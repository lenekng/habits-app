<script lang="ts">
  import { db, getSetting, setSetting, SCHEMA_VERSION } from '../../lib/db';
  import { todayISO } from '../../lib/date';
  import {
    backupFilename,
    buildBackupPayload,
    buildCsvTable,
    csvFilename,
    serializeBackup,
    serializeCsv,
    summarizeBackup,
    validateBackupPayload,
    type BackupPayload,
    type BackupSummary
  } from '../../lib/export';

  type Status = { ok: boolean; text: string };

  let lastBackupAt = $state<string | null>(null);
  let backupBusy = $state(false);
  let backupStatus = $state<Status | null>(null);

  let restoreErrors = $state<string[]>([]);
  let restorePayload = $state.raw<BackupPayload | null>(null);
  let restoreSummary = $state<BackupSummary | null>(null);
  let confirmVisible = $state(false);
  let restoreBusy = $state(false);
  let restoreStatus = $state<Status | null>(null);

  let csvBusy = $state(false);
  let csvStatus = $state<Status | null>(null);

  void getSetting<string>('lastBackupAt').then((value) => (lastBackupAt = value ?? null));

  function formatTimestamp(iso: string): string {
    return new Date(iso).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function formatShortDate(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y!, m! - 1, d!).toLocaleDateString('de-DE');
  }

  function errorText(err: unknown): string {
    return err instanceof Error ? err.message : String(err);
  }

  async function deliverFile(filename: string, content: string, mime: string): Promise<boolean> {
    const file = new File([content], filename, { type: mime });
    if (
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    ) {
      try {
        await navigator.share({ files: [file] });
        return true;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return false;
      }
    }
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Sofortiges Revoken kann den Download in manchen Browsern abbrechen
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return true;
  }

  async function exportBackup(): Promise<void> {
    backupBusy = true;
    backupStatus = null;
    try {
      const data = await db.transaction(
        'r',
        db.day_entries,
        db.habit_definitions,
        db.cycles,
        db.settings,
        async () => ({
          day_entries: await db.day_entries.toArray(),
          habit_definitions: await db.habit_definitions.toArray(),
          cycles: await db.cycles.toArray(),
          settings: await db.settings.toArray()
        })
      );
      const payload = buildBackupPayload(data, SCHEMA_VERSION);
      const delivered = await deliverFile(backupFilename(todayISO()), serializeBackup(payload), 'application/json');
      if (delivered) {
        const now = new Date().toISOString();
        await setSetting('lastBackupAt', now);
        lastBackupAt = now;
        backupStatus = { ok: true, text: 'Backup exportiert.' };
      } else {
        backupStatus = { ok: false, text: 'Export abgebrochen.' };
      }
    } catch (err) {
      backupStatus = { ok: false, text: `Export fehlgeschlagen: ${errorText(err)}` };
    } finally {
      backupBusy = false;
    }
  }

  async function exportCsv(): Promise<void> {
    csvBusy = true;
    csvStatus = null;
    try {
      const [entries, habits] = await Promise.all([db.day_entries.toArray(), db.habit_definitions.toArray()]);
      const csv = serializeCsv(buildCsvTable(entries, habits));
      const delivered = await deliverFile(csvFilename(todayISO()), csv, 'text/csv');
      csvStatus = delivered
        ? { ok: true, text: `CSV exportiert (${entries.length} Tage).` }
        : { ok: false, text: 'Export abgebrochen.' };
    } catch (err) {
      csvStatus = { ok: false, text: `Export fehlgeschlagen: ${errorText(err)}` };
    } finally {
      csvBusy = false;
    }
  }

  async function onRestoreFileChange(event: Event): Promise<void> {
    const input = event.currentTarget as HTMLInputElement;
    restoreErrors = [];
    restorePayload = null;
    restoreSummary = null;
    confirmVisible = false;
    restoreStatus = null;

    const file = input.files?.[0];
    if (!file) return;

    try {
      const parsed: unknown = JSON.parse(await file.text());
      const result = validateBackupPayload(parsed, SCHEMA_VERSION);
      if (!result.valid || !result.payload) {
        restoreErrors = result.errors;
        return;
      }
      restorePayload = result.payload;
      restoreSummary = summarizeBackup(result.payload);
    } catch {
      restoreErrors = ['Datei konnte nicht als JSON gelesen werden.'];
    }
  }

  async function performRestore(): Promise<void> {
    const payload = restorePayload;
    if (!payload) return;
    restoreBusy = true;
    restoreStatus = null;
    try {
      await db.transaction('rw', db.day_entries, db.habit_definitions, db.cycles, db.settings, async () => {
        await Promise.all([
          db.day_entries.clear(),
          db.habit_definitions.clear(),
          db.cycles.clear(),
          db.settings.clear()
        ]);
        await db.day_entries.bulkAdd(payload.day_entries);
        await db.habit_definitions.bulkAdd(payload.habit_definitions);
        await db.cycles.bulkAdd(payload.cycles);
        await db.settings.bulkAdd(payload.settings);
      });
      lastBackupAt = (await getSetting<string>('lastBackupAt')) ?? null;
      restoreStatus = {
        ok: true,
        text: `Backup wiederhergestellt: ${payload.day_entries.length} Tageseinträge, ${payload.habit_definitions.length} Habits.`
      };
      restorePayload = null;
      restoreSummary = null;
      confirmVisible = false;
    } catch (err) {
      restoreStatus = { ok: false, text: `Wiederherstellung fehlgeschlagen: ${errorText(err)}` };
    } finally {
      restoreBusy = false;
    }
  }
