<script lang="ts">
  import { db } from '../lib/db';
  import { buildCycleIndex, cycleLengthStats, type CycleInfo } from '../lib/cycles';
  import { todayISO } from '../lib/date';
  import { t, getLang } from '../lib/i18n/i18n.svelte';
  import type { DayEntry } from '../lib/types';
  import { predictNextPeriod } from '../lib/prediction';
  import Kurvenblatt from './zyklus/Kurvenblatt.svelte';
  import PredictionCard from './zyklus/PredictionCard.svelte';
  import DayDetail from './zyklus/DayDetail.svelte';
  import {
    buildChartModel,
    cycleDayOf,
    fmtDateLong,
    ruleExplanation,
    type ChartDay
  } from './zyklus/kurvenblatt';

  const today = todayISO();

  let entries = $state<DayEntry[]>([]);
  let loading = $state(true);
  let selectedIdx = $state(0);
  let detail = $state<ChartDay | null>(null);

  void db.day_entries.toArray().then((list) => {
    entries = list;
    selectedIdx = Math.max(0, buildCycleIndex(list).cycles.length - 1);
    loading = false;
  });

  const cycles = $derived(buildCycleIndex(entries).cycles);
  const selected = $derived(cycles[selectedIdx]);
  const isCurrent = $derived(selectedIdx === cycles.length - 1);
  const model = $derived(selected ? buildChartModel(selected, entries, today) : null);
  const stats = $derived(cycleLengthStats(cycles));
  const prediction = $derived(cycles.length > 0 ? predictNextPeriod(cycles, today) : null);

  const validTempCount = $derived.by(() => {
    const c = selected;
    if (!c) return 0;
    const end = c.endDate ?? '9999-12-31';
    return entries.filter(
      (e) =>
        e.date >= c.startDate &&
        e.date <= end &&
        e.cycle?.temperature !== undefined &&
        !e.cycle.temperature.excluded
    ).length;
  });

  const explanation = $derived(selected ? ruleExplanation(selected, validTempCount) : null);

  function cycleLabel(c: CycleInfo): string {
    if (c.length !== undefined) {
      return t('zyklus.cycleFrom', { date: fmtDateLong(c.startDate), len: c.length });
    }
    const day = Math.max(1, cycleDayOf(c, today));
    return t('zyklus.cycleFromDay', { date: fmtDateLong(c.startDate), day });
  }

  function fmtMedian(m: number): string {
    if (Number.isInteger(m)) return String(m);
    return getLang() === 'en' ? m.toFixed(1) : m.toFixed(1).replace('.', ',');
  }

  const statsLine = $derived.by(() => {
    if (stats.n === 0) return null;
    return t('zyklus.statsLine', {
      n: stats.n,
      median: fmtMedian(stats.median!),
      min: stats.min!,
      max: stats.max!
    });
  });

  function yearOf(iso: string): number {
    return Number(iso.slice(0, 4));
  }

  const historyByYear = $derived.by(() => {
    const groups: { year: number; items: { c: CycleInfo; i: number }[] }[] = [];
    for (let i = cycles.length - 1; i >= 0; i--) {
      const c = cycles[i]!;
      const y = yearOf(c.startDate);
      let g = groups.find((gr) => gr.year === y);
      if (!g) {
        g = { year: y, items: [] };
        groups.push(g);
      }
      g.items.push({ c, i });
    }
    return groups;
  });

  let expandedYears = $state<Set<number>>(new Set());
  let yearsInitialized = false;
  $effect(() => {
    if (yearsInitialized || cycles.length === 0) return;
    yearsInitialized = true;
    expandedYears = new Set([yearOf(cycles[cycles.length - 1]!.startDate)]);
  });

  function toggleYear(y: number): void {
    const next = new Set(expandedYears);
    if (next.has(y)) next.delete(y);
    else next.add(y);
    expandedYears = next;
  }

  function selectCycle(i: number): void {
    selectedIdx = i;
    detail = null;
    const y = yearOf(cycles[i]!.startDate);
    if (!expandedYears.has(y)) expandedYears = new Set(expandedYears).add(y);
  }
</script>

