<script lang="ts">
  import type { PeriodPrediction } from '../../lib/prediction';
  import { t, locale } from '../../lib/i18n/i18n.svelte';

  let { prediction }: { prediction: PeriodPrediction } = $props();

  function fmt(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y!, m! - 1, d!).toLocaleDateString(locale(), {
      weekday: 'short',
      day: 'numeric',
      month: 'long'
    });
  }

  function fmtShort(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y!, m! - 1, d!).toLocaleDateString(locale(), { day: 'numeric', month: 'short' });
  }

  const relative = $derived.by(() => {
    const p = prediction;
    if (p.overdueDays && p.overdueDays > 0) {
      return { text: t('pred.overdue', { n: p.overdueDays }), tone: 'over' };
    }
    const d = p.daysUntilLikely;
    if (d === undefined) return null;
    if (d === 0) return { text: t('pred.today'), tone: 'soon' };
    if (d < 0) return { text: t('pred.before', { n: -d }), tone: 'over' };
    return { text: t('pred.inDays', { n: d }), tone: d <= 3 ? 'soon' : 'normal' };
  });

  const basis = $derived.by(() => {
    const p = prediction;
    if (p.method === 'temperature') {
      return p.usedDefaultLuteal
        ? t('pred.basisTempDefault')
        : t('pred.basisTempOwn', { n: p.basedOnCycles });
    }
    if (p.method === 'length') {
      const hint = p.hasTempShift ? '' : t('pred.basisLengthHint');
      return t('pred.basisLength', { n: p.basedOnCycles }) + hint;
    }
    return '';
  });
</script>

<div class="pred" class:over={relative?.tone === 'over'}>
  <div class="head">
    <span class="label">{t('pred.title')}</span>
    {#if prediction.method === 'temperature'}<span class="pill">{t('pred.exact')}</span>{/if}
  </div>

  {#if prediction.method === 'none'}
    {#if prediction.reason}
      <p class="reason">{t(prediction.reason.key, prediction.reason.params)}</p>
    {/if}
  {:else}
    <p class="main">
      <span class="date">{fmt(prediction.likelyDate!)}</span>
      {#if relative}<span class="rel {relative.tone}">· {relative.text}</span>{/if}
    </p>
    <p class="window">
      {t('pred.window', {
        from: fmtShort(prediction.earliestDate!),
        to: fmtShort(prediction.latestDate!)
      })}
    </p>
  {/if}

  <p class="basis">{basis}</p>
</div>

<style>
  .pred {
    background: var(--accent-soft);
    border: 1px solid var(--border);
    border-radius: 0.6rem;
    padding: 0.8rem 0.9rem;
    margin-bottom: 0.9rem;
  }

  .pred.over {
    background: var(--period-soft);
  }

  .head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.3rem;
  }

  .label {
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--muted);
  }

  .pill {
    background: var(--accent);
    color: #fff;
    border-radius: 999px;
    padding: 0.05rem 0.45rem;
    font-size: 0.62rem;
    font-weight: 600;
  }

  .main {
    margin: 0.1rem 0 0.25rem;
    font-size: 1.05rem;
  }

  .date {
    font-weight: 700;
  }

  .rel {
    font-weight: 600;
  }

  .rel.soon {
    color: var(--accent);
  }

  .rel.over {
    color: var(--period);
  }

  .window {
    margin: 0 0 0.35rem;
    font-size: 0.85rem;
    color: var(--text);
  }

  .basis,
  .reason {
    margin: 0;
    font-size: 0.78rem;
    line-height: 1.4;
    color: var(--muted);
  }
</style>
