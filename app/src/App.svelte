<script lang="ts">
  import { nav, type View } from './lib/nav.svelte';
  import HeuteView from './views/HeuteView.svelte';
  import MonatView from './views/MonatView.svelte';
  import ZyklusView from './views/ZyklusView.svelte';
  import AnalyseView from './views/AnalyseView.svelte';
  import MehrView from './views/MehrView.svelte';

  const tabs: { id: View; label: string }[] = [
    { id: 'heute', label: 'Heute' },
    { id: 'monat', label: 'Monat' },
    { id: 'zyklus', label: 'Zyklus' },
    { id: 'analyse', label: 'Analyse' },
    { id: 'mehr', label: 'Mehr' }
  ];
</script>

<main>
  {#if nav.view === 'heute'}
    <HeuteView />
  {:else if nav.view === 'monat'}
    <MonatView />
  {:else if nav.view === 'zyklus'}
    <ZyklusView />
  {:else if nav.view === 'analyse'}
    <AnalyseView />
  {:else}
    <MehrView />
  {/if}
</main>

<nav class="tabbar">
  {#each tabs as tab (tab.id)}
    <button class:active={nav.view === tab.id} onclick={() => nav.go(tab.id)}>
      {tab.label}
    </button>
  {/each}
</nav>

<style>
  .tabbar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    background: var(--surface);
    border-top: 1px solid var(--border);
    padding-bottom: env(safe-area-inset-bottom);
    height: calc(var(--tabbar-height) + env(safe-area-inset-bottom));
  }

  .tabbar button {
    flex: 1;
    border: none;
    border-radius: 0;
    background: none;
    color: var(--muted);
    font-size: 0.8rem;
    padding: 0.5rem 0;
  }

  .tabbar button.active {
    color: var(--accent);
    font-weight: 600;
  }
</style>
