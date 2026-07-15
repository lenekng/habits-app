import type { DayEntry, HabitDefinition } from './types';
import type { CycleIndex } from './cycles';
import { addDays } from './date';
import { cycleVariables, habitVariable, spearman } from './stats';

// Automatisch geprüfte, sehr eindeutige Muster für das Auffälligkeiten-Panel:
//
// 1. Einseitige Implikationen: Bedingung a (z. B. „Erkältung: ja") zieht fast
//    immer Folge b nach sich (z. B. „Sport: nein"), während umgekehrt b kaum
//    auf a schließen lässt. Korrelation ist symmetrisch und kann das nicht
//    abbilden — hier werden stattdessen bedingte Häufigkeiten P(b|a) und
//    P(a|b) verglichen. Implikationen beziehen sich immer auf denselben Tag.
//
// 2. Beidseitige Korrelationen: starke monotone Zusammenhänge (Spearman) über
//    alle Paare aus Habits und Zyklus-Variablen — wie die Korrelationsmatrix,
//    nur ohne manuelle Auswahl und mit strengen Schwellen. Carryover-Habits
//    werden wie dort mit dem Folgetag gepaart.

export type CondSide = 'high' | 'low';

export interface ImplicationThresholds {
  // Tage, an denen beide Variablen bestimmbar sind — Untergrenze pro Paar
  minPairDays: number;
  // Mindest-Vorkommen der Bedingung UND der Gegen-Tage (sonst keine Basisrate)
  minCondDays: number;
  // P(b|a): wie zuverlässig die Folge eintritt
  minConfidence: number;
  // P(a|b)-Obergrenze — darüber wäre der Zusammenhang beidseitig, also ein
  // Fall für die Korrelations-Befunde und kein einseitiger
  maxReverse: number;
  // P(b|a) − P(b|¬a): Folge muss deutlich über der Basisrate liegen, sonst ist
  // „a ⇒ b" trivial, weil b ohnehin fast immer gilt
  minContrast: number;
  // Signifikanzniveau; wird durch die Zahl der geprüften Paare geteilt
  // (Bonferroni), damit bei vielen Paaren keine Zufallsfunde durchrutschen
  alpha: number;
}

export const DEFAULT_THRESHOLDS: ImplicationThresholds = {
  minPairDays: 60,
  minCondDays: 8,
  minConfidence: 0.9,
  maxReverse: 0.65,
  minContrast: 0.25,
  alpha: 0.05
};

export interface ImplicationFinding {
  aId: string;
  aSide: CondSide;
  bId: string;
  bSide: CondSide;
  nPair: number; // gemeinsam bestimmbare Tage
  nA: number; // Tage mit Bedingung a
  nAB: number; // davon: Folge b traf ebenfalls zu
  nB: number; // Tage mit b insgesamt
  confForward: number; // P(b|a)
  confReverse: number; // P(a|b)
  baseline: number; // P(b|¬a)
  p: number; // einseitiger exakter Fisher-Test
}

// Binarisierung: scale4 teilt in untere (1–2) und obere Hälfte (3–4); bool und
// choice werden zu ja/nein. An einem Tag, an dem überhaupt Habits erfasst
// wurden, zählt ein fehlender Haken bei bool/choice als „nein" — sonst gäbe es
// praktisch keine Nein-Tage (niemand hakt täglich alles Nicht-Zutreffende ab)
// und Muster wie „krank ⇒ kein Sport" wären unauffindbar. Tage ganz ohne
// Habit-Einträge (z. B. nur Temperatur erfasst) bleiben außen vor.
export function binaryHabitValue(
  habit: HabitDefinition,
  entry: DayEntry | undefined
): boolean | undefined {
  // entry.habits kann bei Alt-Datensätzen fehlen (siehe Guard in der
  // db.ts-Migration) — solche Tage zählen wie Tage ohne Habit-Einträge
  if (!entry?.habits || Object.keys(entry.habits).length === 0) return undefined;
  const v = entry.habits[habit.id];
  if (habit.type === 'scale4') return typeof v === 'number' ? v >= 3 : undefined;
  if (habit.type === 'bool') return typeof v === 'boolean' ? v : false;
  return Array.isArray(v) ? v.length > 0 : false;
}

const LOG_FACT: number[] = [0];

