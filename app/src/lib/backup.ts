import { getSetting } from './db';

export const BACKUP_INTERVAL_DAYS = 14;

export async function isBackupOverdue(): Promise<boolean> {
  const last = await getSetting<string>('lastBackupAt');
  if (!last) return true;
  const ageDays = (Date.now() - new Date(last).getTime()) / 86_400_000;
  return ageDays > BACKUP_INTERVAL_DAYS;
}
