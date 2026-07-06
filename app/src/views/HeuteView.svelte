<script lang="ts">
  import { nav } from '../lib/nav.svelte';
  import { addDays, formatDE, todayISO } from '../lib/date';
  import { activeHabits, db, getDayEntry, getSetting, saveDayEntry, setSetting } from '../lib/db';
  import { isBackupOverdue } from '../lib/backup';
  import type { CycleObservation, DayEntry, HabitDefinition, HabitValue } from '../lib/types';
  import HabitsSection from './heute/HabitsSection.svelte';
  import CycleSection from './heute/CycleSection.svelte';

  let habitDefs = $state<HabitDefinition[]>([]);
  let habits = $state<Record<string, HabitValue>>({});
  let cycle = $state<CycleObservation>({});
  let prevHabits = $state<Record<string, HabitValue>>({});
  let ready = $state(false);
  let backupOverdue = $state(false);
  let lastTempTime = $state('07:00');
  let loadToken = 0;

  void activeHabits().then((h) => (habitDefs = h));
  void isBackupOverdue().then((v) => (backupOverdue = v));
  void getSetting<string>('lastTempTime').then((t) => {
    if (t) lastTempTime = t;
  });

  $effect(() => {
    const date = nav.date;
    ready = false;
    void load(date);
  });

  async function load(date: string): Promise<void> {
    const token = ++loadToken;
    const [entry, prev] = await Promise.all([getDayEntry(date), getDayEntry(addDays(date, -1))]);
    if (token !== loadToken) return;
    habits = entry ? { ...entry.habits } : {};
    cycle = entry?.cycle ? { ...entry.cycle } : {};
    prevHabits = prev?.habits ?? {};
    ready = true;
  }

  const disturbanceReasons = $derived.by(() => {
    const r: string[] = [];
    if (typeof prevHabits.alkohol === 'number' && prevHabits.alkohol >= 3) r.push('Alkohol');
    if (typeof prevHabits.schlaf === 'number' && prevHabits.schlaf <= 2) r.push('schlecht geschlafen');
    if (prevHabits.erkaeltung === true) r.push('Erkältung');
    if (prevHabits.medikamente === true) r.push('Medikamente');
    if (prevHabits.auswaerts_geschlafen === true) r.push('auswärts geschlafen');
    if (prevHabits.urlaub === true) r.push('Urlaub');
    return r;
  });

  function cleanCycle(c: CycleObservation): CycleObservation | undefined {
    const out: CycleObservation = {};
    if (c.bleeding) out.bleeding = c.bleeding;
    if (c.temperature) out.temperature = { ...c.temperature };
    if (c.mucus) out.mucus = c.mucus;
    if (c.midPain) out.midPain = true;
    if (c.breastTenderness) out.breastTenderness = true;
    if (c.spotting) out.spotting = true;
    if (c.note && c.note.trim() !== '') out.note = c.note;
    return Object.keys(out).length > 0 ? out : undefined;
  }

  async function persist(): Promise<void> {
    const date = nav.date;
    const entry: DayEntry = { date, habits: { ...$state.snapshot(habits) } };
    const c = cleanCycle(cycle);
    if (c) entry.cycle = c;
    if (Object.keys(entry.habits).length === 0 && !entry.cycle) {
      await db.day_entries.delete(date);
    } else {
      await saveDayEntry(entry);
    }
  }

  function setHabit(id: string, value: HabitValue | undefined): void {
    if (value === undefined) delete habits[id];
    else habits[id] = value;
    void persist();
  }

  function setCycle(next: CycleObservation): void {
    cycle = next;
    void persist();
  }

  function onTempTimeUsed(time: string): void {
    lastTempTime = time;
    void setSetting('lastTempTime', time);
  }
</script>

<section class="view">
  <header class="date-nav">
    <button class="arrow" aria-label="Vorheriger Tag" onclick={() => nav.setDate(addDays(nav.date, -1))}>
      &lsaquo;
    </button>
    <label class="date-label">
      <span>{formatDE(nav.date)}</span>
      <input
        type="date"
        aria-label="Datum wählen"
        value={nav.date}
        onchange={(e) => {
          if (e.currentTarget.value) nav.setDate(e.currentTarget.value);
        }}
      />
    </label>
    <button class="arrow" aria-label="Nächster Tag" onclick={() => nav.setDate(addDays(nav.date, 1))}>
      &rsaquo;
    </button>
  </header>

  {#if nav.date !== todayISO()}
    <button class="today-link" onclick={() => nav.setDate(todayISO())}>Zurück zu heute</button>
  {/if}

  {#if backupOverdue}
    <div class="banner">
      <span>Letztes Backup liegt über 14 Tage zurück</span>
      <button onclick={() => nav.go('mehr')}>Zum Backup</button>
    </div>
  {/if}

  {#if ready}
    <HabitsSection habits={habitDefs} values={habits} onSet={setHabit} />
    <CycleSection {cycle} {disturbanceReasons} defaultTempTime={lastTempTime} onChange={setCycle} {onTempTimeUsed} />
  {/if}
</section>

<style>
  .date-nav {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .arrow {
    min-width: 44px;
    min-height: 44px;
    font-size: 1.4rem;
    line-height: 1;
  }

  .date-label {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
    font-weight: 600;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
  }

  .date-label input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
  }

  .today-link {
    border: none;
    background: none;
    color: var(--accent);
    padding: 0.25rem 0;
    min-height: 44px;
  }

  .banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    background: var(--accent-soft);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 0.5rem 0.75rem;
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
  }

  .banner button {
    min-height: 44px;
    flex-shrink: 0;
  }
</style>
