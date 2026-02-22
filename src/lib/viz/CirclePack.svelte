<script lang="ts">
  import { hierarchy, pack } from 'd3-hierarchy'
  import type { HierarchyCircularNode } from 'd3-hierarchy'
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

  // ── D3 pack layout ──
  let layoutNodes = $derived.by(() => {
    const h = hierarchy(root, d => d.children)
      .sum(d => d.children.length === 0 ? d.tokens.total.avg : 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    const p = pack<AnalysisNode>()
      .size([width, height])
      .padding(4)

    p(h)
    // Skip root circle
    return h.descendants().filter(d => d.depth > 0)
  })

  // ── Cost normalization ──
  let costNormMap = $derived.by(() => {
    const costs = layoutNodes.map(n => n.data.cost.per_instance)
    return rankNormalize(costs)
  })

  // ── Color per node ──
  function nodeColor(node: HierarchyCircularNode<AnalysisNode>): string {
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

  // ── Show label if circle is large enough ──
  function showLabel(node: HierarchyCircularNode<AnalysisNode>): boolean {
    return node.r > 25
  }

  let hoveredPath = $state<string | null>(null)
</script>

<svg
  class="circle-pack"
  viewBox="0 0 {width} {height}"
  {width}
  {height}
>
  {#each layoutNodes as node (node.data.path)}
    {@const color = nodeColor(node)}
    {@const t = costNormMap.get(node.data.cost.per_instance) ?? 0}
    {@const glow = glowParams(t)}
    {@const hovered = hoveredPath === node.data.path}
    {@const isLeaf = node.data.children.length === 0}

    <g
      class="pack-node"
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
      <circle
        cx={node.x}
        cy={node.y}
        r={node.r}
        fill={isLeaf ? color : `color-mix(in srgb, ${color} 15%, transparent)`}
        stroke={color}
        stroke-width={hovered ? 2.5 : 1.5}
        style="{glow.radius > 0 ? `filter: drop-shadow(0 0 ${glow.radius}px ${color});` : ''} cursor: pointer; transition: opacity 50ms, stroke-width 50ms;"
      />
      {#if showLabel(node)}
        <text
          x={node.x}
          y={node.y - (isLeaf ? 0 : node.r - 14)}
          class="pack-label"
          class:branch-label={!isLeaf}
          text-anchor="middle"
          dominant-baseline="central"
        >
          {node.data.name}
        </text>
        {#if isLeaf && node.r > 35}
          <text
            x={node.x}
            y={node.y + 12}
            class="pack-sublabel"
            text-anchor="middle"
          >
            {Math.round(node.data.tokens.total.avg)} tok
          </text>
        {/if}
      {/if}
    </g>
  {/each}
</svg>

<style>
  .circle-pack {
    display: block;
  }

  .pack-node {
    outline: none;
  }

  .pack-label {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 500;
    fill: var(--text-primary);
    pointer-events: none;
  }

  .branch-label {
    font-size: 10px;
    fill: var(--text-secondary);
  }

  .pack-sublabel {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 400;
    fill: var(--text-secondary);
    pointer-events: none;
  }
</style>
