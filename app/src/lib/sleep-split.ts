import type { HabitDefinition } from './types';

// Schema v3: „Gut geschlafen" wird in Schlafqualität + Schlafdauer aufgeteilt.
// Qualität wird von Vortags-Faktoren beeinflusst und wirkt auf den laufenden
// Tag; Dauer ist v. a. durch Wecker/Termine bestimmt und wirkt nur auf den
// laufenden Tag (siehe NO_CARRYOVER_TARGET_IDS in stats.ts).
// Gemeinsame Quelle für die Dexie-Migration (db.ts) und das Backup-Upgrade
// (export.ts) — beide müssen identisch transformieren.

export const SCHLAF_SEED_NAME_OLD = 'Gut geschlafen';
export const SCHLAF_SEED_NAME = 'Schlafqualität';

export const SCHLAFDAUER_HABIT: Omit<HabitDefinition, 'sortOrder'> = {
  id: 'schlafdauer',
  name: 'Schlafdauer',
  type: 'scale4',
  scaleLabels: ['unter 6 h', '6–7 h', '7–8 h', 'über 8 h']
};

// Bestehende `schlaf`-Werte bleiben unverändert — sie beschreiben die Qualität.
// Umbenannt wird nur, wenn der Name noch dem alten Seed entspricht (selbst
// umbenannte Habits bleiben unangetastet). Schlafdauer wird direkt hinter
// `schlaf` einsortiert; ein archiviertes `schlaf` archiviert auch die Dauer.
export function splitSleepHabits(defs: HabitDefinition[]): HabitDefinition[] {
  const schlaf = defs.find((h) => h.id === 'schlaf');
  let out = defs.map((h) =>
    h.id === 'schlaf' && h.name === SCHLAF_SEED_NAME_OLD ? { ...h, name: SCHLAF_SEED_NAME } : h
  );
  if (schlaf && !defs.some((h) => h.id === SCHLAFDAUER_HABIT.id)) {
    out = out.map((h) => (h.sortOrder > schlaf.sortOrder ? { ...h, sortOrder: h.sortOrder + 1 } : h));
    const dauer: HabitDefinition = { ...SCHLAFDAUER_HABIT, sortOrder: schlaf.sortOrder + 1 };
    if (schlaf.archivedAt) dauer.archivedAt = schlaf.archivedAt;
    out.push(dauer);
  }
  return out;
}