</script>

<h1>Backup &amp; Export</h1>

<section class="block">
  <h2>Backup erstellen</h2>
  <p class="muted">
    Vollständiges JSON-Backup aller Daten (Tageseinträge, Habits, Zyklen, Einstellungen). Auf dem iPhone über das
    Share-Sheet in iCloud Drive oder „Dateien" sichern.
  </p>
  <p class="last-backup">
    Letztes Backup: <strong>{lastBackupAt ? formatTimestamp(lastBackupAt) : 'noch nie'}</strong>
  </p>
  <button onclick={exportBackup} disabled={backupBusy}>Backup exportieren</button>
  {#if backupStatus}
    <p class={backupStatus.ok ? 'ok' : 'error'}>{backupStatus.text}</p>
  {/if}
</section>

<section class="block">
  <h2>Backup wiederherstellen</h2>
  <p class="muted">Stellt ein zuvor exportiertes JSON-Backup vollständig wieder her.</p>
  <input type="file" accept="application/json,.json" onchange={onRestoreFileChange} />
  {#if restoreErrors.length > 0}
    <ul class="error">
      {#each restoreErrors as message (message)}
        <li>{message}</li>
      {/each}
    </ul>
  {/if}
  {#if restoreSummary}
    <ul class="summary">
      <li>Exportiert am: {formatTimestamp(restoreSummary.exportedAt)}</li>
      <li>
        Tageseinträge: {restoreSummary.counts.day_entries}
        {#if restoreSummary.dateRange}
          ({formatShortDate(restoreSummary.dateRange.from)} bis {formatShortDate(restoreSummary.dateRange.to)})
        {/if}
      </li>
      <li>Habits: {restoreSummary.counts.habit_definitions}</li>
      <li>Zyklen: {restoreSummary.counts.cycles}</li>
      <li>Einstellungen: {restoreSummary.counts.settings}</li>
    </ul>
    {#if !confirmVisible}
      <button onclick={() => (confirmVisible = true)}>Wiederherstellen …</button>
    {:else}
      <div class="warning">
        <p>Ersetzt ALLE vorhandenen Daten in der App. Das kann nicht rückgängig gemacht werden.</p>
        <div class="confirm-row">
          <button class="danger" onclick={performRestore} disabled={restoreBusy}>Ja, alle Daten ersetzen</button>
          <button onclick={() => (confirmVisible = false)} disabled={restoreBusy}>Abbrechen</button>
        </div>
      </div>
    {/if}
  {/if}
  {#if restoreStatus}
    <p class={restoreStatus.ok ? 'ok' : 'error'}>{restoreStatus.text}</p>
  {/if}
</section>

<section class="block">
  <h2>CSV-Export</h2>
  <p class="muted">
    Für Auswertungen in Jupyter/Pandas: eine Zeile pro Tag, eine Spalte pro Habit plus Zyklusdaten. Enthält keine
    Einstellungen und ersetzt kein Backup.
  </p>
  <button onclick={exportCsv} disabled={csvBusy}>CSV exportieren</button>
  {#if csvStatus}
    <p class={csvStatus.ok ? 'ok' : 'error'}>{csvStatus.text}</p>
  {/if}
</section>

<style>
  .block {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    padding: 0.9rem 1rem 1rem;
    margin-bottom: 1rem;
  }

  .block h2 {
    margin-top: 0;
  }

  .block > p {
    margin: 0 0 0.75rem;
  }

  .last-backup {
    font-size: 0.95rem;
  }

  .summary {
    margin: 0.75rem 0;
    padding-left: 1.2rem;
    font-size: 0.95rem;
  }

  ul.error {
    margin: 0.75rem 0;
    padding-left: 1.2rem;
  }

  .ok {
    color: var(--accent);
    margin: 0.6rem 0 0;
  }

  .error {
    color: var(--period);
    margin: 0.6rem 0 0;
  }

  .warning {
    background: var(--period-soft);
    border: 1px solid var(--period);
    border-radius: 0.5rem;
    padding: 0.75rem;
    margin-top: 0.75rem;
  }

  .warning p {
    margin: 0 0 0.6rem;
    color: var(--period);
    font-weight: 600;
  }

  .confirm-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  button.danger {
    background: var(--period);
    border-color: var(--period);
    color: #fff;
  }

  input[type='file'] {
    width: 100%;
  }
</style>
