<script lang="ts">
  import HabitConfig from './mehr/HabitConfig.svelte';
  import HealthImport from './mehr/HealthImport.svelte';
  import BackupExport from './mehr/BackupExport.svelte';

  type Section = 'habits' | 'health' | 'backup';

  let section = $state<Section | null>(null);

  const entries: { id: Section; label: string; hint: string }[] = [
    { id: 'habits', label: 'Habits verwalten', hint: 'Anlegen, umbenennen, archivieren' },
    { id: 'health', label: 'Apple-Health-Import', hint: 'Einmaliger Import der Altdaten' },
    { id: 'backup', label: 'Backup & Export', hint: 'JSON-Backup, CSV für Analysen' }
  ];
</script>

<section class="view">
  {#if section === null}
    <h1>Mehr</h1>
    <ul class="menu">
      {#each entries as entry (entry.id)}
        <li>
          <button onclick={() => (section = entry.id)}>
            <span>{entry.label}</span>
            <span class="muted">{entry.hint}</span>
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <button class="back" onclick={() => (section = null)}>&larr; Zurück</button>
    {#if section === 'habits'}
      <HabitConfig />
    {:else if section === 'health'}
      <HealthImport />
    {:else}
      <BackupExport />
    {/if}
  {/if}
</section>

<style>
  .menu {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .menu button {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.15rem;
    padding: 0.8rem;
    text-align: left;
  }

  .back {
    border: none;
    background: none;
    color: var(--accent);
    padding: 0 0 0.75rem;
  }
</style>
