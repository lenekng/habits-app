<script lang="ts">
  import type { HabitDefinition } from '../../../lib/types';
  import { db } from '../../../lib/db';
  import { todayISO } from '../../../lib/date';
  import ChoicesEditor from './ChoicesEditor.svelte';
  import ScaleLabelsEditor from './ScaleLabelsEditor.svelte';

  let { habit, onsaved }: { habit: HabitDefinition; onsaved: () => void } = $props();

  // svelte-ignore state_referenced_locally -- Editor wird pro Aufklappen neu gemountet, Startwert ist gewollt
  const initial = $state.snapshot(habit);
  let name = $state(initial.name);
  let scaleLabels = $state<string[]>(initial.scaleLabels ? [...initial.scaleLabels] : ['1', '2', '3', '4']);
  let choices = $state<string[]>(initial.choices && initial.choices.length > 0 ? [...initial.choices] : ['']);
  let error = $state('');

  async function save() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      error = 'Name darf nicht leer sein.';
      return;
    }
    const updated: HabitDefinition = { ...habit, name: trimmedName };
    if (habit.type === 'scale4') {
      const labels = scaleLabels.map((l) => l.trim());
      if (labels.some((l) => !l)) {
        error = 'Alle vier Skalen-Labels ausfüllen.';
        return;
      }
      updated.scaleLabels = [labels[0]!, labels[1]!, labels[2]!, labels[3]!];
    }
    if (habit.type === 'choice') {
      const cleaned = choices.map((c) => c.trim()).filter((c) => c.length > 0);
      if (cleaned.length === 0) {
        error = 'Mindestens eine Option angeben.';
        return;
      }
      updated.choices = cleaned;
    }
    error = '';
    await db.habit_definitions.put(updated);
    onsaved();
  }

  async function archive() {
    await db.habit_definitions.put({ ...habit, archivedAt: todayISO() });
    onsaved();
  }
</script>

<div class="editor">
  <label class="field">
    <span class="field-label">Name</span>
    <input type="text" bind:value={name} />
  </label>

  {#if habit.type === 'scale4'}
    <div class="group">
      <span class="field-label">Skalen-Labels</span>
      <ScaleLabelsEditor bind:labels={scaleLabels} />
    </div>
  {:else if habit.type === 'choice'}
    <div class="group">
      <span class="field-label">Optionen</span>
      <ChoicesEditor bind:choices />
      <p class="muted hint">Alte Tageseinträge behalten entfernte Optionen.</p>
    </div>
  {/if}

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <div class="actions">
    <button class="primary" onclick={save}>Speichern</button>
    <button onclick={archive}>Archivieren</button>
  </div>
  <p class="muted hint">
    Archivierte Habits verschwinden aus Heute/Monat, ihre Daten bleiben für Analysen erhalten.
  </p>
</div>

<style>
  .editor {
    border-top: 1px solid var(--border);
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
