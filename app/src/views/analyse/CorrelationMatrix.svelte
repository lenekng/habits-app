<script lang="ts">
  import {
    cycleVariables,
    correlate,
    pairLag,
    type VariableSpec,
    type CorrelationCell
  } from '../../lib/stats';
  import { t, getLang } from '../../lib/i18n/i18n.svelte';
  import { localizeVariableSpec, localizedHabitVariable } from '../../lib/i18n/variables';
  import { loadAnalyseData, type AnalyseData } from './statistik/data';
  import { correlationColor, correlationTextColor } from './statistik/color';

  let data = $state<AnalyseData | null>(null);
  let selectedIds = $state<string[]>([]);
  let sel = $state<{ i: number; j: number } | null>(null);

  $effect(() => {
    void loadAnalyseData().then((d) => {
      data = d;
      selectedIds = [
        ...d.habits.filter((h) => h.type === 'scale4').map((h) => h.id),
        'temperatur',
        'zyklustag'
      ];
    });
  });

  const allVars = $derived.by((): VariableSpec[] => {
    if (!data) return [];
    const lang = getLang();
    return [
      ...data.habits.map((h) => localizedHabitVariable(h, lang)),
      ...cycleVariables().map((v) => localizeVariableSpec(v, lang))
    ];
  });

  const needsSelection = $derived(allVars.length > 10);

  const vars = $derived(
    needsSelection ? allVars.filter((v) => selectedIds.includes(v.id)) : allVars
  );

  const carryoverLabels = $derived(vars.filter((v) => v.carryover).map((v) => v.label));

  const noTargetLabels = $derived(
    carryoverLabels.length > 0 ? vars.filter((v) => !v.carryoverTarget).map((v) => v.label) : []
  );

  const matrix = $derived.by((): (CorrelationCell | null)[][] => {
    if (!data) return [];
    const d = data;
    return vars.map((rowVar, i) =>
      vars.map((colVar, j) => {
        if (i === j) return null;
        const lag = pairLag(rowVar, colVar);
        if (lag === undefined) return null;
        return correlate(d.entries, rowVar, colVar, lag, d.index);
      })
    );
  });

  const detail = $derived.by(() => {
    if (!sel) return null;
    const cell = matrix[sel.i]?.[sel.j];
    const a = vars[sel.i];
    const b = vars[sel.j];
    if (!cell || !a || !b) return null;
    const colWord = cell.r === undefined ? '' : cell.r >= 0 ? b.highLabel : b.lowLabel;
    const sentence =
      cell.r === undefined
        ? ''
        : t(a.carryover ? 'corr.sentPrev' : 'corr.sentSame', {
            row: a.label,
            rowHigh: a.highLabel,
            col: b.label,
            colWord
          });
    return { a: a.label, b: b.label, r: cell.r, n: cell.n, nextDay: a.carryover, sentence };
  });

  function toggleVar(id: string): void {
    sel = null;
    selectedIds = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
  }

  function short(label: string, max: number): string {
    return label.length > max ? label.slice(0, max - 1) + '…' : label;
  }
</script>

<h2>{t('corr.heading')}</h2>

