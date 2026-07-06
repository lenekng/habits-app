<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { BLEEDING_LABELS, BLEEDING_ORDER } from '../../lib/types';
  import type { Bleeding, DayEntry, HabitDefinition, HabitValue } from '../../lib/types';
  import { formatDE } from '../../lib/date';

  interface Props {
    habit: HabitDefinition | null;
    date: string;
    entry: DayEntry | undefined;
    onSetHabit: (value: HabitValue | undefined) => void;
    onSetBleeding: (value: Bleeding | undefined) => void;
    onClose: () => void;
  }

  let { habit, date, entry, onSetHabit, onSetBleeding, onClose }: Props = $props();

  const value = $derived(habit ? entry?.habits[habit.id] : undefined);
  const chosen = $derived(Array.isArray(value) ? value : []);
  const bleeding = $derived(entry?.cycle?.bleeding);

  function pickBool(v: boolean | undefined): void {
    onSetHabit(v);
    onClose();
  }

  function pickScale(level: number): void {
    onSetHabit(value === level ? undefined : level);
    onClose();
  }

  function toggleChoice(c: string): void {
    const next = chosen.includes(c) ? chosen.filter((x) => x !== c) : [...chosen, c];
    onSetHabit(next.length > 0 ? next : undefined);
  }

  function pickBleeding(v: Bleeding | undefined): void {
    onSetBleeding(v);
    onClose();
  }
</script>

<button class="backdrop" transition:fade={{ duration: 150 }} onclick={onClose} aria-label="Schließen"></button>

<div
  class="sheet"
  transition:fly={{ y: 240, duration: 200 }}
  role="dialog"
  aria-modal="true"
  aria-label={habit ? habit.name : 'Periode'}
>
  <header>
    <strong>{habit ? habit.name : 'Periode'}</strong>
    <span class="muted">{formatDE(date)}</span>
  </header>

  {#if habit === null}
    <div class="chips">
      {#each BLEEDING_ORDER as b (b)}
        <button class="period-btn" class:selected={bleeding === b} onclick={() => pickBleeding(b)}>
          {BLEEDING_LABELS[b]}
        </button>
      {/each}
      <button class:selected={bleeding === undefined} onclick={() => pickBleeding(undefined)}>keine</button>
    </div>
  {:else if habit.type === 'bool'}
    <div class="chips">
      <button class:selected={value === true} onclick={() => pickBool(true)}>Ja</button>
      <button class:selected={value === false} onclick={() => pickBool(false)}>Nein</button>
      <button class:selected={value === undefined} onclick={() => pickBool(undefined)}>Kein Eintrag</button>
    </div>
  {:else if habit.type === 'scale4'}
    <div class="scale-list">
      {#each [1, 2, 3, 4] as level (level)}
        <button class:selected={value === level} onclick={() => pickScale(level)}>
          <span class="level">{level}</span>
          <span>{habit.scaleLabels?.[level - 1] ?? ''}</span>
        </button>
      {/each}
      <button
        class:selected={value === undefined}
        onclick={() => {
          onSetHabit(undefined);
          onClose();
        }}
      >
        Kein Eintrag
      </button>
    </div>
  {:else}
    <div class="chips">
      {#each habit.choices ?? [] as c (c)}
        <button class:selected={chosen.includes(c)} onclick={() => toggleChoice(c)}>{c}</button>
      {/each}
    </div>
    <button class="done" onclick={onClose}>Fertig</button>
  {/if}
</div>

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(0, 0, 0, 0.35);
    border: none;
    border-radius: 0;
    padding: 0;
  }

  .sheet {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 41;
    max-width: 40rem;
    margin: 0 auto;
    background: var(--surface);
    border-top: 1px solid var(--border);
    border-radius: 1rem 1rem 0 0;
    padding: 1rem 1rem calc(env(safe-area-inset-bottom) + 1.25rem);
    box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.12);
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.75rem;
    margin-bottom: 0.9rem;
  }

  header .muted {
    font-size: 0.85rem;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .chips button {
    min-height: 2.6rem;
  }

  .scale-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .scale-list button {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    text-align: left;
    min-height: 2.6rem;
  }

  .level {
    width: 1.2rem;
    text-align: center;
    font-weight: 600;
  }

  .period-btn.selected {
    background: var(--period);
    border-color: var(--period);
    color: #fff;
  }

  .done {
    margin-top: 0.9rem;
    width: 100%;
    min-height: 2.6rem;
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
</style>
