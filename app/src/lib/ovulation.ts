export interface TempPoint {
  date: string;
  value: number;
  excluded: boolean;
  disturbed: boolean;
}

export type TempShiftRule = 'standard' | 'ausnahme1' | 'ausnahme2';

export interface TempShiftResult {
  found: boolean;
  firstHighDay?: string;
  confirmedDay?: string;
  coverline?: number;
  rule?: TempShiftRule;
  bracketedDay?: string;
}

const EPS = 1e-9;

// Sensiplan-Temperaturauswertung (3-über-6-Regel):
// Hilfslinie = Maximum der 6 Messwerte vor der 1. höheren Messung.
// standard:  3 Werte über der Hilfslinie, der 3. um ≥ 0,2 °C darüber.
// ausnahme1: 3. Wert < 0,2 °C darüber → ein 4. Wert über der Hilfslinie genügt.
// ausnahme2: einer von 2./3. fällt auf/unter die Hilfslinie → wird ausgeklammert,
//            der 4. Wert muss ≥ 0,2 °C über der Hilfslinie liegen.
// Ausnahmen sind nicht kombinierbar. Ausgeklammerte Messungen (excluded) werden
// übersprungen, als gestört markierte zählen normal (Ausklammern ist die
// dokumentierte Nutzerentscheidung, disturbed nur die Beobachtung).
export function evaluateTempShift(points: TempPoint[]): TempShiftResult {
  const m = points
    .filter((p) => !p.excluded)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  for (let i = 6; i < m.length; i++) {
    const coverline = Math.max(...m.slice(i - 6, i).map((p) => p.value));
    if (m[i]!.value <= coverline + EPS) continue;

    const v = (k: number): number | undefined => m[i + k]?.value;
    const above = (k: number): boolean => v(k) !== undefined && v(k)! > coverline + EPS;
    const highEnough = (k: number): boolean =>
      v(k) !== undefined && v(k)! >= coverline + 0.2 - EPS;

    if (above(1) && above(2) && highEnough(2)) {
      return result(m, i, i + 2, coverline, 'standard');
    }

    if (above(1) && above(2) && !highEnough(2) && above(3)) {
      return result(m, i, i + 3, coverline, 'ausnahme1');
    }

    for (const outlier of [1, 2]) {
      const rest = [1, 2, 3].filter((k) => k !== outlier);
      if (!above(outlier) && v(outlier) !== undefined && rest.every(above) && highEnough(3)) {
        const r = result(m, i, i + 3, coverline, 'ausnahme2');
        r.bracketedDay = m[i + outlier]!.date;
        return r;
      }
    }
  }

  return { found: false };
}

function result(
  m: TempPoint[],
  firstIdx: number,
  confirmedIdx: number,
  coverline: number,
  rule: TempShiftRule
): TempShiftResult {
  return {
    found: true,
    firstHighDay: m[firstIdx]!.date,
    confirmedDay: m[confirmedIdx]!.date,
    coverline,
    rule
  };
}
