<script lang="ts">
  import type { AnalysisNode } from './engine/types'
  import { mockOutput } from './lib/viz/mockData'
  import TopBar from './lib/components/TopBar.svelte'
  import Sidebar from './lib/components/Sidebar.svelte'
  import Breadcrumb from './lib/components/Breadcrumb.svelte'
  import DetailPanel from './lib/components/DetailPanel.svelte'
  import SchemaDiet from './lib/components/SchemaDiet.svelte'
  import Tooltip from './lib/components/Tooltip.svelte'

  // ── App state ──
  let vizMode = $state<'Treemap' | 'Sunburst' | 'Pack' | 'Icicle'>('Treemap')
  let colorMode = $state<'Cost' | 'Fill rate' | 'Overhead' | 'Depth'>('Cost')
  let model = $state('gpt-4o')
  let sidebarCollapsed = $state(false)
  let searchQuery = $state('')

  // ── Data ──
  const data = mockOutput
  let rootNode = $state<AnalysisNode>(data.tree)
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
    />

    <main class="viz-area">
      <div class="viz-canvas">
        <!-- Dot grid background -->
        <div class="dot-grid"></div>

        <!-- Placeholder for viz components -->
        <div class="viz-placeholder">
          <span class="viz-mode-label">{vizMode}</span>
          <span class="viz-mode-desc">
            {#if vizMode === 'Treemap'}Where is the money going?{/if}
            {#if vizMode === 'Sunburst'}What does the nesting look like?{/if}
            {#if vizMode === 'Pack'}What are the outliers?{/if}
            {#if vizMode === 'Icicle'}What's at each depth level?{/if}
          </span>
          <span class="viz-node-count">{currentNode.children.length} children · {currentNode.tokens.total.avg} avg tokens</span>

          <!-- Render mock node tiles so the shell isn't empty -->
          <div class="mock-nodes">
            {#each currentNode.children as child}
              <button
                class="mock-node"
                style="--size: {Math.max(40, Math.sqrt(child.tokens.total.avg / currentNode.tokens.total.avg) * 200)}px; --thermal: var(--thermal-{Math.min(9, Math.round((child.cost.per_instance / currentNode.cost.per_instance) * 9))})"
                onclick={() => handleDrill(child)}
                onmouseenter={(e) => handleNodeHover(child, e.clientX, e.clientY)}
                onmouseleave={() => handleNodeHover(null, 0, 0)}
              >
                <span class="mock-node-label">{child.name}</span>
              </button>
            {/each}
          </div>
        </div>
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
  }

  /* Placeholder layout while real viz components are being built */
  .viz-placeholder {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
    padding: var(--space-8);
  }

  .viz-mode-label {
    font-family: var(--font-display);
    font-size: 48px;
    color: var(--text-primary);
    opacity: 0.15;
  }

  .viz-mode-desc {
    font-family: var(--font-body);
    font-size: 15px;
    color: var(--text-tertiary);
  }

  .viz-node-count {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-ghost);
  }

  .mock-nodes {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    justify-content: center;
    margin-top: var(--space-6);
    max-width: 800px;
  }

  .mock-node {
    width: var(--size);
    height: var(--size);
    min-width: 40px;
    min-height: 40px;
    background: color-mix(in srgb, var(--thermal) 20%, var(--bg-surface));
    border: 1px solid var(--thermal);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform var(--duration-instant),
                box-shadow var(--duration-instant);
    padding: var(--space-1);
  }

  .mock-node:hover {
    transform: scale(1.05);
    box-shadow: 0 0 16px color-mix(in srgb, var(--thermal) 30%, transparent);
  }

  .mock-node-label {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
  }
</style>
