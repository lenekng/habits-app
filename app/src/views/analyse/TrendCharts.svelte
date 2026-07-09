<script lang="ts">
  import { activeHabits, db } from '../../lib/db';
  import { t } from '../../lib/i18n/i18n.svelte';
  import { todayISO } from '../../lib/date';
  import { buildCycleIndex } from '../../lib/cycles';
  import type { DayEntry, HabitDefinition } from '../../lib/types';
  import {
    buildChartConfig,
    phaseBands,
    rangeStart,
    trendVariables,
    RANGE_OPTIONS,
    type RangeKey
  } from './trends/data';
  import TrendChart from './trends/TrendChart.svelte';

  let habits = $state<HabitDefinition[]>([]);
  let entries = $state<DayEntry[]>([]);
  let loading = $state(true);
  let selectedId = $state('gefuehle');
  let range = $state<RangeKey>('4w');

  void Promise.all([activeHabits(), db.day_entries.toArray()]).then(([defs, list]) => {
    habits = defs;
    entries = list.sort((a, b) => a.date.localeCompare(b.date));
    const vars = trendVariables(defs);
    if (!vars.some((v) => v.id === selectedId) && vars.length > 0) selectedId = vars[0]!.id;
    loading = false;
  });

  const endISO = todayISO();
  const variables = $derived(trendVariables(habits));
  const habitVars = $derived(variables.filter((v) => v.group === 'habit'));
  const cycleVars = $derived(variables.filter((v) => v.group === 'zyklus'));
  const selected = $derived(variables.find((v) => v.id === selectedId));
  const index = $derived(buildCycleIndex(entries));
  const startISO = $derived(rangeStart(range, entries[0]?.date));
  const config = $derived(
    selected && startISO ? buildChartConfig(selected, entries, index, startISO, endISO) : null
  );
  const bands = $derived(startISO ? phaseBands(index, startISO, endISO) : []);
</script>

<h2>{t('analyse.trends')}</h2>

{#if loading}
  <p class="muted">{t('common.loading')}</p>
{:else}
  <div class="controls">
    <select bind:value={selectedId} aria-label={t('analyse.pickVariable')}>
      <optgroup label={t('habits.heading')}>
        {#each habitVars as v (v.id)}
          <option value={v.id}>{v.label}</option>
        {/each}
      </optgroup>
      <optgroup label={t('nav.zyklus')}>
        {#each cycleVars as v (v.id)}
          <option value={v.id}>{v.label}</option>
        {/each}
      </optgroup>
    </select>

    <div class="segments" role="group" aria-label={t('analyse.range')}>
      {#each RANGE_OPTIONS as opt (opt.key)}
        <button class:selected={range === opt.key} onclick={() => (range = opt.key)}>
          {t(opt.labelKey)}
        </button>
      {/each}
    </div>
  </div>

  {#if config && config.hasData && selected}
    <TrendChart {config} {bands} title={selected.label} />
    <p class="band-legend muted">
      <span class="swatch mens"></span> {t('phase.menstruation')}
      <span class="swatch luteal"></span> {t('phase.luteal')}
    </p>
  {:else}
    <p class="muted">{t('analyse.noVarData')}</p>
  {/if}
{/if}

<style>
  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .controls select {
    flex: 1 1 10rem;
    min-height: 44px;
  }

  .segments {
    display: flex;
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .segments button {
    border: none;
    border-radius: 0;
    min-height: 44px;
    padding: 0.45rem 0.7rem;
    font-size: 0.85rem;
  }

  .segments button + button {
    border-left: 1px solid var(--border);
  }

  .band-legend {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0.5rem 0 0;
    font-size: 0.75rem;
  }

  .band-legend .luteal {
    margin-left: 0.6rem;
  }

  .swatch {
    display: inline-block;
    width: 0.9rem;
    height: 0.9rem;
    border-radius: 0.2rem;
    border: 1px solid var(--border);
  }

  .swatch.mens {
    background: #f3dcdb;
  }

  .swatch.luteal {
    background: #dcebe1;
  }
</style>
