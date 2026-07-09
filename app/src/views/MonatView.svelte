<script lang="ts">
  import { db, activeHabits, putOrDeleteDayEntry } from '../lib/db';
  import { daysInMonth, todayISO } from '../lib/date';
  import { nav } from '../lib/nav.svelte';
  import { t, getLang } from '../lib/i18n/i18n.svelte';
  import { localizedHabitName, localizedChoices } from '../lib/i18n/habits';
  import { formatMonthYear } from '../lib/i18n/format';
  import type { Bleeding, CycleObservation, DayEntry, HabitDefinition, HabitValue } from '../lib/types';
  import QuickEdit from './monat/QuickEdit.svelte';

  const today = todayISO();
  const [todayYear, todayMonth] = today.split('-').map(Number);

  let year = $state(todayYear ?? new Date().getFullYear());
  let month = $state(todayMonth ?? new Date().getMonth() + 1);
  let habits = $state<HabitDefinition[]>([]);
  let entries = $state<Record<string, DayEntry>>({});
  let loading = $state(true);
  let edit = $state<{ habit: HabitDefinition | null; date: string } | null>(null);
  let gridWrap = $state<HTMLDivElement | null>(null);

  const pad = (n: number): string => String(n).padStart(2, '0');

  const nDays = $derived(daysInMonth(year, month));
  const monthLabel = $derived(formatMonthYear(year, month));
  const days = $derived.by(() =>
    Array.from({ length: nDays }, (_, i) => {
      const iso = `${year}-${pad(month)}-${pad(i + 1)}`;
      return {
        num: i + 1,
        iso,
        isToday: iso === today,
        isFuture: iso > today,
        isGap: iso < today && !entries[iso]
      };
    })
  );

  $effect(() => {
    const first = `${year}-${pad(month)}-01`;
    const last = `${year}-${pad(month)}-${pad(nDays)}`;
    let cancelled = false;
    loading = true;
    void Promise.all([
      activeHabits(),
      db.day_entries.where('date').between(first, last, true, true).toArray()
    ]).then(([defs, list]) => {
      if (cancelled) return;
      habits = defs;
      const map: Record<string, DayEntry> = {};
      for (const e of list) map[e.date] = e;
      entries = map;
      loading = false;
    });
    return () => {
      cancelled = true;
    };
  });

  let scrolledMonth = '';
  $effect(() => {
    const key = `${year}-${pad(month)}`;
    if (loading || !gridWrap || scrolledMonth === key) return;
    scrolledMonth = key;
    const wrap = gridWrap;
    requestAnimationFrame(() => {
      wrap.querySelector('.today')?.scrollIntoView({ inline: 'center', block: 'nearest' });
    });
  });

  function shiftMonth(delta: number): void {
    const d = new Date(year, month - 1 + delta, 1);
    year = d.getFullYear();
    month = d.getMonth() + 1;
  }

  let saveError = $state(false);

  async function persist(entry: DayEntry): Promise<void> {
    const plain = $state.snapshot(entry) as DayEntry;
    try {
      const stored = await putOrDeleteDayEntry(plain);
      if (stored) entries[plain.date] = stored;
      else delete entries[plain.date];
      saveError = false;
    } catch {
      saveError = true;
    }
  }

  function setHabitValue(date: string, habitId: string, value: HabitValue | undefined): void {
    const existing = entries[date];
    const habitsMap: Record<string, HabitValue> = { ...(existing?.habits ?? {}) };
    if (value === undefined) delete habitsMap[habitId];
    else habitsMap[habitId] = value;
    const entry: DayEntry = { date, habits: habitsMap };
    if (existing?.cycle) entry.cycle = existing.cycle;
    void persist(entry);
  }

  function setBleeding(date: string, value: Bleeding | undefined): void {
    const existing = entries[date];
    const cycle: CycleObservation = { ...(existing?.cycle ?? {}) };
    if (value === undefined) delete cycle.bleeding;
    else cycle.bleeding = value;
    void persist({ date, habits: { ...(existing?.habits ?? {}) }, cycle });
  }

  function setSpotting(date: string, value: boolean | undefined): void {
    const existing = entries[date];
    const cycle: CycleObservation = { ...(existing?.cycle ?? {}) };
    if (value) cycle.spotting = true;
    else delete cycle.spotting;
    void persist({ date, habits: { ...(existing?.habits ?? {}) }, cycle });
  }

  type HabitMarker =
    | { kind: 'empty' }
    | { kind: 'yes' }
    | { kind: 'no' }
    | { kind: 'scale'; level: 1 | 2 | 3 | 4 }
    | { kind: 'choice'; indices: number[] };

  const choiceHabits = $derived(
    habits.filter((h) => h.type === 'choice' && (h.choices?.length ?? 0) > 0)
  );

  function habitMarker(h: HabitDefinition, entry: DayEntry | undefined): HabitMarker {
    const v = entry?.habits[h.id];
    if (v === undefined) return { kind: 'empty' };
    if (h.type === 'bool') {
      if (v === true) return { kind: 'yes' };
      if (v === false) return { kind: 'no' };
      return { kind: 'empty' };
    }
    if (h.type === 'scale4' && typeof v === 'number') {
      const level = Math.min(4, Math.max(1, Math.round(v))) as 1 | 2 | 3 | 4;
      return { kind: 'scale', level };
    }
    if (h.type === 'choice' && Array.isArray(v) && v.length > 0) {
      const choices = h.choices ?? [];
      return { kind: 'choice', indices: v.map((c) => choices.indexOf(c)) };
    }
    return { kind: 'empty' };
  }

  function periodMarker(entry: DayEntry | undefined): {
    main: 'light' | 'medium' | 'heavy' | null;
    small: boolean;
  } {
    const c = entry?.cycle;
    if (!c) return { main: null, small: false };
    const main =
      c.bleeding === 'light' || c.bleeding === 'medium' || c.bleeding === 'heavy' ? c.bleeding : null;
    const small = c.bleeding === 'spotting' || c.spotting === true;
    return { main, small };
  }
