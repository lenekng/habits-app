<script lang="ts">
  import { MUCUS_LABELS, type Bleeding } from '../../lib/types';
  import { t } from '../../lib/i18n/i18n.svelte';
  import { fmtTemp, type ChartDay, type ChartModel } from './kurvenblatt';

  let {
    model,
    scrollToEnd = false,
    selectedDate = null,
    onSelectDay
  }: {
    model: ChartModel;
    scrollToEnd?: boolean;
    selectedDate?: string | null;
    onSelectDay: (day: ChartDay) => void;
  } = $props();

  const COL = 20;
  const GUTTER = 46;
  const PAD_TOP = 22;
  const TEMP_H = 170;
  const AXIS_H = 18;
  const BLEED_H = 24;
  const MUCUS_H = 20;
  const PEAK_H = 16;
  const H = PAD_TOP + TEMP_H + AXIS_H + BLEED_H + MUCUS_H + PEAK_H + 6;

  const axisY = PAD_TOP + TEMP_H;
  const bleedCY = axisY + AXIS_H + BLEED_H / 2;
  const mucusCY = axisY + AXIS_H + BLEED_H + MUCUS_H / 2;
  const peakCY = axisY + AXIS_H + BLEED_H + MUCUS_H + PEAK_H / 2;

  const n = $derived(model.days.length);
  const plotW = $derived(n * COL + 6);

  function x(day: number): number {
    return (day - 1) * COL + COL / 2;
  }

  function y(v: number): number {
    return PAD_TOP + ((model.yMax - v) / (model.yMax - model.yMin)) * TEMP_H;
  }

  const linePoints = $derived(
    model.temps
      .filter((t) => !t.excluded)
      .map((t) => `${x(t.day)},${y(t.value)}`)
      .join(' ')
  );

  const BLEED_R: Record<Bleeding, number> = { spotting: 2.2, light: 3.8, medium: 5, heavy: 6.5 };

  let wrap = $state<HTMLDivElement | null>(null);

  $effect(() => {
    void model;
    const toEnd = scrollToEnd;
    const el = wrap;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollLeft = toEnd ? el.scrollWidth : 0;
    });
  });

  function fmtAxis(v: number): string {
    return v.toFixed(1).replace('.', ',');
  }

  function ovLabelX(px: number): number {
    return Math.min(Math.max(px, 58), Math.max(plotW - 58, 58));
  }

  function onKey(e: KeyboardEvent, d: ChartDay): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectDay(d);
    }
  }
</script>

