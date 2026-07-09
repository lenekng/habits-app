import { locale } from './i18n.svelte';

// Locale-abhängige Datumsformatierung. In einem reaktiven Kontext (Template,
// $derived) aufgerufen, aktualisieren sich die Ausgaben beim Sprachwechsel,
// weil locale() den reaktiven Sprachzustand liest.
export function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString(locale(), {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export function formatMonthYear(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString(locale(), {
    month: 'long',
    year: 'numeric'
  });
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatShortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString(locale());
}
