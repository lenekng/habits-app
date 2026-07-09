<script lang="ts">
  import { flip } from 'svelte/animate';
  import type { HabitDefinition, HabitType } from '../../lib/types';
  import { allHabits, db } from '../../lib/db';
  import { t, getLang } from '../../lib/i18n/i18n.svelte';
  import type { MessageKey } from '../../lib/i18n/messages';
  import { localizedHabitName } from '../../lib/i18n/habits';
  import HabitEditor from './habitconfig/HabitEditor.svelte';
  import NewHabitForm from './habitconfig/NewHabitForm.svelte';

  const TYPE_BADGES: Record<HabitType, MessageKey> = {
    bool: 'badge.bool',
    scale4: 'badge.scale4',
    choice: 'badge.choice'
  };

  let habits = $state<HabitDefinition[]>([]);
  let editingId = $state<string | null>(null);
  let showArchived = $state(false);
  let showNewForm = $state(false);

  let dragId = $state<string | null>(null);
  let orderIds = $state<string[]>([]);
  let listEl = $state<HTMLUListElement | null>(null);

  const active = $derived(habits.filter((h) => !h.archivedAt));
  const archived = $derived(habits.filter((h) => h.archivedAt));
  const existingIds = $derived(habits.map((h) => h.id));
  const nextSortOrder = $derived(habits.reduce((m, h) => Math.max(m, h.sortOrder), 0) + 1);

  const byId = $derived(new Map(habits.map((h) => [h.id, h])));
  const renderList = $derived(
    dragId
      ? orderIds.map((id) => byId.get(id)).filter((h): h is HabitDefinition => !!h)
      : active
  );

  async function load() {
    habits = await allHabits();
  }
  void load();

  let startOrder: string[] = [];
  let lastPointerY = 0;
  let scrollDir = 0;
  let scrollRAF = 0;

  function onHandleDown(e: PointerEvent, id: string) {
    if (dragId) return; // laufenden Drag nicht durch Zweitfinger überschreiben
    e.preventDefault();
    editingId = null;
    dragId = id;
    orderIds = active.map((h) => h.id);
    startOrder = orderIds;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  // Einfügeindex = Anzahl NICHT-gezogener Zeilen, deren Mittelpunkt über dem
  // Zeiger liegt. Vermeidet die Splice-Off-by-one beim Ziehen nach unten.
  function updateTarget(y: number) {
    if (!dragId || !listEl) return;
    const items = [...listEl.children] as HTMLElement[];
    let insert = 0;
    for (let i = 0; i < items.length; i++) {
      if (orderIds[i] === dragId) continue;
      const r = items[i]!.getBoundingClientRect();
      if (y > r.top + r.height / 2) insert++;
    }
    const next = orderIds.filter((id) => id !== dragId);
    next.splice(insert, 0, dragId);
    if (next.some((id, i) => id !== orderIds[i])) orderIds = next;
  }

  function stopAutoScroll() {
    scrollDir = 0;
    if (scrollRAF) cancelAnimationFrame(scrollRAF);
    scrollRAF = 0;
  }

  function autoScrollTick() {
    if (!dragId || scrollDir === 0) {
      scrollRAF = 0;
      return;
    }
    window.scrollBy(0, scrollDir * 10);
    updateTarget(lastPointerY);
    scrollRAF = requestAnimationFrame(autoScrollTick);
  }

  function onHandleMove(e: PointerEvent) {
    if (!dragId) return;
    lastPointerY = e.clientY;
    updateTarget(e.clientY);
    const margin = 72;
    if (e.clientY < margin) scrollDir = -1;
    else if (e.clientY > window.innerHeight - margin) scrollDir = 1;
    else scrollDir = 0;
    if (scrollDir !== 0 && !scrollRAF) scrollRAF = requestAnimationFrame(autoScrollTick);
    else if (scrollDir === 0 && scrollRAF) stopAutoScroll();
  }

  function onHandleUp() {
    if (!dragId) return;
    stopAutoScroll();
    const changed = orderIds.length === startOrder.length && orderIds.some((id, i) => id !== startOrder[i]);
    if (changed) {
      const reordered = orderIds
        .map((id, i) => {
          const h = byId.get(id);
          return h ? { ...h, sortOrder: i } : null;
        })
        .filter((h): h is HabitDefinition => !!h);
      const archivedItems = habits.filter((h) => h.archivedAt);
      habits = [...reordered, ...archivedItems];
      void db.habit_definitions.bulkPut(reordered).catch(() => void load());
    }
    dragId = null;
    orderIds = [];
  }

  async function reactivate(habit: HabitDefinition) {
    const restored: HabitDefinition = { ...habit, sortOrder: nextSortOrder };
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

<h1>{t('habitcfg.heading')}</h1>

<ul class="habit-list" bind:this={listEl}>
  {#each renderList as habit (habit.id)}
    <li class="habit-item" class:dragging={dragId === habit.id} animate:flip={{ duration: 180 }}>
      <div class="habit-row">
        <button
          class="drag-handle"
          aria-label={t('habitcfg.moveAria')}
          onpointerdown={(e) => onHandleDown(e, habit.id)}
          onpointermove={onHandleMove}
          onpointerup={onHandleUp}
          onpointercancel={onHandleUp}
        >
          &#9776;
        </button>
        <button
          class="row-main"
          onclick={() => toggleEdit(habit.id)}
          aria-expanded={editingId === habit.id}
        >
          <span class="habit-name">{localizedHabitName(habit, getLang())}</span>
          <span class="badge">{t(TYPE_BADGES[habit.type])}</span>
        </button>
      </div>
      {#if editingId === habit.id}
        <HabitEditor {habit} onsaved={onSaved} />
      {/if}
    </li>
  {/each}
</ul>

{#if showNewForm}
  <h2>{t('habitcfg.newHabitTitle')}</h2>
  <NewHabitForm
    {existingIds}
    {nextSortOrder}
    oncreated={onCreated}
    oncancel={() => (showNewForm = false)}
  />
{:else}
  <button class="add" onclick={() => (showNewForm = true)}>{t('habitcfg.newHabit')}</button>
{/if}

{#if archived.length > 0}
  <section class="archived">
    <button class="archived-toggle" onclick={() => (showArchived = !showArchived)}>
      <span>{t('habitcfg.archivedToggle', { n: archived.length })}</span>
      <span class="chevron">{showArchived ? '▾' : '▸'}</span>
    </button>
    {#if showArchived}
      <p class="muted hint">{t('habitcfg.archivedHint')}</p>
      <ul class="habit-list">
        {#each archived as habit (habit.id)}
          <li class="habit-item">
            <div class="habit-row archived-row">
              <span class="habit-name">{localizedHabitName(habit, getLang())}</span>
              <span class="badge">{t(TYPE_BADGES[habit.type])}</span>
              <button class="reactivate" onclick={() => reactivate(habit)}>{t('habitcfg.reactivate')}</button>
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

  .drag-handle {
    flex: 0 0 auto;
    min-width: 2.75rem;
    min-height: 2.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: none;
    color: var(--muted);
    font-size: 1.15rem;
    cursor: grab;
    touch-action: none;
    -webkit-user-select: none;
    user-select: none;
  }

  .drag-handle:active {
    cursor: grabbing;
  }

  .habit-item.dragging {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
    position: relative;
    z-index: 3;
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
