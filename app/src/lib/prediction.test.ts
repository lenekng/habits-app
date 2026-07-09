import { describe, expect, it } from 'vitest';
import { completedLengths, lutealLengths, predictNextPeriod, quantile } from './prediction';
import type { CycleInfo } from './cycles';

function cycle(startDate: string, length?: number, ovulationEstimate?: string): CycleInfo {
  const c: CycleInfo = {
    startDate,
    menstruationEnd: startDate,
    tempShift: { found: ovulationEstimate !== undefined },
    length
  };
  if (ovulationEstimate) c.ovulationEstimate = ovulationEstimate;
  return c;
}

describe('quantile', () => {
  it('Median bei ungerader Länge', () => {
    expect(quantile([21, 28, 35], 0.5)).toBe(28);
  });
  it('interpoliert linear', () => {
    expect(quantile([20, 30], 0.5)).toBe(25);
  });
  it('Ränder', () => {
    expect(quantile([21, 24, 28, 35], 0)).toBe(21);
    expect(quantile([21, 24, 28, 35], 1)).toBe(35);
  });
});

describe('completedLengths / lutealLengths', () => {
  it('nimmt nur plausible abgeschlossene Längen', () => {
    const cs = [cycle('2026-01-01', 28), cycle('2026-01-29', 200), cycle('2026-02-26')];
    expect(completedLengths(cs)).toEqual([28]);
  });

  it('berechnet Lutealphasen aus Eisprung und Folgezyklus', () => {
    const cs = [
      cycle('2026-01-01', 28, '2026-01-15'),
      cycle('2026-01-29', 30, '2026-02-12'),
      cycle('2026-02-28')
    ];
    // 2026-01-15 → 2026-01-29 = 14; 2026-02-12 → 2026-02-28 = 16
    expect(lutealLengths(cs)).toEqual([14, 16]);
  });
});

describe('predictNextPeriod – Längen-Methode', () => {
  const cs = [
    cycle('2026-01-01', 28),
    cycle('2026-01-29', 26),
    cycle('2026-02-24', 30),
    cycle('2026-03-26', 22),
    cycle('2026-04-17', 34),
    cycle('2026-05-21') // laufend, Start
  ];

  it('sagt aus den Zykluslängen ein Fenster voraus', () => {
    const p = predictNextPeriod(cs, '2026-06-01');
    expect(p.method).toBe('length');
    expect(p.basedOnCycles).toBe(5);
    // Median-Länge 28 → 2026-05-21 + 28 = 2026-06-18
    expect(p.likelyDate).toBe('2026-06-18');
    expect(p.earliestDate! <= p.likelyDate!).toBe(true);
    expect(p.likelyDate! <= p.latestDate!).toBe(true);
    expect(p.daysUntilLikely).toBe(17);
    expect(p.overdueDays).toBe(0);
  });

  it('erkennt Überfälligkeit', () => {
    const p = predictNextPeriod(cs, '2026-07-10');
    expect(p.overdueDays).toBeGreaterThan(0);
    expect(p.daysUntilLikely).toBeLessThan(0);
  });

  it('zu wenige Zyklen → keine Vorhersage', () => {
    const p = predictNextPeriod([cycle('2026-01-01', 28), cycle('2026-01-29')], '2026-02-05');
    expect(p.method).toBe('none');
    expect(p.reason?.key).toBe('pred.reasonNeedCycles');
    expect(p.reason?.params?.min).toBe(3);
  });
});

describe('predictNextPeriod – Temperatur-Methode', () => {
  it('nutzt die individuelle Lutealphase nach bestätigtem Anstieg', () => {
    const cs = [
      cycle('2026-01-01', 28, '2026-01-15'),
      cycle('2026-01-29', 30, '2026-02-12'),
      cycle('2026-02-28', 27, '2026-03-14'),
      cycle('2026-03-27', undefined, '2026-04-11') // laufend, Eisprung erkannt
    ];
    const p = predictNextPeriod(cs, '2026-04-14');
    expect(p.method).toBe('temperature');
    expect(p.usedDefaultLuteal).toBe(false);
    // Lutealphasen: 14, 16, 13 → Median 14 → 2026-04-11 + 14 = 2026-04-25
    expect(p.likelyDate).toBe('2026-04-25');
    expect(p.basedOnCycles).toBe(3);
  });

  it('fällt ohne historische Lutealdaten auf 14 Tage zurück', () => {
    const cs = [cycle('2026-01-01', 28), cycle('2026-01-29', undefined, '2026-02-12')];
    const p = predictNextPeriod(cs, '2026-02-15');
    expect(p.method).toBe('temperature');
    expect(p.usedDefaultLuteal).toBe(true);
    expect(p.likelyDate).toBe('2026-02-26');
  });
});
