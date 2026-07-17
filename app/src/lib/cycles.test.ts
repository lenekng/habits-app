import { describe, expect, it } from 'vitest';
import { buildCycleIndex, cycleLengthStats, detectCycles, lutealLengths } from './cycles';
import type { Bleeding, DayEntry, Mucus } from './types';

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

function mucusEntry(date: string, mucus: Mucus): DayEntry {
  return { date, habits: {}, cycle: { mucus } };
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

  it('ohne Temperaturanstieg bleibt nur der laufende Zyklus unbestimmt', () => {
    const entries = [bleedingEntry('2026-01-01', 'medium'), bleedingEntry('2026-01-29', 'medium')];
    const index = buildCycleIndex(entries);
    // abgeschlossener Zyklus: rückgerechnete Phasen (siehe eigener describe-Block)
    expect(index.phaseByDate.get('2026-01-10')).toBe('follikel');
    // laufender Zyklus: rückwärts rechnen geht erst mit der nächsten Periode
    expect(index.phaseByDate.get('2026-02-05')).toBe('unbestimmt');
  });
});

describe('retrospektive Eisprung-Schätzung (abgeschlossene Zyklen ohne Anstieg)', () => {
  it('rechnet mit der Default-Lutealphase rückwärts, wenn es keine bestätigten Zyklen gibt', () => {
    const entries = [bleedingEntry('2026-01-01', 'medium'), bleedingEntry('2026-01-29', 'medium')];
    const index = buildCycleIndex(entries);
    const c = index.cycles[0]!;
    // Ende 2026-01-28, nächste Periode 01-29 → Eisprung ≈ 01-29 − 14 = 01-15
    expect(c.ovulationEstimate).toBeUndefined();
    expect(c.retroOvulationEstimate).toBe('2026-01-15');
    expect(index.phaseByDate.get('2026-01-15')).toBe('follikel');
    expect(index.phaseByDate.get('2026-01-16')).toBe('luteal');
    expect(index.phaseByDate.get('2026-01-28')).toBe('luteal');
  });

  // Zyklus mit bestätigtem Anstieg: Blutung an d0/d1, sechs tiefe Messungen
  // ab d2, drei hohe ab d8 → Eisprung = d7 (Tag vor der 1. höheren Messung)
  function confirmedCycle(d0: string): DayEntry[] {
    const day = (offset: number): string => {
      const d = new Date(Date.parse(d0) + offset * 86_400_000);
      return d.toISOString().slice(0, 10);
    };
    return [
      bleedingEntry(day(0), 'medium'),
      bleedingEntry(day(1), 'light'),
      ...[2, 3, 4, 5, 6, 7].map((o) => tempEntry(day(o), 36.5)),
      tempEntry(day(8), 36.7),
      tempEntry(day(9), 36.75),
      tempEntry(day(10), 36.85)
    ];
  }

  it('nutzt die individuelle mediane Lutealphase aus temperaturbestätigten Zyklen', () => {
    const entries = [
      // ES 2026-01-08, nächste Periode 01-20 → Lutealphase 12 Tage
      ...confirmedCycle('2026-01-01'),
      // ES 2026-01-27, nächste Periode 02-08 → Lutealphase 12 Tage
      ...confirmedCycle('2026-01-20'),
      // abgeschlossen ohne Messungen
      bleedingEntry('2026-02-08', 'medium'),
      bleedingEntry('2026-02-09', 'light'),
      bleedingEntry('2026-03-06', 'medium')
    ];
    const cycles = detectCycles(entries);
    expect(cycles[0]!.ovulationEstimate).toBe('2026-01-08');
    expect(cycles[1]!.ovulationEstimate).toBe('2026-01-27');
    expect(lutealLengths(cycles)).toEqual([12, 12]);
    // Ende 2026-03-05, nächste Periode 03-06 → Eisprung ≈ 03-06 − 12 = 02-22
    expect(cycles[2]!.retroOvulationEstimate).toBe('2026-02-22');
  });

  it('Schleim-Höhepunkt gewinnt, wenn er nahe an der Rückrechnung liegt', () => {
    const entries = [
      bleedingEntry('2026-01-01', 'medium'),
      mucusEntry('2026-01-13', 'S+'),
      bleedingEntry('2026-01-29', 'medium')
    ];
    const index = buildCycleIndex(entries);
    expect(index.cycles[0]!.retroOvulationEstimate).toBe('2026-01-13');
    expect(index.phaseByDate.get('2026-01-13')).toBe('follikel');
    expect(index.phaseByDate.get('2026-01-14')).toBe('luteal');
  });

  it('weit entfernter Schleim-Höhepunkt wird ignoriert', () => {
    const entries = [
      bleedingEntry('2026-01-01', 'medium'),
      mucusEntry('2026-01-05', 'S+'),
      bleedingEntry('2026-01-29', 'medium')
    ];
    const index = buildCycleIndex(entries);
    expect(index.cycles[0]!.retroOvulationEstimate).toBe('2026-01-15');
  });

  it('Rückrechnung wird nie vor das Menstruationsende gelegt', () => {
    // Zykluslänge 15, Menstruation bis 01-03: 01-16 − 14 = 01-02 läge davor
    const entries = [
      bleedingEntry('2026-01-01', 'medium'),
      bleedingEntry('2026-01-02', 'medium'),
      bleedingEntry('2026-01-03', 'light'),
      bleedingEntry('2026-01-16', 'medium')
    ];
    const index = buildCycleIndex(entries);
    expect(index.cycles[0]!.retroOvulationEstimate).toBe('2026-01-03');
    expect(index.phaseByDate.get('2026-01-03')).toBe('menstruation');
    expect(index.phaseByDate.get('2026-01-04')).toBe('luteal');
  });

  it('rückgerechnete Zyklen fließen nicht in die Luteal-Statistik der Vorhersage ein', () => {
    const entries = [
      bleedingEntry('2026-01-01', 'medium'),
      bleedingEntry('2026-01-29', 'medium'),
      bleedingEntry('2026-02-26', 'medium')
    ];
    const cycles = detectCycles(entries);
    expect(cycles[0]!.retroOvulationEstimate).toBeDefined();
    expect(lutealLengths(cycles)).toEqual([]);
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

  it('interpoliert den Median bei gerader Zyklusanzahl', () => {
    const entries = [
      bleedingEntry('2026-01-01', 'medium'),
      bleedingEntry('2026-01-22', 'medium'),
      bleedingEntry('2026-02-17', 'medium'),
      bleedingEntry('2026-03-19', 'medium'),
      bleedingEntry('2026-04-21', 'medium')
    ];
    const stats = cycleLengthStats(detectCycles(entries));
    expect(stats.n).toBe(4);
    expect(stats.min).toBe(21);
    expect(stats.max).toBe(33);
    expect(stats.median).toBe(28);
  });
});
