<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { BLEEDING_LABELS, MUCUS_LABELS } from '../../lib/types';
  import { fmtDateLong, fmtTemp, type ChartDay } from './kurvenblatt';

  let { day, onClose }: { day: ChartDay; onClose: () => void } = $props();

  const c = $derived(day.entry?.cycle);

  const extras = $derived.by(() => {
    const out: string[] = [];
    if (c?.midPain) out.push('Mittelschmerz');
    if (c?.breastTenderness) out.push('Brustspannen');
    if (c?.spotting) out.push('Zwischenblutung');
    return out;
  });

  const hasData = $derived(
    !!(
      c &&
      (c.bleeding || c.temperature || c.mucus || c.midPain || c.breastTenderness || c.spotting || c.note)
    )
  );
</script>

<button class="backdrop" transition:fade={{ duration: 150 }} onclick={onClose} aria-label="Schließen"></button>

<div
  class="sheet"
  transition:fly={{ y: 240, duration: 200 }}
  role="dialog"
  aria-modal="true"
  aria-label="Tagesdetails"
>
  <header>
    <strong>{fmtDateLong(day.date)}</strong>
    <span class="muted">Zyklustag {day.day}</span>
  </header>

  {#if hasData}
    <dl>
      {#if c?.temperature}
        <dt>Temperatur</dt>
        <dd>
          {fmtTemp(c.temperature.value)} °C um {c.temperature.time} Uhr
          {#if c.temperature.excluded}<span class="tag">ausgeklammert</span>{/if}
          {#if c.temperature.disturbed}<span class="tag">gestört</span>{/if}
          {#if c.temperature.disturbanceNote}
            <span class="note-line">Störung: {c.temperature.disturbanceNote}</span>
          {/if}
        </dd>
      {/if}
      {#if c?.bleeding}
        <dt>Blutung</dt>
        <dd>{BLEEDING_LABELS[c.bleeding]}</dd>
      {/if}
      {#if c?.mucus}
        <dt>Zervixschleim</dt>
        <dd>{MUCUS_LABELS[c.mucus].short} — {MUCUS_LABELS[c.mucus].description}</dd>
      {/if}
      {#if extras.length > 0}
        <dt>Zusatzzeichen</dt>
        <dd>{extras.join(', ')}</dd>
      {/if}
      {#if c?.note}
        <dt>Notiz</dt>
        <dd>{c.note}</dd>
      {/if}
    </dl>
  {:else}
    <p class="muted">Keine Zyklusdaten für diesen Tag.</p>
  {/if}

  <button class="close" onclick={onClose}>Schließen</button>
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
