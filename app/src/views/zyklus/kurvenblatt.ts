import { addDays } from '../../lib/date';
import type { CycleInfo } from '../../lib/cycles';
import type { TempShiftRule } from '../../lib/ovulation';
import type { DayEntry } from '../../lib/types';

export interface ChartDay {
  day: number;
  date: string;
  entry?: DayEntry;
  isToday: boolean;
}

export interface TempMarker {
  day: number;
  value: number;
  excluded: boolean;
  disturbed: boolean;
  bracketed: boolean;
  firstHigh: boolean;
  confirmed: boolean;
}

export interface Coverline {
  value: number;
  fromDay: number;
  toDay: number;
}

export interface ChartModel {
  days: ChartDay[];
  temps: TempMarker[];
  hasTemps: boolean;
  yMin: number;
  yMax: number;
  gridTicks: number[];
  labelTicks: number[];
  coverline?: Coverline;
  ovulationDay?: number;
  mucusPeakDay?: number;
  mucusPlausible?: boolean;
}

const MAX_OPEN_DAYS = 99;

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

export function cycleDayOf(cycle: CycleInfo, date: string): number {
  return daysBetween(cycle.startDate, date) + 1;
}

export function fmtDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export function fmtTemp(v: number): string {
  return v.toFixed(2).replace('.', ',');
}

export function buildChartModel(cycle: CycleInfo, entries: DayEntry[], today: string): ChartModel {
  const n =
    cycle.length ?? Math.min(Math.max(daysBetween(cycle.startDate, today) + 2, 1), MAX_OPEN_DAYS);
  const byDate = new Map(entries.map((e) => [e.date, e]));

  const days: ChartDay[] = [];
  for (let i = 0; i < n; i++) {
    const date = addDays(cycle.startDate, i);
    days.push({ day: i + 1, date, entry: byDate.get(date), isToday: date === today });
  }

  const shift = cycle.tempShift;
  const temps: TempMarker[] = [];
  for (const d of days) {
    const t = d.entry?.cycle?.temperature;
    if (!t) continue;
    temps.push({
      day: d.day,
      value: t.value,
      excluded: t.excluded,
      disturbed: t.disturbed && !t.excluded,
      bracketed: shift.bracketedDay === d.date,
      firstHigh: shift.firstHighDay === d.date,
      confirmed: shift.confirmedDay === d.date
    });
  }

  const domainValues = temps.map((t) => t.value);
  if (shift.coverline !== undefined) domainValues.push(shift.coverline);
  const hasTemps = temps.length > 0;

  // y-Domäne in Hundertstel-°C rechnen, um Fließkomma-Drift beim 0,05-Raster zu vermeiden
  let loC = 3600;
  let hiC = 3700;
  if (domainValues.length > 0) {
    let lo = Math.min(...domainValues) - 0.05;
    let hi = Math.max(...domainValues) + 0.05;
    if (hi - lo < 0.3) {
      const mid = (hi + lo) / 2;
      lo = mid - 0.15;
      hi = mid + 0.15;
    }
    loC = Math.floor(Math.round(lo * 100) / 5) * 5;
    hiC = Math.ceil(Math.round(hi * 100) / 5) * 5;
  }

  const gridTicks: number[] = [];
  const labelTicks: number[] = [];
  const labelStep = hiC - loC > 120 ? 20 : 10;
  for (let c = loC; c <= hiC; c += 5) {
    gridTicks.push(c / 100);
    if (c % labelStep === 0) labelTicks.push(c / 100);
  }

  const model: ChartModel = {
    days,
    temps,
    hasTemps,
    yMin: loC / 100,
    yMax: hiC / 100,
    gridTicks,
    labelTicks
  };

  if (shift.found && shift.coverline !== undefined && shift.firstHighDay) {
    const fhDay = cycleDayOf(cycle, shift.firstHighDay);
    const confDay = shift.confirmedDay ? cycleDayOf(cycle, shift.confirmedDay) : fhDay + 2;
    model.coverline = {
      value: shift.coverline,
      fromDay: Math.max(1, fhDay - 6),
      toDay: Math.min(n, confDay + 2)
    };
  }

  if (cycle.ovulationEstimate) {
    const d = cycleDayOf(cycle, cycle.ovulationEstimate);
    if (d >= 1 && d <= n) model.ovulationDay = d;
  }

  if (cycle.mucusPeakDay) {
    const d = cycleDayOf(cycle, cycle.mucusPeakDay);
    if (d >= 1 && d <= n) model.mucusPeakDay = d;
    if (cycle.mucusPlausible !== undefined) model.mucusPlausible = cycle.mucusPlausible;
  }

  return model;
}

