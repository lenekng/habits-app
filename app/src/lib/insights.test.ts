import { describe, expect, it } from 'vitest';
import { buildCycleIndex } from './cycles';
import {
  binaryHabitValue,
  findImplications,
  findInsights,
  findStrongCorrelations,
  hypergeomTail,
  spearmanP
} from './insights';
import type { DayEntry, HabitDefinition } from './types';

const erkaeltung: HabitDefinition = { id: 'erkaeltung', name: 'Erkältung', type: 'bool', sortOrder: 1 };
const sport: HabitDefinition = {
  id: 'sport',
  name: 'Sport',
  type: 'choice',
  choices: ['Gym', 'Laufen'],
  sortOrder: 2
};
const schlaf: HabitDefinition = {
  id: 'schlaf',
  name: 'Gut geschlafen',
  type: 'scale4',
  scaleLabels: ['schlecht', 'mäßig', 'gut', 'sehr gut'],
  sortOrder: 3
};
const stress: HabitDefinition = {
  id: 'stress',
  name: 'Stress',
  type: 'scale4',
  scaleLabels: ['sehr viel', 'viel', 'mittel', 'wenig'],
  sortOrder: 4
};
const ernaehrung: HabitDefinition = {
  id: 'ernaehrung',
  name: 'Ernährung',
  type: 'scale4',
  scaleLabels: ['ungesund', 'eher ungesund', 'eher gesund', 'gesund'],
  sortOrder: 5
};
const alkohol: HabitDefinition = {
  id: 'alkohol',
  name: 'Alkohol',
  type: 'scale4',
  scaleLabels: ['viel', 'mittel', 'wenig', 'keiner'],
  sortOrder: 6
};
const gefuehle: HabitDefinition = {
  id: 'gefuehle',
  name: 'Gefühle',
  type: 'scale4',
  scaleLabels: ['schlecht', 'eher schlecht', 'eher gut', 'gut'],
  sortOrder: 7
};

const EMPTY_INDEX = buildCycleIndex([]);

function isoDay(i: number): string {
  const d = new Date(Date.UTC(2026, 0, 1 + i));
  return d.toISOString().slice(0, 10);
}

function day(i: number, habits: DayEntry['habits']): DayEntry {
  return { date: isoDay(i), habits };
}

describe('hypergeomTail', () => {
  it('Tea-Tasting-Beispiel: P(X ≥ 4) bei N=8, K=4, n=4 ist 1/70', () => {
    expect(hypergeomTail(4, 4, 4, 8)).toBeCloseTo(1 / 70, 6);
  });

  it('P(X ≥ 3) bei N=8, K=4, n=4 ist 17/70', () => {
    expect(hypergeomTail(3, 4, 4, 8)).toBeCloseTo(17 / 70, 6);
  });

  it('P(X ≥ 0) ist 1', () => {
    expect(hypergeomTail(0, 4, 4, 8)).toBeCloseTo(1, 9);
  });
});

describe('spearmanP', () => {
  it('ρ = 0 → p = 1', () => {
    expect(spearmanP(0, 100)).toBeCloseTo(1, 6);
  });

  it('starke Korrelation bei n = 60 ist hochsignifikant', () => {
    expect(spearmanP(0.6, 60)).toBeLessThan(1e-5);
  });

  it('bekannter Wert: ρ = 0.25 bei n = 60', () => {
    expect(spearmanP(0.25, 60)).toBeCloseTo(0.061, 2);
  });

  it('symmetrisch in ρ, Grenzfälle abgesichert', () => {
    expect(spearmanP(-0.4, 80)).toBeCloseTo(spearmanP(0.4, 80), 12);
    expect(spearmanP(1, 60)).toBe(0);
    expect(spearmanP(0.9, 3)).toBe(1);
  });
});

