<script lang="ts">
  import TrendCharts from './analyse/TrendCharts.svelte';
  import PhaseProfiles from './analyse/PhaseProfiles.svelte';
  import CorrelationMatrix from './analyse/CorrelationMatrix.svelte';
</script>

<section class="view">
  <h1>Analyse</h1>
  <TrendCharts />
  <PhaseProfiles />
  <CorrelationMatrix />
</section>
