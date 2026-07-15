import type { HabitDefinition } from '../types';
import type { Lang } from './messages';

type Scale = [string, string, string, string];

interface HabitI18n {
  name: Record<Lang, string>;
  scaleLabels?: Record<Lang, Scale>;
  choices?: Record<Lang, string[]>;
}

// Übersetzungen der eingebauten Standard-Habits. Die `de`-Werte MÜSSEN dem Seed
// in db.ts (DEFAULT_HABITS) entsprechen — nur dann wird lokalisiert. Selbst
// umbenannte Defaults und eigene Habits bleiben unangetastet.
export const DEFAULT_HABIT_I18N: Record<string, HabitI18n> = {
  geweint: { name: { de: 'Geweint', en: 'Cried' } },
  streit: { name: { de: 'Streit', en: 'Argument' } },
  gv: { name: { de: 'GV', en: 'Sex' } },
  erkaeltung: { name: { de: 'Erkältung', en: 'Cold' } },
  soziale_kontakte: { name: { de: 'Soziale Kontakte', en: 'Social contact' } },
  auswaerts_geschlafen: { name: { de: 'Auswärts geschlafen', en: 'Slept elsewhere' } },
  urlaub: { name: { de: 'Urlaub', en: 'Vacation' } },
  medikamente: { name: { de: 'Medikamente', en: 'Medication' } },
  sport: {
    name: { de: 'Sport', en: 'Exercise' },
    choices: {
      de: ['Volleyball', 'Beachvolleyball', 'Gym', 'Laufen', 'Sonstiges'],
      en: ['Volleyball', 'Beach volleyball', 'Gym', 'Running', 'Other']
    }
  },
  alkohol: {
    name: { de: 'Alkohol', en: 'Alcohol' },
    scaleLabels: {
      de: ['viel', 'mittel', 'wenig', 'keiner'],
      en: ['a lot', 'some', 'little', 'none']
    }
  },
  stress: {
    name: { de: 'Stress', en: 'Stress' },
    scaleLabels: {
      de: ['sehr viel', 'viel', 'mittel', 'wenig'],
      en: ['very high', 'high', 'medium', 'low']
    }
  },
  gefuehle: {
    name: { de: 'Gefühle', en: 'Mood' },
    scaleLabels: {
      de: ['schlecht', 'eher schlecht', 'eher gut', 'gut'],
      en: ['bad', 'rather bad', 'rather good', 'good']
    }
  },
  schlaf: {
    name: { de: 'Schlafqualität', en: 'Sleep quality' },
    scaleLabels: {
      de: ['schlecht', 'mäßig', 'gut', 'sehr gut'],
      en: ['bad', 'fair', 'good', 'very good']
    }
  },
  schlafdauer: {
    name: { de: 'Schlafdauer', en: 'Sleep duration' },
    scaleLabels: {
      de: ['unter 6 h', '6–7 h', '7–8 h', 'über 8 h'],
      en: ['under 6 h', '6–7 h', '7–8 h', 'over 8 h']
    }
  },
  ernaehrung: {
    name: { de: 'Ernährung', en: 'Nutrition' },
    scaleLabels: {
      de: ['ungesund', 'eher ungesund', 'eher gesund', 'gesund'],
      en: ['unhealthy', 'rather unhealthy', 'rather healthy', 'healthy']
    }
  }
};

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function localizedHabitName(h: HabitDefinition, lang: Lang): string {
  const i = DEFAULT_HABIT_I18N[h.id];
  return i && h.name === i.name.de ? i.name[lang] : h.name;
}

export function localizedScaleLabels(h: HabitDefinition, lang: Lang): Scale | undefined {
  const i = DEFAULT_HABIT_I18N[h.id];
  if (i?.scaleLabels && h.scaleLabels && arraysEqual(h.scaleLabels, i.scaleLabels.de)) {
    return i.scaleLabels[lang];
  }
  return h.scaleLabels;
}

// Nur Anzeige-Übersetzung der Auswahl-Optionen (Standard-Sport). Der gespeicherte
// Wert bleibt die deutsche Option; die Aufrufer matchen weiter über den Rohwert
// und zeigen nur das lokalisierte Label per Index.
export function localizedChoices(h: HabitDefinition, lang: Lang): string[] | undefined {
  const i = DEFAULT_HABIT_I18N[h.id];
  if (i?.choices && h.choices && arraysEqual(h.choices, i.choices.de)) {
    return i.choices[lang];
  }
  return h.choices;
}

// Habit für Anzeige/Analyse lokalisieren (id bleibt unverändert für Matching).
export function localizeHabit(h: HabitDefinition, lang: Lang): HabitDefinition {
  return { ...h, name: localizedHabitName(h, lang), scaleLabels: localizedScaleLabels(h, lang) };
}