describe('binaryHabitValue', () => {
  const entry = day(0, { erkaeltung: true, schlaf: 2, sport: ['Gym'] });

  it('bool: erfasster Wert zählt direkt', () => {
    expect(binaryHabitValue(erkaeltung, entry)).toBe(true);
    expect(binaryHabitValue(erkaeltung, day(0, { erkaeltung: false, schlaf: 1 }))).toBe(false);
  });

  it('bool/choice: fehlender Haken an einem erfassten Tag zählt als nein', () => {
    const tracked = day(0, { schlaf: 3 });
    expect(binaryHabitValue(erkaeltung, tracked)).toBe(false);
    expect(binaryHabitValue(sport, tracked)).toBe(false);
  });

  it('scale4: 1–2 ist low, 3–4 high; fehlend bleibt unbestimmt', () => {
    expect(binaryHabitValue(schlaf, entry)).toBe(false);
    expect(binaryHabitValue(schlaf, day(0, { schlaf: 3 }))).toBe(true);
    expect(binaryHabitValue(schlaf, day(0, { erkaeltung: true }))).toBeUndefined();
  });

  it('Tage ohne Habit-Einträge bleiben komplett außen vor', () => {
    expect(binaryHabitValue(erkaeltung, day(0, {}))).toBeUndefined();
    expect(binaryHabitValue(erkaeltung, undefined)).toBeUndefined();
  });

  it('Legacy-Einträge ohne habits-Objekt crashen nicht', () => {
    const legacy = { date: isoDay(0) } as unknown as DayEntry;
    expect(binaryHabitValue(erkaeltung, legacy)).toBeUndefined();
    const entries = [legacy, ...krankKeinSportEntries().slice(1)];
    expect(() => findInsights(entries, [erkaeltung, sport, schlaf], EMPTY_INDEX)).not.toThrow();
  });

  it('choice: mindestens eine Auswahl zählt als ja', () => {
    expect(binaryHabitValue(sport, entry)).toBe(true);
  });
});

// 90 Tage: 10 Krankheitstage ohne Sport; an den 80 gesunden Tagen je zur
// Hälfte Sport/kein Sport. Schlaf variiert unabhängig davon.
function krankKeinSportEntries(days = 90, sickDays = 10): DayEntry[] {
  const entries: DayEntry[] = [];
  for (let i = 0; i < days; i++) {
    const habits: DayEntry['habits'] = { schlaf: i % 4 < 2 ? 2 : 3 };
    if (i < sickDays) habits.erkaeltung = true;
    else if (i % 2 === 0) habits.sport = ['Gym'];
    entries.push(day(i, habits));
  }
  return entries;
}

describe('findImplications', () => {
  it('findet „krank ⇒ kein Sport", aber nicht die Gegenrichtung', () => {
    const findings = findImplications(krankKeinSportEntries(), [erkaeltung, sport, schlaf]);
    expect(findings).toHaveLength(1);
    const f = findings[0]!;
    expect(f.aId).toBe('erkaeltung');
    expect(f.aSide).toBe('high');
    expect(f.bId).toBe('sport');
    expect(f.bSide).toBe('low');
    expect(f.nA).toBe(10);
    expect(f.nAB).toBe(10);
    expect(f.nB).toBe(50);
    expect(f.confForward).toBe(1);
    expect(f.confReverse).toBeCloseTo(0.2);
    expect(f.baseline).toBeCloseTo(0.5);
    expect(f.p).toBeLessThan(0.05 / 3);
  });

  it('meldet nichts unterhalb der Mindestdatenmenge', () => {
    const findings = findImplications(krankKeinSportEntries(50, 10), [erkaeltung, sport, schlaf]);
    expect(findings).toEqual([]);
  });

  it('scale4: viel Stress ⇒ ungesunde Ernährung über die Skalen-Hälften', () => {
    const entries: DayEntry[] = [];
    for (let i = 0; i < 90; i++) {
      // 12 Tage mit sehr viel Stress (Wert 1) und schlechter Ernährung;
      // sonst wenig Stress, Ernährung unabhängig halbe/halbe
      if (i < 12) entries.push(day(i, { stress: 1, ernaehrung: 1 }));
      else entries.push(day(i, { stress: i % 2 === 0 ? 3 : 4, ernaehrung: i % 2 === 0 ? 2 : 4 }));
    }
    const findings = findImplications(entries, [stress, ernaehrung]);
    expect(findings).toHaveLength(1);
    const f = findings[0]!;
    expect(f.aId).toBe('stress');
    expect(f.aSide).toBe('low');
    expect(f.bId).toBe('ernaehrung');
    expect(f.bSide).toBe('low');
    expect(f.confForward).toBe(1);
    expect(f.confReverse).toBeLessThan(0.3);
  });

  it('beidseitige Zusammenhänge (Äquivalenzen) werden nicht als Implikation gemeldet', () => {
    // A und B fallen perfekt zusammen — das ist symmetrisch, kein einseitiger Befund
    const a: HabitDefinition = { id: 'a', name: 'A', type: 'bool', sortOrder: 1 };
    const b: HabitDefinition = { id: 'b', name: 'B', type: 'bool', sortOrder: 2 };
    const entries = Array.from({ length: 90 }, (_, i) =>
      day(i, i % 2 === 0 ? { a: true, b: true } : { a: false, b: false })
    );
    expect(findImplications(entries, [a, b])).toEqual([]);
  });

  it('triviale Folgen (Basisrate ohnehin hoch) werden nicht gemeldet', () => {
    // b gilt an 88 von 90 Tagen — dass es auch an a-Tagen gilt, sagt nichts
    const a: HabitDefinition = { id: 'a', name: 'A', type: 'bool', sortOrder: 1 };
    const b: HabitDefinition = { id: 'b', name: 'B', type: 'bool', sortOrder: 2 };
    const entries = Array.from({ length: 90 }, (_, i) =>
      day(i, { a: i < 10, b: i < 88 })
    );
    expect(findImplications(entries, [a, b])).toEqual([]);
  });

  it('seltene Bedingungen unter der Mindesthäufigkeit werden nicht getestet', () => {
    const entries = krankKeinSportEntries(90, 5);
    expect(findImplications(entries, [erkaeltung, sport])).toEqual([]);
  });

  it('nie erfasste Habits blähen die Bonferroni-Korrektur nicht auf', () => {
    // Habits ohne einen einzigen Eintrag zählen als konstant „nein" — solche
    // Paare haben keine Teststärke und dürfen echte Befunde nicht verdrängen
    const unused: HabitDefinition[] = Array.from({ length: 8 }, (_, k) => ({
      id: `unused${k}`,
      name: `Unused ${k}`,
      type: 'bool' as const,
      sortOrder: 10 + k
    }));
    const findings = findImplications(krankKeinSportEntries(), [erkaeltung, sport, schlaf, ...unused]);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.aId).toBe('erkaeltung');
  });
});

