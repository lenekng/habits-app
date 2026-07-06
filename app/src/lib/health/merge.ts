import { db } from '../db';
import type { DayEntry } from '../types';
import { applyPatchToEntry, emptyFieldCounts, type CyclePatch, type FieldCounts } from './mapping';

export interface MergeResult {
  imported: FieldCounts;
  skipped: FieldCounts;
  daysCreated: number;
  daysUpdated: number;
  daysUnchanged: number;
}

export async function mergePatchesIntoDb(patches: Map<string, CyclePatch>): Promise<MergeResult> {
  const imported = emptyFieldCounts();
  const skipped = emptyFieldCounts();
  let daysCreated = 0;
  let daysUpdated = 0;
  let daysUnchanged = 0;

  const dates = Array.from(patches.keys()).sort();

  await db.transaction('rw', db.day_entries, async () => {
    const existingRows = await db.day_entries.bulkGet(dates);
    const toPut: DayEntry[] = [];
    for (let i = 0; i < dates.length; i++) {
      const date = dates[i]!;
      const patch = patches.get(date);
      if (patch === undefined) continue;
      const result = applyPatchToEntry(existingRows[i], date, patch);
      for (const field of result.importedFields) imported[field] += 1;
      for (const field of result.skippedFields) skipped[field] += 1;
      if (result.changed) {
        if (existingRows[i] === undefined) daysCreated += 1;
        else daysUpdated += 1;
        toPut.push(result.entry);
      } else {
        daysUnchanged += 1;
      }
    }
    if (toPut.length > 0) await db.day_entries.bulkPut(toPut);
  });

  return { imported, skipped, daysCreated, daysUpdated, daysUnchanged };
}