</script>

<section class="view">
  <div class="month-nav">
    <button class="nav-btn" onclick={() => shiftMonth(-1)} aria-label={t('monat.prevMonth')}>&lsaquo;</button>
    <h1>{monthLabel}</h1>
    <button class="nav-btn" onclick={() => shiftMonth(1)} aria-label={t('monat.nextMonth')}>&rsaquo;</button>
  </div>

  {#if loading}
    <p class="muted">{t('common.loading')}</p>
  {:else}
    <div class="grid-wrap" bind:this={gridWrap}>
      <div class="grid" style="grid-template-columns: 6.5rem repeat({nDays}, 1.7rem);">
        <div class="label-cell corner"></div>
        {#each days as d (d.iso)}
          <button
            class="day-head"
            class:today={d.isToday}
            class:future={d.isFuture}
            class:gap={d.isGap}
            onclick={() => nav.go('heute', d.iso)}
            aria-label={t('monat.openDay', { n: d.num })}
          >
            <span class="num">{d.num}</span>
          </button>
        {/each}

        <div class="label-cell period-label">{t('monat.period')}</div>
        {#each days as d (d.iso)}
          {@const pm = periodMarker(entries[d.iso])}
          <button
            class="cell"
            onclick={() => (edit = { habit: null, date: d.iso })}
            aria-label={t('monat.editPeriod', { n: d.num })}
          >
            {#if pm.main}
              <span class="pdot p-{pm.main}"></span>
            {/if}
            {#if pm.small}
              <span class="spot" class:corner-spot={pm.main !== null}></span>
            {/if}
          </button>
        {/each}

        {#each habits as h (h.id)}
          {@const hName = localizedHabitName(h, getLang())}
          <div class="label-cell" title={hName}>{hName}</div>
          {#each days as d (d.iso)}
            {@const m = habitMarker(h, entries[d.iso])}
            <button
              class="cell"
              onclick={() => (edit = { habit: h, date: d.iso })}
              aria-label={t('monat.editHabit', { name: hName, n: d.num })}
            >
              {#if m.kind === 'yes'}
                <span class="dot"></span>
              {:else if m.kind === 'no'}
                <span class="no-mark"></span>
              {:else if m.kind === 'scale'}
                <span class="scale s{m.level}"></span>
              {:else if m.kind === 'choice'}
                <span class="minis">
                  {#each m.indices.slice(0, 4) as ci, i (i)}
                    <span class="mini {ci >= 0 ? `c${ci % 8}` : 'cx'}"></span>
                  {/each}
                </span>
              {/if}
            </button>
          {/each}
        {/each}
      </div>
    </div>

    <div class="legend">
      <span class="item"><span class="dot"></span> {t('legend.yes')}</span>
      <span class="item"><span class="no-mark"></span> {t('legend.noRecorded')}</span>
      <span class="item">
        <span class="scale s1"></span><span class="scale s2"></span><span class="scale s3"
        ></span><span class="scale s4"></span> {t('legend.scale')}
      </span>
      {#each choiceHabits as h (h.id)}
        <span class="item choice-legend">
          {localizedHabitName(h, getLang())}:
          {#each h.choices ?? [] as c, i (c)}
            <span class="legend-choice"><span class="mini c{i % 8}"></span>{localizedChoices(h, getLang())?.[i] ?? c}</span>
          {/each}
        </span>
      {/each}
      <span class="item">
        <span class="pdot p-light"></span><span class="pdot p-medium"></span><span
          class="pdot p-heavy"
        ></span> {t('legend.periodRange')}
      </span>
      <span class="item"><span class="spot"></span> {t('legend.spotting')}</span>
      <span class="item"><span class="gap-demo">5</span> {t('legend.gap')}</span>
      <span class="item">{t('legend.empty')}</span>
    </div>
  {/if}

  {#if edit}
    {@const cur = edit}
    <QuickEdit
      habit={cur.habit}
      date={cur.date}
      entry={entries[cur.date]}
      onSetHabit={(v) => {
        if (cur.habit) setHabitValue(cur.date, cur.habit.id, v);
      }}
      onSetBleeding={(v) => setBleeding(cur.date, v)}
      onSetSpotting={(v) => setSpotting(cur.date, v)}
      onClose={() => (edit = null)}
    />
  {/if}

  {#if saveError}
    <p class="save-error">{t('monat.saveFailed')}</p>
  {/if}
</section>

<style>
  .save-error {
    color: var(--period);
    font-size: 0.85rem;
    font-weight: 600;
  }

  .month-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .month-nav h1 {
    flex: 1;
    margin: 0;
    text-align: center;
  }

  .nav-btn {
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
    font-size: 1.3rem;
    line-height: 1;
  }

  .grid-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 0.6rem;
  }

  .grid {
    display: grid;
    width: max-content;
    grid-auto-rows: 1.9rem;
  }

  .label-cell {
    position: sticky;
    left: 0;
    z-index: 2;
    background: var(--surface);
    border-right: 2px solid var(--border);
    border-bottom: 1px solid var(--border);
    padding: 0 0.45rem;
    font-size: 0.72rem;
    line-height: 1.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .corner {
    border-bottom: 2px solid var(--border);
  }

  .period-label {
    color: var(--period);
    font-weight: 600;
  }

  .day-head,
  .cell {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-right: 1px solid var(--border);
    border-bottom: 1px solid var(--border);
    border-radius: 0;
    background: none;
    padding: 0;
    touch-action: manipulation;
  }

  .day-head {
    border-bottom: 2px solid var(--border);
    font-size: 0.68rem;
  }

  .day-head .num {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.35rem;
    height: 1.35rem;
    border-radius: 50%;
  }

  .day-head.today .num {
    background: var(--accent);
    color: #fff;
    font-weight: 600;
  }

  .day-head.future {
    color: var(--muted);
    opacity: 0.55;
  }

  .day-head.gap .num {
    border: 1.5px dashed var(--period);
    color: var(--period);
  }

  .cell {
    position: relative;
  }

  .cell:active {
    background: var(--accent-soft);
  }

  .dot {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 0.95rem;
    height: 0.95rem;
    border-radius: 50%;
    background: var(--accent);
    color: #fff;
    font-size: 0.6rem;
    font-weight: 600;
  }

  .minis {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5px;
    justify-content: center;
    max-width: 1.5rem;
  }

  .mini {
    display: inline-block;
    width: 0.42rem;
    height: 0.42rem;
    border-radius: 2px;
    box-shadow: inset 0 0 0 1px rgba(11, 11, 11, 0.1);
  }

  .c0 { background: #2a78d6; }
  .c1 { background: #1baf7a; }
  .c2 { background: #eda100; }
  .c3 { background: #008300; }
  .c4 { background: #4a3aa7; }
  .c5 { background: #e34948; }
  .c6 { background: #e87ba4; }
  .c7 { background: #eb6834; }
  .cx { background: var(--muted); }

  .legend-choice {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    margin-right: 0.4rem;
  }

  .choice-legend {
    flex-wrap: wrap;
  }

  .no-mark {
    display: inline-block;
    width: 0.55rem;
    height: 2px;
    border-radius: 1px;
    background: var(--muted);
    opacity: 0.65;
  }

  .scale {
    display: inline-block;
    width: 0.95rem;
    height: 0.95rem;
    border-radius: 0.25rem;
    box-shadow: inset 0 0 0 1px rgba(11, 11, 11, 0.1);
  }

  /* Bedeutungstragende Skala: 1 = schlecht (rot) … 4 = ideal (grün). Gilt seit
     der Polaritäts-Vereinheitlichung für jeden scale4-Habit gleich. */
  .s1 {
    background: #e34948;
  }

  .s2 {
    background: #ef8b3b;
  }

  .s3 {
    background: #9dbf3e;
  }

  .s4 {
    background: #1baf7a;
  }

  .pdot {
    display: inline-block;
    width: 0.95rem;
    height: 0.95rem;
    border-radius: 50%;
  }

  .p-light {
    background: color-mix(in srgb, var(--period) 45%, transparent);
  }

  .p-medium {
    background: color-mix(in srgb, var(--period) 72%, transparent);
  }

  .p-heavy {
    background: var(--period);
  }

  .spot {
    display: inline-block;
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 50%;
    background: var(--period);
  }

  .cell .corner-spot {
    position: absolute;
    top: 2px;
    right: 2px;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1rem;
    margin-top: 0.85rem;
    font-size: 0.75rem;
    color: var(--muted);
  }

  .legend .item {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
  }

  .gap-demo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.2rem;
    height: 1.2rem;
    border: 1.5px dashed var(--period);
    border-radius: 50%;
    color: var(--period);
    font-size: 0.68rem;
  }
</style>
