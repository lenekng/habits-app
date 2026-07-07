<script lang="ts">
  import {
    habitVariable,
    cycleVariables,
    correlate,
    type VariableSpec,
    type CorrelationCell
  } from '../../lib/stats';
  import { loadAnalyseData, type AnalyseData } from './statistik/data';
  import { correlationColor, correlationTextColor } from './statistik/color';

  let data = $state<AnalyseData | null>(null);
  let lag = $state<0 | 1>(0);
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
    return [...data.habits.map(habitVariable), ...cycleVariables()];
  });

  const needsSelection = $derived(allVars.length > 10);

  const vars = $derived(
    needsSelection ? allVars.filter((v) => selectedIds.includes(v.id)) : allVars
  );

  const matrix = $derived.by((): (CorrelationCell | null)[][] => {
    if (!data) return [];
    const d = data;
    return vars.map((rowVar, i) =>
      vars.map((colVar, j) => {
        if (i === j) return null;
        if (lag === 0 && j < i) return null;
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
    return { a: a.label, b: b.label, r: cell.r, n: cell.n };
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

<h2>Korrelationen</h2>

{#if !data}
  <p class="muted">Laden…</p>
{:else if data.entries.length < 10}
  <p class="muted">
    Noch zu wenig Daten — Korrelationen erscheinen ab 10 Tagen mit Einträgen.
  </p>
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

  <div class="segmented">
    <button class:selected={lag === 0} onclick={() => (lag = 0)}>Gleicher Tag</button>
    <button class:selected={lag === 1} onclick={() => (lag = 1)}>Folgetag</button>
  </div>

  {#if lag === 1}
    <p class="muted explain">
      Bei „Folgetag“ wird die Zeilen-Variable heute mit der Spalten-Variable morgen gepaart (z. B.
      Alkohol heute ↔ Gut geschlafen morgen früh).
    </p>
  {/if}

  {#if vars.length < 2}
    <p class="muted">Mindestens zwei Variablen auswählen.</p>
  {:else}
    <div class="matrix-wrap">
      <div class="matrix" style="grid-template-columns: 6.5rem repeat({vars.length}, 2.8rem);">
        <div class="corner head"></div>
        {#each vars as v (v.id)}
          <div class="col-head head" title={v.label}><span>{short(v.label, 16)}</span></div>
        {/each}
        {#each vars as rowVar, i (rowVar.id)}
          <div class="row-head" title={rowVar.label}>{short(rowVar.label, 14)}</div>
          {#each vars as colVar, j (colVar.id)}
            {@const cell = matrix[i]?.[j] ?? null}
            {#if cell}
              <button
                class="cell"
                class:low-n={cell.n < 20}
                class:active={sel?.i === i && sel?.j === j}
                style="background: {cell.r !== undefined ? correlationColor(cell.r) : 'var(--surface)'};"
                onclick={() => (sel = { i, j })}
                aria-label="Korrelation {rowVar.label} und {colVar.label}"
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
        {detail.a} ↔ {detail.b} ({lag === 1 ? 'Folgetag' : 'Gleicher Tag'}):
        {#if detail.r !== undefined}
          ρ = {detail.r.toFixed(2)}, n = {detail.n}
        {:else}
          ρ nicht berechenbar, n = {detail.n}
        {/if}
      </p>
    {/if}

    <div class="scale-legend">
      <span class="muted">−1</span>
      <span class="gradient"></span>
      <span class="muted">+1</span>
    </div>
  {/if}

  <p class="muted footnote">
    Spearman-Rangkorrelation. Zellen mit n &lt; 20 sind ausgegraut. Bei vielen Zellen sind einzelne
    „starke“ Werte durch Zufall zu erwarten — Hypothesen, keine Beweise.
  </p>
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

  .segmented {
    display: flex;
    gap: 0.4rem;
    margin-bottom: 0.6rem;
  }

  .segmented button {
    flex: 1;
    min-height: 44px;
  }

  .explain {
    font-size: 0.8rem;
    margin: 0 0 0.6rem;
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
    align-items: center;
    height: 2.8rem;
    padding: 0 0.45rem;
    font-size: 0.72rem;
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

  .scale-legend {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: 0.6rem;
    font-size: 0.75rem;
  }

  .gradient {
    width: 7rem;
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
