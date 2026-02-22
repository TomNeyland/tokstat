<script lang="ts">
  import { onMount } from 'svelte'
  import type { AnalysisNode, AnalysisOutput } from './engine/types'
  import { filterTree, recomputeSummary, countIgnoredFields } from './engine/ignore'
  import { loadAnalysisData, createWorkerPipeline } from './lib/viz/dataLoader'
  import { mockOutput } from './lib/viz/mockData'
  import FileDropZone from './lib/components/FileDropZone.svelte'
  import AnalysisProgress from './lib/components/AnalysisProgress.svelte'
  import TopBar from './lib/components/TopBar.svelte'
  import Sidebar from './lib/components/Sidebar.svelte'
  import Breadcrumb from './lib/components/Breadcrumb.svelte'
  import DetailPanel from './lib/components/DetailPanel.svelte'
  import SchemaDiet from './lib/components/SchemaDiet.svelte'
  import IgnorePanel from './lib/components/IgnorePanel.svelte'
  import ContextMenu from './lib/components/ContextMenu.svelte'
  import Tooltip from './lib/components/Tooltip.svelte'
  import VizContainer from './lib/viz/VizContainer.svelte'

  // ── App state ──
  let vizMode = $state<'Treemap' | 'Sunburst' | 'Pack' | 'Icicle'>('Treemap')
  let colorMode = $state<'Cost' | 'Fill rate' | 'Overhead' | 'Depth'>('Cost')
  let model = $state('gpt-4o')
  let sidebarCollapsed = $state(false)
  let searchQuery = $state('')

  // ── Data loading: engine output, file picker, or mock ──
  const preloadedData = loadAnalysisData()

  // In dev mode (no preloaded data), use mock data and go straight to the viz.
  // The "Load JSON" button in TopBar lets users switch to the file picker.
  type AppPhase = 'picker' | 'analyzing' | 'ready'
  let phase = $state<AppPhase>('ready')
  let data = $state<AnalysisOutput>(preloadedData ?? mockOutput)
  let analysisProgress = $state(0)
  let analysisTotalFiles = $state(0)

  function handleFiles(files: { name: string; content: string }[]) {
    phase = 'analyzing'
    analysisTotalFiles = files.length
    analysisProgress = 0

    const pipeline = createWorkerPipeline()
    pipeline.onprogress((processed, total) => {
      analysisProgress = processed
      analysisTotalFiles = total
    })
    pipeline.onresult((result) => {
      data = result
      phase = 'ready'
      pipeline.terminate()
    })
    pipeline.analyze(files, model)
  }

  // ── Ignore system ──
  let ignorePatterns = $state<string[]>([])
  let filteredTree = $derived(
    ignorePatterns.length > 0 ? filterTree(data.tree, ignorePatterns) : data.tree
  )
  let filteredSummary = $derived(
    ignorePatterns.length > 0
      ? recomputeSummary(
          filteredTree,
          data.summary.output_price_per_1m / 1_000_000,
          data.summary.file_count,
          data.summary.glob,
          data.summary.model,
          data.summary.tokenizer,
          data.summary.output_price_per_1m
        )
      : data.summary
  )

  // ── Drill-down ──
  let drillPath = $state<AnalysisNode[]>([filteredTree])

  // Reset drill path when ignore patterns change
  $effect(() => {
    const _ft = filteredTree // track dependency
    drillPath = [_ft]
  })

  let currentNode = $derived(drillPath[drillPath.length - 1])
  let breadcrumbSegments = $derived(drillPath.map(n => n.name))
  let maxDepth = $derived.by(() => {
    function depth(node: AnalysisNode): number {
      if (node.children.length === 0) return 0
      return 1 + Math.max(...node.children.map(depth))
    }
    return depth(currentNode)
  })

  // ── Detail panel ──
  let selectedNode = $state<AnalysisNode | null>(null)
  let showDetail = $derived(selectedNode !== null)

  // ── Schema diet ──
  let showDiet = $state(false)

  // ── Ignore panel ──
  let showIgnore = $state(false)

  // ── Context menu ──
  let contextMenuNode = $state<AnalysisNode | null>(null)
  let contextMenuX = $state(0)
  let contextMenuY = $state(0)
  let showContextMenu = $derived(contextMenuNode !== null)

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

  function handleContextMenu(node: AnalysisNode, x: number, y: number) {
    contextMenuNode = node
    contextMenuX = x
    contextMenuY = y
  }

  function handleIgnorePattern(pattern: string) {
    if (!ignorePatterns.includes(pattern)) {
      ignorePatterns = [...ignorePatterns, pattern]
    }
  }

  function handleIgnoreChange(patterns: string[]) {
    ignorePatterns = patterns
  }
</script>

{#if phase === 'picker'}
  <FileDropZone onfiles={handleFiles} />
{:else if phase === 'analyzing'}
  <AnalysisProgress filesProcessed={analysisProgress} totalFiles={analysisTotalFiles} />
{:else}
<div class="app-shell">
  <TopBar
    summary={filteredSummary}
    searchQuery={searchQuery}
    {vizMode}
    onsearch={(q) => searchQuery = q}
    onvizchange={(m) => vizMode = m as typeof vizMode}
    onloadjson={() => phase = 'picker'}
  />

  <div class="app-body">
    <Sidebar
      {colorMode}
      {model}
      collapsed={sidebarCollapsed}
      summary={filteredSummary}
      tree={filteredTree}
      oncolorchange={(m) => colorMode = m as typeof colorMode}
      onmodelchange={(m) => model = m}
      ontogglecollapse={() => sidebarCollapsed = !sidebarCollapsed}
      ontogglediet={() => showDiet = !showDiet}
      ontoggleignore={() => showIgnore = !showIgnore}
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
          oncontextmenu={handleContextMenu}
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
        tree={filteredTree}
        scale={10000}
        visible={showDiet}
        onclose={() => showDiet = false}
      />
    {/if}

    {#if showIgnore}
      <IgnorePanel
        patterns={ignorePatterns}
        tree={data.tree}
        visible={showIgnore}
        onchange={handleIgnoreChange}
        onclose={() => showIgnore = false}
      />
    {/if}
  </div>

  <Breadcrumb
    segments={breadcrumbSegments}
    summary={filteredSummary}
    currentCostPerInstance={currentNode.cost.per_instance}
    currentCorpusCost={currentNode.cost.total_corpus}
    depth={maxDepth}
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

  {#if showContextMenu && contextMenuNode}
    <ContextMenu
      node={contextMenuNode}
      x={contextMenuX}
      y={contextMenuY}
      visible={showContextMenu}
      onignore={handleIgnorePattern}
      onclose={() => contextMenuNode = null}
    />
  {/if}
</div>
{/if}

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
