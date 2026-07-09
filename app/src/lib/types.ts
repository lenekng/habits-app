export type HabitType = 'bool' | 'scale4' | 'choice';

export interface HabitDefinition {
  id: string;
  name: string;
  type: HabitType;
  choices?: string[];
  scaleLabels?: [string, string, string, string];
  sortOrder: number;
  archivedAt?: string;
}

export type HabitValue = boolean | number | string[];

export type Bleeding = 'spotting' | 'light' | 'medium' | 'heavy';

export type Mucus = 't' | 'none' | 'f' | 'S' | 'S+';

export interface Temperature {
  value: number;
  time: string;
  disturbed: boolean;
  disturbanceNote?: string;
  excluded: boolean;
}

export interface CycleObservation {
  bleeding?: Bleeding;
  temperature?: Temperature;
  mucus?: Mucus;
  midPain?: boolean;
  breastTenderness?: boolean;
  spotting?: boolean;
  note?: string;
}

export interface DayEntry {
  date: string;
  habits: Record<string, HabitValue>;
  cycle?: CycleObservation;
}

export interface Cycle {
  startDate: string;
  endDate?: string;
  length?: number;
  ovulationEstimate?: string;
  tempShiftDay?: string;
  mucusPeakDay?: string;
}

export interface Setting {
  key: string;
  value: unknown;
}

export const MUCUS_ORDER: Mucus[] = ['t', 'none', 'f', 'S', 'S+'];

export const MUCUS_LABELS: Record<Mucus, { short: string; description: string }> = {
  t: { short: 't', description: 'trocken: trockenes, raues Gefühl, nichts sichtbar' },
  none: { short: 'Ø', description: 'nichts gefühlt, nichts gesehen' },
  f: { short: 'f', description: 'feucht: feuchtes Gefühl, aber kein Schleim sichtbar' },
  S: { short: 'S', description: 'Schleim minderer Qualität: dicklich, weißlich, cremig, klumpig' },
  'S+': { short: 'S+', description: 'beste Qualität: glasklar, spinnbar, dehnbar; Gefühl nass/glitschig' }
};

export const BLEEDING_ORDER: Bleeding[] = ['spotting', 'light', 'medium', 'heavy'];
