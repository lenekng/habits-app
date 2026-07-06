<script lang="ts">
  import { formatDE } from '../../lib/date';
  import { PATCH_FIELDS, type PatchField } from '../../lib/health/mapping';
  import { mergePatchesIntoDb, type MergeResult } from '../../lib/health/merge';
  import { parseHealthExport, type ParseProgress, type ParseResult } from '../../lib/health/stream';

  const FIELD_LABELS: Record<PatchField, string> = {
    bleeding: 'Blutung',
    temperature: 'Basaltemperatur',
    mucus: 'Zervixschleim',
    spotting: 'Zwischenblutung',
    midPain: 'Mittelschmerz',
    breastTenderness: 'Brustspannen'
  };

  type Phase = 'idle' | 'parsing' | 'saving' | 'done' | 'error';

  let phase = $state<Phase>('idle');
  let progress = $state<ParseProgress | null>(null);
  let parseResult = $state<ParseResult | null>(null);
  let mergeResult = $state<MergeResult | null>(null);
  let errorMessage = $state('');

  const busy = $derived(phase === 'parsing' || phase === 'saving');

  const percent = $derived.by(() => {
    const p = progress;
    if (p === null || p.totalBytes <= 0) return 0;
    return Math.min(100, Math.round((p.bytesRead / p.totalBytes) * 100));
  });

  const runningTotal = $derived.by(() => {
    const p = progress;
    if (p === null) return 0;
    return PATCH_FIELDS.reduce((sum, field) => sum + p.recordCounts[field], 0);
  });

  const foundTotal = $derived.by(() => {
    const r = parseResult;
    if (r === null) return 0;
    return PATCH_FIELDS.reduce((sum, field) => sum + r.recordCounts[field], 0);
  });

  async function onFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file === undefined || busy) return;

    phase = 'parsing';
    progress = null;
    parseResult = null;
    mergeResult = null;
    errorMessage = '';

    try {
      const parsed = await parseHealthExport(file, (p) => {
        progress = { ...p, recordCounts: { ...p.recordCounts } };
      });
      parseResult = parsed;
      phase = 'saving';
      mergeResult = await mergePatchesIntoDb(parsed.patches);
      phase = 'done';
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
      phase = 'error';
    }
  }
</script>

<h1>Apple-Health-Import</h1>

<p>
  So kommst du an den Export: In der Health-App auf dem iPhone oben rechts auf das
  Profilbild tippen und „Alle Gesundheitsdaten exportieren&#8220; wählen. Die erzeugte
  Export.zip hier auswählen (z. B. über die Dateien-App); eine bereits entpackte
  Export.xml funktioniert ebenfalls.
</p>
<p class="muted">
  Importiert werden Blutung, Basaltemperatur, Zervixschleim, Zwischenblutung, Mittelschmerz
  und Brustspannen. Manuell eingetragene Werte werden nie überschrieben; ein erneuter Import
  derselben Datei ändert nichts.
</p>

<label class="file-button" class:disabled={busy}>
  {#if busy}
    Import läuft &hellip;
  {:else if phase === 'idle'}
    Export.zip oder Export.xml auswählen
  {:else}
    Weitere Datei importieren
  {/if}
  <input
    type="file"
    accept=".zip,.xml,application/zip,text/xml"
    disabled={busy}
    onchange={onFileChange}
  />
</label>

{#if busy}
  <div class="progress" role="status">
    <div class="bar">
      <div class="fill" style:width="{percent}%"></div>
    </div>
    {#if phase === 'parsing'}
      <p class="muted">{percent} % gelesen &middot; {runningTotal} Zyklus-Records gefunden</p>
    {:else}
      <p class="muted">Speichere in die Datenbank &hellip;</p>
    {/if}
  </div>
{/if}

{#if phase === 'done' && parseResult !== null && mergeResult !== null}
  <h2>Import abgeschlossen</h2>
  {#if foundTotal === 0}
    <p>In der Datei wurden keine relevanten Zyklusdaten gefunden.</p>
  {:else}
    {#if parseResult.dateRange !== null}
      <p>
        Zeitraum der Daten: {formatDE(parseResult.dateRange.from)} bis
        {formatDE(parseResult.dateRange.to)}
      </p>
    {/if}
    <p>
      {mergeResult.daysCreated} neue Tage angelegt, {mergeResult.daysUpdated} bestehende Tage
      ergänzt, {mergeResult.daysUnchanged} Tage unverändert.
    </p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Typ</th>
            <th>Records</th>
            <th>Tage importiert</th>
            <th>Tage übersprungen</th>
          </tr>
        </thead>
        <tbody>
          {#each PATCH_FIELDS as field (field)}
            <tr>
              <td>{FIELD_LABELS[field]}</td>
              <td>{parseResult.recordCounts[field]}</td>
              <td>{mergeResult.imported[field]}</td>
              <td>{mergeResult.skipped[field]}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="muted">
      Übersprungen heißt: An diesem Tag war das Feld bereits ausgefüllt, manuelle Einträge
      haben Vorrang.
    </p>
    {#if parseResult.recordCounts.mucus > 0}
      <p class="muted">
        Hinweis: Die Zervixschleim-Werte aus Apple Health wurden näherungsweise auf das
        Sensiplan-Schema abgebildet (Dry &rarr; t, Sticky/Creamy &rarr; S, Watery/EggWhite
        &rarr; S+). Einzelne Tage bei Bedarf manuell prüfen.
      </p>
    {/if}
  {/if}
  {#if parseResult.warnings.length > 0}
    <h2>Warnungen</h2>
    <ul class="warnings">
      {#each parseResult.warnings as warning}
        <li>{warning}</li>
      {/each}
    </ul>
  {/if}
{/if}

{#if phase === 'error'}
  <p class="error">Import fehlgeschlagen: {errorMessage}</p>
{/if}

<style>
  .file-button {
    display: inline-block;
    background: var(--accent);
    color: #fff;
    border-radius: 0.5rem;
    padding: 0.6rem 1rem;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .file-button.disabled {
    opacity: 0.6;
    cursor: default;
  }

  .file-button input {
    display: none;
  }

  .progress {
    margin-top: 1rem;
  }

  .bar {
    height: 0.5rem;
    background: var(--accent-soft);
    border-radius: 0.25rem;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.2s ease;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.9rem;
  }

  th,
  td {
    text-align: left;
    padding: 0.35rem 0.5rem;
    border-bottom: 1px solid var(--border);
  }

  th:nth-child(n + 2),
  td:nth-child(n + 2) {
    text-align: right;
  }

  .warnings {
    color: var(--period);
    padding-left: 1.2rem;
    margin: 0.25rem 0;
  }

  .error {
    color: var(--period);
  }
</style>
