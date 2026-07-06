import {
  BLEEDING_ORDER,
  MUCUS_ORDER,
  type Bleeding,
  type CycleObservation,
  type DayEntry,
  type Mucus,
  type Temperature
} from '../types';

export type PatchField = 'bleeding' | 'temperature' | 'mucus' | 'spotting' | 'breastTenderness';

export const PATCH_FIELDS: readonly PatchField[] = [
  'bleeding',
  'temperature',
  'mucus',
  'spotting',
  'breastTenderness'
];

export type CyclePatch = Pick<CycleObservation, PatchField>;

export type FieldCounts = Record<PatchField, number>;

export function emptyFieldCounts(): FieldCounts {
  return { bleeding: 0, temperature: 0, mucus: 0, spotting: 0, breastTenderness: 0 };
}

export type Candidate =
  | { field: 'bleeding'; date: string; value: Bleeding }
  | { field: 'mucus'; date: string; value: Mucus }
  | { field: 'temperature'; date: string; value: Temperature }
  | { field: 'spotting' | 'breastTenderness'; date: string; value: true };

// „…None" fehlt bewusst: keine Blutung → Record überspringen.
// Die VaginalBleeding-Varianten sind die ab iOS 18 umbenannten Werte.
// Unspecified → 'light': konservativ, damit ein bloßer Perioden-Toggle ohne
// Stärkeangabe nie eine echte Stärkeangabe desselben Tages überstimmt.
const BLEEDING_VALUES: { [value: string]: Bleeding | undefined } = {
  HKCategoryValueMenstrualFlowLight: 'light',
  HKCategoryValueMenstrualFlowMedium: 'medium',
  HKCategoryValueMenstrualFlowHeavy: 'heavy',
  HKCategoryValueMenstrualFlowUnspecified: 'light',
  HKCategoryValueVaginalBleedingLight: 'light',
  HKCategoryValueVaginalBleedingMedium: 'medium',
  HKCategoryValueVaginalBleedingHeavy: 'heavy',
  HKCategoryValueVaginalBleedingUnspecified: 'light'
};

// Näherung ans Sensiplan-Schema: Sticky/Creamy → S, Watery/EggWhite → S+.
const MUCUS_VALUES: { [value: string]: Mucus | undefined } = {
  HKCategoryValueCervicalMucusQualityDry: 't',
  HKCategoryValueCervicalMucusQualitySticky: 'S',
  HKCategoryValueCervicalMucusQualityCreamy: 'S',
  HKCategoryValueCervicalMucusQualityWatery: 'S+',
  HKCategoryValueCervicalMucusQualityEggWhite: 'S+'
};

// AbdominalCramps wird bewusst NICHT importiert: meist Menstruations-, nicht
// Mittelschmerz — falsche Ovulationsmarker wären schlimmer als fehlende.
const TYPE_FLOW = 'HKCategoryTypeIdentifierMenstrualFlow';
const TYPE_MUCUS = 'HKCategoryTypeIdentifierCervicalMucusQuality';
const TYPE_TEMP = 'HKQuantityTypeIdentifierBasalBodyTemperature';
const TYPE_SPOTTING = 'HKCategoryTypeIdentifierIntermenstrualBleeding';
const TYPE_BREAST = 'HKCategoryTypeIdentifierBreastPain';

// startDate wie „2024-05-12 07:31:00 +0200": der Offset ist bereits die lokale
// Zeitzone des Exports, daher sind die ersten 10 Zeichen direkt der Tages-Key.
const START_DATE_RE = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/;

function splitStartDate(startDate: string | undefined): { date: string; time: string } | null {
  if (startDate === undefined || !START_DATE_RE.test(startDate)) return null;
  return { date: startDate.slice(0, 10), time: startDate.slice(11, 16) };
}

export function recordToCandidate(
  attrs: Readonly<Record<string, string | undefined>>
): Candidate | null {
  const type = attrs.type;
  if (type === undefined) return null;
  const start = splitStartDate(attrs.startDate);
  if (start === null) return null;

  switch (type) {
    case TYPE_FLOW: {
      const bleeding = attrs.value !== undefined ? BLEEDING_VALUES[attrs.value] : undefined;
      return bleeding !== undefined ? { field: 'bleeding', date: start.date, value: bleeding } : null;
    }
    case TYPE_MUCUS: {
      const mucus = attrs.value !== undefined ? MUCUS_VALUES[attrs.value] : undefined;
      return mucus !== undefined ? { field: 'mucus', date: start.date, value: mucus } : null;
    }
    case TYPE_TEMP: {
      const raw = Number(attrs.value);
      if (!Number.isFinite(raw)) return null;
      const celsius = attrs.unit === 'degF' ? ((raw - 32) * 5) / 9 : raw;
      return {
        field: 'temperature',
        date: start.date,
        value: {
          value: Math.round(celsius * 100) / 100,
          time: start.time,
          disturbed: false,
          excluded: false
        }
      };
    }
    case TYPE_SPOTTING:
      return { field: 'spotting', date: start.date, value: true };
    case TYPE_BREAST:
      return { field: 'breastTenderness', date: start.date, value: true };
    default:
      return null;
  }
}

// Mehrere Records desselben Typs am selben Tag: stärkste Blutung, beste
// Schleimqualität, früheste Temperaturmessung gewinnt.
export function addCandidate(patches: Map<string, CyclePatch>, candidate: Candidate): void {
  let patch = patches.get(candidate.date);
  if (patch === undefined) {
    patch = {};
    patches.set(candidate.date, patch);
  }
  switch (candidate.field) {
    case 'bleeding': {
      const prev = patch.bleeding;
      if (prev === undefined || BLEEDING_ORDER.indexOf(candidate.value) > BLEEDING_ORDER.indexOf(prev)) {
        patch.bleeding = candidate.value;
      }
      break;
    }
    case 'mucus': {
      const prev = patch.mucus;
      if (prev === undefined || MUCUS_ORDER.indexOf(candidate.value) > MUCUS_ORDER.indexOf(prev)) {
        patch.mucus = candidate.value;
      }
      break;
    }
    case 'temperature': {
      const prev = patch.temperature;
      if (prev === undefined || candidate.value.time < prev.time) {
        patch.temperature = candidate.value;
      }
      break;
    }
    default:
      patch[candidate.field] = true;
  }
}

export interface ApplyResult {
  entry: DayEntry;
  changed: boolean;
  importedFields: PatchField[];
  skippedFields: PatchField[];
}

function setCycleField<K extends PatchField>(
  cycle: CycleObservation,
  field: K,
  value: CycleObservation[K]
): void {
  cycle[field] = value;
}

export function applyPatchToEntry(
  existing: DayEntry | undefined,
  date: string,
  patch: CyclePatch
): ApplyResult {
  const cycle: CycleObservation = { ...existing?.cycle };
  const importedFields: PatchField[] = [];
  const skippedFields: PatchField[] = [];

  for (const field of PATCH_FIELDS) {
    const value = patch[field];
    if (value === undefined) continue;
    if (cycle[field] === undefined) {
      setCycleField(cycle, field, value);
      importedFields.push(field);
    } else {
      skippedFields.push(field);
    }
  }

  const changed = importedFields.length > 0;
  const base: DayEntry = existing ?? { date, habits: {} };
  return {
    entry: changed ? { ...base, cycle } : base,
    changed,
    importedFields,
    skippedFields
  };
}
