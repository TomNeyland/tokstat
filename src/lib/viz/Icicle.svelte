<script lang="ts">
  import { hierarchy, partition } from 'd3-hierarchy'
  import type { HierarchyRectangularNode } from 'd3-hierarchy'
  import type { AnalysisNode, Insight } from '../../engine/types'
  import { thermalScale, fillRateScale, overheadScale, depthScale, glowParams, rankNormalize } from './colorScale'

  type ColorMode = 'Cost' | 'Fill rate' | 'Overhead' | 'Depth'

  interface Props {
    root: AnalysisNode
    width: number
    height: number
    colorMode: ColorMode
    insights?: Insight[]
    onhover: (node: AnalysisNode | null, x: number, y: number) => void
    onclick: (node: AnalysisNode) => void
  }

  let { root, width, height, colorMode, insights = [], onhover, onclick }: Props = $props()

  let insightPaths = $derived(new Set(
    insights.sort((a, b) => b.savings_tokens - a.savings_tokens).slice(0, 10).map(i => i.path)
  ))

  // ── D3 partition layout (linear) ──
  let layoutNodes = $derived.by(() => {
    const h = hierarchy(root, d => d.children)
      .sum(d => d.children.length === 0 ? d.tokens.total.avg : 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    const p = partition<AnalysisNode>()
      .size([width, height])
      .padding(1)

    p(h)
    // Include all nodes except root
    return h.descendants().filter(d => d.depth > 0)
  })

  // ── Cost normalization ──
  let costNormMap = $derived.by(() => {
    const costs = layoutNodes.map(n => n.data.cost.per_instance)
    return rankNormalize(costs)
  })

  // ── Color per node ──
  function nodeColor(node: HierarchyRectangularNode<AnalysisNode>): string {
    const d = node.data
    switch (colorMode) {
      case 'Cost':
        return thermalScale(costNormMap.get(d.cost.per_instance) ?? 0)
      case 'Fill rate':
        return fillRateScale(d.fill_rate)
      case 'Overhead': {
        const total = d.tokens.schema_overhead + d.tokens.value_payload + d.tokens.null_waste
        return overheadScale(d.tokens.schema_overhead / total)
      }
      case 'Depth':
        return depthScale(Math.min(d.depth, 5))
    }
  }

  // ── Show label if bar is wide enough ──
  function showLabel(node: HierarchyRectangularNode<AnalysisNode>): boolean {
    return (node.x1 - node.x0) > 50
  }

  let hoveredPath = $state<string | null>(null)
</script>

<svg
  class="icicle"
  viewBox="0 0 {width} {height}"
  {width}
  {height}
>
  {#each layoutNodes as node (node.data.path)}
    {@const x = node.x0}
    {@const y = node.y0}
    {@const w = node.x1 - node.x0}
    {@const h = node.y1 - node.y0}
    {@const color = nodeColor(node)}
    {@const t = costNormMap.get(node.data.cost.per_instance) ?? 0}
    {@const glow = glowParams(t)}
    {@const hovered = hoveredPath === node.data.path}

    <g
      class="icicle-node"
      class:hovered
      onmouseenter={(e) => {
        hoveredPath = node.data.path
        onhover(node.data, e.clientX, e.clientY)
      }}
      onmousemove={(e) => onhover(node.data, e.clientX, e.clientY)}
      onmouseleave={() => {
        hoveredPath = null
        onhover(null, 0, 0)
      }}
      onclick={() => onclick(node.data)}
      onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') onclick(node.data) }}
      role="button"
      tabindex="0"
    >
      <rect
        {x} {y} width={w} height={h}
        rx="2"
        fill={color}
        stroke={hovered ? 'var(--text-primary)' : 'var(--bg-root)'}
        stroke-width={hovered ? 1.5 : 0.5}
        style="filter: drop-shadow(0 0 {glow.radius * 0.5}px {color}); opacity: {hovered ? 1 : 0.85 + t * 0.15}; cursor: pointer; transition: opacity 50ms, stroke 50ms;"
      />
      {#if showLabel(node)}
        <text
          x={x + 6}
          y={y + h / 2}
          class="icicle-label"
          dominant-baseline="central"
        >
          {node.data.name}
        </text>
        {#if w > 120}
          <text
            x={x + w - 6}
            y={y + h / 2}
            class="icicle-tokens"
            text-anchor="end"
            dominant-baseline="central"
          >
            {node.data.tokens.total.avg} tok
          </text>
        {/if}
      {/if}
    </g>
  {/each}
</svg>

<style>
  .icicle {
    display: block;
  }

  .icicle-node {
    outline: none;
  }

  .icicle-label {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    fill: var(--bg-root);
    pointer-events: none;
  }

  .icicle-tokens {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 400;
    fill: var(--bg-root);
    opacity: 0.7;
    pointer-events: none;
  }
</style>
