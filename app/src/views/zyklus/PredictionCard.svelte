<script lang="ts">
  import type { PeriodPrediction } from '../../lib/prediction';

  let { prediction }: { prediction: PeriodPrediction } = $props();

  function fmt(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y!, m! - 1, d!).toLocaleDateString('de-DE', {
      weekday: 'short',
      day: 'numeric',
      month: 'long'
    });
  }

  function fmtShort(iso: string): string {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y!, m! - 1, d!).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' });
  }

  const relative = $derived.by(() => {
    const p = prediction;
    if (p.overdueDays && p.overdueDays > 0) {
      return { text: `überfällig seit ${p.overdueDays} ${p.overdueDays === 1 ? 'Tag' : 'Tagen'}`, tone: 'over' };
    }
    const d = p.daysUntilLikely;
    if (d === undefined) return null;
    if (d === 0) return { text: 'wahrscheinlich heute', tone: 'soon' };
    if (d < 0) return { text: `wahrscheinlich vor ${-d} ${-d === 1 ? 'Tag' : 'Tagen'}`, tone: 'over' };
    return { text: `in ${d} ${d === 1 ? 'Tag' : 'Tagen'}`, tone: d <= 3 ? 'soon' : 'normal' };
  });

  const basis = $derived.by(() => {
    const p = prediction;
    if (p.method === 'temperature') {
      return p.usedDefaultLuteal
        ? 'Nach dem Temperaturanstieg, mit Standard-Lutealphase (14 Tage) — wird genauer, sobald du eigene Temperatur-Zyklen gesammelt hast.'
        : `Nach dem bestätigten Temperaturanstieg, über deine eigene Lutealphase (aus ${prediction.basedOnCycles} Zyklen). Das ist die genaueste Schätzung.`;
    }
    if (p.method === 'length') {
      const hint = p.hasTempShift
        ? ''
        : ' Sie verengt sich, sobald in diesem Zyklus ein Temperaturanstieg erkannt wird.';
      return `Aus der Verteilung deiner ${p.basedOnCycles} bisherigen Zykluslängen.${hint}`;
    }
    return p.reason ?? '';
  });
</script>

<div class="pred" class:over={relative?.tone === 'over'}>
  <div class="head">
    <span class="label">Nächste Periode</span>
    {#if prediction.method === 'temperature'}<span class="pill">genau</span>{/if}
  </div>

  {#if prediction.method === 'none'}
    <p class="reason">{prediction.reason}</p>
  {:else}
    <p class="main">
      <span class="date">{fmt(prediction.likelyDate!)}</span>
      {#if relative}<span class="rel {relative.tone}">· {relative.text}</span>{/if}
    </p>
    <p class="window">
      Zeitfenster {fmtShort(prediction.earliestDate!)} – {fmtShort(prediction.latestDate!)}
    </p>
  {/if}

  <p class="basis">{basis}</p>
</div>

<style>
  .pred {
    background: var(--accent-soft);
    border: 1px solid var(--border);
    border-radius: 0.6rem;
    padding: 0.8rem 0.9rem;
    margin-bottom: 0.9rem;
  }

  .pred.over {
    background: var(--period-soft);
  }

  .head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.3rem;
  }

  .label {
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--muted);
  }

  .pill {
    background: var(--accent);
    color: #fff;
    border-radius: 999px;
    padding: 0.05rem 0.45rem;
    font-size: 0.62rem;
    font-weight: 600;
  }

  .main {
    margin: 0.1rem 0 0.25rem;
    font-size: 1.05rem;
  }

  .date {
    font-weight: 700;
  }

  .rel {
    font-weight: 600;
  }

  .rel.soon {
    color: var(--accent);
  }

  .rel.over {
    color: var(--period);
  }

  .window {
    margin: 0 0 0.35rem;
    font-size: 0.85rem;
    color: var(--text);
  }

  .basis,
  .reason {
    margin: 0;
    font-size: 0.78rem;
    line-height: 1.4;
    color: var(--muted);
  }
</style>
