import type { Bleeding, DayEntry, HabitDefinition } from '../../../lib/types';
import { BLEEDING_ORDER, MUCUS_LABELS, MUCUS_ORDER } from '../../../lib/types';
import { addDays, toISODate, todayISO } from '../../../lib/date';
import type { CycleIndex } from '../../../lib/cycles';
import { cycleVariables, habitVariable, type VariableSpec } from '../../../lib/stats';
import { t, getLang, locale } from '../../../lib/i18n/i18n.svelte';
import type { MessageKey } from '../../../lib/i18n/messages';
import { localizedHabitName, localizedScaleLabels } from '../../../lib/i18n/habits';
import { localizeVariableSpec } from '../../../lib/i18n/variables';
import { formatDateLong } from '../../../lib/i18n/format';

const bleedingKey = (b: Bleeding): MessageKey => `bleeding.${b}` as MessageKey;

export const SERIES_COLOR = '#2a78d6';
export const GRID_COLOR = '#e1e0d9';
export const BAND_FILLS = {
  menstruation: 'rgba(243, 220, 219, 0.4)',
  luteal: 'rgba(220, 235, 225, 0.4)'
} as const;

export type RangeKey = '4w' | '3m' | 'all';

export const RANGE_OPTIONS: { key: RangeKey; labelKey: MessageKey }[] = [
  { key: '4w', labelKey: 'analyse.range4w' },
  { key: '3m', labelKey: 'analyse.range3m' },
  { key: 'all', labelKey: 'analyse.rangeAll' }
];

export interface TrendVariable {
  id: string;
  label: string;
  group: 'habit' | 'zyklus';
  kind: 'bool' | 'numeric';
  spec: VariableSpec;
  habit?: HabitDefinition;
}

export function trendVariables(habits: HabitDefinition[]): TrendVariable[] {
  const lang = getLang();
  const habitVars: TrendVariable[] = habits.map((h) => ({
    id: h.id,
    label: localizedHabitName(h, lang),
    group: 'habit',
    kind: h.type === 'bool' ? 'bool' : 'numeric',
    spec: habitVariable(h),
    habit: h
  }));
  const cycleVars: TrendVariable[] = cycleVariables()
    .filter((v) => v.id !== 'zyklustag' && v.id !== 'lutealphase')
    .map((v) => ({
      id: v.id,
      label: localizeVariableSpec(v, lang).label,
      group: 'zyklus',
      kind: 'numeric',
      spec: v
    }));
  return [...habitVars, ...cycleVars];
}

export function rangeStart(range: RangeKey, firstEntryDate: string | undefined): string | undefined {
  if (range === '4w') return addDays(todayISO(), -27);
  if (range === '3m') return addDays(todayISO(), -90);
  return firstEntryDate;
}

// Mittag statt Mitternacht als Tages-Anker, damit Sommerzeitwechsel die
// Zuordnung Punkt <-> Kalendertag nicht verschieben.
export function isoToTs(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, m! - 1, d!, 12).getTime() / 1000;
}

function tsToISO(ts: number): string {
  return toISODate(new Date(ts * 1000));
}

const HALF_DAY = 43_200;

export interface PhaseBand {
  from: number;
  to: number;
  phase: 'menstruation' | 'luteal';
}

export function phaseBands(index: CycleIndex, startISO: string, endISO: string): PhaseBand[] {
  const bands: PhaseBand[] = [];
  let current: PhaseBand | null = null;
  let d = startISO;
  while (d <= endISO) {
    const p = index.phaseByDate.get(d);
    const phase = p === 'menstruation' || p === 'luteal' ? p : null;
    if (phase) {
      const ts = isoToTs(d);
      if (current && current.phase === phase) current.to = ts + HALF_DAY;
      else {
        current = { from: ts - HALF_DAY, to: ts + HALF_DAY, phase };
        bands.push(current);
      }
    } else current = null;
    d = addDays(d, 1);
  }
  return bands;
}

function dailySeries(
  entries: DayEntry[],
  spec: VariableSpec,
  index: CycleIndex,
  startISO: string,
  endISO: string
): { xs: number[]; ys: (number | null)[] } {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const xs: number[] = [];
  const ys: (number | null)[] = [];
  let d = startISO;
  while (d <= endISO) {
    xs.push(isoToTs(d));
    const v = spec.extract(byDate.get(d), d, index);
    ys.push(v === undefined ? null : v);
    d = addDays(d, 1);
  }
  return { xs, ys };
}

function mondayOf(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const shift = (new Date(y!, m! - 1, d!).getDay() + 6) % 7;
  return addDays(iso, -shift);
}

