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
    insights.toSorted((a, b) => b.savings_tokens - a.savings_tokens).slice(0, 10).map(i => i.path)
  ))

  let cx = $derived(width / 2)
  let cy = $derived(height / 2)
  let radius = $derived(Math.min(width, height) / 2 - 16)
  let innerRadius = 60

  // ── D3 partition layout ──
  let layoutNodes = $derived.by(() => {
    const h = hierarchy(root, d => d.children)
      .sum(d => d.children.length === 0 ? d.tokens.total.avg : 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

    const p = partition<AnalysisNode>()
      .size([2 * Math.PI, radius])
      .padding(0.005)

    p(h)
    // Skip root node in rendering (it's the center)
    return h.descendants().filter(d => d.depth > 0)
  })

  // ── Max depth in layout (for shallow-schema detection) ──
  let maxDepth = $derived(Math.max(...layoutNodes.map(n => n.depth)))

  // ── Sibling index map for shallow-depth differentiation ──
  let siblingIndexMap = $derived.by(() => {
    const map = new Map<string, number>()
    for (const node of layoutNodes) {
      const siblings = node.parent?.children
      if (siblings) {
        map.set(node.data.path, siblings.indexOf(node))
      }
    }
    return map
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

  // ── Arc path generator ──
  function arcPath(node: HierarchyRectangularNode<AnalysisNode>): string {
    const innerR = (node.y0 / radius) * (radius - innerRadius) + innerRadius
    const outerR = (node.y1 / radius) * (radius - innerRadius) + innerRadius
    const startAngle = node.x0 - Math.PI / 2
    const endAngle = node.x1 - Math.PI / 2

    const x0Inner = Math.cos(startAngle) * innerR
    const y0Inner = Math.sin(startAngle) * innerR
    const x1Inner = Math.cos(endAngle) * innerR
    const y1Inner = Math.sin(endAngle) * innerR
    const x0Outer = Math.cos(startAngle) * outerR
    const y0Outer = Math.sin(startAngle) * outerR
    const x1Outer = Math.cos(endAngle) * outerR
    const y1Outer = Math.sin(endAngle) * outerR

    const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0

    return [
      `M ${x0Inner} ${y0Inner}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 1 ${x1Inner} ${y1Inner}`,
      `L ${x1Outer} ${y1Outer}`,
      `A ${outerR} ${outerR} 0 ${largeArc} 0 ${x0Outer} ${y0Outer}`,
      'Z',
    ].join(' ')
  }

  // ── Show label if arc is wide enough ──
  function showLabel(node: HierarchyRectangularNode<AnalysisNode>): boolean {
    const angleSpan = node.x1 - node.x0
    const midR = ((node.y0 / radius) * (radius - innerRadius) + innerRadius + (node.y1 / radius) * (radius - innerRadius) + innerRadius) / 2
    return angleSpan * midR > 40
  }

  // ── Label position (midpoint of arc) ──
  function labelPos(node: HierarchyRectangularNode<AnalysisNode>): { x: number; y: number; rotation: number } {
    const midAngle = (node.x0 + node.x1) / 2 - Math.PI / 2
    const midR = ((node.y0 / radius) * (radius - innerRadius) + innerRadius + (node.y1 / radius) * (radius - innerRadius) + innerRadius) / 2
    const x = Math.cos(midAngle) * midR
    const y = Math.sin(midAngle) * midR
    let rotation = (midAngle * 180) / Math.PI
    if (rotation > 90) rotation -= 180
    if (rotation < -90) rotation += 180
    return { x, y, rotation }
  }

  let hoveredPath = $state<string | null>(null)
</script>

<svg
  class="sunburst"
  viewBox="0 0 {width} {height}"
  {width}
  {height}
>
  <g transform="translate({cx},{cy})">
    <!-- Center text -->
    <text class="center-name" text-anchor="middle" dy="-4">{root.name}</text>
    <text class="center-cost" text-anchor="middle" dy="14">${root.cost.per_instance.toFixed(4)}</text>

    {#each layoutNodes as node (node.data.path)}
      {@const color = nodeColor(node)}
      {@const t = costNormMap.get(node.data.cost.per_instance) ?? 0}
      {@const glow = glowParams(t)}
      {@const hovered = hoveredPath === node.data.path}
      {@const label = labelPos(node)}
      {@const siblingIdx = siblingIndexMap.get(node.data.path) ?? 0}
      {@const shallowOpacity = maxDepth <= 2 ? (siblingIdx % 2 === 0 ? 1 : 0.85) : 1}

      <g
        class="arc-node"
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
        <path
          d={arcPath(node)}
          fill={color}
          stroke="var(--bg-root)"
          stroke-width="1.5"
          opacity={shallowOpacity}
          style="{glow.radius > 0 ? `filter: drop-shadow(0 0 ${glow.radius}px ${color});` : ''} cursor: pointer; transition: opacity 50ms;"
        />
        {#if showLabel(node)}
          <text
            class="arc-label"
            x={label.x}
            y={label.y}
            text-anchor="middle"
            dominant-baseline="central"
            transform="rotate({label.rotation},{label.x},{label.y})"
          >
            {node.data.name}
          </text>
        {/if}
      </g>
    {/each}
  </g>
</svg>

<style>
  .sunburst {
    display: block;
  }

  .arc-node {
    outline: none;
  }

  .center-name {
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 600;
    fill: var(--text-primary);
  }

  .center-cost {
    font-family: var(--font-mono);
    font-size: 12px;
    fill: var(--text-secondary);
  }

  .arc-label {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 500;
    fill: white;
    paint-order: stroke fill;
    stroke: rgba(0,0,0,0.5);
    stroke-width: 3px;
    pointer-events: none;
  }
</style>
