export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return slug || 'habit';
}

export function uniqueHabitId(base: string, existing: Set<string>): string {
  if (!existing.has(base)) return base;
  let n = 2;
  while (existing.has(`${base}_${n}`)) n++;
  return `${base}_${n}`;
}
