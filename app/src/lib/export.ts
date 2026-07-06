import type { Cycle, DayEntry, HabitDefinition, Setting } from './types';

export const BACKUP_APP_ID = 'habits-app';

export interface BackupPayload {
  app: typeof BACKUP_APP_ID;
  schemaVersion: number;
  exportedAt: string;
  day_entries: DayEntry[];
  habit_definitions: HabitDefinition[];
  cycles: Cycle[];
  settings: Setting[];
}

export interface BackupSourceData {
  day_entries: DayEntry[];
  habit_definitions: HabitDefinition[];
  cycles: Cycle[];
  settings: Setting[];
}

export function buildBackupPayload(
  data: BackupSourceData,
  schemaVersion: number,
  exportedAt: string = new Date().toISOString()
): BackupPayload {
  return {
    app: BACKUP_APP_ID,
    schemaVersion,
    exportedAt,
    day_entries: data.day_entries,
    habit_definitions: data.habit_definitions,
    cycles: data.cycles,
    settings: data.settings
  };
}

export function serializeBackup(payload: BackupPayload): string {
  return JSON.stringify(payload, null, 2);
}

export interface BackupValidationResult {
  valid: boolean;
  errors: string[];
  payload?: BackupPayload;
}

const BACKUP_ARRAY_KEYS = ['day_entries', 'habit_definitions', 'cycles', 'settings'] as const;

export function validateBackupPayload(data: unknown, currentSchemaVersion: number): BackupValidationResult {
  const errors: string[] = [];

  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Datei enthält kein gültiges JSON-Objekt.'] };
  }

  const obj = data as Record<string, unknown>;

  if (obj.app !== BACKUP_APP_ID) {
    errors.push('Kein gültiges Backup dieser App (Feld "app" fehlt oder ist falsch).');
  }

  if (typeof obj.schemaVersion !== 'number') {
    errors.push('Feld "schemaVersion" fehlt oder ist keine Zahl.');
  } else if (obj.schemaVersion > currentSchemaVersion) {
    errors.push(
      `Backup stammt aus einer neueren App-Version (Schema ${obj.schemaVersion} > ${currentSchemaVersion}).`
    );
  }

  if (typeof obj.exportedAt !== 'string') {
    errors.push('Feld "exportedAt" fehlt oder ist kein Zeitstempel.');
  }

  for (const key of BACKUP_ARRAY_KEYS) {
    if (!Array.isArray(obj[key])) {
      errors.push(`Feld "${key}" fehlt oder ist kein Array.`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    payload: {
      app: BACKUP_APP_ID,
      schemaVersion: obj.schemaVersion as number,
      exportedAt: obj.exportedAt as string,
      day_entries: obj.day_entries as DayEntry[],
      habit_definitions: obj.habit_definitions as HabitDefinition[],
      cycles: obj.cycles as Cycle[],
      settings: obj.settings as Setting[]
    }
  };
}

export interface BackupSummary {
  exportedAt: string;
  schemaVersion: number;
  counts: {
    day_entries: number;
    habit_definitions: number;
    cycles: number;
    settings: number;
  };
  dateRange?: { from: string; to: string };
}

export function summarizeBackup(payload: BackupPayload): BackupSummary {
  const dates = payload.day_entries.map((entry) => entry.date).sort();
  return {
    exportedAt: payload.exportedAt,
    schemaVersion: payload.schemaVersion,
    counts: {
      day_entries: payload.day_entries.length,
      habit_definitions: payload.habit_definitions.length,
      cycles: payload.cycles.length,
      settings: payload.settings.length
    },
    dateRange: dates.length > 0 ? { from: dates[0]!, to: dates[dates.length - 1]! } : undefined
  };
}

export function backupFilename(dateISO: string): string {
  return `habits-backup-${dateISO}.json`;
}

export function csvFilename(dateISO: string): string {
  return `habits-data-${dateISO}.csv`;
}

export type CsvCell = string | number | boolean | undefined;

export interface CsvTable {
  header: string[];
  rows: CsvCell[][];
}

const CSV_CYCLE_COLUMNS = [
  'cycle_bleeding',
  'cycle_temp',
  'cycle_temp_time',
  'cycle_temp_disturbed',
  'cycle_temp_excluded',
  'cycle_mucus',
  'cycle_mid_pain',
  'cycle_breast_tenderness',
  'cycle_spotting',
  'cycle_note'
] as const;

export function buildCsvTable(dayEntries: DayEntry[], habitDefinitions: HabitDefinition[]): CsvTable {
  const habits = [...habitDefinitions].sort((a, b) => a.sortOrder - b.sortOrder);
  const header = ['date', ...habits.map((habit) => habit.id), ...CSV_CYCLE_COLUMNS];

  const sortedEntries = [...dayEntries].sort((a, b) => a.date.localeCompare(b.date));

  const rows = sortedEntries.map((entry) => {
    const row: CsvCell[] = [entry.date];

    for (const habit of habits) {
      const value = entry.habits?.[habit.id];
      if (value === undefined) {
        row.push(undefined);
      } else if (Array.isArray(value)) {
        row.push(value.join('|'));
      } else {
        row.push(value);
      }
    }

    const cycle = entry.cycle;
    row.push(cycle?.bleeding);
    row.push(cycle?.temperature?.value);
    row.push(cycle?.temperature?.time);
    row.push(cycle?.temperature?.disturbed);
    row.push(cycle?.temperature?.excluded);
    row.push(cycle?.mucus);
    row.push(cycle?.midPain);
    row.push(cycle?.breastTenderness);
    row.push(cycle?.spotting);
    row.push(cycle?.note);

    return row;
  });

  return { header, rows };
}

function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvFieldToString(value: CsvCell): string {
  if (value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  return csvEscape(value);
}

export function serializeCsv(table: CsvTable): string {
  const lines = [
    table.header.map(csvEscape).join(','),
    ...table.rows.map((row) => row.map(csvFieldToString).join(','))
  ];
  return '\uFEFF' + lines.join('\r\n');
}