describe('findStrongCorrelations', () => {
  it('carryover: Alkohol heute ↔ Schlaf am Folgetag, als Vortag-Paar markiert', () => {
    // Schlaf am Tag danach folgt exakt dem Alkohol-Wert → ρ = 1 bei Lag 1
    const entries = Array.from({ length: 90 }, (_, i) =>
      day(i, { alkohol: (i % 4) + 1, schlaf: ((i + 3) % 4) + 1 })
    );
    const findings = findStrongCorrelations(entries, [alkohol, schlaf], EMPTY_INDEX);
    expect(findings).toHaveLength(1);
    const f = findings[0]!;
    expect(f.aId).toBe('alkohol');
    expect(f.bId).toBe('schlaf');
    expect(f.lagged).toBe(true);
    expect(f.rho).toBeCloseTo(1);
  });

  it('schwache Zusammenhänge bleiben unter der Effektstärke-Schwelle', () => {
    const entries = Array.from({ length: 90 }, (_, i) =>
      day(i, { stress: (i % 4) + 1, schlaf: (i % 3) + 1 })
    );
    expect(findStrongCorrelations(entries, [stress, schlaf], EMPTY_INDEX)).toEqual([]);
  });

  it('beide Variablen carryover: Lag-1-Beziehung wird wie in der Matrix gefunden', () => {
    // Stress am Folgetag folgt exakt dem Alkohol-Wert; alkohol UND stress
    // sind carryover — es werden beide Lag-Richtungen geprüft und nur die
    // stärkere behalten
    const entries = Array.from({ length: 90 }, (_, i) =>
      day(i, { alkohol: (i % 4) + 1, stress: ((i + 3) % 4) + 1 })
    );
    const findings = findStrongCorrelations(entries, [alkohol, stress], EMPTY_INDEX);
    expect(findings).toHaveLength(1);
    const f = findings[0]!;
    expect(f.aId).toBe('alkohol');
    expect(f.bId).toBe('stress');
    expect(f.lagged).toBe(true);
    expect(f.rho).toBeCloseTo(1);
  });

  it('Habit ↔ Zyklustag wird gefunden, Zyklus ↔ Zyklus nicht', () => {
    // zwei 30-Tage-Zyklen; Gefühle gut in der ersten, schlecht in der zweiten
    // Zyklushälfte; Temperatur steigt mit dem Zyklustag
    const entries: DayEntry[] = [];
    for (let i = 0; i < 60; i++) {
      const cycleDay = (i % 30) + 1;
      const e = day(i, { gefuehle: cycleDay <= 15 ? 4 : 1 });
      e.cycle = {
        temperature: { value: 36.3 + cycleDay * 0.01, time: '07:00', disturbed: false, excluded: false }
      };
      if (cycleDay === 1) e.cycle.bleeding = 'medium';
      entries.push(e);
    }
    const index = buildCycleIndex(entries);
    const findings = findStrongCorrelations(entries, [gefuehle], index);
    const ids = findings.map((f) => `${f.aId}~${f.bId}`);
    expect(ids).toContain('gefuehle~zyklustag');
    expect(ids.every((id) => id.includes('gefuehle'))).toBe(true);
    const zyklustag = findings.find((f) => f.bId === 'zyklustag')!;
    expect(zyklustag.rho).toBeLessThan(-0.6);
  });
});

