import type { DayEntry, HabitDefinition, HabitValue } from './types';
import { addDays } from './date';
import type { CycleIndex, Phase } from './cycles';

export interface VariableSpec {
  id: string;
  label: string;
  extract: (entry: DayEntry | undefined, date: string, index: CycleIndex) => number | undefined;
}

const BLEEDING_LEVEL: Record<string, number> = { spotting: 1, light: 2, medium: 3, heavy: 4 };
const MUCUS_LEVEL: Record<string, number> = { t: 0, none: 1, f: 2, S: 3, 'S+': 4 };

export function habitVariable(habit: HabitDefinition): VariableSpec {
  return {
    id: habit.id,
    label: habit.name,
    extract: (entry) => {
      const v: HabitValue | undefined = entry?.habits[habit.id];
      if (v === undefined) return undefined;
      if (typeof v === 'number') return v;
      if (typeof v === 'boolean') return v ? 1 : 0;
      return v.length;
    }
  };
}

export function cycleVariables(): VariableSpec[] {
  return [
    {
      id: 'temperatur',
      label: 'Basaltemperatur',
      extract: (entry) => {
        const t = entry?.cycle?.temperature;
        return t && !t.excluded ? t.value : undefined;
      }
    },
    {
      id: 'blutung',
      label: 'Blutungsstärke',
      extract: (entry) =>
        entry?.cycle?.bleeding ? BLEEDING_LEVEL[entry.cycle.bleeding] : undefined
    },
    {
      id: 'schleim',
      label: 'Zervixschleim-Qualität',
      extract: (entry) => (entry?.cycle?.mucus ? MUCUS_LEVEL[entry.cycle.mucus] : undefined)
    },
    {
      id: 'zyklustag',
      label: 'Zyklustag',
      extract: (_e, date, index) => index.cycleDayByDate.get(date)
    },
    {
      id: 'lutealphase',
      label: 'Lutealphase (ja/nein)',
      extract: (_e, date, index) => {
        const p = index.phaseByDate.get(date);
        if (p === undefined || p === 'unbestimmt') return undefined;
        return p === 'luteal' ? 1 : 0;
      }
    }
  ];
}

// Durchschnittsränge bei Bindungen (fractional ranking) — Standard für Spearman.
function ranks(values: number[]): number[] {
  const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array<number>(values.length);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1]![0] === order[i]![0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[order[k]![1]] = avg;
    i = j + 1;
  }
  return out;
}

function pearson(x: number[], y: number[]): number | undefined {
  const n = x.length;
  if (n < 3) return undefined;
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i]! - mx;
    const dy = y[i]! - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return undefined;
  return sxy / Math.sqrt(sxx * syy);
}

export function spearman(x: number[], y: number[]): number | undefined {
  if (x.length !== y.length) return undefined;
  return pearson(ranks(x), ranks(y));
}

export interface CorrelationCell {
  r: number | undefined;
  n: number;
}

// lag = 1: Variable A an Tag d wird mit Variable B an Tag d+1 gepaart
// (z. B. Alkohol heute ↔ Schlafqualität der Nacht danach).
export function correlate(
  entries: DayEntry[],
  a: VariableSpec,
  b: VariableSpec,
  lag: 0 | 1,
  index: CycleIndex
): CorrelationCell {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const xs: number[] = [];
  const ys: number[] = [];
  for (const e of entries) {
    const dateB = lag === 0 ? e.date : addDays(e.date, 1);
    const va = a.extract(e, e.date, index);
    const vb = b.extract(byDate.get(dateB), dateB, index);
    if (va !== undefined && vb !== undefined) {
      xs.push(va);
      ys.push(vb);
    }
  }
  return { r: spearman(xs, ys), n: xs.length };
}

export interface PhaseProfileRow {
  phase: Phase;
  mean: number | undefined;
  n: number;
}

const PROFILE_PHASES: Phase[] = ['menstruation', 'follikel', 'luteal'];

export function phaseProfile(
  entries: DayEntry[],
  variable: VariableSpec,
  index: CycleIndex
): PhaseProfileRow[] {
  const sums = new Map<Phase, { sum: number; n: number }>();
  for (const e of entries) {
    const phase = index.phaseByDate.get(e.date);
    if (!phase || phase === 'unbestimmt') continue;
    const v = variable.extract(e, e.date, index);
    if (v === undefined) continue;
    const acc = sums.get(phase) ?? { sum: 0, n: 0 };
    acc.sum += v;
    acc.n += 1;
    sums.set(phase, acc);
  }
  return PROFILE_PHASES.map((phase) => {
    const acc = sums.get(phase);
    return { phase, mean: acc && acc.n > 0 ? acc.sum / acc.n : undefined, n: acc?.n ?? 0 };
  });
}

export function meanByCycleDay(
  entries: DayEntry[],
  variable: VariableSpec,
  index: CycleIndex,
  maxDay = 40
): { day: number; mean: number; n: number }[] {
  const acc = new Map<number, { sum: number; n: number }>();
  for (const e of entries) {
    const day = index.cycleDayByDate.get(e.date);
    if (!day || day > maxDay) continue;
    const v = variable.extract(e, e.date, index);
    if (v === undefined) continue;
    const a = acc.get(day) ?? { sum: 0, n: 0 };
    a.sum += v;
    a.n += 1;
    acc.set(day, a);
  }
  return [...acc.entries()]
    .map(([day, a]) => ({ day, mean: a.sum / a.n, n: a.n }))
    .sort((a, b) => a.day - b.day);
}
