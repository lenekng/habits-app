import type { DayEntry, Mucus } from './types';
import { addDays } from './date';
import { evaluateTempShift, type TempPoint, type TempShiftResult } from './ovulation';

export type Phase = 'menstruation' | 'follikel' | 'luteal' | 'unbestimmt';

export interface CycleInfo {
  startDate: string;
  endDate?: string;
  length?: number;
  menstruationEnd: string;
  tempShift: TempShiftResult;
  ovulationEstimate?: string;
  mucusPeakDay?: string;
  mucusPlausible?: boolean;
}

export interface CycleIndex {
  cycles: CycleInfo[];
  phaseByDate: Map<string, Phase>;
  cycleDayByDate: Map<string, number>;
}

const REAL_BLEEDING = new Set(['light', 'medium', 'heavy']);
const EPISODE_MAX_GAP = 2;
const MIN_CYCLE_DAYS = 15;
const MUCUS_QUALITY: Partial<Record<Mucus, number>> = { f: 1, S: 2, 'S+': 3 };

function bleedingEpisodes(entries: DayEntry[]): { start: string; end: string }[] {
  const days = entries
    .filter((e) => e.cycle?.bleeding && REAL_BLEEDING.has(e.cycle.bleeding))
    .map((e) => e.date)
    .sort();
  const episodes: { start: string; end: string }[] = [];
  for (const day of days) {
    const last = episodes[episodes.length - 1];
    if (last && day <= addDays(last.end, EPISODE_MAX_GAP + 1)) last.end = day;
    else episodes.push({ start: day, end: day });
  }
  return episodes;
}

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

export function detectCycles(entries: DayEntry[]): CycleInfo[] {
  const episodes = bleedingEpisodes(entries);

  const starts: { start: string; menstruationEnd: string }[] = [];
  for (const ep of episodes) {
    const current = starts[starts.length - 1];
    if (!current || daysBetween(current.start, ep.start) >= MIN_CYCLE_DAYS) {
      starts.push({ start: ep.start, menstruationEnd: ep.end });
    }
  }

  return starts.map((s, idx) => {
    const next = starts[idx + 1];
    const endDate = next ? addDays(next.start, -1) : undefined;
    const rangeEnd = endDate ?? '9999-12-31';

    const temps: TempPoint[] = entries
      .filter((e) => e.date >= s.start && e.date <= rangeEnd && e.cycle?.temperature)
      .map((e) => ({
        date: e.date,
        value: e.cycle!.temperature!.value,
        excluded: e.cycle!.temperature!.excluded,
        disturbed: e.cycle!.temperature!.disturbed
      }));
    const tempShift = evaluateTempShift(temps);
    const ovulationEstimate = tempShift.found ? addDays(tempShift.firstHighDay!, -1) : undefined;

    const searchEnd = tempShift.found ? addDays(tempShift.confirmedDay!, 0) : rangeEnd;
    let best = 0;
    let mucusPeakDay: string | undefined;
    for (const e of entries) {
      if (e.date < s.start || e.date > searchEnd) continue;
      const q = e.cycle?.mucus ? (MUCUS_QUALITY[e.cycle.mucus] ?? 0) : 0;
      if (q >= best && q > 0) {
        best = q;
        mucusPeakDay = e.date;
      }
    }
    const mucusPlausible =
      ovulationEstimate && mucusPeakDay
        ? Math.abs(daysBetween(mucusPeakDay, ovulationEstimate)) <= 3
        : undefined;

    return {
      startDate: s.start,
      endDate,
      length: endDate ? daysBetween(s.start, endDate) + 1 : undefined,
      menstruationEnd: s.menstruationEnd,
      tempShift,
      ovulationEstimate,
      mucusPeakDay,
      mucusPlausible
    };
  });
}

export function buildCycleIndex(entries: DayEntry[]): CycleIndex {
  const cycles = detectCycles(entries);
  const phaseByDate = new Map<string, Phase>();
  const cycleDayByDate = new Map<string, number>();

  for (const c of cycles) {
    const end = c.endDate ?? addDays(c.startDate, 45);
    let d = c.startDate;
    while (d <= end) {
      cycleDayByDate.set(d, daysBetween(c.startDate, d) + 1);
      if (d <= c.menstruationEnd) phaseByDate.set(d, 'menstruation');
      else if (c.ovulationEstimate) {
        phaseByDate.set(d, d <= c.ovulationEstimate ? 'follikel' : 'luteal');
      } else phaseByDate.set(d, 'unbestimmt');
      d = addDays(d, 1);
    }
  }

  return { cycles, phaseByDate, cycleDayByDate };
}

export function cycleLengthStats(cycles: CycleInfo[]): {
  n: number;
  min?: number;
  max?: number;
  median?: number;
} {
  const lengths = cycles.map((c) => c.length).filter((l): l is number => l !== undefined);
  if (lengths.length === 0) return { n: 0 };
  const sorted = [...lengths].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
  return { n: lengths.length, min: sorted[0], max: sorted[sorted.length - 1], median };
}
