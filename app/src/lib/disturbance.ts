import type { HabitValue } from './types';

interface DisturbanceRule {
  habitId: string;
  label: string;
  test: (value: HabitValue | undefined) => boolean;
}

export const TEMP_DISTURBANCE_RULES: DisturbanceRule[] = [
  { habitId: 'alkohol', label: 'Alkohol', test: (v) => typeof v === 'number' && v >= 3 },
  { habitId: 'schlaf', label: 'schlecht geschlafen', test: (v) => typeof v === 'number' && v <= 2 },
  { habitId: 'erkaeltung', label: 'Erkältung', test: (v) => v === true },
  { habitId: 'medikamente', label: 'Medikamente', test: (v) => v === true },
  { habitId: 'auswaerts_geschlafen', label: 'auswärts geschlafen', test: (v) => v === true },
  { habitId: 'urlaub', label: 'Urlaub', test: (v) => v === true }
];

export function disturbanceReasons(prevHabits: Record<string, HabitValue>): string[] {
  return TEMP_DISTURBANCE_RULES.filter((r) => r.test(prevHabits[r.habitId])).map((r) => r.label);
}
