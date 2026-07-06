import { describe, expect, it } from 'vitest';
import { buildCycleIndex, cycleLengthStats, detectCycles } from './cycles';
import type { Bleeding, DayEntry } from './types';

function bleedingEntry(date: string, bleeding: Bleeding): DayEntry {
  return { date, habits: {}, cycle: { bleeding } };
}

function tempEntry(date: string, value: number): DayEntry {
  return {
    date,
    habits: {},
    cycle: { temperature: { value, time: '07:00', disturbed: false, excluded: false } }
  };
}

describe('detectCycles', () => {
  it('erkennt zwei Zyklen aus zwei Blutungsepisoden', () => {
    const entries = [
      bleedingEntry('2026-01-01', 'medium'),
      bleedingEntry('2026-01-02', 'medium'),
      bleedingEntry('2026-01-03', 'light'),
      bleedingEntry('2026-01-29', 'medium'),
      bleedingEntry('2026-01-30', 'light')
    ];
    const cycles = detectCycles(entries);
    expect(cycles).toHaveLength(2);
    expect(cycles[0]!.startDate).toBe('2026-01-01');
    expect(cycles[0]!.endDate).toBe('2026-01-28');
    expect(cycles[0]!.length).toBe(28);
    expect(cycles[1]!.startDate).toBe('2026-01-29');
    expect(cycles[1]!.length).toBeUndefined();
  });

  it('Schmierblutung startet keinen Zyklus', () => {
    const entries = [
      bleedingEntry('2026-01-01', 'medium'),
      bleedingEntry('2026-01-15', 'spotting'),
      bleedingEntry('2026-01-29', 'heavy')
    ];
    expect(detectCycles(entries)).toHaveLength(2);
  });

  it('Blutungslücke von ≤ 2 Tagen bleibt eine Episode', () => {
    const entries = [
      bleedingEntry('2026-01-01', 'medium'),
      bleedingEntry('2026-01-04', 'light'),
      bleedingEntry('2026-01-29', 'medium')
    ];
    const cycles = detectCycles(entries);
    expect(cycles).toHaveLength(2);
    expect(cycles[0]!.menstruationEnd).toBe('2026-01-04');
  });

  it('Zwischenblutung nach < 15 Tagen startet keinen neuen Zyklus', () => {
    const entries = [
      bleedingEntry('2026-01-01', 'medium'),
      bleedingEntry('2026-01-10', 'light'),
      bleedingEntry('2026-01-29', 'medium')
    ];
    const cycles = detectCycles(entries);
    expect(cycles).toHaveLength(2);
    expect(cycles[1]!.startDate).toBe('2026-01-29');
  });
});

describe('buildCycleIndex', () => {
  it('weist Phasen zu, wenn ein Temperaturanstieg gefunden wird', () => {
    const entries: DayEntry[] = [
      bleedingEntry('2026-01-01', 'medium'),
      bleedingEntry('2026-01-02', 'light'),
      ...['03', '04', '05', '06', '07', '08'].map((d) => tempEntry(`2026-01-${d}`, 36.5)),
      tempEntry('2026-01-09', 36.7),
      tempEntry('2026-01-10', 36.75),
      tempEntry('2026-01-11', 36.85),
      bleedingEntry('2026-01-27', 'medium')
    ];
    const index = buildCycleIndex(entries);
    expect(index.cycles[0]!.ovulationEstimate).toBe('2026-01-08');
    expect(index.phaseByDate.get('2026-01-01')).toBe('menstruation');
    expect(index.phaseByDate.get('2026-01-05')).toBe('follikel');
    expect(index.phaseByDate.get('2026-01-08')).toBe('follikel');
    expect(index.phaseByDate.get('2026-01-09')).toBe('luteal');
    expect(index.phaseByDate.get('2026-01-26')).toBe('luteal');
    expect(index.phaseByDate.get('2026-01-27')).toBe('menstruation');
    expect(index.cycleDayByDate.get('2026-01-27')).toBe(1);
  });

  it('ohne Temperaturanstieg bleibt die Phase nach der Menstruation unbestimmt', () => {
    const entries = [bleedingEntry('2026-01-01', 'medium'), bleedingEntry('2026-01-29', 'medium')];
    const index = buildCycleIndex(entries);
    expect(index.phaseByDate.get('2026-01-10')).toBe('unbestimmt');
  });
});

describe('cycleLengthStats', () => {
  it('liefert Median, Min und Max abgeschlossener Zyklen', () => {
    const entries = [
      bleedingEntry('2026-01-01', 'medium'),
      bleedingEntry('2026-01-27', 'medium'),
      bleedingEntry('2026-02-26', 'medium'),
      bleedingEntry('2026-03-19', 'medium')
    ];
    const stats = cycleLengthStats(detectCycles(entries));
    expect(stats.n).toBe(3);
    expect(stats.min).toBe(21);
    expect(stats.max).toBe(30);
    expect(stats.median).toBe(26);
  });
});
