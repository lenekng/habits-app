import { Unzip, UnzipInflate, UnzipPassThrough, type FlateError, type UnzipFile } from 'fflate';
import { SaxesParser } from 'saxes';
import {
  addCandidate,
  emptyFieldCounts,
  recordToCandidate,
  type CyclePatch,
  type FieldCounts
} from './mapping';

export interface ParseProgress {
  bytesRead: number;
  totalBytes: number;
  recordCounts: FieldCounts;
}

export interface ParseResult {
  patches: Map<string, CyclePatch>;
  recordCounts: FieldCounts;
  dateRange: { from: string; to: string } | null;
  warnings: string[];
}

const EXPORT_XML_RE = /(^|\/)export\.xml$/i;
const MAX_XML_WARNINGS = 3;

export async function parseHealthExport(
  file: File,
  onProgress: (progress: ParseProgress) => void
): Promise<ParseResult> {
  const patches = new Map<string, CyclePatch>();
  const recordCounts = emptyFieldCounts();
  const warnings: string[] = [];
  let xmlErrorCount = 0;
  let sawRoot = false;

  const sax = new SaxesParser({ position: false, xmlns: false });
  // saxes' fail() ruft nur den Handler auf und parst weiter — einzelne kaputte
  // Zeichen (z. B. in Gerätenamen) brechen den Import daher nicht ab.
  sax.on('error', (err) => {
    xmlErrorCount += 1;
    if (warnings.length < MAX_XML_WARNINGS) warnings.push(`XML-Fehler: ${err.message}`);
  });
  sax.on('opentag', (tag) => {
    if (!sawRoot) {
      sawRoot = true;
      if (tag.name !== 'HealthData') {
        warnings.push(
          `Unerwartetes Wurzelelement <${tag.name}> – ist das wirklich ein Apple-Health-Export?`
        );
      }
    }
    if (tag.name !== 'Record') return;
    const candidate = recordToCandidate(tag.attributes);
    if (candidate === null) return;
    recordCounts[candidate.field] += 1;
    addCandidate(patches, candidate);
  });

  // stream: true hält Multi-Byte-Sequenzen an Chunk-Grenzen zusammen;
  // decode() ohne Argument am Ende spült einen eventuellen Rest.
  const decoder = new TextDecoder('utf-8');
  let xmlClosed = false;
  const writeXml = (bytes: Uint8Array): void => {
    if (xmlClosed) return;
    const text = decoder.decode(bytes, { stream: true });
    if (text.length > 0) sax.write(text);
  };
  const finishXml = (): void => {
    if (xmlClosed) return;
    xmlClosed = true;
    const tail = decoder.decode();
    if (tail.length > 0) sax.write(tail);
    sax.close();
  };

  let unzip: Unzip | null = null;
  let zipEntryFound = false;
  let zipXmlDone = false;
  let zipError: FlateError | null = null;

  const setupUnzip = (): void => {
    unzip = new Unzip();
    unzip.register(UnzipInflate);
    unzip.register(UnzipPassThrough);
    unzip.onfile = (entry: UnzipFile) => {
      if (zipEntryFound || !EXPORT_XML_RE.test(entry.name)) return;
      zipEntryFound = true;
      entry.ondata = (err, data, final) => {
        if (err !== null) {
          zipError = err;
          return;
        }
        writeXml(data);
        if (final) {
          zipXmlDone = true;
          finishXml();
        }
      };
      entry.start();
    };
  };

  let mode: 'zip' | 'xml' | null = null;
  let bytesRead = 0;

  const processChunk = (chunk: Uint8Array, final: boolean): void => {
    if (mode === null) {
      const zipMagic = chunk.length >= 2 && chunk[0] === 0x50 && chunk[1] === 0x4b;
      mode = zipMagic || /\.zip$/i.test(file.name) ? 'zip' : 'xml';
      if (mode === 'zip') setupUnzip();
    }
    if (mode === 'zip') {
      unzip?.push(chunk, final);
      if (zipError !== null) {
        throw new Error(`ZIP-Datei konnte nicht entpackt werden: ${zipError.message}`);
      }
    } else {
      writeXml(chunk);
      if (final) finishXml();
    }
    bytesRead += chunk.byteLength;
  };

  const breathe = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
  // Gedrosselt: pro Chunk emittieren hieße bei großen Dateien tausende Re-Renders.
  let lastProgressAt = 0;
  const emitProgress = (force = false): void => {
    const now = Date.now();
    if (!force && now - lastProgressAt < 150) return;
    lastProgressAt = now;
    onProgress({ bytesRead, totalBytes: file.size, recordCounts });
  };

  const reader = file.stream().getReader();
  try {
    // Ein Chunk Vorlauf, damit der letzte Chunk mit final = true verarbeitet
    // werden kann (fflate und TextDecoder brauchen ein echtes Stream-Ende).
    let pending: Uint8Array | null = null;
    let aborted = false;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (pending !== null) {
        processChunk(pending, false);
        emitProgress();
        if (zipXmlDone) {
          // Export.xml ist komplett; der Rest der ZIP (export_cda.xml u. a.)
          // muss nicht mehr gelesen werden.
          aborted = true;
          break;
        }
        await breathe();
      }
      pending = value;
    }
    if (aborted) {
      pending = null;
      await reader.cancel().catch(() => undefined);
    }
    if (pending !== null) {
      processChunk(pending, true);
      emitProgress(true);
    }

    if (mode === null) throw new Error('Die Datei ist leer.');
    if (mode === 'zip') {
      if (!zipEntryFound) {
        throw new Error(
          'In der ZIP-Datei wurde keine Export.xml gefunden. Bitte die unveränderte Export.zip aus der Health-App wählen.'
        );
      }
      if (!zipXmlDone) throw new Error('Die ZIP-Datei ist unvollständig oder beschädigt.');
    } else {
      finishXml();
    }
  } finally {
    reader.releaseLock();
  }

  if (xmlErrorCount > MAX_XML_WARNINGS) {
    warnings.push(`Insgesamt ${xmlErrorCount} XML-Fehler, weitere Meldungen unterdrückt.`);
  }

  let from: string | null = null;
  let to: string | null = null;
  for (const date of patches.keys()) {
    if (from === null || date < from) from = date;
    if (to === null || date > to) to = date;
  }

  return {
    patches,
    recordCounts,
    dateRange: from !== null && to !== null ? { from, to } : null,
    warnings
  };
}
