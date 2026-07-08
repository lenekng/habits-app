// Konvention: bei scale4-Habits ist 4 immer der Idealzustand. Alkohol und
// Stress wurden dafür umgedreht (früher war 1 = ideal). Die Migration in db.ts
// dreht bestehende Werte (v → 5−v) und die Label-Reihenfolge; dieselbe Logik
// gilt beim Import älterer Backups (export.ts).
export const POLARITY_FLIP_IDS = ['alkohol', 'stress'] as const;

export function flipScale4Value(v: unknown): unknown {
  return typeof v === 'number' && v >= 1 && v <= 4 ? 5 - v : v;
}
