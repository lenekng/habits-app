<script lang="ts">
  import {
    cycleVariables,
    phaseProfile,
    meanByCycleDay,
    type VariableSpec
  } from '../../lib/stats';
  import type { Phase } from '../../lib/cycles';
  import { t, getLang } from '../../lib/i18n/i18n.svelte';
  import type { MessageKey } from '../../lib/i18n/messages';
  import { localizeVariableSpec, localizedHabitVariable } from '../../lib/i18n/variables';
  import { loadAnalyseData, type AnalyseData } from './statistik/data';

  const PHASE_LABEL_KEYS: Record<Phase, MessageKey> = {
    menstruation: 'phase.menstruation',
    follikel: 'phase.follikel',
    luteal: 'phase.luteal',
    unbestimmt: 'phase.unbestimmt'
  };

  const W = 360;
  const H = 160;
  const PAD = { left: 34, right: 10, top: 10, bottom: 20 };
  const MAX_DAY = 35;

  let data = $state<AnalyseData | null>(null);
  let selectedId = $state('gefuehle');

  $effect(() => {
    void loadAnalyseData().then((d) => {
      data = d;
    });
  });

  const variables = $derived.by((): VariableSpec[] => {
    if (!data) return [];
    const lang = getLang();
    const scales = data.habits
      .filter((h) => h.type === 'scale4')
      .map((h) => localizedHabitVariable(h, lang));
    const bools = data.habits
      .filter((h) => h.type === 'bool')
      .map((h) => localizedHabitVariable(h, lang));
    const temp = cycleVariables().find((v) => v.id === 'temperatur');
    return [...scales, ...bools, ...(temp ? [localizeVariableSpec(temp, lang)] : [])];
  });

  const variable = $derived(variables.find((v) => v.id === selectedId) ?? variables[0]);

  // ja/nein-Habits: Mittelwert von 0/1 = Anteil Ja-Tage → als Prozent darstellen.
  const isProportion = $derived(
    !!variable && data?.habits.find((h) => h.id === variable.id)?.type === 'bool'
  );

  const fmt = $derived((v: number): string =>
    isProportion ? `${Math.round(v * 100)} %` : v.toFixed(1)
  );

  const yLabel = $derived(isProportion ? t('phase.yProportion') : t('phase.yMean'));

  const rows = $derived.by(() => {
    if (!data || !variable) return [];
    return phaseProfile(data.entries, variable, data.index);
  });

  const maxMean = $derived(Math.max(0, ...rows.map((r) => r.mean ?? 0)));
  const noPhaseData = $derived(rows.every((r) => r.n === 0));

  const curve = $derived.by(() => {
    if (!data || !variable) return [];
    return meanByCycleDay(data.entries, variable, data.index, MAX_DAY);
  });

  const chart = $derived.by(() => {
    if (curve.length === 0) return null;
    const means = curve.map((p) => p.mean);
    let lo = Math.min(...means);
    let hi = Math.max(...means);
    if (isProportion) {
      lo = 0;
      hi = 1;
    } else if (hi - lo < 0.4) {
      const mid = (hi + lo) / 2;
      lo = mid - 0.2;
      hi = mid + 0.2;
    }
    const x = (day: number) => PAD.left + ((day - 1) / (MAX_DAY - 1)) * (W - PAD.left - PAD.right);
    const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
    const pts = curve.map((p) => ({ day: p.day, n: p.n, x: x(p.day), y: y(p.mean) }));
    const solid = pts.filter((p) => p.n >= 2);
    const path = solid
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
      .join(' ');
    const xTicks = [1, 7, 14, 21, 28, 35].map((d) => ({ d, x: x(d) }));
    const yTicks = [lo, (lo + hi) / 2, hi].map((v) => ({ v, y: y(v) }));
    return { pts, path, xTicks, yTicks };
  });

  const cycleCount = $derived(data?.index.cycles.length ?? 0);
</script>

<h2>{t('phase.heading')}</h2>