function logFact(n: number): number {
  for (let i = LOG_FACT.length; i <= n; i++) LOG_FACT[i] = LOG_FACT[i - 1]! + Math.log(i);
  return LOG_FACT[n]!;
}

function logChoose(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  return logFact(n) - logFact(k) - logFact(n - k);
}

// P(X ≥ k) für X ~ hypergeometrisch(N Tage gesamt, davon K mit Eigenschaft b,
// n gezogene Bedingungs-Tage) — einseitiger exakter Fisher-Test.
export function hypergeomTail(k: number, K: number, n: number, N: number): number {
  const logDenom = logChoose(N, n);
  let p = 0;
  for (let i = Math.max(k, n - (N - K)); i <= Math.min(K, n); i++) {
    p += Math.exp(logChoose(K, i) + logChoose(N - K, n - i) - logDenom);
  }
  return Math.min(1, p);
}

interface Candidate extends ImplicationFinding {
  pairKey: string;
}

export function findImplications(
  entries: DayEntry[],
  habits: HabitDefinition[],
  th: ImplicationThresholds = DEFAULT_THRESHOLDS
): ImplicationFinding[] {
  const candidates: Candidate[] = [];
  const testedPairs = new Set<string>();

  for (let i = 0; i < habits.length; i++) {
    for (let j = i + 1; j < habits.length; j++) {
      const ha = habits[i]!;
      const hb = habits[j]!;
      const pairs: [boolean, boolean][] = [];
      for (const e of entries) {
        const va = binaryHabitValue(ha, e);
        const vb = binaryHabitValue(hb, e);
        if (va !== undefined && vb !== undefined) pairs.push([va, vb]);
      }
      if (pairs.length < th.minPairDays) continue;

      const pairKey = `${ha.id}|${hb.id}`;
      // alle 8 gerichteten Bedingungs-Kombinationen des Paars
      for (const antecedentOnA of [true, false]) {
        for (const aSide of ['high', 'low'] as const) {
          for (const bSide of ['high', 'low'] as const) {
            const aHolds = (p: [boolean, boolean]) =>
              (antecedentOnA ? p[0] : p[1]) === (aSide === 'high');
            const bHolds = (p: [boolean, boolean]) =>
              (antecedentOnA ? p[1] : p[0]) === (bSide === 'high');
            const nPair = pairs.length;
            const nA = pairs.filter(aHolds).length;
            const nB = pairs.filter(bHolds).length;
            const nAB = pairs.filter((p) => aHolds(p) && bHolds(p)).length;
            // Beide Seiten müssen ausreichend variieren. Kombinationen mit
            // (fast) konstanter Folge haben keine Teststärke (p ≈ 1, Kontrast
            // ≈ 0) und würden nur die Bonferroni-Korrektur aufblähen — etwa
            // durch nie angehakte Ja/Nein-Habits, die als konstant „nein"
            // zählen.
            if (nA < th.minCondDays || nPair - nA < th.minCondDays) continue;
            if (nB < th.minCondDays || nPair - nB < th.minCondDays) continue;
            testedPairs.add(pairKey);
            candidates.push({
              pairKey,
              aId: antecedentOnA ? ha.id : hb.id,
              aSide,
              bId: antecedentOnA ? hb.id : ha.id,
              bSide,
              nPair,
              nA,
              nAB,
              nB,
              confForward: nAB / nA,
              confReverse: nAB / nB,
              baseline: (nB - nAB) / (nPair - nA),
              p: hypergeomTail(nAB, nB, nA, nPair)
            });
          }
        }
      }
    }
  }

  // Bonferroni über die Zahl der geprüften Paare (nicht der Kombinationen —
  // die 8 Kombinationen eines Paars beruhen auf derselben Vierfeldertafel und
  // sind stark abhängig; pro Paar wird ohnehin nur ein Befund gemeldet).
  const pCut = th.alpha / Math.max(1, testedPairs.size);
  const passing = candidates.filter(
    (f) =>
      f.confForward >= th.minConfidence &&
      f.confReverse <= th.maxReverse &&
      f.confForward - f.baseline >= th.minContrast &&
      f.p <= pCut
  );

  // pro Variablen-Paar nur den stärksten Befund behalten — die übrigen
  // Kombinationen sind meist Umformulierungen desselben Musters
  const bestByPair = new Map<string, Candidate>();
  for (const f of passing) {
    const cur = bestByPair.get(f.pairKey);
    if (
      !cur ||
      f.p < cur.p ||
      (f.p === cur.p && (f.confForward > cur.confForward || (f.confForward === cur.confForward && f.nA > cur.nA)))
    ) {
      bestByPair.set(f.pairKey, f);
    }
  }

  return [...bestByPair.values()]
    .sort((a, b) => a.p - b.p)
    .map(({ pairKey: _k, ...finding }) => finding);
}