<section class="view">
  <h1>{t('zyklus.heading')}</h1>

  {#if loading}
    <p class="muted">{t('common.loading')}</p>
  {:else if cycles.length === 0}
    <div class="empty">
      <p><strong>{t('zyklus.emptyTitle')}</strong></p>
      <p>{t('zyklus.emptyBody')}</p>
    </div>
  {:else if selected && model}
    {#if prediction}
      <PredictionCard {prediction} />
    {/if}

    <div class="cycle-nav">
      <button
        class="nav-btn"
        disabled={selectedIdx === 0}
        onclick={() => selectCycle(selectedIdx - 1)}
        aria-label={t('zyklus.prevCycle')}
      >
        &lsaquo;
      </button>
      <span class="cycle-label">{cycleLabel(selected)}</span>
      <button
        class="nav-btn"
        disabled={selectedIdx >= cycles.length - 1}
        onclick={() => selectCycle(selectedIdx + 1)}
        aria-label={t('zyklus.nextCycle')}
      >
        &rsaquo;
      </button>
    </div>

    <Kurvenblatt
      {model}
      scrollToEnd={isCurrent}
      selectedDate={detail?.date ?? null}
      onSelectDay={(d) => (detail = d)}
    />

    {#if explanation}
      <div class="explain">
        <strong>{t(explanation.titleKey)}</strong>
        {#each explanation.lines as line, i (i)}
          <p>{t(line.key, line.params)}</p>
        {/each}
      </div>
    {/if}

    <h2>{t('zyklus.history')}</h2>
    {#if statsLine}
      <p class="stats">{statsLine}</p>
    {:else}
      <p class="stats">{t('zyklus.noCompletedCycle')}</p>
    {/if}
    <div class="years">
      {#each historyByYear as group (group.year)}
        {@const open = expandedYears.has(group.year)}
        <div class="year">
          <button class="year-head" onclick={() => toggleYear(group.year)} aria-expanded={open}>
            <span class="chev">{open ? '▾' : '▸'}</span>
            <span class="year-label">{group.year}</span>
            <span class="year-count">{t('zyklus.cyclesCount', { n: group.items.length })}</span>
          </button>
          {#if open}
            <ul class="history">
              {#each group.items as h (h.c.startDate)}
                <li>
                  <button
                    class="hist-row"
                    class:active={h.i === selectedIdx}
                    onclick={() => selectCycle(h.i)}
                  >
                    <span class="hist-date">{fmtDateLong(h.c.startDate)}</span>
                    <span class="hist-len">
                      {h.c.length !== undefined
                        ? t('zyklus.lenDays', { len: h.c.length })
                        : t('zyklus.running', { day: Math.max(1, cycleDayOf(h.c, today)) })}
                    </span>
                    <span class="hist-ov">
                      {h.c.ovulationEstimate
                        ? t('zyklus.ovDay', { day: cycleDayOf(h.c, h.c.ovulationEstimate) })
                        : t('zyklus.dash')}
                    </span>
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </div>
      {/each}
    </div>
  {/if}

  {#if detail}
    <DayDetail day={detail} onClose={() => (detail = null)} />
  {/if}
</section>

<style>
  .empty {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 0.6rem;
    padding: 1rem;
  }

  .empty p {
    margin: 0 0 0.5rem;
  }

  .empty p:last-child {
    margin-bottom: 0;
  }

  .cycle-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .cycle-label {
    flex: 1;
    text-align: center;
    font-weight: 600;
    font-size: 0.95rem;
  }

  .nav-btn {
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    font-size: 1.3rem;
    line-height: 1;
  }

  .nav-btn:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .explain {
    margin-top: 0.9rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 0.6rem;
    padding: 0.75rem 0.9rem;
    font-size: 0.9rem;
  }

  .explain p {
    margin: 0.4rem 0 0;
    color: var(--text);
  }

  .stats {
    margin: 0 0 0.5rem;
    font-size: 0.85rem;
    color: var(--muted);
  }

  .years {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .year-head {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 2.75rem;
    text-align: left;
  }

  .chev {
    color: var(--muted);
    width: 0.9rem;
  }

  .year-label {
    flex: 1;
    font-weight: 600;
  }

  .year-count {
    font-size: 0.8rem;
    color: var(--muted);
  }

  .history {
    list-style: none;
    margin: 0.3rem 0 0;
    padding: 0 0 0 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .hist-row {
    width: 100%;
    display: flex;
    align-items: baseline;
    gap: 0.6rem;
    text-align: left;
    min-height: 2.75rem;
  }

  .hist-row.active {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  .hist-date {
    flex: 1;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .hist-len {
    font-size: 0.85rem;
    white-space: nowrap;
  }

  .hist-ov {
    font-size: 0.85rem;
    color: var(--muted);
    white-space: nowrap;
  }
</style>
