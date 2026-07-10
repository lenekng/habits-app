<script lang="ts">
  import {
    findInsights,
    DEFAULT_THRESHOLDS,
    DEFAULT_CORRELATION_THRESHOLDS,
    type CondSide
  } from '../../lib/insights';
  import { cycleVariables, type VariableSpec } from '../../lib/stats';
  import { t, getLang } from '../../lib/i18n/i18n.svelte';
  import { localizedHabitName, localizedScaleLabels } from '../../lib/i18n/habits';
  import { localizedHabitVariable, localizeVariableSpec } from '../../lib/i18n/variables';
  import { loadAnalyseData, type AnalyseData } from './statistik/data';

  let data = $state<AnalyseData | null>(null);
  let open = $state(false);

  $effect(() => {
    void loadAnalyseData().then((d) => (data = d));
  });

  const insights = $derived(
    data
      ? findInsights(data.entries, data.habits, data.index)
      : { implications: [], correlations: [] }
  );

  const total = $derived(insights.implications.length + insights.correlations.length);

  const habitById = $derived(new Map((data?.habits ?? []).map((h) => [h.id, h])));

  // lokalisierte Variablen (Label + Skalen-Enden) für die Klartext-Sätze der
  // Korrelations-Befunde — dieselbe Quelle wie die Korrelationsmatrix
  const specById = $derived.by(() => {
    const lang = getLang();
    const m = new Map<string, VariableSpec>();
    for (const h of data?.habits ?? []) m.set(h.id, localizedHabitVariable(h, lang));
    for (const v of cycleVariables()) m.set(v.id, localizeVariableSpec(v, lang));
    return m;
  });

  // Bedingungs-Text, z. B. „Stress: sehr viel/viel" (untere Skalen-Hälfte)
  // oder „Erkältung: Ja". Bei scale4 benennen die beiden Skalen-Labels der
  // jeweiligen Hälfte, welche Werte die Bedingung umfasst.
  function condText(id: string, side: CondSide): string {
    const h = habitById.get(id);
    if (!h) return id;
    const lang = getLang();
    const name = localizedHabitName(h, lang);
    if (h.type === 'scale4') {
      const l = localizedScaleLabels(h, lang);
      if (l) return `${name}: ${side === 'high' ? `${l[2]}/${l[3]}` : `${l[0]}/${l[1]}`}`;
    }
    return `${name}: ${side === 'high' ? t('common.yes') : t('common.no')}`;
  }

  function pct(x: number): string {
    return String(Math.round(x * 100));
  }
</script>

{#if total > 0}
  <section class="impl">
    <button class="impl-head" aria-expanded={open} onclick={() => (open = !open)}>
      <span>{t('impl.cardTitle', { n: total })}</span>
      <span class="chev" class:open>▸</span>
    </button>
    {#if open}
      <div class="impl-body">
        <p class="intro">{t('impl.intro')}</p>
        {#each insights.implications as f (`${f.aId}:${f.aSide}>${f.bId}:${f.bSide}`)}
          {@const a = condText(f.aId, f.aSide)}
          {@const b = condText(f.bId, f.bSide)}
          <div class="finding">
            <p class="rule">{a} ⇒ {b}</p>
            <p class="expl">
              {t('impl.forward', { a, b, nA: f.nA, nAB: f.nAB, pct: pct(f.confForward) })}
            </p>
            <p class="expl muted">
              {t('impl.reverse', { a, b, nB: f.nB, nAB: f.nAB, pct: pct(f.confReverse) })}
            </p>
            <p class="expl muted">{t('impl.baseline', { a, b, pct: pct(f.baseline) })}</p>
          </div>
        {/each}
        {#each insights.correlations as c (`${c.aId}~${c.bId}`)}
          {@const a = specById.get(c.aId)}
          {@const b = specById.get(c.bId)}
          {#if a && b}
            <div class="finding">
              <p class="rule">
                {a.label} ↔ {b.label}
                {#if c.lagged}<span class="pill">{t('corr.pillPrevDay')}</span>{/if}
              </p>
              <p class="expl">
                {t(c.lagged ? 'corr.sentPrev' : 'corr.sentSame', {
                  row: a.label,
                  rowHigh: a.highLabel,
                  col: b.label,
                  colWord: c.rho >= 0 ? b.highLabel : b.lowLabel
                })}
              </p>
              <p class="expl muted">{t('corr.rhoVal', { r: c.rho.toFixed(2), n: c.n })}</p>
            </div>
          {/if}
        {/each}
        <p class="muted footnote">
          {t('impl.footnote', {
            minDays: DEFAULT_THRESHOLDS.minCondDays,
            conf: Math.round(DEFAULT_THRESHOLDS.minConfidence * 100),
            rev: Math.round(DEFAULT_THRESHOLDS.maxReverse * 100),
            corrDays: DEFAULT_CORRELATION_THRESHOLDS.minPairDays,
            rho: DEFAULT_CORRELATION_THRESHOLDS.minAbsRho
          })}
        </p>
      </div>
    {/if}
  </section>
{/if}

<style>
  .impl {
    background: var(--accent-soft);
    border: 1px solid var(--accent);
    border-radius: 0.6rem;
    margin: 0 0 1rem;
  }

  .impl-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    width: 100%;
    min-height: 44px;
    padding: 0.6rem 0.9rem;
    background: none;
    border: none;
    text-align: left;
    font-weight: 600;
    color: var(--accent);
  }

  .chev {
    flex-shrink: 0;
    transition: transform 0.15s;
  }

  .chev.open {
    transform: rotate(90deg);
  }

  .impl-body {
    padding: 0 0.9rem 0.75rem;
  }

  .intro {
    margin: 0 0 0.6rem;
    font-size: 0.8rem;
    line-height: 1.4;
  }

  .finding {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 0.6rem 0.7rem;
    margin: 0 0 0.6rem;
  }

  .rule {
    margin: 0 0 0.35rem;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .pill {
    display: inline-block;
    background: var(--accent-soft);
    color: var(--accent);
    border-radius: 999px;
    padding: 0.05rem 0.4rem;
    margin-left: 0.3rem;
    font-size: 0.62rem;
    font-weight: 600;
    white-space: nowrap;
    vertical-align: middle;
  }

  .expl {
    margin: 0 0 0.25rem;
    font-size: 0.82rem;
    line-height: 1.4;
  }

  .expl:last-child {
    margin-bottom: 0;
  }

  .footnote {
    margin: 0.2rem 0 0;
    font-size: 0.72rem;
    line-height: 1.4;
  }
</style>