export interface CorrelationThresholds {
  // Tage, an denen beide Variablen bestimmbar sind — Untergrenze pro Paar
  minPairDays: number;
  // jede Reihe muss über den häufigsten Wert hinaus so viele Tage variieren,
  // sonst hat der Test keine Aussagekraft und bläht nur die Korrektur auf
  minVariedDays: number;
  // Effektstärke-Schwelle: erst ab dieser Rangkorrelation „sehr eindeutig"
  minAbsRho: number;
  // Signifikanzniveau; wird durch die Zahl der geprüften Paare geteilt
  alpha: number;
}

export const DEFAULT_CORRELATION_THRESHOLDS: CorrelationThresholds = {
  minPairDays: 60,
  minVariedDays: 8,
  minAbsRho: 0.6,
  alpha: 0.05
};

export interface CorrelationFinding {
  aId: string; // führende Variable (bei lagged: der Vortag)
  bId: string;
  lagged: boolean;
  rho: number;
  n: number;
  p: number;
}

// Zweiseitiges p für Spearman-ρ über die Fisher-z-Näherung
// (z = atanh(ρ)·√((n−3)/1.06)); Normalverteilung per erf-Näherung
// nach Abramowitz/Stegun 7.1.26.
export function spearmanP(rho: number, n: number): number {
  if (n < 4) return 1;
  if (Math.abs(rho) >= 1) return 0;
  const z = Math.abs(Math.atanh(rho)) * Math.sqrt((n - 3) / 1.06);
  const x = z / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return Math.max(0, 1 - erf);
}

// Werte-Extraktion für den Korrelations-Scan: scale4 behält die 1–4-Skala,
// bool/choice werden 0/1 mit derselben „fehlender Haken = nein"-Regel wie bei
// den Implikationen (siehe binaryHabitValue).
function correlationValue(habit: HabitDefinition, entry: DayEntry | undefined): number | undefined {
  if (habit.type === 'scale4') {
    if (!entry?.habits || Object.keys(entry.habits).length === 0) return undefined;
    const v = entry.habits[habit.id];
    return typeof v === 'number' ? v : undefined;
  }
  const b = binaryHabitValue(habit, entry);
  return b === undefined ? undefined : b ? 1 : 0;
}

function varies(values: number[], minOther: number): boolean {
  const counts = new Map<number, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return values.length - Math.max(...counts.values()) >= minOther;
}

interface ScanVariable {
  id: string;
  carryover: boolean;
  carryoverTarget: boolean;
  isCycle: boolean;
  extract: (entry: DayEntry | undefined, date: string, index: CycleIndex) => number | undefined;
}

