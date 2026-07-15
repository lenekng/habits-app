import { describe, expect, it } from 'vitest';
import { splitSleepHabits, SCHLAFDAUER_HABIT } from './sleep-split';
import { upgradeBackupPayload, type BackupPayload } from './export';
import type { DayEntry, HabitDefinition } from './types';

const defsV2: HabitDefinition[] = [
  { id: 'alkohol', name: 'Alkohol', type: 'scale4', scaleLabels: ['viel', 'mittel', 'wenig', 'keiner'], sortOrder: 10 },
  { id: 'schlaf', name: 'Gut geschlafen', type: 'scale4', scaleLabels: ['schlecht', 'mäßig', 'gut', 'sehr gut'], sortOrder: 13 },
  { id: 'ernaehrung', name: 'Ernährung', type: 'scale4', scaleLabels: ['ungesund', 'eher ungesund', 'eher gesund', 'gesund'], sortOrder: 14 }
];

describe('splitSleepHabits', () => {
  it('benennt „Gut geschlafen" um und sortiert Schlafdauer direkt dahinter ein', () => {
    const out = splitSleepHabits(defsV2);
    const schlaf = out.find((h) => h.id === 'schlaf')!;
    const dauer = out.find((h) => h.id === 'schlafdauer')!;
    const ernaehrung = out.find((h) => h.id === 'ernaehrung')!;
    expect(schlaf.name).toBe('Schlafqualität');
    expect(schlaf.sortOrder).toBe(13);
    expect(dauer.sortOrder).toBe(14);
    expect(dauer.scaleLabels).toEqual(SCHLAFDAUER_HABIT.scaleLabels);
    expect(ernaehrung.sortOrder).toBe(15);
  });

  it('lässt selbst umbenannte schlaf-Habits unangetastet, ergänzt aber die Dauer', () => {
    const renamed = defsV2.map((h) => (h.id === 'schlaf' ? { ...h, name: 'Mein Schlaf' } : h));
    const out = splitSleepHabits(renamed);
    expect(out.find((h) => h.id === 'schlaf')!.name).toBe('Mein Schlaf');
    expect(out.some((h) => h.id === 'schlafdauer')).toBe(true);
  });

  it('legt Schlafdauer nicht doppelt an', () => {
    const once = splitSleepHabits(defsV2);
    const twice = splitSleepHabits(once);
    expect(twice.filter((h) => h.id === 'schlafdauer')).toHaveLength(1);
    expect(twice.find((h) => h.id === 'ernaehrung')!.sortOrder).toBe(15);
  });

  it('ohne schlaf-Habit passiert nichts', () => {
    const without = defsV2.filter((h) => h.id !== 'schlaf');
    expect(splitSleepHabits(without)).toEqual(without);
  });

  it('archiviertes schlaf archiviert auch die neue Schlafdauer', () => {
    const archived = defsV2.map((h) => (h.id === 'schlaf' ? { ...h, archivedAt: '2026-01-01' } : h));
    const out = splitSleepHabits(archived);
    expect(out.find((h) => h.id === 'schlafdauer')!.archivedAt).toBe('2026-01-01');
  });
});

function payload(schemaVersion: number, habits: HabitDefinition[], entries: DayEntry[]): BackupPayload {
  return {
    app: 'habits-app',
    schemaVersion,
    exportedAt: '2026-07-01T00:00:00.000Z',
    day_entries: entries,
    habit_definitions: habits,
    cycles: [],
    settings: []
  };
}

describe('upgradeBackupPayload (Schema 2 → 3)', () => {
  const entries: DayEntry[] = [{ date: '2026-01-01', habits: { alkohol: 4, schlaf: 2 } }];

  it('teilt den Schlaf-Habit auf, ohne die Polaritäts-Drehung erneut anzuwenden', () => {
    const up = upgradeBackupPayload(payload(2, defsV2, entries), 3);
    expect(up.schemaVersion).toBe(3);
    // v2-Werte sind schon gedreht — ein zweiter Flip wäre Datenverlust
    expect(up.day_entries[0]!.habits).toEqual({ alkohol: 4, schlaf: 2 });
    expect(up.habit_definitions.find((h) => h.id === 'alkohol')!.scaleLabels).toEqual([
      'viel',
      'mittel',
      'wenig',
      'keiner'
    ]);
    expect(up.habit_definitions.find((h) => h.id === 'schlaf')!.name).toBe('Schlafqualität');
    expect(up.habit_definitions.some((h) => h.id === 'schlafdauer')).toBe(true);
  });

  it('Schema 1 → 3 wendet Flip und Aufteilung an', () => {
    const defsV1 = defsV2.map((h) =>
      h.id === 'alkohol'
        ? { ...h, scaleLabels: ['keiner', 'wenig', 'mittel', 'viel'] as HabitDefinition['scaleLabels'] }
        : h
    );
    const up = upgradeBackupPayload(payload(1, defsV1, entries), 3);
    expect(up.day_entries[0]!.habits).toEqual({ alkohol: 1, schlaf: 2 });
    expect(up.habit_definitions.find((h) => h.id === 'alkohol')!.scaleLabels).toEqual([
      'viel',
      'mittel',
      'wenig',
      'keiner'
    ]);
    expect(up.habit_definitions.some((h) => h.id === 'schlafdauer')).toBe(true);
  });

  it('aktuelle Backups bleiben unverändert', () => {
    const current = payload(3, defsV2, entries);
    expect(upgradeBackupPayload(current, 3)).toBe(current);
  });
});