<div class="chart-scroll" bind:this={wrap}>
  <div class="chart-inner">
    <svg class="axis" width={GUTTER} height={H} aria-hidden="true">
      <rect x="0" y="0" width={GUTTER} height={H} fill="var(--surface)" />
      <line x1={GUTTER - 0.5} y1="0" x2={GUTTER - 0.5} y2={H} stroke="var(--border)" />
      {#if model.hasTemps}
        <text x={GUTTER - 6} y={PAD_TOP - 9} text-anchor="end" class="ax unit">°C</text>
        {#each model.labelTicks as t (t)}
          <text x={GUTTER - 6} y={y(t) + 3} text-anchor="end" class="ax">{fmtAxis(t)}</text>
        {/each}
      {/if}
      <text x={GUTTER - 6} y={axisY + 13} text-anchor="end" class="ax">{t('chart.axisDay')}</text>
      <text x={GUTTER - 6} y={bleedCY + 3} text-anchor="end" class="ax">{t('cycle.bleeding')}</text>
      <text x={GUTTER - 6} y={mucusCY + 3} text-anchor="end" class="ax">{t('chart.axisMucus')}</text>
    </svg>

    <svg class="plot" width={plotW} height={H}>
      {#each model.days as d (d.day)}
        {#if d.isToday}
          <rect x={(d.day - 1) * COL} y="0" width={COL} height={H} fill="var(--accent-soft)" opacity="0.45" />
        {/if}
        {#if selectedDate === d.date}
          <rect x={(d.day - 1) * COL} y="0" width={COL} height={H} fill="var(--accent-soft)" opacity="0.8" />
        {/if}
      {/each}

      {#each model.days as d (d.day)}
        <line
          x1={d.day * COL}
          y1={PAD_TOP}
          x2={d.day * COL}
          y2={axisY}
          stroke="#e1e0d9"
          stroke-width={d.day % 5 === 0 ? 1 : 0.5}
          opacity="0.7"
        />
      {/each}

      {#if model.hasTemps}
        {#each model.gridTicks as t (t)}
          <line x1="0" y1={y(t)} x2={plotW} y2={y(t)} stroke="#e1e0d9" stroke-width="0.75" />
        {/each}
      {:else}
        <text x="10" y={PAD_TOP + TEMP_H / 2} class="empty-note">{t('chart.noTemps')}</text>
      {/if}

      {#if model.coverline}
        {@const cy = y(model.coverline.value)}
        {@const cx1 = (model.coverline.fromDay - 1) * COL}
        {@const cx2 = model.coverline.toDay * COL}
        <line x1={cx1} y1={cy} x2={cx2} y2={cy} stroke="var(--muted)" stroke-width="1.3" stroke-dasharray="5 3" />
        <text x={cx1 + 2} y={Math.max(cy - 5, 10)} class="cover-label">{t('chart.coverline', { temp: fmtTemp(model.coverline.value) })}</text>
      {/if}

      {#if model.ovulationDay}
        {@const ox = x(model.ovulationDay)}
        <line x1={ox} y1={PAD_TOP - 4} x2={ox} y2={axisY} stroke="var(--accent)" stroke-width="1.4" stroke-dasharray="4 3" />
        <text x={ovLabelX(ox)} y="12" text-anchor="middle" class="ov-label">{t('chart.ovulation', { day: model.ovulationDay })}</text>
      {/if}

      {#if linePoints}
        <polyline
          points={linePoints}
          fill="none"
          stroke="#2a78d6"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
      {/if}

      {#each model.temps as t (t.day)}
        {@const px = x(t.day)}
        {@const py = y(t.value)}
        {#if t.firstHigh || t.confirmed}
          <circle cx={px} cy={py} r="8" fill="none" stroke="#2a78d6" stroke-width="2" opacity="0.3" />
        {/if}
        {#if t.disturbed}
          <circle cx={px} cy={py} r="6.5" fill="none" stroke="var(--period)" stroke-width="1.4" stroke-dasharray="2.5 2" />
        {/if}
        {#if t.excluded}
          <circle cx={px} cy={py} r="4" fill="var(--surface)" stroke="#2a78d6" stroke-width="1.6" />
        {:else}
          <circle cx={px} cy={py} r="4" fill="#2a78d6" />
        {/if}
        {#if t.excluded || t.bracketed}
          <text x={px - 7.5} y={py + 4} text-anchor="middle" class="paren">(</text>
          <text x={px + 7.5} y={py + 4} text-anchor="middle" class="paren">)</text>
        {/if}
      {/each}

      <line x1="0" y1={axisY + 0.5} x2={plotW} y2={axisY + 0.5} stroke="var(--border)" />
      {#each model.days as d (d.day)}
        {#if d.day === 1 || d.day % 5 === 0}
          <text x={x(d.day)} y={axisY + 13} text-anchor="middle" class="tick">{d.day}</text>
        {/if}
      {/each}

      {#each model.days as d (d.day)}
        {@const c = d.entry?.cycle}
        {#if c?.bleeding}
          <circle cx={x(d.day)} cy={bleedCY} r={BLEED_R[c.bleeding]} fill="var(--period)" />
        {/if}
        {#if c?.spotting && !c?.bleeding}
          <circle cx={x(d.day)} cy={bleedCY} r="2.2" fill="none" stroke="var(--period)" stroke-width="1.3" />
        {:else if c?.spotting && c?.bleeding}
          <circle cx={x(d.day) + 6} cy={bleedCY - 7} r="2" fill="none" stroke="var(--period)" stroke-width="1.3" />
        {/if}
        {#if c?.mucus}
          <text x={x(d.day)} y={mucusCY + 3.5} text-anchor="middle" class="mucus">{MUCUS_LABELS[c.mucus].short}</text>
        {/if}
      {/each}

      {#if model.mucusPeakDay}
        {@const mx = x(model.mucusPeakDay)}
        {@const anchorEnd = mx > plotW - 105}
        <polygon
          points="{mx - 4.5},{peakCY + 3.5} {mx + 4.5},{peakCY + 3.5} {mx},{peakCY - 4.5}"
          fill="var(--accent)"
        />
        <text
          x={anchorEnd ? mx - 8 : mx + 8}
          y={peakCY + 3.5}
          text-anchor={anchorEnd ? 'end' : 'start'}
          class="peak-label"
        >
          {t('chart.mucusPeak')}
        </text>
      {/if}

      {#each model.days as d (d.day)}
        <rect
          class="tap"
          x={(d.day - 1) * COL}
          y="0"
          width={COL}
          height={H}
          fill="transparent"
          role="button"
          tabindex="0"
          aria-label={t('chart.dayAria', { day: d.day })}
          onclick={() => onSelectDay(d)}
          onkeydown={(e) => onKey(e, d)}
        />
      {/each}
    </svg>
  </div>
</div>

<div class="legend">
  <span class="item">
    <svg width="14" height="14"><circle cx="7" cy="7" r="4" fill="#2a78d6" /></svg>
    {t('chart.legendTemp')}
  </span>
  <span class="item">
    <svg width="26" height="14">
      <text x="4" y="11" text-anchor="middle" class="paren">(</text>
      <circle cx="13" cy="7" r="4" fill="var(--surface)" stroke="#2a78d6" stroke-width="1.5" />
      <text x="22" y="11" text-anchor="middle" class="paren">)</text>
    </svg>
    {t('chart.legendExcluded')}
  </span>
  <span class="item">
    <svg width="16" height="16">
      <circle cx="8" cy="8" r="6" fill="none" stroke="var(--period)" stroke-width="1.4" stroke-dasharray="2.5 2" />
      <circle cx="8" cy="8" r="3.5" fill="#2a78d6" />
    </svg>
    {t('chart.legendDisturbed')}
  </span>
  <span class="item">
    <svg width="18" height="18">
      <circle cx="9" cy="9" r="7" fill="none" stroke="#2a78d6" stroke-width="2" opacity="0.3" />
      <circle cx="9" cy="9" r="3.5" fill="#2a78d6" />
    </svg>
    {t('chart.legendFirstHigh')}
  </span>
  <span class="item">
    <svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="var(--period)" /></svg>
    {t('chart.legendBleeding')}
  </span>
  <span class="item">
    <svg width="12" height="12"><polygon points="1.5,10 10.5,10 6,2.5" fill="var(--accent)" /></svg>
    {t('chart.mucusPeak')}
  </span>
  <span class="item hint">{t('chart.legendHint')}</span>
</div>

<style>
  .chart-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 0.6rem;
  }

  .chart-inner {
    display: flex;
    width: max-content;
  }

  .axis {
    position: sticky;
    left: 0;
    z-index: 2;
    flex: none;
  }

  .plot {
    display: block;
  }

  .ax {
    font-size: 9px;
    fill: var(--muted);
  }

  .unit {
    font-weight: 600;
  }

  .tick {
    font-size: 9px;
    fill: var(--muted);
  }

  .mucus {
    font-size: 10px;
    font-weight: 600;
    fill: var(--muted);
  }

  .paren {
    font-size: 12px;
    fill: var(--muted);
  }

  .cover-label {
    font-size: 9.5px;
    fill: var(--muted);
  }

  .ov-label {
    font-size: 10px;
    font-weight: 600;
    fill: var(--text);
  }

  .peak-label {
    font-size: 9px;
    fill: var(--muted);
  }

  .empty-note {
    font-size: 11px;
    fill: var(--muted);
  }

  .tap {
    cursor: pointer;
    outline: none;
  }

  .tap:focus-visible {
    fill: var(--accent-soft);
    opacity: 0.5;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 0.9rem;
    margin-top: 0.6rem;
    font-size: 0.75rem;
    color: var(--muted);
  }

  .legend .item {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }

  .legend .hint {
    font-style: italic;
  }
</style>
