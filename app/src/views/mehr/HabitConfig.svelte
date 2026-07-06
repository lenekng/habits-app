<script lang="ts">
  import type { HabitDefinition, HabitType } from '../../lib/types';
  import { allHabits, db } from '../../lib/db';
  import HabitEditor from './habitconfig/HabitEditor.svelte';
  import NewHabitForm from './habitconfig/NewHabitForm.svelte';

  const TYPE_BADGES: Record<HabitType, string> = {
    bool: 'Ja/Nein',
    scale4: 'Skala 1–4',
    choice: 'Auswahl'
  };

  let habits = $state<HabitDefinition[]>([]);
  let editingId = $state<string | null>(null);
  let showArchived = $state(false);
  let showNewForm = $state(false);

  const active = $derived(habits.filter((h) => !h.archivedAt));
  const archived = $derived(habits.filter((h) => h.archivedAt));
  const existingIds = $derived(habits.map((h) => h.id));
  const nextSortOrder = $derived(habits.reduce((m, h) => Math.max(m, h.sortOrder), 0) + 1);

  async function load() {
    habits = await allHabits();
  }
  void load();

  async function move(index: number, delta: -1 | 1) {
    const a = active[index];
    const b = active[index + delta];
    if (!a || !b) return;
    await db.habit_definitions.bulkPut([
      { ...a, sortOrder: b.sortOrder },
      { ...b, sortOrder: a.sortOrder }
    ]);
    await load();
  }

  async function reactivate(habit: HabitDefinition) {
    const restored: HabitDefinition = { ...habit };
    delete restored.archivedAt;
    await db.habit_definitions.put(restored);
    await load();
  }

  function toggleEdit(id: string) {
    editingId = editingId === id ? null : id;
  }

  async function onSaved() {
    editingId = null;
    await load();
  }

  async function onCreated() {
    showNewForm = false;
    await load();
  }
</script>

<h1>Habits verwalten</h1>

<ul class="habit-list">
  {#each active as habit, i (habit.id)}
    <li class="habit-item">
      <div class="habit-row">
        <button
          class="row-main"
          onclick={() => toggleEdit(habit.id)}
          aria-expanded={editingId === habit.id}
        >
          <span class="habit-name">{habit.name}</span>
          <span class="badge">{TYPE_BADGES[habit.type]}</span>
        </button>
        <div class="sort">
          <button onclick={() => move(i, -1)} disabled={i === 0} aria-label="Nach oben">
            &uarr;
          </button>
          <button
            onclick={() => move(i, 1)}
            disabled={i === active.length - 1}
            aria-label="Nach unten"
          >
            &darr;
          </button>
        </div>
      </div>
      {#if editingId === habit.id}
        <HabitEditor {habit} onsaved={onSaved} />
      {/if}
    </li>
  {/each}
</ul>

{#if showNewForm}
  <h2>Neues Habit</h2>
  <NewHabitForm
    {existingIds}
    {nextSortOrder}
    oncreated={onCreated}
    oncancel={() => (showNewForm = false)}
  />
{:else}
  <button class="add" onclick={() => (showNewForm = true)}>Neues Habit anlegen</button>
{/if}

{#if archived.length > 0}
  <section class="archived">
    <button class="archived-toggle" onclick={() => (showArchived = !showArchived)}>
      <span>Archivierte Habits ({archived.length})</span>
      <span class="chevron">{showArchived ? '▾' : '▸'}</span>
    </button>
    {#if showArchived}
      <p class="muted hint">
        Archivierte Habits verschwinden aus Heute/Monat, ihre Daten bleiben für Analysen erhalten.
      </p>
      <ul class="habit-list">
        {#each archived as habit (habit.id)}
          <li class="habit-item">
            <div class="habit-row archived-row">
              <span class="habit-name">{habit.name}</span>
              <span class="badge">{TYPE_BADGES[habit.type]}</span>
              <button class="reactivate" onclick={() => reactivate(habit)}>Reaktivieren</button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
{/if}

<style>
  .habit-list {
    list-style: none;
    margin: 0 0 1rem;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .habit-item {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
  }

  .habit-row {
    display: flex;
    align-items: stretch;
  }

  .row-main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    min-height: 2.75rem;
    padding: 0.5rem 0.75rem;
    border: none;
    background: none;
    text-align: left;
  }

  .habit-name {
    overflow-wrap: anywhere;
  }

  .badge {
    font-size: 0.75rem;
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: 999px;
    padding: 0.1rem 0.5rem;
    white-space: nowrap;
  }

  .sort {
    display: flex;
    align-items: center;
    padding-right: 0.25rem;
  }

  .sort button {
    min-width: 2.75rem;
    min-height: 2.75rem;
    border: none;
    background: none;
    color: var(--accent);
    font-size: 1.1rem;
  }

  .sort button:disabled {
    color: var(--border);
  }

  .add {
    width: 100%;
    min-height: 2.75rem;
    margin-bottom: 1rem;
    color: var(--accent);
    border-style: dashed;
  }

  .archived {
    margin-top: 1.5rem;
  }

  .archived-toggle {
    width: 100%;
    min-height: 2.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .chevron {
    color: var(--muted);
  }

  .archived-row {
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
  }

  .archived-row .habit-name {
    flex: 1;
    color: var(--muted);
  }

  .reactivate {
    min-height: 2.75rem;
    color: var(--accent);
  }

  .hint {
    margin: 0.5rem 0;
    font-size: 0.85rem;
  }
</style>
