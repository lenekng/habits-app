<script lang="ts">
  import type { Bleeding, CycleObservation, Mucus, Temperature } from '../../lib/types';
  import { BLEEDING_LABELS, BLEEDING_ORDER, MUCUS_LABELS, MUCUS_ORDER } from '../../lib/types';

  type ExtraKey = 'midPain' | 'breastTenderness' | 'spotting';

  let {
    cycle,
    disturbanceReasons,
    defaultTempTime,
    onChange,
    onTempTimeUsed
  }: {
    cycle: CycleObservation;
    disturbanceReasons: string[];
    defaultTempTime: string;
    onChange: (c: CycleObservation) => void;
    onTempTimeUsed: (time: string) => void;
  } = $props();

  const extras: { key: ExtraKey; label: string }[] = [
    { key: 'midPain', label: 'Mittelschmerz' },
    { key: 'breastTenderness', label: 'Brustspannen' },
    { key: 'spotting', label: 'Zwischenblutung' }
  ];

  function update(patch: Partial<CycleObservation>, remove: (keyof CycleObservation)[] = []): void {
    const next: CycleObservation = { ...cycle, ...patch };
    for (const k of remove) delete next[k];
    onChange(next);
  }

  function setBleeding(b: Bleeding | null): void {
    if (b === null || cycle.bleeding === b) update({}, ['bleeding']);
    else update({ bleeding: b });
  }

  let tempOutOfRange = $state(false);

  function setTempValue(raw: string): void {
    const v = parseFloat(raw.replace(',', '.'));
    if (raw.trim() === '' || Number.isNaN(v)) {
      tempOutOfRange = false;
      update({}, ['temperature']);
      return;
    }
    if (v < 34 || v > 42) {
      tempOutOfRange = true;
      return;
    }
    tempOutOfRange = false;
    const prev = cycle.temperature;
    const next: Temperature = {
      value: v,
      time: prev?.time ?? defaultTempTime,
      disturbed: prev?.disturbed ?? false,
      excluded: prev?.excluded ?? false
    };
    if (prev?.disturbanceNote) next.disturbanceNote = prev.disturbanceNote;
    update({ temperature: next });
  }

  function setTempTime(time: string): void {
    const t = cycle.temperature;
    if (!t || !time) return;
    update({ temperature: { ...t, time } });
    onTempTimeUsed(time);
  }

  function setDisturbed(checked: boolean): void {
    const t = cycle.temperature;
    if (!t) return;
    const next: Temperature = { ...t, disturbed: checked };
    if (!checked) delete next.disturbanceNote;
    update({ temperature: next });
  }

  function setDisturbanceNote(value: string): void {
    const t = cycle.temperature;
    if (!t) return;
    const next: Temperature = { ...t };
    if (value.trim() === '') delete next.disturbanceNote;
    else next.disturbanceNote = value;
    update({ temperature: next });
  }

  function setExcluded(checked: boolean): void {
    const t = cycle.temperature;
    if (!t) return;
    update({ temperature: { ...t, excluded: checked } });
  }

  function applySuggestion(): void {
    const t = cycle.temperature;
    if (!t) return;
    update({ temperature: { ...t, disturbed: true, disturbanceNote: disturbanceReasons.join(', ') } });
  }

  function toggleMucus(m: Mucus): void {
    if (cycle.mucus === m) update({}, ['mucus']);
    else update({ mucus: m });
  }

  function toggleExtra(key: ExtraKey): void {
    if (cycle[key] === true) {
      update({}, [key]);
    } else {
      const next: CycleObservation = { ...cycle };
      next[key] = true;
      onChange(next);
    }
  }

  function setNote(value: string): void {
    if (value.trim() === '') update({}, ['note']);
    else update({ note: value });
  }
</script>

<h2>Zyklus</h2>

