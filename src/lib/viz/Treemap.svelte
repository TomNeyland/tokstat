<script lang="ts">
  import { hierarchy, treemap, treemapSquarify } from 'd3-hierarchy'
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

  // Top 10 insight paths for annotations
  let insightPaths = $derived(new Set(
    insights
      .sort((a, b) => b.savings_tokens - a.savings_tokens)
      .slice(0, 10)
      .map(i => i.path)
  ))

  // ── D3 layout computation ──
  let layoutNodes = $derived.by(() => {
    const h = hierarchy(root, d => d.children)
      .sum(d => d.children.length === 0 ? d.tokens.total.avg : 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    const layout = treemap<AnalysisNode>()
      .size([width, height])
      .tile(treemapSquarify)
      .padding(2)
      .paddingOuter(4)

    layout(h)
    return h.leaves()
  })

  // ── Cost normalization (rank-based for skewed distributions) ──
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

  // ── Thermal value for glow ──
  function nodeThermalValue(node: HierarchyRectangularNode<AnalysisNode>): number {
    return costNormMap.get(node.data.cost.per_instance) ?? 0
  }

  // ── Should show label ──
  function showLabel(node: HierarchyRectangularNode<AnalysisNode>): boolean {
    return (node.x1 - node.x0) > 60 && (node.y1 - node.y0) > 20
  }

  // ── Hover tracking ──
  let hoveredPath = $state<string | null>(null)
</script>

<svg
  class="treemap"
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
    {@const t = nodeThermalValue(node)}
    {@const glow = glowParams(t)}
    {@const hovered = hoveredPath === node.data.path}

    <g
      class="node"
      class:hovered
      onmouseenter={(e) => {
        hoveredPath = node.data.path
        onhover(node.data, e.clientX, e.clientY)
      }}
      onmousemove={(e) => {
        onhover(node.data, e.clientX, e.clientY)
      }}
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
        rx="3"
        fill={color}
        stroke={hovered ? 'var(--text-primary)' : 'var(--bg-root)'}
        stroke-width={hovered ? 1.5 : 1}
        style="{glow.radius > 0 ? `filter: drop-shadow(0 0 ${glow.radius}px ${color});` : ''} cursor: pointer; transition: opacity 50ms, stroke 50ms;"
      />
      {#if showLabel(node)}
        <text
          x={x + 6}
          y={y + 14}
          class="label"
          clip-path="inset(0 {Math.max(0, w - 12)}px 0 0)"
        >
          {node.data.name}
        </text>
        {#if h > 34}
          <text
            x={x + 6}
            y={y + 26}
            class="sublabel"
          >
            {Math.round(node.data.tokens.total.avg)} tok
          </text>
        {/if}
      {/if}
      {#if insightPaths.has(node.data.path)}
        <circle
          cx={x + w - 8}
          cy={y + 8}
          r="4"
          class="insight-dot"
        />
      {/if}
    </g>
  {/each}
</svg>

<style>
  .treemap {
    display: block;
  }

  .node {
    outline: none;
  }

  .label {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    fill: var(--bg-root);
    pointer-events: none;
  }

  .sublabel {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 400;
    fill: var(--bg-root);
    opacity: 0.7;
    pointer-events: none;
  }

  .insight-dot {
    fill: var(--accent);
    pointer-events: none;
    animation: insight-pulse 2s ease-in-out infinite;
  }

  @keyframes insight-pulse {
    0%, 100% { opacity: 0.6; r: 4; }
    50% { opacity: 1; r: 5; }
  }
</style>