export interface Explanation {
  title: string;
  lines: string[];
}

const RULE_TITLES: Record<TempShiftRule, string> = {
  standard: 'Temperaturanstieg bestätigt: 3-über-6-Regel',
  ausnahme1: 'Temperaturanstieg bestätigt: Ausnahmeregel 1 (4. Wert)',
  ausnahme2: 'Temperaturanstieg bestätigt: Ausnahmeregel 2 (Ausreißer ausgeklammert)'
};

export function ruleExplanation(cycle: CycleInfo, validTempCount: number): Explanation {
  const s = cycle.tempShift;

  if (!s.found) {
    if (validTempCount < 7) {
      return {
        title: 'Zu wenige Temperaturwerte',
        lines: [
          'Für die Auswertung braucht es mindestens 6 Messungen als Vergleichsbasis plus eine erste höhere Messung. Am besten täglich direkt nach dem Aufwachen messen — ausgeklammerte Werte zählen dabei nicht mit.'
        ]
      };
    }
    return {
      title: 'Noch kein Temperaturanstieg erkennbar',
      lines: [
        'Gesucht wird eine Messung über allen 6 vorangehenden Werten, gefolgt von 2 weiteren höheren Messungen; die dritte muss mindestens 0,2 °C über der Hilfslinie liegen (3-über-6-Regel). Sobald das eintritt, erscheint die Auswertung hier.'
      ]
    };
  }

  const cover = `${fmtTemp(s.coverline!)} °C`;
  const fhDay = cycleDayOf(cycle, s.firstHighDay!);
  const confDay = cycleDayOf(cycle, s.confirmedDay!);
  const lines: string[] = [];

  if (s.rule === 'standard') {
    lines.push(
      `3 Messungen liegen über der Hilfslinie (${cover} — das Maximum der 6 vorangehenden Werte), die dritte mindestens 0,2 °C darüber.`
    );
  } else if (s.rule === 'ausnahme1') {
    lines.push(
      `Die dritte höhere Messung lag keine 0,2 °C über der Hilfslinie (${cover}). Nach Ausnahmeregel 1 wurde deshalb ein 4. Wert abgewartet — er muss nur über der Hilfslinie liegen.`
    );
  } else {
    const bracket = s.bracketedDay ? ` (Tag ${cycleDayOf(cycle, s.bracketedDay)})` : '';
    lines.push(
      `Eine der 3 höheren Messungen fiel auf oder unter die Hilfslinie (${cover}) und wurde ausgeklammert${bracket}. Nach Ausnahmeregel 2 muss dafür die 4. Messung mindestens 0,2 °C über der Hilfslinie liegen.`
    );
  }

  lines.push(
    `Erste höhere Messung: Tag ${fhDay} (${fmtDateLong(s.firstHighDay!)}), bestätigt an Tag ${confDay}. Der Eisprung liegt meist am Tag vor der ersten höheren Messung — geschätzt Tag ${fhDay - 1}.`
  );

  if (cycle.mucusPeakDay) {
    const mp = cycleDayOf(cycle, cycle.mucusPeakDay);
    if (cycle.mucusPlausible === false) {
      lines.push(
        `Hinweis: Der Schleimhöhepunkt (Tag ${mp}) liegt mehr als 3 Tage von der Eisprung-Schätzung entfernt. Temperatur- und Schleimbild passen nicht gut zusammen — Schätzung mit Vorsicht interpretieren.`
      );
    } else if (cycle.mucusPlausible === true) {
      lines.push(
        `Der Schleimhöhepunkt (Tag ${mp}) passt zeitlich zur Temperaturauswertung und stützt die Schätzung.`
      );
    }
  }

  return { title: RULE_TITLES[s.rule!], lines };
}
