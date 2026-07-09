import { messages, type Lang, type MessageKey, type MsgParams } from './messages';

const STORAGE_KEY = 'lang';

function initialLang(): Lang {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s === 'de' || s === 'en') return s;
  } catch {
    /* localStorage nicht verfügbar */
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language?.toLowerCase() : '';
  return nav?.startsWith('en') ? 'en' : 'de';
}

function applyDocLang(l: Lang): void {
  if (typeof document !== 'undefined') document.documentElement.lang = l;
}

// Modul-globaler, reaktiver Sprachzustand. Jede Komponente, die t()/getLang()
// im Template liest, rendert bei Sprachwechsel automatisch neu.
const startLang = initialLang();
let current = $state<Lang>(startLang);
applyDocLang(startLang);

export function getLang(): Lang {
  return current;
}

export function setLang(l: Lang): void {
  current = l;
  applyDocLang(l);
  try {
    localStorage.setItem(STORAGE_KEY, l);
  } catch {
    /* ignore */
  }
}

export function locale(): string {
  return current === 'en' ? 'en-GB' : 'de-DE';
}

export function t(key: MessageKey, params?: MsgParams): string {
  const entry = messages[current][key] ?? messages.de[key];
  return typeof entry === 'function' ? entry(params ?? {}) : entry;
}
