<script lang="ts">
  import { onMount } from 'svelte'
  import type { AnalysisNode } from './engine/types'
  import { mockOutput } from './lib/viz/mockData'
  import TopBar from './lib/components/TopBar.svelte'
  import Sidebar from './lib/components/Sidebar.svelte'
  import Breadcrumb from './lib/components/Breadcrumb.svelte'
  import DetailPanel from './lib/components/DetailPanel.svelte'
  import SchemaDiet from './lib/components/SchemaDiet.svelte'
  import Tooltip from './lib/components/Tooltip.svelte'
  import VizContainer from './lib/viz/VizContainer.svelte'

  // ── App state ──
  let vizMode = $state<'Treemap' | 'Sunburst' | 'Pack' | 'Icicle'>('Treemap')
  let colorMode = $state<'Cost' | 'Fill rate' | 'Overhead' | 'Depth'>('Cost')
  let model = $state('gpt-4o')
  let sidebarCollapsed = $state(false)
  let searchQuery = $state('')

  // ── Data ──
  const data = mockOutput
  let drillPath = $state<AnalysisNode[]>([data.tree])

  let currentNode = $derived(drillPath[drillPath.length - 1])
  let breadcrumbSegments = $derived(drillPath.map(n => n.name))
  let breadcrumbCost = $derived('$' + currentNode.cost.per_instance.toFixed(4) + '/instance')

  // ── Detail panel ──
  let selectedNode = $state<AnalysisNode | null>(null)
  let showDetail = $derived(selectedNode !== null)

  // ── Schema diet ──
  let showDiet = $state(false)

  // ── Tooltip ──
  let tooltipNode = $state<AnalysisNode | null>(null)
  let tooltipX = $state(0)
  let tooltipY = $state(0)
  let showTooltip = $derived(tooltipNode !== null)

  // ── Viz canvas dimensions (ResizeObserver) ──
  let vizCanvasEl = $state<HTMLDivElement | null>(null)
  let vizWidth = $state(800)
  let vizHeight = $state(600)

  onMount(() => {
    if (!vizCanvasEl) return
    const ro = new ResizeObserver(entries => {
      const entry = entries[0]
      vizWidth = entry.contentRect.width
      vizHeight = entry.contentRect.height
    })
    ro.observe(vizCanvasEl)
    return () => ro.disconnect()
  })

  // ── Handlers ──
  function handleDrill(node: AnalysisNode) {
    if (node.children.length > 0) {
      drillPath = [...drillPath, node]
    }
    selectedNode = node
  }

  function handleBreadcrumbNav(index: number) {
    drillPath = drillPath.slice(0, index + 1)
    selectedNode = null
  }

  function handleNodeHover(node: AnalysisNode | null, x: number, y: number) {
    tooltipNode = node
    tooltipX = x
    tooltipY = y
  }

  function handleNodeClick(node: AnalysisNode) {
    handleDrill(node)
  }
</script>

<div class="app-shell">
  <TopBar
    summary={data.summary}
    searchQuery={searchQuery}
    onsearch={(q) => searchQuery = q}
  />

  <div class="app-body">
    <Sidebar
      {vizMode}
      {colorMode}
      {model}
      collapsed={sidebarCollapsed}
      onvizchange={(m) => vizMode = m as typeof vizMode}
      oncolorchange={(m) => colorMode = m as typeof colorMode}
      onmodelchange={(m) => model = m}
      ontogglecollapse={() => sidebarCollapsed = !sidebarCollapsed}
      ontogglediet={() => showDiet = !showDiet}
    />

    <main class="viz-area">
      <div class="viz-canvas" bind:this={vizCanvasEl}>
        <!-- Dot grid background -->
        <div class="dot-grid"></div>

        <VizContainer
          root={currentNode}
          {vizMode}
          {colorMode}
          width={vizWidth}
          height={vizHeight}
          insights={data.insights}
          onhover={handleNodeHover}
          onclick={handleNodeClick}
        />
      </div>
    </main>

    {#if showDetail && selectedNode}
      <DetailPanel
        node={selectedNode}
        insights={data.insights}
        visible={showDetail}
        onclose={() => selectedNode = null}
      />
    {/if}

    {#if showDiet}
      <SchemaDiet
        tree={data.tree}
        scale={10000}
        visible={showDiet}
        onclose={() => showDiet = false}
      />
    {/if}
  </div>

  <Breadcrumb
    segments={breadcrumbSegments}
    cost={breadcrumbCost}
    onnavigate={handleBreadcrumbNav}
  />

  {#if showTooltip && tooltipNode}
    <Tooltip
      node={tooltipNode}
      x={tooltipX}
      y={tooltipY}
      visible={showTooltip}
    />
  {/if}
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }

  .app-body {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .viz-area {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .viz-canvas {
    flex: 1;
    position: relative;
    overflow: hidden;
  }

  .dot-grid {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, var(--text-ghost) 1px, transparent 1px);
    background-size: 32px 32px;
    pointer-events: none;
    z-index: 0;
  }

  .viz-canvas :global(.viz-container) {
    position: absolute;
    inset: 0;
    z-index: 1;
  }

  .viz-canvas :global(svg) {
    position: absolute;
    inset: 0;
  }
</style>
