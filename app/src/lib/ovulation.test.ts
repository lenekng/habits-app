import { describe, expect, it } from 'vitest';
import { evaluateTempShift, type TempPoint } from './ovulation';

function series(values: (number | null)[], startDay = 1): TempPoint[] {
  return values.flatMap((v, i) =>
    v === null
      ? []
      : [
          {
            date: `2026-01-${String(startDay + i).padStart(2, '0')}`,
            value: v,
            excluded: false,
            disturbed: false
          }
        ]
  );
}

const LOW6 = [36.5, 36.55, 36.5, 36.45, 36.5, 36.55];

describe('evaluateTempShift', () => {
  it('Standardregel: 3 Werte über Hilfslinie, dritter ≥ 0,2 °C darüber', () => {
    const r = evaluateTempShift(series([...LOW6, 36.7, 36.75, 36.8]));
    expect(r.found).toBe(true);
    expect(r.rule).toBe('standard');
    expect(r.firstHighDay).toBe('2026-01-07');
    expect(r.confirmedDay).toBe('2026-01-09');
    expect(r.coverline).toBeCloseTo(36.55);
  });

  it('Ausnahme 1: dritter Wert zu niedrig, vierter über Hilfslinie genügt', () => {
    const r = evaluateTempShift(series([...LOW6, 36.65, 36.7, 36.7, 36.6]));
    expect(r.found).toBe(true);
    expect(r.rule).toBe('ausnahme1');
    expect(r.confirmedDay).toBe('2026-01-10');
  });

  it('Ausnahme 2: ein Ausreißer auf/unter der Hilfslinie wird ausgeklammert', () => {
    const r = evaluateTempShift(series([...LOW6, 36.7, 36.5, 36.7, 36.8]));
    expect(r.found).toBe(true);
    expect(r.rule).toBe('ausnahme2');
    expect(r.bracketedDay).toBe('2026-01-08');
    expect(r.confirmedDay).toBe('2026-01-10');
  });

  it('Ausnahme 2 gilt nicht, wenn der vierte Wert < 0,2 °C darüber liegt', () => {
    const r = evaluateTempShift(series([...LOW6, 36.7, 36.5, 36.7, 36.65]));
    expect(r.found).toBe(false);
  });

  it('kein Anstieg bei monotoner Tieflage', () => {
    const r = evaluateTempShift(series([...LOW6, 36.5, 36.52, 36.48, 36.5]));
    expect(r.found).toBe(false);
  });

  it('ausgeklammerte Werte werden übersprungen und zählen nicht als Vorwerte', () => {
    const pts = series([...LOW6, 36.9, 36.7, 36.75, 36.8]);
    pts[6]!.excluded = true;
    const r = evaluateTempShift(pts);
    expect(r.found).toBe(true);
    expect(r.firstHighDay).toBe('2026-01-08');
    expect(r.coverline).toBeCloseTo(36.55);
  });

  it('weniger als 7 Messwerte → keine Auswertung', () => {
    const r = evaluateTempShift(series([36.5, 36.5, 36.5, 36.7, 36.75, 36.8]));
    expect(r.found).toBe(false);
  });

  it('erste höhere Messung muss strikt über der Hilfslinie liegen', () => {
    const r = evaluateTempShift(series([...LOW6, 36.55, 36.75, 36.8, 36.85]));
    expect(r.found).toBe(true);
    expect(r.firstHighDay).toBe('2026-01-08');
  });
});
