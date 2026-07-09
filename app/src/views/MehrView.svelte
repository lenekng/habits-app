<script lang="ts">
  import { t, getLang, setLang } from '../lib/i18n/i18n.svelte';
  import type { MessageKey } from '../lib/i18n/messages';
  import HabitConfig from './mehr/HabitConfig.svelte';
  import HealthImport from './mehr/HealthImport.svelte';
  import BackupExport from './mehr/BackupExport.svelte';

  type Section = 'habits' | 'health' | 'backup';

  let section = $state<Section | null>(null);

  const entries: { id: Section; labelKey: MessageKey; hintKey: MessageKey }[] = [
    { id: 'habits', labelKey: 'mehr.habitsLabel', hintKey: 'mehr.habitsHint' },
    { id: 'health', labelKey: 'mehr.healthLabel', hintKey: 'mehr.healthHint' },
    { id: 'backup', labelKey: 'mehr.backupLabel', hintKey: 'mehr.backupHint' }
  ];
</script>

<section class="view">
  {#if section === null}
    <h1>{t('mehr.heading')}</h1>
    <div class="lang">
      <span class="lang-label">{t('mehr.language')}</span>
      <div class="lang-select" role="group" aria-label={t('mehr.language')}>
        <button class:selected={getLang() === 'de'} onclick={() => setLang('de')}>Deutsch</button>
        <button class:selected={getLang() === 'en'} onclick={() => setLang('en')}>English</button>
      </div>
    </div>
    <ul class="menu">
      {#each entries as entry (entry.id)}
        <li>
          <button onclick={() => (section = entry.id)}>
            <span>{t(entry.labelKey)}</span>
            <span class="muted">{t(entry.hintKey)}</span>
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <button class="back" onclick={() => (section = null)}>&larr; {t('common.back')}</button>
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

  .lang {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .lang-label {
    font-size: 0.85rem;
    color: var(--muted);
  }

  .lang-select {
    display: flex;
    gap: 0.4rem;
  }

  .lang-select button {
    min-height: 2.5rem;
    padding: 0 0.9rem;
  }

  .lang-select button.selected {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
</style>
