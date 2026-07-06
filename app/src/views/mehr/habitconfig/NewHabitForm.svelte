<script lang="ts">
  import type { HabitDefinition, HabitType } from '../../../lib/types';
  import { db } from '../../../lib/db';
  import ChoicesEditor from './ChoicesEditor.svelte';
  import ScaleLabelsEditor from './ScaleLabelsEditor.svelte';
  import { slugify, uniqueHabitId } from './slug';

  let {
    existingIds,
    nextSortOrder,
    oncreated,
    oncancel
  }: {
    existingIds: string[];
    nextSortOrder: number;
    oncreated: () => void;
    oncancel: () => void;
  } = $props();

  const typeOptions: { value: HabitType; label: string }[] = [
    { value: 'bool', label: 'Ja/Nein' },
    { value: 'scale4', label: 'Skala 1–4' },
    { value: 'choice', label: 'Auswahl' }
  ];

  let name = $state('');
  let type = $state<HabitType>('bool');
  let scaleLabels = $state(['1', '2', '3', '4']);
  let choices = $state(['']);
  let error = $state('');

  async function create() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      error = 'Name darf nicht leer sein.';
      return;
    }
    const habit: HabitDefinition = {
      id: uniqueHabitId(slugify(trimmedName), new Set(existingIds)),
      name: trimmedName,
      type,
      sortOrder: nextSortOrder
    };
    if (type === 'scale4') {
      const labels = scaleLabels.map((l) => l.trim());
      if (labels.some((l) => !l)) {
        error = 'Alle vier Skalen-Labels ausfüllen.';
        return;
      }
      habit.scaleLabels = [labels[0]!, labels[1]!, labels[2]!, labels[3]!];
    }
    if (type === 'choice') {
      const cleaned = choices.map((c) => c.trim()).filter((c) => c.length > 0);
      if (cleaned.length === 0) {
        error = 'Mindestens eine Option angeben.';
        return;
      }
      habit.choices = cleaned;
    }
    error = '';
    await db.habit_definitions.add(habit);
    oncreated();
  }
</script>

<div class="form">
  <label class="field">
    <span class="field-label">Name</span>
    <input type="text" bind:value={name} placeholder="z. B. Meditation" />
  </label>

  <div class="group">
    <span class="field-label">Typ</span>
    <div class="type-select" role="group" aria-label="Typ wählen">
      {#each typeOptions as opt (opt.value)}
        <button class:selected={type === opt.value} onclick={() => (type = opt.value)}>
          {opt.label}
        </button>
      {/each}
    </div>
    <p class="muted hint">Typ ist nach dem Anlegen nicht änderbar.</p>
  </div>

  {#if type === 'scale4'}
    <div class="group">
      <span class="field-label">Skalen-Labels</span>
      <ScaleLabelsEditor bind:labels={scaleLabels} />
    </div>
  {:else if type === 'choice'}
    <div class="group">
      <span class="field-label">Optionen</span>
      <ChoicesEditor bind:choices />
    </div>
  {/if}

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <div class="actions">
    <button class="primary" onclick={create}>Anlegen</button>
    <button onclick={oncancel}>Abbrechen</button>
  </div>
</div>

<style>
  .form {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .field,
  .group {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .field-label {
    font-size: 0.85rem;
    color: var(--muted);
  }

  .field input {
    min-height: 2.75rem;
  }

  .type-select {
    display: flex;
    gap: 0.5rem;
  }

  .type-select button {
    flex: 1;
    min-height: 2.75rem;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .actions button {
    flex: 1;
    min-height: 2.75rem;
  }

  .primary {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }

  .error {
    color: var(--period);
    margin: 0;
  }

  .hint {
    margin: 0;
    font-size: 0.85rem;
  }
</style>