// Wochen ohne einen einzigen erfassten Tag bleiben null (Lücke), damit
// "kein Eintrag" nicht wie "0 Ja-Tage" aussieht.
function weeklyBoolSeries(
  entries: DayEntry[],
  spec: VariableSpec,
  index: CycleIndex,
  startISO: string,
  endISO: string
): { xs: number[]; ys: (number | null)[] } {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const xs: number[] = [];
  const ys: (number | null)[] = [];
  let week = mondayOf(startISO);
  while (week <= endISO) {
    let yes = 0;
    let recorded = 0;
    for (let i = 0; i < 7; i++) {
      const d = addDays(week, i);
      if (d < startISO || d > endISO) continue;
      const v = spec.extract(byDate.get(d), d, index);
      if (v !== undefined) {
        recorded++;
        if (v === 1) yes++;
      }
    }
    xs.push(isoToTs(addDays(week, 3)));
    ys.push(recorded === 0 ? null : yes);
    week = addDays(week, 7);
  }
  return { xs, ys };
}

export interface AxisSpec {
  size: number;
  label?: string;
  splits?: number[];
  tickValues?: string[];
  tickFormat?: (v: number) => string;
  incrs?: number[];
  range?: [number, number];
}

export interface ChartConfig {
  kind: 'points' | 'bars';
  xs: number[];
  ys: (number | null)[];
  axis: AxisSpec;
  xPadSeconds: number;
  hasData: boolean;
  formatX: (ts: number) => string;
  formatValue: (v: number) => string;
}

function tickAxisSize(labels: string[]): number {
  const maxLen = Math.max(...labels.map((l) => l.length));
  return Math.round(maxLen * 6.5) + 18;
}

function weekLabel(ts: number): string {
  const iso = addDays(tsToISO(ts), -3);
  const [y, m, d] = iso.split('-').map(Number);
  const start = new Date(y!, m! - 1, d!).toLocaleDateString(locale(), {
    day: 'numeric',
    month: 'long'
  });
  return t('trends.weekOf', { start });
}

export function buildChartConfig(
  variable: TrendVariable,
  entries: DayEntry[],
  index: CycleIndex,
  startISO: string,
  endISO: string
): ChartConfig {
  if (variable.kind === 'bool') {
    const { xs, ys } = weeklyBoolSeries(entries, variable.spec, index, startISO, endISO);
    return {
      kind: 'bars',
      xs,
      ys,
      xPadSeconds: 3.5 * 86_400,
      hasData: ys.some((y) => y !== null),
      axis: {
        size: 30,
        label: t('trends.yesDaysPerWeek'),
        splits: [0, 1, 2, 3, 4, 5, 6, 7],
        tickValues: ['0', '1', '2', '3', '4', '5', '6', '7'],
        range: [0, 7.4]
      },
      formatX: weekLabel,
      formatValue: (v) => t('trends.yesDay', { v })
    };
  }

  const { xs, ys } = dailySeries(entries, variable.spec, index, startISO, endISO);
  const base = {
    kind: 'points' as const,
    xs,
    ys,
    xPadSeconds: HALF_DAY,
    hasData: ys.some((y) => y !== null),
    formatX: (ts: number) => formatDateLong(tsToISO(ts))
  };

  if (variable.id === 'temperatur') {
    return {
      ...base,
      axis: { size: 48, label: '°C', tickFormat: (v) => v.toFixed(2) },
      formatValue: (v) => `${getLang() === 'en' ? v.toFixed(2) : v.toFixed(2).replace('.', ',')} °C`
    };
  }

  if (variable.id === 'blutung') {
    const words = BLEEDING_ORDER.map((b) => t(bleedingKey(b)));
    const ticks = [t('trends.bleedSpotShort'), t('bleeding.light'), t('bleeding.medium'), t('bleeding.heavy')];
    return {
      ...base,
      axis: { size: tickAxisSize(ticks), splits: [1, 2, 3, 4], tickValues: ticks, range: [0.7, 4.3] },
      formatValue: (v) => words[v - 1] ?? String(v)
    };
  }

  if (variable.id === 'schleim') {
    const ticks = MUCUS_ORDER.map((m) => MUCUS_LABELS[m].short);
    return {
      ...base,
      axis: { size: tickAxisSize(ticks), splits: [0, 1, 2, 3, 4], tickValues: ticks, range: [-0.3, 4.3] },
      formatValue: (v) => ticks[v] ?? String(v)
    };
  }

  if (variable.habit?.type === 'scale4') {
    const labels = localizedScaleLabels(variable.habit, getLang()) ??
      variable.habit.scaleLabels ?? ['1', '2', '3', '4'];
    return {
      ...base,
      axis: { size: tickAxisSize(labels), splits: [1, 2, 3, 4], tickValues: [...labels], range: [0.7, 4.3] },
      formatValue: (v) => `${v} (${labels[v - 1] ?? '?'})`
    };
  }

  return {
    ...base,
    axis: { size: 30, label: t('trends.countPerDay'), incrs: [1, 2, 5, 10], range: [0, Math.max(2, ...ys.map((y) => y ?? 0)) + 0.5] },
    formatValue: (v) => t('trends.count', { v })
  };
}