{#if !data}
  <p class="muted">{t('common.loading')}</p>
{:else if data.entries.length < 10}
  <p class="muted">{t('corr.tooFewData')}</p>
{:else}
  {#if needsSelection}
    <div class="chips">
      {#each allVars as v (v.id)}
        <button class:selected={selectedIds.includes(v.id)} onclick={() => toggleVar(v.id)}>
          {v.label}
        </button>
      {/each}
    </div>
  {/if}

  <div class="reading">
    <p><strong>{t('corr.howToReadTitle')}</strong> {t('corr.howToReadBody')}</p>
    {#if carryoverLabels.length > 0}
      <p class="muted">{t('corr.carryoverNote', { labels: carryoverLabels.join(', ') })}</p>
    {/if}
    {#if noTargetLabels.length > 0}
      <p class="muted">{t('corr.noCarryoverTargetNote', { labels: noTargetLabels.join(', ') })}</p>
    {/if}
  </div>

  {#if vars.length < 2}
    <p class="muted">{t('corr.selectHint')}</p>
  {:else}
    <div class="matrix-wrap">
      <div class="matrix" style="grid-template-columns: 7rem repeat({vars.length}, 2.8rem);">
        <div class="corner head"></div>
        {#each vars as v (v.id)}
          <div class="col-head head" title={v.label}><span>{short(v.label, 16)}</span></div>
        {/each}
        {#each vars as rowVar, i (rowVar.id)}
          <div class="row-head" title={rowVar.label}>
            <span class="row-name">{short(rowVar.label, 13)}</span>
            {#if rowVar.carryover}<span class="pill">{t('corr.pillPrevDay')}</span>{/if}
          </div>
          {#each vars as colVar, j (colVar.id)}
            {@const cell = matrix[i]?.[j] ?? null}
            {#if cell}
              <button
                class="cell"
                class:low-n={cell.n < 20}
                class:active={sel?.i === i && sel?.j === j}
                style="background: {cell.r !== undefined ? correlationColor(cell.r) : 'var(--surface)'};"
                onclick={() => (sel = { i, j })}
                aria-label={t('corr.cellAria', { a: rowVar.label, b: colVar.label })}
              >
                {#if cell.r !== undefined}
                  <span class="r" style="color: {correlationTextColor(cell.r)}">{cell.r.toFixed(2)}</span>
                  <span class="n" style="color: {correlationTextColor(cell.r)}">{cell.n}</span>
                {:else}
                  <span class="r muted">–</span>
                  <span class="n muted">{cell.n}</span>
                {/if}
              </button>
            {:else}
              <div class="cell blank"></div>
            {/if}
          {/each}
        {/each}
      </div>
    </div>

    {#if detail}
      <p class="detail">
        {detail.a} ↔ {detail.b} ({detail.nextDay ? t('corr.relPrevToday') : t('corr.relSameDay')}):
        {#if detail.r !== undefined}
          {t('corr.rhoVal', { r: detail.r.toFixed(2), n: detail.n })}
        {:else}
          {t('corr.rhoNA', { n: detail.n })}
        {/if}
      </p>
      {#if detail.sentence}
        <p class="detail-plain">{detail.sentence}</p>
      {/if}
    {/if}

    <div class="scale-legend">
      <span class="muted">{t('corr.legendLow')}</span>
      <span class="gradient"></span>
      <span class="muted">{t('corr.legendHigh')}</span>
    </div>
  {/if}

  <p class="muted footnote">{t('corr.footnote')}</p>
{/if}

<style>
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

  .reading {
    margin-bottom: 0.85rem;
  }

  .reading p {
    margin: 0 0 0.4rem;
    font-size: 0.82rem;
    line-height: 1.4;
  }

  .reading p:last-child {
    margin-bottom: 0;
  }

  .pill {
    display: inline-block;
    background: var(--accent-soft);
    color: var(--accent);
    border-radius: 999px;
    padding: 0.05rem 0.4rem;
    font-size: 0.62rem;
    font-weight: 600;
    white-space: nowrap;
    vertical-align: middle;
  }

  .matrix-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 0.6rem;
  }

  .matrix {
    display: grid;
    width: max-content;
  }

  .head {
    height: 5.8rem;
    border-bottom: 2px solid var(--border);
  }

  .corner,
  .row-head {
    position: sticky;
    left: 0;
    z-index: 2;
    background: var(--surface);
    border-right: 2px solid var(--border);
  }

  .row-head {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 2px;
    height: 2.8rem;
    padding: 0 0.45rem;
    font-size: 0.72rem;
    overflow: hidden;
  }

  .row-name {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .col-head {
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .col-head span {
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    font-size: 0.68rem;
    max-height: 5.4rem;
    white-space: nowrap;
    overflow: hidden;
  }

  .cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    width: 2.8rem;
    height: 2.8rem;
    padding: 0;
    border: 1px solid var(--bg);
    border-radius: 0;
    touch-action: manipulation;
  }

  .cell.blank {
    background: none;
    border: 1px solid transparent;
  }

  .cell.low-n {
    opacity: 0.45;
  }

  .cell.low-n .n {
    font-style: italic;
  }

  .cell.active {
    outline: 2px solid var(--text);
    outline-offset: -2px;
  }

  .r {
    font-size: 0.62rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .n {
    font-size: 0.55rem;
    font-variant-numeric: tabular-nums;
  }

  .detail {
    margin: 0.6rem 0 0;
    font-size: 0.85rem;
    font-weight: 500;
  }

  .detail-plain {
    margin: 0.25rem 0 0;
    font-size: 0.85rem;
    line-height: 1.4;
    color: var(--text);
  }

  .scale-legend {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.6rem;
    font-size: 0.75rem;
  }

  .gradient {
    flex: 1;
    max-width: 7rem;
    height: 0.55rem;
    border-radius: 4px;
    background: linear-gradient(90deg, #e34948, #f0efec, #2a78d6);
    border: 1px solid var(--border);
  }

  .footnote {
    font-size: 0.75rem;
    margin: 0.5rem 0 0;
  }
</style>
