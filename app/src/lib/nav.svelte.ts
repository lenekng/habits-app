import { todayISO } from './date';

export type View = 'heute' | 'monat' | 'zyklus' | 'analyse' | 'mehr';

const state = $state({ view: 'heute' as View, date: todayISO() });

export const nav = {
  get view(): View {
    return state.view;
  },
  get date(): string {
    return state.date;
  },
  go(view: View, date?: string): void {
    state.view = view;
    if (date) state.date = date;
  },
  setDate(date: string): void {
    state.date = date;
  }
};
