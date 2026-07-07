<script lang="ts">
  import uPlot from 'uplot';
  import 'uplot/dist/uPlot.min.css';
  import { BAND_FILLS, GRID_COLOR, SERIES_COLOR, type ChartConfig, type PhaseBand } from './data';

  interface Props {
    config: ChartConfig;
    bands: PhaseBand[];
    title: string;
  }

  let { config, bands, title }: Props = $props();

  let host = $state<HTMLDivElement | null>(null);
  let scrollWrap = $state<HTMLDivElement | null>(null);
  let wrapWidth = $state(0);

  const CHART_HEIGHT = 240;
  // iOS begrenzt die Canvas-Fläche; bei devicePixelRatio 3 bleibt 6000 CSS-px
  // Breite unter dem Limit.
  const MAX_WIDTH = 6000;

  const chartWidth = $derived.by(() => {
    const perPoint = config.kind === 'bars' ? 30 : 9;
    const minWidth = Math.min(MAX_WIDTH, config.xs.length * perPoint + config.axis.size);
    return Math.max(wrapWidth, minWidth);
  });

  function drawBands(u: uPlot, bs: PhaseBand[]): void {
    const { left, top, width, height } = u.bbox;
    u.ctx.save();
    for (const b of bs) {
      const x0 = Math.max(u.valToPos(b.from, 'x', true), left);
      const x1 = Math.min(u.valToPos(b.to, 'x', true), left + width);
      if (x1 <= x0) continue;
      u.ctx.fillStyle = BAND_FILLS[b.phase];
      u.ctx.fillRect(x0, top, x1 - x0, height);
    }
    u.ctx.restore();
  }

  function makeChart(el: HTMLElement, width: number, cfg: ChartConfig, bs: PhaseBand[]): uPlot {
    const rootStyle = getComputedStyle(document.documentElement);
    const mutedColor = rootStyle.getPropertyValue('--muted').trim() || '#8a8878';

    const tip = document.createElement('div');
    tip.className = 'trend-tip';
    tip.style.display = 'none';

    const grid = { stroke: GRID_COLOR, width: 1 };
    const ticks = { stroke: GRID_COLOR, width: 1 };

    const ySeries: uPlot.Series =
      cfg.kind === 'bars'
        ? {
            stroke: SERIES_COLOR,
            fill: SERIES_COLOR,
            paths: uPlot.paths.bars!({ size: [0.6, 26] }),
            points: { show: false }
          }
        : {
            stroke: SERIES_COLOR,
            width: 2,
            spanGaps: false,
            points: { show: true, size: 6, width: 0, fill: SERIES_COLOR }
          };

    const yAxis: uPlot.Axis = {
      stroke: mutedColor,
      grid,
      ticks,
      size: cfg.axis.size
    };
    if (cfg.axis.label) yAxis.label = cfg.axis.label;
    if (cfg.axis.splits && cfg.axis.tickValues) {
      yAxis.splits = cfg.axis.splits;
      yAxis.values = cfg.axis.tickValues;
    } else if (cfg.axis.tickFormat) {
      const fmt = cfg.axis.tickFormat;
      yAxis.values = (_u, splits) => splits.map(fmt);
    }
    if (cfg.axis.incrs) yAxis.incrs = cfg.axis.incrs;

    const opts: uPlot.Options = {
      width,
      height: CHART_HEIGHT,
      legend: { show: false },
      cursor: {
        y: false,
        drag: { setScale: false, x: false, y: false },
        points: {
          show: cfg.kind === 'points',
          size: 10,
          width: 2,
          stroke: SERIES_COLOR,
          fill: '#ffffff'
        },
        hover: { skip: [null, undefined], prox: 30 }
      },
      scales: {
        x: {
          time: true,
          range: (_u, min, max) => [min - cfg.xPadSeconds, max + cfg.xPadSeconds]
        },
        y: cfg.axis.range ? { range: cfg.axis.range } : { auto: true }
      },
      series: [{}, ySeries],
      axes: [
        { stroke: mutedColor, grid, ticks, values: '{DD}.{MM}.', space: 56 },
        yAxis
      ],
      hooks: {
        init: [
          (u) => {
            u.over.appendChild(tip);
          }
        ],
        drawClear: [(u) => drawBands(u, bs)],
        setCursor: [
          (u) => {
            const idx = u.cursor.idxs?.[1] ?? u.cursor.idx;
            const y = idx == null ? null : cfg.ys[idx];
            if (idx == null || y == null) {
              tip.style.display = 'none';
              return;
            }
            const x = cfg.xs[idx]!;
            tip.textContent = `${cfg.formatX(x)} · ${cfg.formatValue(y)}`;
            tip.style.display = 'block';
            const plotW = u.over.clientWidth;
            const left = Math.max(0, Math.min(u.valToPos(x, 'x') - tip.offsetWidth / 2, plotW - tip.offsetWidth));
            const above = u.valToPos(y, 'y') - tip.offsetHeight - 10;
            tip.style.left = `${left}px`;
            tip.style.top = `${Math.max(0, above)}px`;
          }
        ]
      }
    };

    return new uPlot(opts, [cfg.xs, cfg.ys], el);
  }

  $effect(() => {
    const el = host;
    const width = chartWidth;
    const cfg = config;
    const bs = bands;
    if (!el || wrapWidth <= 0) return;
    const u = makeChart(el, width, cfg, bs);
    if (scrollWrap) scrollWrap.scrollLeft = scrollWrap.scrollWidth;
    return () => u.destroy();
  });
</script>

<div class="chart-card">
  <h3 class="chart-title">{title}</h3>
  <div class="scroll-wrap" bind:this={scrollWrap} bind:clientWidth={wrapWidth}>
    <div class="chart-host" bind:this={host}></div>
  </div>
</div>

<style>
  .chart-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 0.6rem;
    padding: 0.75rem 0.5rem 0.5rem;
  }

  .chart-title {
    margin: 0 0 0.5rem 0.5rem;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text);
  }

  .scroll-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .chart-host {
    width: max-content;
  }

  .chart-host :global(.u-over) {
    touch-action: pan-y;
  }

  .chart-host :global(.trend-tip) {
    position: absolute;
    z-index: 3;
    pointer-events: none;
    white-space: nowrap;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 0.4rem;
    padding: 0.2rem 0.45rem;
    font-size: 0.75rem;
    color: var(--text);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  }
</style>
