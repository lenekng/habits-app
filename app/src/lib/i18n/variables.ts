import { habitVariable, type VariableSpec } from '../stats';
import type { HabitDefinition } from '../types';
import type { Lang, MessageKey } from './messages';
import { t } from './i18n.svelte';
import { localizeHabit } from './habits';

// Lokalisierung der festen Zyklus-Variablen (label + Skalen-Enden für die
// Korrelations-Klartextsätze). Bewusst hier statt in stats.ts, damit stats.ts
// (von Vitest getestet) frei von i18n/localStorage bleibt.
const CYCLEVAR_LABEL: Record<string, MessageKey> = {
  temperatur: 'cyclevar.temperatur',
  blutung: 'cyclevar.blutung',
  schleim: 'cyclevar.schleim',
  zyklustag: 'cyclevar.zyklustag',
  lutealphase: 'cyclevar.lutealphase'
};

const CYCLEVAR_ENDS: Record<string, { high: Record<Lang, string>; low: Record<Lang, string> }> = {
  temperatur: { high: { de: 'höher', en: 'higher' }, low: { de: 'niedriger', en: 'lower' } },
  blutung: { high: { de: 'stärker', en: 'stronger' }, low: { de: 'schwächer', en: 'weaker' } },
  schleim: {
    high: { de: 'hochwertiger', en: 'higher quality' },
    low: { de: 'trockener', en: 'drier' }
  },
  zyklustag: {
    high: { de: 'später im Zyklus', en: 'later in the cycle' },
    low: { de: 'früh im Zyklus', en: 'early in the cycle' }
  },
  lutealphase: {
    high: { de: 'Lutealphase', en: 'luteal phase' },
    low: { de: 'Follikelphase', en: 'follicular phase' }
  }
};

export function localizeVariableSpec(v: VariableSpec, lang: Lang): VariableSpec {
  const key = CYCLEVAR_LABEL[v.id];
  const ends = CYCLEVAR_ENDS[v.id];
  if (!key || !ends) return v;
  return { ...v, label: t(key), highLabel: ends.high[lang], lowLabel: ends.low[lang] };
}

// Habit-Variable mit lokalisierten Label- und Skalen-Enden. Für scale4 kommen
// die Enden aus den übersetzten scaleLabels; bool/choice haben in stats.ts fest
// deutsche Enden (ja/nein, mehr/weniger), die hier für den Korrelations-Satz
// übersetzt werden.
export function localizedHabitVariable(h: HabitDefinition, lang: Lang): VariableSpec {
  const spec = habitVariable(localizeHabit(h, lang));
  if (h.type === 'bool') return { ...spec, highLabel: t('common.yes'), lowLabel: t('common.no') };
  if (h.type === 'choice') return { ...spec, highLabel: t('common.more'), lowLabel: t('common.less') };
  return spec;
}
