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
  // Rückblickend geschätzter Eisprung für abgeschlossene Zyklen ohne
  // bestätigten Temperaturanstieg — nur für die Phasen-Zuordnung im
  // CycleIndex. Vorhersage (lutealLengths) und Kurvenblatt nutzen bewusst
  // ausschließlich ovulationEstimate, sonst würde die Rückrechnung ihre
  // eigene Luteal-Statistik zirkulär füttern.
  retroOvulationEstimate?: string;
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

export const DEFAULT_LUTEAL = 14;
const PLAUSIBLE_LUTEAL: [number, number] = [8, 18];
// Schleim-Höhepunkt zählt nur als Eisprung-Kandidat, wenn er nahe genug an
// der Rückrechnung liegt — sonst ist es eher eine späte Östrogenspitze o. Ä.
const MUCUS_RETRO_TOLERANCE = 4;

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

// Lutealphasenlänge = Tage vom geschätzten Eisprung bis zum Beginn der nächsten
// Periode. Nur aus Zyklen, die einen temperaturbestätigten Eisprung haben UND
// einen Folgezyklus.
export function lutealLengths(cycles: CycleInfo[]): number[] {
  const out: number[] = [];
  for (let i = 0; i < cycles.length - 1; i++) {
    const ov = cycles[i]!.ovulationEstimate;
    if (!ov) continue;
    const len = daysBetween(ov, cycles[i + 1]!.startDate);
    if (len >= PLAUSIBLE_LUTEAL[0] && len <= PLAUSIBLE_LUTEAL[1]) out.push(len);
  }
  return out;
}

function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

// Rückblickende Eisprung-Schätzung für abgeschlossene Zyklen ohne bestätigten
// Temperaturanstieg. Die Lutealphase ist intraindividuell deutlich stabiler
// als die Follikelphase, deshalb wird rückwärts gerechnet: Eisprung ≈ nächster
// Periodenstart minus mediane Lutealphasenlänge aus den temperaturbestätigten
// Zyklen (mit < 2 Stützwerten: DEFAULT_LUTEAL). Liegt der Schleim-Höhepunkt
// nahe genug an dieser Rückrechnung, gewinnt er als direkte Beobachtung.
function addRetroOvulationEstimates(cycles: CycleInfo[]): void {
  const luteals = lutealLengths(cycles);
  const lutealDays = luteals.length >= 2 ? Math.round(median(luteals)) : DEFAULT_LUTEAL;
  for (const c of cycles) {
    if (c.ovulationEstimate || !c.endDate) continue;
    const backward = addDays(c.endDate, 1 - lutealDays);
    const estimate =
      c.mucusPeakDay && Math.abs(daysBetween(c.mucusPeakDay, backward)) <= MUCUS_RETRO_TOLERANCE
        ? c.mucusPeakDay
        : backward;
    // nie vor das Menstruationsende — bei sehr kurzen Zyklen entfällt die
    // Follikelphase dann einfach
    c.retroOvulationEstimate = estimate < c.menstruationEnd ? c.menstruationEnd : estimate;
  }
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

  const cycles = starts.map((s, idx) => {
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

  addRetroOvulationEstimates(cycles);
  return cycles;
}

export function buildCycleIndex(entries: DayEntry[]): CycleIndex {
  const cycles = detectCycles(entries);
  const phaseByDate = new Map<string, Phase>();
  const cycleDayByDate = new Map<string, number>();

  for (const c of cycles) {
    const end = c.endDate ?? addDays(c.startDate, 45);
    const boundary = c.ovulationEstimate ?? c.retroOvulationEstimate;
    let d = c.startDate;
    while (d <= end) {
      cycleDayByDate.set(d, daysBetween(c.startDate, d) + 1);
      if (d <= c.menstruationEnd) phaseByDate.set(d, 'menstruation');
      else if (boundary) {
        phaseByDate.set(d, d <= boundary ? 'follikel' : 'luteal');
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