{#if !data}
  <p class="muted">{t('common.loading')}</p>
{:else}
  <div class="chips">
    {#each variables as v (v.id)}
      <button class:selected={variable?.id === v.id} onclick={() => (selectedId = v.id)}>
        {v.label}
      </button>
    {/each}
  </div>

  {#if cycleCount === 0}
    <p class="muted">{t('phase.noCyclesYet')}</p>
  {:else}
    {#if noPhaseData}
      <p class="muted phase-empty">{t('phase.noMeans')}</p>
    {:else}
      <div class="bars">
        {#each rows as row (row.phase)}
          <div class="bar-row">
            <span class="phase">{t(PHASE_LABEL_KEYS[row.phase])}</span>
            {#if row.n > 0 && row.mean !== undefined}
              <div class="track">
                <div
                  class="bar"
                  style="width: {isProportion
                    ? row.mean * 100
                    : maxMean > 0
                      ? (row.mean / maxMean) * 100
                      : 0}%"
                ></div>
              </div>
              <span class="value">{fmt(row.mean)} · n={row.n}</span>
            {:else}
              <span class="muted nodata">{t('phase.noData')}</span>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <h3>{t('phase.trendHeading')}</h3>
    {#if chart}
      <svg
        viewBox="0 0 {W} {H}"
        role="img"
        aria-label={t('phase.ariaChart', { y: yLabel, label: variable?.label ?? '' })}
      >
        {#each chart.yTicks as tick, k (k)}
          <line x1={PAD.left} y1={tick.y} x2={W - PAD.right} y2={tick.y} class="grid" />
          <text x={PAD.left - 4} y={tick.y + 3} class="tick" text-anchor="end">{fmt(tick.v)}</text>
        {/each}
        {#each chart.xTicks as tick (tick.d)}
          <line x1={tick.x} y1={PAD.top} x2={tick.x} y2={H - PAD.bottom} class="grid" />
          <text x={tick.x} y={H - 6} class="tick" text-anchor="middle">{tick.d}</text>
        {/each}
        {#if chart.path}
          <path d={chart.path} class="line" />
        {/if}
        {#each chart.pts as p (p.day)}
          <circle cx={p.x} cy={p.y} r="2.5" class="pt" class:faint={p.n < 2} />
        {/each}
      </svg>
      <p class="muted axis-note">{t('phase.axisNote', { y: yLabel })}</p>
    {:else}
      <p class="muted">{t('phase.noCurve')}</p>
    {/if}

    <p class="muted note">{t('phase.note', { n: cycleCount })}</p>
  {/if}
{/if}

<style>
  h3 {
    font-size: 0.95rem;
    margin: 1.1rem 0 0.4rem;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.85rem;
  }

  .chips button {
    min-height: 44px;
    font-size: 0.85rem;
  }

  .bars {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .bar-row {
    display: grid;
    grid-template-columns: 6.6rem 1fr auto;
    align-items: center;
    gap: 0.5rem;
  }

  .phase {
    font-size: 0.85rem;
  }

  .track {
    height: 14px;
    border-radius: 4px;
    background: color-mix(in srgb, var(--border) 45%, transparent);
  }

  .bar {
    height: 14px;
    border-radius: 4px;
    background: #2a78d6;
  }

  .value {
    font-size: 0.8rem;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }

  .nodata {
    grid-column: 2 / -1;
    font-size: 0.8rem;
  }

  .phase-empty {
    font-size: 0.85rem;
    line-height: 1.45;
    margin: 0;
  }

  svg {
    display: block;
    width: 100%;
    height: auto;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 0.6rem;
  }

  .grid {
    stroke: var(--border);
    stroke-width: 0.7;
  }

  .tick {
    fill: var(--muted);
    font-size: 9px;
  }

  .line {
    fill: none;
    stroke: #2a78d6;
    stroke-width: 1.5;
  }

  .pt {
    fill: #2a78d6;
  }

  .pt.faint {
    opacity: 0.3;
  }

  .axis-note,
  .note {
    font-size: 0.75rem;
    margin: 0.4rem 0 0;
  }
</style>
