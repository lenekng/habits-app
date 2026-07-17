import { DEFAULT_LUTEAL, lutealLengths, type CycleInfo } from './cycles';
import { addDays } from './date';
import type { MessageKey } from './i18n/messages';

export { lutealLengths };

export type PredictionMethod = 'temperature' | 'length' | 'none';

export interface PeriodPrediction {
  method: PredictionMethod;
  likelyDate?: string;
  earliestDate?: string;
  latestDate?: string;
  daysUntilLikely?: number; // von heute; negativ = liegt in der Vergangenheit
  overdueDays?: number; // > 0 wenn heute nach dem spätesten Termin liegt
  basedOnCycles: number;
  usedDefaultLuteal?: boolean;
  hasTempShift?: boolean; // aktueller Zyklus hat schon einen bestätigten Anstieg
  // gesetzt, wenn method === 'none'; i18n-Katalog-Key + Parameter statt fertigem Text
  reason?: { key: MessageKey; params?: Record<string, string | number> };
}

const MIN_LENGTH_CYCLES = 3;
const PLAUSIBLE_LENGTH: [number, number] = [15, 60];

function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

// Lineare Quantil-Interpolation (Typ 7), Eingabe aufsteigend sortiert.
export function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0]!;
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo]!;
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (idx - lo);
}

export function completedLengths(cycles: CycleInfo[]): number[] {
  return cycles
    .map((c) => c.length)
    .filter((l): l is number => l !== undefined && l >= PLAUSIBLE_LENGTH[0] && l <= PLAUSIBLE_LENGTH[1]);
}

function finalize(
  base: PeriodPrediction,
  earliest: string,
  likely: string,
  latest: string,
  today: string
): PeriodPrediction {
  const daysUntilLikely = daysBetween(today, likely);
  const overdueDays = today > latest ? daysBetween(latest, today) : 0;
  return { ...base, earliestDate: earliest, likelyDate: likely, latestDate: latest, daysUntilLikely, overdueDays };
}

export function predictNextPeriod(cycles: CycleInfo[], today: string): PeriodPrediction {
  if (cycles.length === 0) {
    return { method: 'none', basedOnCycles: 0, reason: { key: 'pred.reasonNoCycle' } };
  }

  const current = cycles[cycles.length - 1]!;
  const currentOv = current.ovulationEstimate;
  const hasTempShift = currentOv !== undefined;

  // Stufe 2: Eisprung im laufenden Zyklus bestätigt → über die Lutealphase.
  if (currentOv) {
    const luteals = lutealLengths(cycles);
    const usedDefault = luteals.length < 2;
    const sorted = [...luteals].sort((a, b) => a - b);
    const med = usedDefault ? DEFAULT_LUTEAL : Math.round(quantile(sorted, 0.5));
    const lo = usedDefault ? med - 2 : Math.min(med - 1, sorted[0]!);
    const hi = usedDefault ? med + 2 : Math.max(med + 1, sorted[sorted.length - 1]!);
    return finalize(
      {
        method: 'temperature',
        basedOnCycles: luteals.length,
        usedDefaultLuteal: usedDefault,
        hasTempShift
      },
      addDays(currentOv, lo),
      addDays(currentOv, med),
      addDays(currentOv, hi),
      today
    );
  }

  // Stufe 1: vor dem Eisprung → aus der Verteilung der Zykluslängen.
  const lengths = completedLengths(cycles).sort((a, b) => a - b);
  if (lengths.length < MIN_LENGTH_CYCLES) {
    return {
      method: 'none',
      basedOnCycles: lengths.length,
      hasTempShift,
      reason: {
        key: 'pred.reasonNeedCycles',
        params: { min: MIN_LENGTH_CYCLES, current: lengths.length }
      }
    };
  }

  const start = current.startDate;
  return finalize(
    { method: 'length', basedOnCycles: lengths.length, hasTempShift },
    addDays(start, Math.round(quantile(lengths, 0.1))),
    addDays(start, Math.round(quantile(lengths, 0.5))),
    addDays(start, Math.round(quantile(lengths, 0.9))),
    today
  );
}
