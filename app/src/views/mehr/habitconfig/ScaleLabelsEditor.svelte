<script lang="ts">
  let { labels = $bindable() }: { labels: string[] } = $props();
</script>

<div class="scale-labels">
  {#each labels as _, i}
    <label class="scale-row">
      <span class="num">{i + 1}</span>
      <input type="text" bind:value={labels[i]} />
    </label>
  {/each}
</div>

<style>
  .scale-labels {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .scale-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .num {
    width: 1.25rem;
    text-align: center;
    color: var(--muted);
  }

  .scale-row input {
    flex: 1;
    min-height: 2.75rem;
  }
</style>
