<script lang="ts">
  import { t } from '../../lib/i18n/i18n.svelte';
  import type { MessageKey } from '../../lib/i18n/messages';
  import { formatDateLong } from '../../lib/i18n/format';
  import { PATCH_FIELDS, type PatchField } from '../../lib/health/mapping';
  import { mergePatchesIntoDb, type MergeResult } from '../../lib/health/merge';
  import { parseHealthExport, type ParseProgress, type ParseResult } from '../../lib/health/stream';

  const FIELD_LABELS: Record<PatchField, MessageKey> = {
    bleeding: 'health.fieldBleeding',
    temperature: 'health.fieldTemp',
    mucus: 'health.fieldMucus',
    spotting: 'health.fieldSpotting',
    breastTenderness: 'health.fieldBreast'
  };

  type Phase = 'idle' | 'parsing' | 'saving' | 'done' | 'error';

  let phase = $state<Phase>('idle');
  let progress = $state<ParseProgress | null>(null);
  let parseResult = $state<ParseResult | null>(null);
  let mergeResult = $state<MergeResult | null>(null);
  let errorMessage = $state('');

  const busy = $derived(phase === 'parsing' || phase === 'saving');

  const percent = $derived.by(() => {
    const p = progress;
    if (p === null || p.totalBytes <= 0) return 0;
    return Math.min(100, Math.round((p.bytesRead / p.totalBytes) * 100));
  });

  const runningTotal = $derived.by(() => {
    const p = progress;
    if (p === null) return 0;
    return PATCH_FIELDS.reduce((sum, field) => sum + p.recordCounts[field], 0);
  });

  const foundTotal = $derived.by(() => {
    const r = parseResult;
    if (r === null) return 0;
    return PATCH_FIELDS.reduce((sum, field) => sum + r.recordCounts[field], 0);
  });

  async function onFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file === undefined || busy) return;

    phase = 'parsing';
    progress = null;
    parseResult = null;
    mergeResult = null;
    errorMessage = '';

    try {
      const parsed = await parseHealthExport(file, (p) => {
        progress = { ...p, recordCounts: { ...p.recordCounts } };
      });
      parseResult = parsed;
      phase = 'saving';
      mergeResult = await mergePatchesIntoDb(parsed.patches);
      phase = 'done';
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
      phase = 'error';
    }
  }
</script>

<h1>{t('health.title')}</h1>

<p>{t('health.intro')}</p>
<p class="muted">{t('health.introFields')}</p>

<label class="file-button" class:disabled={busy}>
  {#if busy}
    {t('health.importing')}
  {:else if phase === 'idle'}
    {t('health.pickFile')}
  {:else}
    {t('health.pickAnother')}
  {/if}
  <input
    type="file"
    accept=".zip,.xml,application/zip,text/xml"
    disabled={busy}
    onchange={onFileChange}
  />
</label>

{#if busy}
  <div class="progress" role="status">
    <div class="bar">
      <div class="fill" style:width="{percent}%"></div>
    </div>
    {#if phase === 'parsing'}
      <p class="muted">{t('health.progressRead', { percent, total: runningTotal })}</p>
    {:else}
      <p class="muted">{t('health.saving')}</p>
    {/if}
  </div>
{/if}

{#if phase === 'done' && parseResult !== null && mergeResult !== null}
  <h2>{t('health.doneTitle')}</h2>
  {#if foundTotal === 0}
    <p>{t('health.noData')}</p>
  {:else}
    {#if parseResult.dateRange !== null}
      <p>{t('health.range', { from: formatDateLong(parseResult.dateRange.from), to: formatDateLong(parseResult.dateRange.to) })}</p>
    {/if}
    <p>
      {t('health.summary', {
        created: mergeResult.daysCreated,
        updated: mergeResult.daysUpdated,
        unchanged: mergeResult.daysUnchanged
      })}
    </p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{t('health.thType')}</th>
            <th>{t('health.thRecords')}</th>
            <th>{t('health.thImported')}</th>
            <th>{t('health.thSkipped')}</th>
          </tr>
        </thead>
        <tbody>
          {#each PATCH_FIELDS as field (field)}
            <tr>
              <td>{t(FIELD_LABELS[field])}</td>
              <td>{parseResult.recordCounts[field]}</td>
              <td>{mergeResult.imported[field]}</td>
              <td>{mergeResult.skipped[field]}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="muted">{t('health.skippedNote')}</p>
    {#if parseResult.recordCounts.mucus > 0}
      <p class="muted">{t('health.mucusNote')}</p>
    {/if}
  {/if}
  {#if parseResult.warnings.length > 0}
    <h2>{t('health.warningsTitle')}</h2>
    <ul class="warnings">
      {#each parseResult.warnings as warning}
        <li>{warning}</li>
      {/each}
    </ul>
  {/if}
{/if}

{#if phase === 'error'}
  <p class="error">{t('health.failed', { msg: errorMessage })}</p>
{/if}

<style>
  .file-button {
    display: inline-block;
    background: var(--accent);
    color: #fff;
    border-radius: 0.5rem;
    padding: 0.6rem 1rem;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .file-button.disabled {
    opacity: 0.6;
    cursor: default;
  }

  .file-button input {
    display: none;
  }

  .progress {
    margin-top: 1rem;
  }

  .bar {
    height: 0.5rem;
    background: var(--accent-soft);
    border-radius: 0.25rem;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: var(--accent);
    transition: width 0.2s ease;
  }

  .table-wrap {
    overflow-x: auto;
  }

  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.9rem;
  }

  th,
  td {
    text-align: left;
    padding: 0.35rem 0.5rem;
    border-bottom: 1px solid var(--border);
  }

  th:nth-child(n + 2),
  td:nth-child(n + 2) {
    text-align: right;
  }

  .warnings {
    color: var(--period);
    padding-left: 1.2rem;
    margin: 0.25rem 0;
  }

  .error {
    color: var(--period);
  }
</style>
