import { describe, expect, it } from 'vitest';
import { buildCycleIndex } from './cycles';
import {
  correlate,
  cycleVariables,
  habitVariable,
  meanByCycleDay,
  pairLag,
  phaseProfile,
  spearman
} from './stats';
import type { DayEntry, HabitDefinition } from './types';

const alkohol: HabitDefinition = { id: 'alkohol', name: 'Alkohol', type: 'scale4', sortOrder: 1 };
const schlaf: HabitDefinition = { id: 'schlaf', name: 'Schlafqualität', type: 'scale4', sortOrder: 2 };
const schlafdauer: HabitDefinition = { id: 'schlafdauer', name: 'Schlafdauer', type: 'scale4', sortOrder: 3 };

describe('pairLag / carryover', () => {
  it('nachwirkende Habits (Alkohol) → Lag 1', () => {
    expect(pairLag(habitVariable(alkohol), habitVariable(schlaf))).toBe(1);
  });

  it('Ergebnis-Habits (Schlafqualität) → Lag 0', () => {
    expect(pairLag(habitVariable(schlaf), habitVariable(alkohol))).toBe(0);
  });

  it('Schlafdauer ist kein Folgetag-Ziel: Vortag-Zeile × Schlafdauer entfällt', () => {
    expect(habitVariable(schlafdauer).carryoverTarget).toBe(false);
    expect(pairLag(habitVariable(alkohol), habitVariable(schlafdauer))).toBeUndefined();
  });

  it('Schlafdauer als Zeile wirkt auf denselben Tag (Lag 0)', () => {
    expect(pairLag(habitVariable(schlafdauer), habitVariable(alkohol))).toBe(0);
  });

  it('Zyklus-Variablen sind nie nachwirkend, aber gültige Folgetag-Ziele', () => {
    expect(cycleVariables().every((v) => v.carryover === false)).toBe(true);
    expect(cycleVariables().every((v) => v.carryoverTarget === true)).toBe(true);
  });

  it('unbekannte/eigene Habits sind standardmäßig nicht nachwirkend', () => {
    const custom: HabitDefinition = { id: 'kaelte_dusche', name: 'Kälte-Dusche', type: 'bool', sortOrder: 9 };
    expect(pairLag(habitVariable(custom), habitVariable(alkohol))).toBe(0);
    expect(habitVariable(custom).carryoverTarget).toBe(true);
  });
});

function day(date: string, habits: DayEntry['habits']): DayEntry {
  return { date, habits };
}

const EMPTY_INDEX = buildCycleIndex([]);

describe('spearman', () => {
  it('perfekt monoton steigend → 1', () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1);
  });

  it('perfekt monoton fallend → -1', () => {
    expect(spearman([1, 2, 3, 4], [8, 6, 4, 2])).toBeCloseTo(-1);
  });

  it('bekannter Wert mit Bindungen (Durchschnittsränge)', () => {
    expect(spearman([1, 2, 2, 4], [1, 2, 3, 4])).toBeCloseTo(0.9487, 3);
  });

  it('konstante Reihe → undefined statt Division durch null', () => {
    expect(spearman([1, 1, 1, 1], [1, 2, 3, 4])).toBeUndefined();
  });

  it('n < 3 → undefined', () => {
    expect(spearman([1, 2], [2, 1])).toBeUndefined();
  });
});

describe('correlate', () => {
  const entries = [
    day('2026-01-01', { alkohol: 4, schlaf: 4 }),
    day('2026-01-02', { alkohol: 1, schlaf: 1 }),
    day('2026-01-03', { alkohol: 3, schlaf: 4 }),
    day('2026-01-04', { alkohol: 2, schlaf: 2 }),
    day('2026-01-05', { alkohol: 1, schlaf: 3 })
  ];

  it('Lag 0 paart denselben Tag', () => {
    const cell = correlate(entries, habitVariable(alkohol), habitVariable(schlaf), 0, EMPTY_INDEX);
    expect(cell.n).toBe(5);
  });

  it('Lag 1 paart Variable B des Folgetags', () => {
    const cell = correlate(entries, habitVariable(alkohol), habitVariable(schlaf), 1, EMPTY_INDEX);
    expect(cell.n).toBe(4);
    expect(cell.r).toBeCloseTo(-1);
  });

  it('fehlende Tage reduzieren n statt als 0 einzugehen', () => {
    const sparse = [day('2026-01-01', { alkohol: 2 }), day('2026-01-02', { schlaf: 3 })];
    const cell = correlate(sparse, habitVariable(alkohol), habitVariable(schlaf), 0, EMPTY_INDEX);
    expect(cell.n).toBe(0);
    expect(cell.r).toBeUndefined();
  });
});

describe('meanByCycleDay', () => {
  it('mittelt gleiche Zyklustage über mehrere Zyklen und zählt n', () => {
    const entries: DayEntry[] = [
      { date: '2026-01-01', habits: { schlaf: 2 }, cycle: { bleeding: 'medium' } },
      { date: '2026-01-02', habits: { schlaf: 1 } },
      { date: '2026-02-01', habits: { schlaf: 4 }, cycle: { bleeding: 'medium' } }
    ];
    const index = buildCycleIndex(entries);
    const curve = meanByCycleDay(entries, habitVariable(schlaf), index);
    expect(curve[0]).toEqual({ day: 1, mean: 3, n: 2 });
    expect(curve[1]).toEqual({ day: 2, mean: 1, n: 1 });
  });
});

describe('phaseProfile', () => {
  it('mittelt pro Phase und zählt n', () => {
    const entries: DayEntry[] = [
      { date: '2026-01-01', habits: { schlaf: 1 }, cycle: { bleeding: 'medium' } },
      { date: '2026-01-02', habits: { schlaf: 3 }, cycle: { bleeding: 'light' } },
      ...['03', '04', '05', '06', '07', '08'].map((d) => ({
        date: `2026-01-${d}`,
        habits: { schlaf: 4 },
        cycle: { temperature: { value: 36.5, time: '07:00', disturbed: false, excluded: false } }
      })),
      {
        date: '2026-01-09',
        habits: { schlaf: 2 },
        cycle: { temperature: { value: 36.7, time: '07:00', disturbed: false, excluded: false } }
      },
      {
        date: '2026-01-10',
        habits: { schlaf: 2 },
        cycle: { temperature: { value: 36.75, time: '07:00', disturbed: false, excluded: false } }
      },
      {
        date: '2026-01-11',
        habits: { schlaf: 2 },
        cycle: { temperature: { value: 36.85, time: '07:00', disturbed: false, excluded: false } }
      }
    ];
    const index = buildCycleIndex(entries);
    const rows = phaseProfile(entries, habitVariable(schlaf), index);
    const menstruation = rows.find((r) => r.phase === 'menstruation')!;
    const follikel = rows.find((r) => r.phase === 'follikel')!;
    const luteal = rows.find((r) => r.phase === 'luteal')!;
    expect(menstruation.mean).toBe(2);
    expect(menstruation.n).toBe(2);
    expect(follikel.mean).toBe(4);
    expect(luteal.mean).toBe(2);
    expect(luteal.n).toBe(3);
  });
});
