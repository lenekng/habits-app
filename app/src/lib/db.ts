import Dexie, { type Table } from 'dexie';
import type { Cycle, DayEntry, HabitDefinition, Setting } from './types';

export const SCHEMA_VERSION = 1;

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
  { id: 'alkohol', name: 'Alkohol', type: 'scale4', scaleLabels: ['keiner', 'wenig', 'mittel', 'viel'], sortOrder: 10 },
  { id: 'stress', name: 'Stress', type: 'scale4', scaleLabels: ['wenig', 'mittel', 'viel', 'sehr viel'], sortOrder: 11 },
  { id: 'gefuehle', name: 'Gefühle', type: 'scale4', scaleLabels: ['schlecht', 'eher schlecht', 'eher gut', 'gut'], sortOrder: 12 },
  { id: 'schlaf', name: 'Gut geschlafen', type: 'scale4', scaleLabels: ['schlecht', 'mäßig', 'gut', 'sehr gut'], sortOrder: 13 },
  { id: 'ernaehrung', name: 'Ernährung', type: 'scale4', scaleLabels: ['ungesund', 'eher ungesund', 'eher gesund', 'gesund'], sortOrder: 14 }
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
