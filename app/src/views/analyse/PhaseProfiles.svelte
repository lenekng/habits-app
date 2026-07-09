<script lang="ts">
  import {
    habitVariable,
    cycleVariables,
    phaseProfile,
    meanByCycleDay,
    type VariableSpec
  } from '../../lib/stats';
  import type { Phase } from '../../lib/cycles';
  import { loadAnalyseData, type AnalyseData } from './statistik/data';

  const PHASE_LABELS: Record<Phase, string> = {
    menstruation: 'Menstruation',
    follikel: 'Follikelphase',
    luteal: 'Lutealphase',
    unbestimmt: 'Unbestimmt'
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
    const scales = data.habits.filter((h) => h.type === 'scale4').map(habitVariable);
    const bools = data.habits.filter((h) => h.type === 'bool').map(habitVariable);
    const temp = cycleVariables().find((v) => v.id === 'temperatur');
    return [...scales, ...bools, ...(temp ? [temp] : [])];
  });

  const variable = $derived(variables.find((v) => v.id === selectedId) ?? variables[0]);

  // ja/nein-Habits: Mittelwert von 0/1 = Anteil Ja-Tage → als Prozent darstellen.
  const isProportion = $derived(
    !!variable && data?.habits.find((h) => h.id === variable.id)?.type === 'bool'
  );

  const fmt = $derived((v: number): string =>
    isProportion ? `${Math.round(v * 100)} %` : v.toFixed(1)
  );

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

<h2>Phasen-Profile</h2>

{#if !data}
  <p class="muted">Laden…</p>
{:else}
  <div class="chips">
    {#each variables as v (v.id)}
      <button class:selected={variable?.id === v.id} onclick={() => (selectedId = v.id)}>
        {v.label}
      </button>
    {/each}
  </div>

  {#if cycleCount === 0}
    <p class="muted">
      Noch keine Zyklen erkannt — Phasen-Profile erscheinen, sobald eine Periode eingetragen ist.
    </p>
  {:else}
    {#if noPhaseData}
      <p class="muted phase-empty">
        Noch keine Phasen-Mittelwerte. Menstruation, Follikel- und Lutealphase lassen sich erst
        trennen, wenn in einem Zyklus ein Temperaturanstieg erkannt wurde — dafür die Basaltemperatur
        täglich morgens eintragen. Der Verlauf über den Zyklustag unten funktioniert schon jetzt.
      </p>
    {:else}
      <div class="bars">
        {#each rows as row (row.phase)}
          <div class="bar-row">
            <span class="phase">{PHASE_LABELS[row.phase]}</span>
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
              <span class="muted nodata">keine Daten</span>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <h3>Verlauf über den Zyklus</h3>
    {#if chart}
      <svg
        viewBox="0 0 {W} {H}"
        role="img"
        aria-label="{isProportion ? 'Anteil Ja-Tage' : 'Mittelwert'} von {variable?.label} je Zyklustag"
      >
        {#each chart.yTicks as t, k (k)}
          <line x1={PAD.left} y1={t.y} x2={W - PAD.right} y2={t.y} class="grid" />
          <text x={PAD.left - 4} y={t.y + 3} class="tick" text-anchor="end">{fmt(t.v)}</text>
        {/each}
        {#each chart.xTicks as t (t.d)}
          <line x1={t.x} y1={PAD.top} x2={t.x} y2={H - PAD.bottom} class="grid" />
          <text x={t.x} y={H - 6} class="tick" text-anchor="middle">{t.d}</text>
        {/each}
        {#if chart.path}
          <path d={chart.path} class="line" />
        {/if}
        {#each chart.pts as p (p.day)}
          <circle cx={p.x} cy={p.y} r="2.5" class="pt" class:faint={p.n < 2} />
        {/each}
      </svg>
      <p class="muted axis-note">
        x: Zyklustag, y: {isProportion ? 'Anteil Ja-Tage' : 'Mittelwert'}. Blasse Punkte: nur 1 Wert.
      </p>
    {:else}
      <p class="muted">Noch keine Daten für den Zyklusverlauf.</p>
    {/if}

    <p class="muted note">
      Basiert auf {cycleCount}
      {cycleCount === 1 ? 'erkannten Zyklus' : 'erkannten Zyklen'}; Phasen erst zuordenbar, wenn ein
      Temperaturanstieg erkannt wurde.
    </p>
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
