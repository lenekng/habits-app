<script lang="ts">
  import type { HabitDefinition, HabitType } from '../../../lib/types';
  import { db } from '../../../lib/db';
  import { t } from '../../../lib/i18n/i18n.svelte';
  import type { MessageKey } from '../../../lib/i18n/messages';
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

  const typeOptions: { value: HabitType; labelKey: MessageKey }[] = [
    { value: 'bool', labelKey: 'badge.bool' },
    { value: 'scale4', labelKey: 'badge.scale4' },
    { value: 'choice', labelKey: 'badge.choice' }
  ];

  let name = $state('');
  let type = $state<HabitType>('bool');
  let scaleLabels = $state(['1', '2', '3', '4']);
  let choices = $state(['']);
  let error = $state('');

  async function create() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      error = t('habiteditor.errNameEmpty');
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
        error = t('habiteditor.errScaleLabels');
        return;
      }
      habit.scaleLabels = [labels[0]!, labels[1]!, labels[2]!, labels[3]!];
    }
    if (type === 'choice') {
      const cleaned = choices.map((c) => c.trim()).filter((c) => c.length > 0);
      if (cleaned.length === 0) {
        error = t('habiteditor.errOptions');
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
    <span class="field-label">{t('habiteditor.name')}</span>
    <input type="text" bind:value={name} placeholder={t('newhabit.namePlaceholder')} />
  </label>

  <div class="group">
    <span class="field-label">{t('newhabit.type')}</span>
    <div class="type-select" role="group" aria-label={t('newhabit.typeAria')}>
      {#each typeOptions as opt (opt.value)}
        <button class:selected={type === opt.value} onclick={() => (type = opt.value)}>
          {t(opt.labelKey)}
        </button>
      {/each}
    </div>
    <p class="muted hint">{t('newhabit.typeHint')}</p>
  </div>

  {#if type === 'scale4'}
    <div class="group">
      <span class="field-label">{t('habiteditor.scaleLabels')}</span>
      <ScaleLabelsEditor bind:labels={scaleLabels} />
    </div>
  {:else if type === 'choice'}
    <div class="group">
      <span class="field-label">{t('habiteditor.options')}</span>
      <ChoicesEditor bind:choices />
    </div>
  {/if}

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <div class="actions">
    <button class="primary" onclick={create}>{t('newhabit.create')}</button>
    <button onclick={oncancel}>{t('common.cancel')}</button>
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