<div class="sub">
  <span class="sub-label">Blutung</span>
  <div class="row">
    <button class:selected={!cycle.bleeding} onclick={() => setBleeding(null)}>keine</button>
    {#each BLEEDING_ORDER as b (b)}
      <button class="bleed" class:selected={cycle.bleeding === b} onclick={() => setBleeding(b)}>
        {BLEEDING_LABELS[b]}
      </button>
    {/each}
  </div>
</div>

<div class="sub">
  <span class="sub-label">Basaltemperatur</span>
  {#if disturbanceReasons.length > 0 && !cycle.temperature?.disturbed}
    <div class="suggest">
      <span>Gestern: {disturbanceReasons.join(', ')} — Messung als gestört markieren?</span>
      <button disabled={!cycle.temperature} onclick={applySuggestion}>Als gestört markieren</button>
    </div>
  {/if}
  <div class="temp-row">
    <input
      class="temp-value"
      type="number"
      inputmode="decimal"
      step="0.01"
      min="34"
      max="42"
      placeholder="36.50"
      aria-label="Basaltemperatur in °C"
      value={cycle.temperature?.value ?? ''}
      onchange={(e) => setTempValue(e.currentTarget.value)}
    />
    <span class="muted">°C</span>
    <input
      type="time"
      aria-label="Messzeit"
      disabled={!cycle.temperature}
      value={cycle.temperature?.time ?? defaultTempTime}
      onchange={(e) => setTempTime(e.currentTarget.value)}
    />
  </div>
  {#if tempOutOfRange}
    <p class="hint warn">Wert außerhalb von 34–42 °C — wurde nicht gespeichert.</p>
  {/if}
  {#if cycle.temperature}
    <label class="check">
      <input
        type="checkbox"
        checked={cycle.temperature.disturbed}
        onchange={(e) => setDisturbed(e.currentTarget.checked)}
      />
      Messung gestört
    </label>
    {#if cycle.temperature.disturbed}
      <input
        class="text-input"
        type="text"
        placeholder="Grund (optional)"
        value={cycle.temperature.disturbanceNote ?? ''}
        onchange={(e) => setDisturbanceNote(e.currentTarget.value)}
      />
    {/if}
    <label class="check">
      <input
        type="checkbox"
        checked={cycle.temperature.excluded}
        onchange={(e) => setExcluded(e.currentTarget.checked)}
      />
      Wert ausklammern
    </label>
    {#if cycle.temperature.excluded}
      <p class="hint muted">Wird bei der späteren Auswertung übersprungen.</p>
    {/if}
  {/if}
</div>

<div class="sub">
  <span class="sub-label">Zervixschleim</span>
  <div class="mucus-row">
    {#each MUCUS_ORDER as m (m)}
      <button class:selected={cycle.mucus === m} onclick={() => toggleMucus(m)}>
        {MUCUS_LABELS[m].short}
      </button>
    {/each}
  </div>
  {#if cycle.mucus}
    <p class="hint muted">{MUCUS_LABELS[cycle.mucus].description}</p>
  {/if}
</div>

<div class="sub">
  <span class="sub-label">Zusatzzeichen</span>
  <div class="row">
    {#each extras as ex (ex.key)}
      <button class:selected={cycle[ex.key] === true} onclick={() => toggleExtra(ex.key)}>
        {ex.label}
      </button>
    {/each}
  </div>
</div>

<div class="sub">
  <span class="sub-label">Notiz</span>
  <textarea rows="2" placeholder="Notiz zum Tag" value={cycle.note ?? ''} onchange={(e) => setNote(e.currentTarget.value)}
  ></textarea>
</div>

<style>
  .sub {
    margin-bottom: 1rem;
  }

  .sub-label {
    display: block;
    margin-bottom: 0.4rem;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: var(--muted);
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .row button {
    min-height: 44px;
  }

  .bleed.selected {
    background: var(--period);
    border-color: var(--period);
    color: #fff;
  }

  .suggest {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.4rem;
    background: var(--accent-soft);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.6rem;
    font-size: 0.85rem;
  }

  .suggest button {
    min-height: 44px;
  }

  .suggest button:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .temp-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .temp-row input {
    min-height: 44px;
  }

  .temp-value {
    width: 6.5rem;
  }

  .check {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 44px;
  }

  .check input {
    width: 1.15rem;
    height: 1.15rem;
    accent-color: var(--accent);
  }

  .text-input {
    width: 100%;
    min-height: 44px;
    margin-bottom: 0.25rem;
  }

  .mucus-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.4rem;
  }

  .mucus-row button {
    min-height: 44px;
    font-weight: 600;
  }

  .hint {
    margin: 0.4rem 0 0;
    font-size: 0.85rem;
  }

  .warn {
    color: var(--period);
  }

  textarea {
    width: 100%;
    resize: vertical;
  }
</style>