export function findStrongCorrelations(
  entries: DayEntry[],
  habits: HabitDefinition[],
  index: CycleIndex,
  th: CorrelationThresholds = DEFAULT_CORRELATION_THRESHOLDS
): CorrelationFinding[] {
  const byDate = new Map(entries.map((e) => [e.date, e]));
  const vars: ScanVariable[] = [
    ...habits.map((h) => {
      const spec = habitVariable(h);
      return {
        id: h.id,
        carryover: spec.carryover,
        carryoverTarget: spec.carryoverTarget,
        isCycle: false,
        extract: (entry: DayEntry | undefined) => correlationValue(h, entry)
      };
    }),
    ...cycleVariables().map((v) => ({
      id: v.id,
      carryover: false,
      carryoverTarget: v.carryoverTarget,
      isCycle: true,
      extract: v.extract
    }))
  ];

  const candidates: (CorrelationFinding & { pairKey: string })[] = [];
  let tested = 0;
  for (let i = 0; i < vars.length; i++) {
    for (let j = i + 1; j < vars.length; j++) {
      const va = vars[i]!;
      const vb = vars[j]!;
      // Zyklus-Variablen untereinander sind strukturell gekoppelt (Zyklustag,
      // Lutealphase, Temperatur hängen per Definition zusammen) — solche
      // Befunde wären trivial
      if (va.isCycle && vb.isCycle) continue;
      // carryover-Habits werden wie in der Korrelationsmatrix (pairLag) mit
      // dem Folgetag der anderen Variable gepaart (z. B. Alkohol → Schlaf-
      // qualität danach) — außer die andere Seite ist kein carryover-Ziel
      // (Schlafdauer), dann bleibt das Paar beim selben Tag. Sind beide
      // carryover, prüft die Matrix beide Lag-Richtungen — hier genauso;
      // behalten wird unten der stärkste Befund des Paars.
      const aLeads = va.carryover && vb.carryoverTarget;
      const bLeads = vb.carryover && va.carryoverTarget;
      const lagged = aLeads || bLeads;
      const orientations: [ScanVariable, ScanVariable][] =
        aLeads && bLeads
          ? [
              [va, vb],
              [vb, va]
            ]
          : bLeads
            ? [[vb, va]]
            : [[va, vb]];

      for (const [lead, follow] of orientations) {
        const xs: number[] = [];
        const ys: number[] = [];
        for (const e of entries) {
          const x = lead.extract(e, e.date, index);
          const dateB = lagged ? addDays(e.date, 1) : e.date;
          const y = follow.extract(lagged ? byDate.get(dateB) : e, dateB, index);
          if (x !== undefined && y !== undefined) {
            xs.push(x);
            ys.push(y);
          }
        }
        if (xs.length < th.minPairDays) continue;
        if (!varies(xs, th.minVariedDays) || !varies(ys, th.minVariedDays)) continue;
        const rho = spearman(xs, ys);
        if (rho === undefined) continue;
        tested++;
        candidates.push({
          pairKey: `${va.id}|${vb.id}`,
          aId: lead.id,
          bId: follow.id,
          lagged,
          rho,
          n: xs.length,
          p: spearmanP(rho, xs.length)
        });
      }
    }
  }

  const pCut = th.alpha / Math.max(1, tested);
  const passing = candidates.filter((c) => Math.abs(c.rho) >= th.minAbsRho && c.p <= pCut);

  // pro Variablen-Paar nur die stärkste Lag-Richtung behalten
  const bestByPair = new Map<string, (typeof passing)[number]>();
  for (const c of passing) {
    const cur = bestByPair.get(c.pairKey);
    if (
      !cur ||
      Math.abs(c.rho) > Math.abs(cur.rho) ||
      (Math.abs(c.rho) === Math.abs(cur.rho) && c.n > cur.n)
    ) {
      bestByPair.set(c.pairKey, c);
    }
  }

  return [...bestByPair.values()]
    .sort((a, b) => Math.abs(b.rho) - Math.abs(a.rho))
    .map(({ pairKey: _k, ...finding }) => finding);
}

export interface Insights {
  implications: ImplicationFinding[];
  correlations: CorrelationFinding[];
}

// Gesamtscan für das Panel. Paare, die schon als einseitige Implikation
// gemeldet werden, tauchen nicht zusätzlich als gleichtägige Korrelation auf —
// die Implikation ist dann die spezifischere Aussage. Eine Vortag-Korrelation
// desselben Paars bleibt aber stehen: Implikationen vergleichen immer
// denselben Tag, das Lag-Paar ist eine inhaltlich andere Beobachtung.
export function findInsights(
  entries: DayEntry[],
  habits: HabitDefinition[],
  index: CycleIndex,
  thImpl: ImplicationThresholds = DEFAULT_THRESHOLDS,
  thCorr: CorrelationThresholds = DEFAULT_CORRELATION_THRESHOLDS
): Insights {
  const implications = findImplications(entries, habits, thImpl);
  const covered = new Set(implications.map((f) => [f.aId, f.bId].sort().join('|')));
  const correlations = findStrongCorrelations(entries, habits, index, thCorr).filter(
    (c) => c.lagged || !covered.has([c.aId, c.bId].sort().join('|'))
  );
  return { implications, correlations };
}
