import type { HabitValue } from './types';

interface DisturbanceRule {
  habitId: string;
  label: string;
  // Die Temperatur am Tag d wird morgens nach der Nacht d−1→d gemessen.
  // 'prev': Verhalten vom Vortag (z. B. Alkohol am Abend) stört die Messung
  // am Morgen danach. 'same': Schlaf-Habits beschreiben genau diese Nacht
  // und stehen am selben Tag wie die Messung.
  day: 'prev' | 'same';
  test: (value: HabitValue | undefined) => boolean;
}

export const TEMP_DISTURBANCE_RULES: DisturbanceRule[] = [
  // Skala umgedreht (4 = keiner): „mittel" (2) und „viel" (1) stören die Messung.
  { habitId: 'alkohol', label: 'Alkohol am Vortag', day: 'prev', test: (v) => typeof v === 'number' && v <= 2 },
  { habitId: 'schlaf', label: 'schlecht geschlafen', day: 'same', test: (v) => typeof v === 'number' && v <= 2 },
  // nur die unterste Stufe („unter 6 h") — kurze, aber normale Nächte sollen
  // nicht ständig als Störung vorgeschlagen werden
  { habitId: 'schlafdauer', label: 'zu wenig geschlafen', day: 'same', test: (v) => typeof v === 'number' && v <= 1 },
  { habitId: 'erkaeltung', label: 'Erkältung', day: 'prev', test: (v) => v === true },
  { habitId: 'medikamente', label: 'Medikamente', day: 'prev', test: (v) => v === true },
  { habitId: 'auswaerts_geschlafen', label: 'auswärts geschlafen', day: 'prev', test: (v) => v === true },
  { habitId: 'urlaub', label: 'Urlaub', day: 'prev', test: (v) => v === true }
];

export function disturbanceReasons(
  prevHabits: Record<string, HabitValue>,
  sameDayHabits: Record<string, HabitValue>
): string[] {
  return TEMP_DISTURBANCE_RULES.filter((r) =>
    r.test((r.day === 'prev' ? prevHabits : sameDayHabits)[r.habitId])
  ).map((r) => r.label);
}
