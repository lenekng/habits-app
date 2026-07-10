<script lang="ts">
  import { t } from '../lib/i18n/i18n.svelte';
  import InsightsPanel from './analyse/InsightsPanel.svelte';
  import TrendCharts from './analyse/TrendCharts.svelte';
  import PhaseProfiles from './analyse/PhaseProfiles.svelte';
  import CorrelationMatrix from './analyse/CorrelationMatrix.svelte';
</script>

<section class="view">
  <h1>{t('nav.analyse')}</h1>
  <InsightsPanel />
  <TrendCharts />
  <PhaseProfiles />
  <CorrelationMatrix />
</section>
