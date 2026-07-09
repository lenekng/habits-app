<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { MUCUS_LABELS, type Bleeding, type Mucus } from '../../lib/types';
  import { t } from '../../lib/i18n/i18n.svelte';
  import type { MessageKey } from '../../lib/i18n/messages';
  import { fmtDateLong, fmtTemp, type ChartDay } from './kurvenblatt';

  let { day, onClose }: { day: ChartDay; onClose: () => void } = $props();

  const bleedingKey = (b: Bleeding): MessageKey => `bleeding.${b}` as MessageKey;
  const MUCUS_DESC: Record<Mucus, MessageKey> = {
    t: 'mucus.t',
    none: 'mucus.none',
    f: 'mucus.f',
    S: 'mucus.S',
    'S+': 'mucus.Splus'
  };

  const c = $derived(day.entry?.cycle);

  const extras = $derived.by(() => {
    const out: string[] = [];
    if (c?.midPain) out.push(t('sign.midPain'));
    if (c?.breastTenderness) out.push(t('sign.breastTenderness'));
    if (c?.spotting) out.push(t('sign.spotting'));
    return out;
  });

  const hasData = $derived(
    !!(
      c &&
      (c.bleeding || c.temperature || c.mucus || c.midPain || c.breastTenderness || c.spotting || c.note)
    )
  );
</script>

<button class="backdrop" transition:fade={{ duration: 150 }} onclick={onClose} aria-label={t('common.close')}></button>

<div
  class="sheet"
  transition:fly={{ y: 240, duration: 200 }}
  role="dialog"
  aria-modal="true"
  aria-label={t('day.aria')}
>
  <header>
    <strong>{fmtDateLong(day.date)}</strong>
    <span class="muted">{t('day.cycleDay', { day: day.day })}</span>
  </header>

  {#if hasData}
    <dl>
      {#if c?.temperature}
        <dt>{t('chart.legendTemp')}</dt>
        <dd>
          {t('day.tempLine', { temp: fmtTemp(c.temperature.value), time: c.temperature.time })}
          {#if c.temperature.excluded}<span class="tag">{t('chart.legendExcluded')}</span>{/if}
          {#if c.temperature.disturbed}<span class="tag">{t('day.disturbedTag')}</span>{/if}
          {#if c.temperature.disturbanceNote}
            <span class="note-line">{t('day.disturbNote', { note: c.temperature.disturbanceNote })}</span>
          {/if}
        </dd>
      {/if}
      {#if c?.bleeding}
        <dt>{t('cycle.bleeding')}</dt>
        <dd>{t(bleedingKey(c.bleeding))}</dd>
      {/if}
      {#if c?.mucus}
        <dt>{t('cycle.mucus')}</dt>
        <dd>{MUCUS_LABELS[c.mucus].short} — {t(MUCUS_DESC[c.mucus])}</dd>
      {/if}
      {#if extras.length > 0}
        <dt>{t('cycle.extras')}</dt>
        <dd>{extras.join(', ')}</dd>
      {/if}
      {#if c?.note}
        <dt>{t('cycle.note')}</dt>
        <dd>{c.note}</dd>
      {/if}
    </dl>
  {:else}
    <p class="muted">{t('day.noData')}</p>
  {/if}

  <button class="close" onclick={onClose}>{t('common.close')}</button>
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(0, 0, 0, 0.35);
    border: none;
    border-radius: 0;
    padding: 0;
  }

  .sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 41;
    max-width: 40rem;
    margin: 0 auto;
    background: var(--surface);
    border-top: 1px solid var(--border);
    border-radius: 1rem 1rem 0 0;
    padding: 1rem 1rem calc(env(safe-area-inset-bottom) + 1.25rem);
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.12);
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.75rem;
    margin-bottom: 0.9rem;
  }

  header .muted {
    font-size: 0.85rem;
  }

  dl {
    margin: 0;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.45rem 0.9rem;
  }

  dt {
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--muted);
    padding-top: 0.1rem;
  }

  dd {
    margin: 0;
  }

  .tag {
    display: inline-block;
    margin-left: 0.35rem;
    padding: 0.05rem 0.4rem;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    font-size: 0.75rem;
    color: var(--muted);
    vertical-align: middle;
  }

  .note-line {
    display: block;
    font-size: 0.85rem;
    color: var(--muted);
  }

  .close {
    margin-top: 1rem;
    width: 100%;
    min-height: 2.75rem;
  }
</style>
