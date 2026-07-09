<script lang="ts">
  import type { HabitDefinition } from '../../../lib/types';
  import { db } from '../../../lib/db';
  import { todayISO } from '../../../lib/date';
  import { t } from '../../../lib/i18n/i18n.svelte';
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
      error = t('habiteditor.errNameEmpty');
      return;
    }
    const updated: HabitDefinition = { ...habit, name: trimmedName };
    if (habit.type === 'scale4') {
      const labels = scaleLabels.map((l) => l.trim());
      if (labels.some((l) => !l)) {
        error = t('habiteditor.errScaleLabels');
        return;
      }
      updated.scaleLabels = [labels[0]!, labels[1]!, labels[2]!, labels[3]!];
    }
    if (habit.type === 'choice') {
      const cleaned = choices.map((c) => c.trim()).filter((c) => c.length > 0);
      if (cleaned.length === 0) {
        error = t('habiteditor.errOptions');
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
      error = t('habiteditor.deleteFailed');
    }
  }
</script>

<div class="editor">
  <label class="field">
    <span class="field-label">{t('habiteditor.name')}</span>
    <input type="text" bind:value={name} />
  </label>

  {#if habit.type === 'scale4'}
    <div class="group">
      <span class="field-label">{t('habiteditor.scaleLabels')}</span>
      <ScaleLabelsEditor bind:labels={scaleLabels} />
    </div>
  {:else if habit.type === 'choice'}
    <div class="group">
      <span class="field-label">{t('habiteditor.options')}</span>
      <ChoicesEditor bind:choices />
      <p class="muted hint">{t('habiteditor.optionsHint')}</p>
    </div>
  {/if}

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <div class="actions">
    <button class="primary" onclick={save}>{t('habiteditor.save')}</button>
    <button onclick={archive}>{t('habiteditor.archive')}</button>
  </div>
  <p class="muted hint">{t('habiteditor.archiveHint')}</p>

  {#if confirming}
    <div class="danger-confirm">
      <p>{t('habiteditor.deleteConfirm')}</p>
      <div class="actions">
        <button onclick={() => (confirming = false)}>{t('common.cancel')}</button>
        <button class="danger" onclick={remove}>{t('habiteditor.deleteConfirmBtn')}</button>
      </div>
    </div>
  {:else}
    <button class="danger-link" onclick={() => (confirming = true)}>{t('habiteditor.delete')}</button>
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
