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
  let confirming = $state(false);

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

  async function remove() {
    try {
      await db.transaction('rw', db.habit_definitions, db.day_entries, async () => {
        await db.habit_definitions.delete(habit.id);
        await db.day_entries.toCollection().modify((e, ref) => {
          if (!e.habits || !(habit.id in e.habits)) return;
          delete e.habits[habit.id];
          // Invariante aus db.ts wahren: leer gewordene Tage nicht als
          // Phantom-Eintrag zurücklassen, sondern löschen.
          if (Object.keys(e.habits).length === 0 && !e.cycle) {
            delete (ref as { value?: unknown }).value;
          }
        });
      });
      onsaved();
    } catch {
      confirming = false;
      error = 'Löschen fehlgeschlagen — bitte erneut versuchen.';
    }
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

  {#if confirming}
    <div class="danger-confirm">
      <p>Endgültig löschen? Alle erfassten Werte dieses Habits gehen verloren.</p>
      <div class="actions">
        <button onclick={() => (confirming = false)}>Abbrechen</button>
        <button class="danger" onclick={remove}>Endgültig löschen</button>
      </div>
    </div>
  {:else}
    <button class="danger-link" onclick={() => (confirming = true)}>Löschen</button>
  {/if}
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

  .danger-link {
    align-self: flex-start;
    border: none;
    background: none;
    color: var(--period);
    padding: 0.25rem 0;
    min-height: 2.75rem;
  }

  .danger-confirm {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    border: 1px solid var(--period);
    border-radius: 0.5rem;
    padding: 0.6rem 0.75rem;
  }

  .danger-confirm p {
    margin: 0;
    font-size: 0.85rem;
  }

  .danger {
    background: var(--period);
    border-color: var(--period);
    color: #fff;
  }
</style>