describe('findInsights', () => {
  it('beidseitige Äquivalenzen erscheinen als Korrelation statt als Implikation', () => {
    const a: HabitDefinition = { id: 'a', name: 'A', type: 'bool', sortOrder: 1 };
    const b: HabitDefinition = { id: 'b', name: 'B', type: 'bool', sortOrder: 2 };
    const entries = Array.from({ length: 90 }, (_, i) =>
      day(i, i % 2 === 0 ? { a: true, b: true } : { a: false, b: false })
    );
    const insights = findInsights(entries, [a, b], EMPTY_INDEX);
    expect(insights.implications).toEqual([]);
    expect(insights.correlations).toHaveLength(1);
    expect(insights.correlations[0]!.rho).toBeCloseTo(1);
  });

  it('Paare mit Implikations-Befund werden nicht doppelt als Korrelation gemeldet', () => {
    // a ⇒ b mit conf 1.0, Gegenrichtung 0.625 — zugleich φ ≈ 0.69 ≥ 0.6
    const a: HabitDefinition = { id: 'a', name: 'A', type: 'bool', sortOrder: 1 };
    const b: HabitDefinition = { id: 'b', name: 'B', type: 'bool', sortOrder: 2 };
    const entries = Array.from({ length: 90 }, (_, i) =>
      day(i, { a: i < 25, b: i < 40 })
    );
    const insights = findInsights(entries, [a, b], EMPTY_INDEX);
    expect(insights.implications).toHaveLength(1);
    expect(insights.correlations).toEqual([]);
  });

  it('krank ⇒ kein Sport bleibt ein reiner Implikations-Befund', () => {
    const insights = findInsights(krankKeinSportEntries(), [erkaeltung, sport, schlaf], EMPTY_INDEX);
    expect(insights.implications).toHaveLength(1);
    expect(insights.correlations).toEqual([]);
  });

  it('Vortag-Korrelation wird von einer Gleichtag-Implikation desselben Paars nicht unterdrückt', () => {
    // Schlaf folgt dem Alkohol-Wert des Vortags (Lag-Korrelation). Weil die
    // wenigen Viel-Alkohol-Tage am Blockanfang liegen, gilt zugleich die
    // Gleichtag-Implikation „Alkohol viel ⇒ schlecht geschlafen"; zusätzliche
    // Schlecht-Schlaf-Tage (45–54) halten sie einseitig. Beide Aussagen sind
    // verschieden und müssen beide erscheinen.
    const entries = Array.from({ length: 90 }, (_, i) => {
      const alk = i < 12 ? (i % 2) + 1 : (i % 2) + 3;
      let schlafVal = i === 0 ? 2 : i < 13 ? ((i - 1) % 2) + 1 : ((i - 1) % 2) + 3;
      if (i >= 45 && i < 55) schlafVal = 1;
      return day(i, { alkohol: alk, schlaf: schlafVal });
    });
    const insights = findInsights(entries, [alkohol, schlaf], EMPTY_INDEX, undefined, {
      minPairDays: 60,
      minVariedDays: 8,
      minAbsRho: 0.3,
      alpha: 0.05
    });
    expect(insights.implications).toHaveLength(1);
    expect(insights.implications[0]!.aId).toBe('alkohol');
    expect(insights.implications[0]!.aSide).toBe('low');
    expect(insights.correlations).toHaveLength(1);
    expect(insights.correlations[0]!.lagged).toBe(true);
  });
});
