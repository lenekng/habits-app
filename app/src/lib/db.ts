import Dexie, { type Table } from 'dexie';
import type { Cycle, CycleObservation, DayEntry, HabitDefinition, Setting } from './types';
import { POLARITY_FLIP_IDS, flipScale4Value } from './polarity';
import { SCHLAF_SEED_NAME, SCHLAFDAUER_HABIT, splitSleepHabits } from './sleep-split';

export const SCHEMA_VERSION = 3;

export class HabitsDB extends Dexie {
  day_entries!: Table<DayEntry, string>;
  habit_definitions!: Table<HabitDefinition, string>;
  cycles!: Table<Cycle, string>;
  settings!: Table<Setting, string>;

  constructor() {
    super('habits-app');
    this.version(1).stores({
      day_entries: 'date',
      habit_definitions: 'id, sortOrder',
      cycles: 'startDate',
      settings: 'key'
    });
    // v2: Skalen-Polarität vereinheitlicht (4 = Idealzustand). Alkohol & Stress
    // umgedreht — Werte v→5−v und Label-Reihenfolge, damit jeder Tag denselben
    // Begriff wie vorher zeigt, nur unter neuer Nummer.
    this.version(2).upgrade(async (tx) => {
      await tx
        .table('habit_definitions')
        .toCollection()
        .modify((h: HabitDefinition) => {
          if (POLARITY_FLIP_IDS.includes(h.id as never) && Array.isArray(h.scaleLabels)) {
            h.scaleLabels = [...h.scaleLabels].reverse() as HabitDefinition['scaleLabels'];
          }
        });
      await tx
        .table('day_entries')
        .toCollection()
        .modify((e: DayEntry) => {
          if (!e.habits) return;
          for (const id of POLARITY_FLIP_IDS) {
            if (id in e.habits) e.habits[id] = flipScale4Value(e.habits[id]) as never;
          }
        });
    });
    // v3: „Gut geschlafen" in Schlafqualität + Schlafdauer aufgeteilt
    // (Transformation in sleep-split.ts, geteilt mit dem Backup-Upgrade).
    this.version(3).upgrade(async (tx) => {
      const table = tx.table('habit_definitions');
      const defs = (await table.toArray()) as HabitDefinition[];
      await table.bulkPut(splitSleepHabits(defs));
    });
  }
}

export const DEFAULT_HABITS: HabitDefinition[] = [
  { id: 'geweint', name: 'Geweint', type: 'bool', sortOrder: 1 },
  { id: 'streit', name: 'Streit', type: 'bool', sortOrder: 2 },
  { id: 'gv', name: 'GV', type: 'bool', sortOrder: 3 },
  { id: 'erkaeltung', name: 'Erkältung', type: 'bool', sortOrder: 4 },
  { id: 'soziale_kontakte', name: 'Soziale Kontakte', type: 'bool', sortOrder: 5 },
  { id: 'auswaerts_geschlafen', name: 'Auswärts geschlafen', type: 'bool', sortOrder: 6 },
  { id: 'urlaub', name: 'Urlaub', type: 'bool', sortOrder: 7 },
  { id: 'medikamente', name: 'Medikamente', type: 'bool', sortOrder: 8 },
  {
    id: 'sport',
    name: 'Sport',
    type: 'choice',
    choices: ['Volleyball', 'Beachvolleyball', 'Gym', 'Laufen', 'Sonstiges'],
    sortOrder: 9
  },
  { id: 'alkohol', name: 'Alkohol', type: 'scale4', scaleLabels: ['viel', 'mittel', 'wenig', 'keiner'], sortOrder: 10 },
  { id: 'stress', name: 'Stress', type: 'scale4', scaleLabels: ['sehr viel', 'viel', 'mittel', 'wenig'], sortOrder: 11 },
  { id: 'gefuehle', name: 'Gefühle', type: 'scale4', scaleLabels: ['schlecht', 'eher schlecht', 'eher gut', 'gut'], sortOrder: 12 },
  { id: 'schlaf', name: SCHLAF_SEED_NAME, type: 'scale4', scaleLabels: ['schlecht', 'mäßig', 'gut', 'sehr gut'], sortOrder: 13 },
  { ...SCHLAFDAUER_HABIT, sortOrder: 14 },
  { id: 'ernaehrung', name: 'Ernährung', type: 'scale4', scaleLabels: ['ungesund', 'eher ungesund', 'eher gesund', 'gesund'], sortOrder: 15 }
];

export const db = new HabitsDB();

db.on('populate', () => {
  void db.habit_definitions.bulkAdd(DEFAULT_HABITS);
});

export async function getDayEntry(date: string): Promise<DayEntry | undefined> {
  return db.day_entries.get(date);
}

export async function saveDayEntry(entry: DayEntry): Promise<void> {
  await db.day_entries.put(entry);
}

function cleanCycle(c: CycleObservation): CycleObservation | undefined {
  const out: CycleObservation = {};
  if (c.bleeding) out.bleeding = c.bleeding;
  if (c.temperature) out.temperature = { ...c.temperature };
  if (c.mucus) out.mucus = c.mucus;
  if (c.midPain) out.midPain = true;
  if (c.breastTenderness) out.breastTenderness = true;
  if (c.spotting) out.spotting = true;
  if (c.note && c.note.trim() !== '') out.note = c.note;
  return Object.keys(out).length > 0 ? out : undefined;
}

export function normalizeDayEntry(entry: DayEntry): DayEntry | null {
  const habits = { ...entry.habits };
  const cycle = entry.cycle ? cleanCycle(entry.cycle) : undefined;
  if (Object.keys(habits).length === 0 && !cycle) return null;
  const out: DayEntry = { date: entry.date, habits };
  if (cycle) out.cycle = cycle;
  return out;
}

// Leere Entries werden gelöscht statt gespeichert: "kein Eintrag" muss von
// "explizit nein" unterscheidbar bleiben. Einzige Stelle für diese Regel.
export async function putOrDeleteDayEntry(entry: DayEntry): Promise<DayEntry | null> {
  const normalized = normalizeDayEntry(entry);
  if (normalized) await db.day_entries.put(normalized);
  else await db.day_entries.delete(entry.date);
  return normalized;
}

export async function activeHabits(): Promise<HabitDefinition[]> {
  const all = await db.habit_definitions.orderBy('sortOrder').toArray();
  return all.filter((h) => !h.archivedAt);
}

export async function allHabits(): Promise<HabitDefinition[]> {
  return db.habit_definitions.orderBy('sortOrder').toArray();
}

export async function getSetting<T>(key: string): Promise<T | undefined> {
  const row = await db.settings.get(key);
  return row?.value as T | undefined;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  await db.settings.put({ key, value });
}
