<script lang="ts">
  let { choices = $bindable() }: { choices: string[] } = $props();

  function add() {
    choices = [...choices, ''];
  }

  function remove(i: number) {
    choices = choices.filter((_, j) => j !== i);
  }
</script>

<div class="choices">
  {#each choices as _, i}
    <div class="choice-row">
      <input type="text" bind:value={choices[i]} placeholder="Option" />
      <button onclick={() => remove(i)} disabled={choices.length === 1}>Entfernen</button>
    </div>
  {/each}
  <button class="add-choice" onclick={add}>Option hinzufügen</button>
</div>

<style>
  .choices {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .choice-row {
    display: flex;
    gap: 0.5rem;
  }

  .choice-row input {
    flex: 1;
    min-height: 2.75rem;
  }

  .choice-row button {
    min-height: 2.75rem;
    color: var(--muted);
  }

  .choice-row button:disabled {
    opacity: 0.4;
  }

  .add-choice {
    min-height: 2.75rem;
    align-self: flex-start;
    color: var(--accent);
    border-style: dashed;
  }
</style>
