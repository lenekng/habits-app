import { db, activeHabits } from '../../../lib/db';
import { buildCycleIndex, type CycleIndex } from '../../../lib/cycles';
import type { DayEntry, HabitDefinition } from '../../../lib/types';

export interface AnalyseData {
  entries: DayEntry[];
  habits: HabitDefinition[];
  index: CycleIndex;
}

export async function loadAnalyseData(): Promise<AnalyseData> {
  const [entries, habits] = await Promise.all([db.day_entries.toArray(), activeHabits()]);
  return { entries, habits, index: buildCycleIndex(entries) };
}
