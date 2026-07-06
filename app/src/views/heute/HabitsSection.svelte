<script lang="ts">
  import type { HabitDefinition, HabitValue } from '../../lib/types';

  let {
    habits,
    values,
    onSet
  }: {
    habits: HabitDefinition[];
    values: Record<string, HabitValue>;
    onSet: (id: string, value: HabitValue | undefined) => void;
  } = $props();

  function toggleBool(id: string, next: boolean): void {
    onSet(id, values[id] === next ? undefined : next);
  }

  function toggleScale(id: string, n: number): void {
    onSet(id, values[id] === n ? undefined : n);
  }

  function toggleChoice(id: string, choice: string): void {
    const current = Array.isArray(values[id]) ? (values[id] as string[]) : [];
    const next = current.includes(choice) ? current.filter((c) => c !== choice) : [...current, choice];
    onSet(id, next.length > 0 ? next : undefined);
  }

  function isChoiceSelected(id: string, choice: string): boolean {
    const current = values[id];
    return Array.isArray(current) && current.includes(choice);
  }
</script>

<h2>Habits</h2>
<div class="habits">
  {#each habits as habit (habit.id)}
    <div class="habit-row">
      <span class="habit-name">{habit.name}</span>
      {#if habit.type === 'bool'}
        <div class="segmented">
          <button class:selected={values[habit.id] === true} onclick={() => toggleBool(habit.id, true)}>Ja</button>
          <button class:selected={values[habit.id] === false} onclick={() => toggleBool(habit.id, false)}>Nein</button>
        </div>
      {:else if habit.type === 'scale4'}
        <div class="scale4">
          {#each [0, 1, 2, 3] as idx (idx)}
            <button class:selected={values[habit.id] === idx + 1} onclick={() => toggleScale(habit.id, idx + 1)}>
              <span class="num">{idx + 1}</span>
              <span class="lbl">{habit.scaleLabels?.[idx] ?? ''}</span>
            </button>
          {/each}
        </div>
      {:else if habit.type === 'choice'}
        <div class="chips">
          {#each habit.choices ?? [] as choice (choice)}
            <button class:selected={isChoiceSelected(habit.id, choice)} onclick={() => toggleChoice(habit.id, choice)}>
              {choice}
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .habits {
    display: flex;
    flex-direction: column;
  }

  .habit-row {
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--border);
  }

  .habit-row:last-child {
    border-bottom: none;
  }

  .habit-name {
    display: block;
    margin-bottom: 0.4rem;
    font-weight: 500;
  }

  .segmented {
    display: flex;
    gap: 0.4rem;
  }

  .segmented button {
    flex: 1;
    min-height: 44px;
  }

  .scale4 {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.4rem;
  }

  .scale4 button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.15rem;
    min-height: 44px;
    padding: 0.4rem 0.2rem;
  }

  .scale4 .num {
    font-weight: 600;
  }

  .scale4 .lbl {
    font-size: 0.65rem;
    color: var(--muted);
    text-align: center;
    line-height: 1.1;
  }

  .scale4 button.selected .lbl {
    color: #fff;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .chips button {
    min-height: 44px;
  }
</style>
