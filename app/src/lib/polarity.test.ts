import { describe, expect, it } from 'vitest';
import { flipScale4Value } from './polarity';
import { upgradeBackupPayload, type BackupPayload } from './export';
import type { DayEntry, HabitDefinition } from './types';

describe('flipScale4Value', () => {
  it('spiegelt 1..4 an 5', () => {
    expect(flipScale4Value(1)).toBe(4);
    expect(flipScale4Value(2)).toBe(3);
    expect(flipScale4Value(3)).toBe(2);
    expect(flipScale4Value(4)).toBe(1);
  });

  it('lässt Nicht-Zahlen und Werte außerhalb 1..4 unangetastet', () => {
    expect(flipScale4Value(true)).toBe(true);
    expect(flipScale4Value(['Gym'])).toEqual(['Gym']);
    expect(flipScale4Value(0)).toBe(0);
    expect(flipScale4Value(undefined)).toBe(undefined);
  });
});

describe('upgradeBackupPayload (Schema 1 → 2)', () => {
  const oldPayload = (): BackupPayload => ({
    app: 'habits-app',
    schemaVersion: 1,
    exportedAt: '2026-01-01T00:00:00.000Z',
    day_entries: [
      { date: '2026-01-01', habits: { alkohol: 1, stress: 4, schlaf: 2, gv: true } } as DayEntry,
      { date: '2026-01-02', habits: { alkohol: 4, ernaehrung: 1 } } as DayEntry
    ],
    habit_definitions: [
      {
        id: 'alkohol',
        name: 'Alkohol',
        type: 'scale4',
        scaleLabels: ['keiner', 'wenig', 'mittel', 'viel'],
        sortOrder: 10
      } as HabitDefinition,
      {
        id: 'ernaehrung',
        name: 'Ernährung',
        type: 'scale4',
        scaleLabels: ['ungesund', 'eher ungesund', 'eher gesund', 'gesund'],
        sortOrder: 14
      } as HabitDefinition
    ],
    cycles: [],
    settings: []
  });

  it('dreht nur alkohol/stress-Werte, andere Habits bleiben', () => {
    const up = upgradeBackupPayload(oldPayload(), 2);
    expect(up.schemaVersion).toBe(2);
    expect(up.day_entries[0]!.habits).toEqual({ alkohol: 4, stress: 1, schlaf: 2, gv: true });
    expect(up.day_entries[1]!.habits).toEqual({ alkohol: 1, ernaehrung: 1 });
  });

  it('reversed die Labels von alkohol, lässt ernaehrung unverändert', () => {
    const up = upgradeBackupPayload(oldPayload(), 2);
    const alk = up.habit_definitions.find((h) => h.id === 'alkohol')!;
    const ern = up.habit_definitions.find((h) => h.id === 'ernaehrung')!;
    expect(alk.scaleLabels).toEqual(['viel', 'mittel', 'wenig', 'keiner']);
    expect(ern.scaleLabels).toEqual(['ungesund', 'eher ungesund', 'eher gesund', 'gesund']);
  });

  it('ist idempotent — Schema ≥ Ziel bleibt unverändert', () => {
    const already = { ...oldPayload(), schemaVersion: 2 };
    expect(upgradeBackupPayload(already, 2)).toBe(already);
  });
});
