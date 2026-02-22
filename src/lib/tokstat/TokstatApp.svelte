<script lang="ts">
  import { fade } from 'svelte/transition'
  import { onMount } from 'svelte'
  import { analyzeRecords } from '../../core/analyze.js'
  import { demoCorpus } from './demoCorpus'
  import { flattenNodes, findNode, computeLayout, describeArc, maxDepth, type ViewMode } from './layouts'
  import { nodeColorForMode, glowForColor, type ColorMode } from './colors'
  import { fmtPct, fmtTok, fmtUsd, shortPath } from './format'

  let report = $state<any | null>(null)
  let error = $state<string | null>(null)
  let loading = $state(false)

  let viewMode = $state<ViewMode>('treemap')
  let colorMode = $state<ColorMode>('cost')
  let search = $state('')
  let hideBelowTokens = $state(0)
  let dietThreshold = $state(0.5)
  let annualRuns = $state(100000)
  let selectedPath = $state('root')
  let rootPath = $state('root')
  let detailOpen = $state(true)
  let sidebarCollapsed = $state(false)
  let showDiet = $state(false)

  let viewport = $state({ width: 960, height: 620 })
  let hover = $state<{ path: string; x: number; y: number } | null>(null)
  let cutSelection = $state<Record<string, boolean>>({})

  const allNodes = $derived(report ? flattenNodes(report.tree) : [])
  const insights = $derived(report?.insights ?? [])
  const insightMap = $derived.by(() => {
    const map = new Map<string, any[]>()
    for (const insight of insights) {
      const arr = map.get(insight.path) ?? []
      arr.push(insight)
      map.set(insight.path, arr)
    }
    return map
  })

  const currentRoot = $derived(report ? findNode(report.tree, rootPath) ?? report.tree : null)
  const selectedNode = $derived(report ? findNode(report.tree, selectedPath) ?? currentRoot : null)
  const localNodes = $derived(currentRoot ? flattenNodes(currentRoot) : [])
  const maxCost = $derived(Math.max(1, ...localNodes.map((n: any) => n.tokens?.total?.avg ?? 0)))
  const layoutShapes = $derived(currentRoot ? computeLayout(viewMode, currentRoot, viewport.width, viewport.height) : [])
  const breadcrumbChain = $derived(report ? findChain(report.tree, rootPath) : [])

  const topInsightPaths = $derived(new Set((insights ?? []).slice(0, 10).map((i: any) => i.path)))

  const schemaDietCandidates = $derived(
    allNodes
      .filter((node: any) => node.path !== 'root' && node.fill_rate < dietThreshold && (node.tokens?.total?.avg ?? 0) > 0)
      .map((node: any) => {
        const wasteTokens = (node.tokens.schema_overhead ?? 0) * (1 - (node.fill_rate ?? 0)) + (node.tokens.null_waste ?? 0)
        const wasteUsdPerRun = wasteTokens * ((report?.summary?.output_price_per_1m ?? 0) / 1_000_000)
        return { node, wasteTokens, wasteUsdPerRun }
      })
      .sort((a: any, b: any) => b.wasteTokens - a.wasteTokens)
      .slice(0, 40),
  )

  const dietTotals = $derived.by(() => {
    let tokens = 0
    let usdPerRun = 0
    for (const row of schemaDietCandidates) {
      if (cutSelection[row.node.path]) {
        tokens += row.wasteTokens
        usdPerRun += row.wasteUsdPerRun
      }
    }
    return { tokens, usdPerRun }
  })

  const hoveredNode = $derived(hover && report ? findNode(report.tree, hover.path) : null)

  onMount(() => {
    try {
      const embedded = (window as any).__TOKSTAT_DATA__
      if (embedded) {
        setReport(embedded)
        return
      }
      const demoReport = analyzeRecords(demoCorpus as any, {
        glob: 'demo/*.json',
        model: 'gpt-4o',
        sampleValues: 5,
      })
      setReport(demoReport)
    }
    catch (e: any) {
      error = e?.message ?? String(e)
    }
  })

  function setReport(next: any) {
    report = next
    rootPath = 'root'
    selectedPath = 'root'
    error = null
    cutSelection = {}
  }

  async function handleFiles(event: Event) {
    const input = event.currentTarget as HTMLInputElement
    const files = Array.from(input.files ?? [])
    if (files.length === 0) return

    loading = true
    error = null

    try {
      const records = await Promise.all(
        files.map(async (file) => {
          const text = await file.text()
          return { path: file.name, parsed: JSON.parse(text) }
        }),
      )
      const next = analyzeRecords(records, {
        glob: files.length === 1 ? files[0].name : `${files.length} uploaded files`,
        model: report?.summary?.model ?? 'gpt-4o',
        sampleValues: 5,
      })
      setReport(next)
    }
    catch (e: any) {
      error = e?.message ?? String(e)
    }
    finally {
      loading = false
      input.value = ''
    }
  }

  function selectNode(path: string) {
    selectedPath = path
    detailOpen = true
  }

  function drillTo(path: string) {
    if (!report) return
    const target = findNode(report.tree, path)
    if (!target) return
    rootPath = path
    selectedPath = path
  }

  function resetRoot() {
    rootPath = 'root'
    selectedPath = 'root'
  }

  function handleHover(path: string, event: MouseEvent) {
    hover = { path, x: event.clientX, y: event.clientY }
  }

  function clearHover() {
    hover = null
  }

  function matchesSearch(node: any) {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return node.name?.toLowerCase().includes(q) || node.path?.toLowerCase().includes(q)
  }

  function isVisibleNode(node: any) {
    return (node.tokens?.total?.avg ?? 0) >= hideBelowTokens
  }

  function toggleCut(path: string) {
    cutSelection = { ...cutSelection, [path]: !cutSelection[path] }
  }

  function cycleView(mode: ViewMode) {
    viewMode = mode
  }

  function cycleColor(mode: ColorMode) {
    colorMode = mode
  }

  function measure(node: HTMLElement) {
    const ro = new ResizeObserver(() => {
      const rect = node.getBoundingClientRect()
      viewport = { width: Math.max(280, rect.width), height: Math.max(220, rect.height) }
    })
    ro.observe(node)
    return {
      destroy() { ro.disconnect() },
    }
  }

  function nodeColor(node: any) {
    return nodeColorForMode(node, colorMode, { maxCost })
  }

  function nodeStroke(node: any) {
    const color = nodeColor(node)
    return color
  }

  function nodeOpacity(node: any) {
    if (!isVisibleNode(node)) return 0
    if (search.trim() && !matchesSearch(node)) return 0.15
    return 1
  }

  function insightFor(path: string) {
    return insightMap.get(path) ?? []
  }

  function shapeCenter(shape: any) {
    if (shape.kind === 'rect') return { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 }
    if (shape.kind === 'circle') return { x: shape.cx, y: shape.cy }
    const mid = (shape.startAngle + shape.endAngle) / 2
    const r = (shape.innerR + shape.outerR) / 2
    return { x: shape.cx + Math.cos(mid - Math.PI / 2) * r, y: shape.cy + Math.sin(mid - Math.PI / 2) * r }
  }

  function shapeAria(node: any) {
    return `${shortPath(node.path)}, ${node.type}, ${fmtTok(node.tokens.total.avg)}, ${fmtPct(node.fill_rate)} fill`
  }

  function handleShapeKeydown(event: KeyboardEvent, path: string, hasChildren: boolean) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selectNode(path)
    }
    if (event.key === 'ArrowRight' && hasChildren) {
      event.preventDefault()
      drillTo(path)
    }
  }

  function findChain(root: any, targetPath: string, chain: any[] = []): any[] {
    const next = [...chain, root]
    if (root.path === targetPath) return next
    for (const child of root.children ?? []) {
      const found = findChain(child, targetPath, next)
      if (found.length) return found
    }
    return []
  }
</script>

{#if !report}
  <div class="empty-state">
    <div class="empty-card">
      <div class="brand">tokstat</div>
      <h1>Loading analysis…</h1>
      {#if error}<p class="error">{error}</p>{/if}
    </div>
  </div>
{:else}
  <div class="app-shell">
    <header class="topbar">
      <div class="topbar-left">
        <button class="brand-button" onclick={() => (showDiet = false)} title="Explorer view">tokstat</button>
        <div class="view-toggles">
          {#each ['treemap', 'sunburst', 'pack', 'icicle'] as mode}
            <button class="toggle" class:active={viewMode === mode} onclick={() => cycleView(mode as ViewMode)}>{mode}</button>
          {/each}
        </div>
      </div>

      <div class="summary-strip">
        <div class="stat-block">
          <span class="stat-label">Cost / Instance</span>
          <span class="stat-value">{fmtUsd(report.summary.cost_per_instance)}</span>
        </div>
        <div class="stat-block">
          <span class="stat-label">Schema Overhead</span>
          <span class="stat-value">{fmtPct(report.summary.overhead_ratio)}</span>
        </div>
        <div class="stat-block">
          <span class="stat-label">Null Waste</span>
          <span class="stat-value">{fmtPct(report.summary.null_waste_ratio)}</span>
        </div>
        <div class="stat-block">
          <span class="stat-label">Files</span>
          <span class="stat-value">{report.summary.file_count}</span>
        </div>
      </div>

      <div class="topbar-actions">
        <label class="upload-btn">
          <input type="file" multiple accept=".json,application/json" onchange={handleFiles} hidden />
          {loading ? 'Analyzing…' : 'Load JSON'}
        </label>
        <button class="ghost-btn" onclick={() => (showDiet = !showDiet)}>{showDiet ? 'Explorer' : 'Schema Diet'}</button>
        <button class="ghost-btn" onclick={() => (sidebarCollapsed = !sidebarCollapsed)}>{sidebarCollapsed ? 'Show Controls' : 'Hide Controls'}</button>
      </div>
    </header>

    <div class="body-shell">
      <aside class="sidebar" class:collapsed={sidebarCollapsed}>
        <section class="panel">
          <h2>Controls</h2>
          <label class="field">
            <span>Search</span>
            <input type="text" bind:value={search} placeholder="field name or path" />
          </label>
          <label class="field">
            <span>Color Mode</span>
            <div class="mini-toggle-grid">
              {#each ['cost', 'fill', 'overhead', 'depth'] as mode}
                <button class="mini-toggle" class:active={colorMode === mode} onclick={() => cycleColor(mode as ColorMode)}>{mode}</button>
              {/each}
            </div>
          </label>
          <label class="field">
            <span>Hide below {hideBelowTokens} tok</span>
            <input type="range" min="0" max="80" step="1" bind:value={hideBelowTokens} />
          </label>
          <label class="field">
            <span>Null tax threshold {Math.round(dietThreshold * 100)}%</span>
            <input type="range" min="0.05" max="0.95" step="0.05" bind:value={dietThreshold} />
          </label>
          <div class="small-meta">{report.summary.model} • {report.summary.tokenizer}</div>
          <div class="small-meta">{report.summary.glob ?? 'browser upload'}</div>
        </section>

        {#if !showDiet}
          <section class="panel accent">
            <h2>Insights</h2>
            <div class="insight-list">
              {#if insights.length === 0}
                <div class="muted">No insights detected for this corpus.</div>
              {:else}
                {#each insights.slice(0, 8) as insight}
                  <button class="insight-item" onclick={() => selectNode(insight.path)}>
                    <span class="insight-type">{insight.type.replaceAll('_', ' ')}</span>
                    <span class="insight-msg">{insight.message}</span>
                    <span class="insight-save">{fmtUsd(insight.savings_usd_per_10k)}/10K</span>
                  </button>
                {/each}
              {/if}
            </div>
          </section>
        {:else}
          <section class="panel accent">
            <h2>Schema Diet</h2>
            <label class="field">
              <span>Generations / year</span>
              <input type="number" min="0" step="1000" bind:value={annualRuns} />
            </label>
            <div class="diet-summary">
              <div>
                <div class="stat-label">Selected savings</div>
                <div class="diet-number">{fmtTok(dietTotals.tokens)}</div>
              </div>
              <div>
                <div class="stat-label">Annual impact</div>
                <div class="diet-number">{fmtUsd(dietTotals.usdPerRun * annualRuns)}</div>
              </div>
            </div>
            <div class="diet-list">
              {#each schemaDietCandidates as row}
                <label class="diet-row">
                  <input type="checkbox" checked={!!cutSelection[row.node.path]} onchange={() => toggleCut(row.node.path)} />
                  <div class="diet-row-main">
                    <span class="diet-path">{shortPath(row.node.path)}</span>
                    <span class="diet-meta">{fmtPct(row.node.fill_rate)} fill • {fmtTok(row.node.tokens.total.avg)}</span>
                  </div>
                  <span class="diet-savings">{fmtUsd(row.wasteUsdPerRun * annualRuns)}</span>
                </label>
              {/each}
            </div>
          </section>
        {/if}
      </aside>

      <main class="main-stage">
        <div class="viz-surface">
          <div class="viz-grid"></div>
          <div class="viz-canvas" use:measure>
            {#if currentRoot}
              <svg viewBox={`0 0 ${viewport.width} ${viewport.height}`} preserveAspectRatio="none" aria-label="tokstat visualization">
                {#key `${viewMode}:${rootPath}:${viewport.width}:${viewport.height}`}
                  <g in:fade={{ duration: 400 }} out:fade={{ duration: 250 }}>
                    {#if viewMode === 'sunburst'}
                      {#each layoutShapes as shape (shape.path)}
                        {#if shape.kind === 'arc' && isVisibleNode(shape.node)}
                          <path
                            d={describeArc(shape)}
                            fill={nodeColor(shape.node)}
                            fill-opacity={Math.max(0.18, nodeOpacity(shape.node) * 0.88)}
                            stroke={nodeStroke(shape.node)}
                            stroke-opacity={Math.max(0.2, nodeOpacity(shape.node))}
                            stroke-width={selectedPath === shape.path ? 2 : 1}
                            style={`filter: drop-shadow(0 0 ${topInsightPaths.has(shape.path) ? 10 : 6}px ${glowForColor(nodeColor(shape.node), topInsightPaths.has(shape.path) ? 0.4 : 0.22)});`}
                            class:selected={selectedPath === shape.path}
                            class:search-hit={matchesSearch(shape.node)}
                            role="button"
                            tabindex="0"
                            aria-label={shapeAria(shape.node)}
                            onclick={() => selectNode(shape.path)}
                            ondblclick={() => shape.hasChildren && drillTo(shape.path)}
                            onkeydown={(e) => handleShapeKeydown(e, shape.path, shape.hasChildren)}
                            onmousemove={(e) => handleHover(shape.path, e)}
                            onmouseleave={clearHover}
                          />
                        {/if}
                      {/each}
                    {:else if viewMode === 'pack'}
                      {#each layoutShapes as shape (shape.path)}
                        {#if shape.kind === 'circle' && isVisibleNode(shape.node)}
                          <circle
                            cx={shape.cx}
                            cy={shape.cy}
                            r={shape.r}
                            fill={nodeColor(shape.node)}
                            fill-opacity={Math.max(0.08, nodeOpacity(shape.node) * 0.22)}
                            stroke={nodeStroke(shape.node)}
                            stroke-opacity={Math.max(0.28, nodeOpacity(shape.node))}
                            stroke-width={selectedPath === shape.path ? 2 : 1.25}
                            style={`filter: drop-shadow(0 0 ${topInsightPaths.has(shape.path) ? 12 : 8}px ${glowForColor(nodeColor(shape.node), topInsightPaths.has(shape.path) ? 0.45 : 0.25)});`}
                            role="button"
                            tabindex="0"
                            aria-label={shapeAria(shape.node)}
                            onclick={() => selectNode(shape.path)}
                            ondblclick={() => shape.hasChildren && drillTo(shape.path)}
                            onkeydown={(e) => handleShapeKeydown(e, shape.path, shape.hasChildren)}
                            onmousemove={(e) => handleHover(shape.path, e)}
                            onmouseleave={clearHover}
                          />
                        {/if}
                      {/each}
                    {:else}
                      {#each layoutShapes as shape (shape.path)}
                        {#if shape.kind === 'rect' && isVisibleNode(shape.node)}
                          <rect
                            x={shape.x}
                            y={shape.y}
                            width={Math.max(0, shape.width - 1)}
                            height={Math.max(0, shape.height - 1)}
                            rx={viewMode === 'treemap' ? 3 : 2}
                            fill={nodeColor(shape.node)}
                            fill-opacity={Math.max(viewMode === 'treemap' ? 0.2 : 0.28, nodeOpacity(shape.node) * (viewMode === 'treemap' ? 0.75 : 0.85))}
                            stroke={selectedPath === shape.path ? 'var(--accent)' : nodeStroke(shape.node)}
                            stroke-opacity={Math.max(0.25, nodeOpacity(shape.node))}
                            stroke-width={selectedPath === shape.path ? 1.8 : 1}
                            style={`filter: drop-shadow(0 0 ${topInsightPaths.has(shape.path) ? 10 : 6}px ${glowForColor(nodeColor(shape.node), topInsightPaths.has(shape.path) ? 0.38 : 0.2)});`}
                            role="button"
                            tabindex="0"
                            aria-label={shapeAria(shape.node)}
                            onclick={() => selectNode(shape.path)}
                            ondblclick={() => shape.hasChildren && drillTo(shape.path)}
                            onkeydown={(e) => handleShapeKeydown(e, shape.path, shape.hasChildren)}
                            onmousemove={(e) => handleHover(shape.path, e)}
                            onmouseleave={clearHover}
                          />
                        {/if}
                      {/each}
                    {/if}

                    {#each layoutShapes as shape (shape.path + ':label')}
                      {#if isVisibleNode(shape.node)}
                        {@const c = shapeCenter(shape)}
                        {#if (shape.kind === 'rect' && shape.width > 58 && shape.height > 22) || (shape.kind === 'circle' && shape.r > 26) || (shape.kind === 'arc' && (shape.endAngle - shape.startAngle) > 0.18 && shape.outerR - shape.innerR > 14)}
                          <text
                            x={c.x}
                            y={c.y}
                            class="viz-label"
                            text-anchor="middle"
                            dominant-baseline="middle"
                            pointer-events="none"
                            opacity={nodeOpacity(shape.node)}
                          >{shape.label}</text>
                        {/if}
                      {/if}
                    {/each}
                  </g>
                {/key}
              </svg>
            {/if}
          </div>
        </div>

        <footer class="breadcrumb-bar">
          <div class="breadcrumb-left">
            {#if breadcrumbChain.length > 0}
              {#each breadcrumbChain as crumb, idx}
                <button class="crumb" class:active={idx === breadcrumbChain.length - 1} onclick={() => drillTo(crumb.path)}>{crumb.name}</button>
                {#if idx < breadcrumbChain.length - 1}
                  <span class="crumb-sep">›</span>
                {/if}
              {/each}
            {/if}
            {#if rootPath !== 'root'}
              <button class="crumb-reset" onclick={resetRoot}>Reset to root</button>
            {/if}
          </div>
          <div class="breadcrumb-right">
            <span>{currentRoot ? fmtUsd(currentRoot.cost.per_instance) : '$0'}/instance</span>
            <span>•</span>
            <span>{currentRoot ? fmtTok(currentRoot.tokens.total.avg) : '0 tok'}</span>
            <span>•</span>
            <span>{currentRoot ? `${maxDepth(currentRoot) - currentRoot.depth} levels` : '0 levels'}</span>
          </div>
        </footer>
      </main>

      {#if detailOpen && selectedNode}
        <aside class="detail-panel">
          <div class="detail-header">
            <div>
              <div class="detail-title">{selectedNode.name}</div>
              <div class="detail-path">{selectedNode.path}</div>
            </div>
            <div class="detail-actions">
              <span class="type-badge" data-type={selectedNode.type}>{selectedNode.type}</span>
              <button class="ghost-btn" onclick={() => (detailOpen = false)}>Close</button>
            </div>
          </div>

          <section class="detail-section">
            <div class="token-bar">
              <div class="token-seg schema" style={`width:${(selectedNode.tokens.schema_overhead / Math.max(selectedNode.tokens.total.avg, 1)) * 100}%`}></div>
              <div class="token-seg value" style={`width:${(selectedNode.tokens.value_payload / Math.max(selectedNode.tokens.total.avg, 1)) * 100}%`}></div>
              <div class="token-seg nul" style={`width:${(selectedNode.tokens.null_waste / Math.max(selectedNode.tokens.total.avg, 1)) * 100}%`}></div>
            </div>
            <div class="token-legend">
              <span>schema {fmtTok(selectedNode.tokens.schema_overhead)}</span>
              <span>value {fmtTok(selectedNode.tokens.value_payload)}</span>
              <span>null {fmtTok(selectedNode.tokens.null_waste)}</span>
            </div>
          </section>

          <section class="detail-section stats-grid">
            <div><span class="k">avg</span><span class="v">{fmtTok(selectedNode.tokens.total.avg)}</span></div>
            <div><span class="k">p50</span><span class="v">{fmtTok(selectedNode.tokens.total.p50)}</span></div>
            <div><span class="k">p95</span><span class="v">{fmtTok(selectedNode.tokens.total.p95)}</span></div>
            <div><span class="k">max</span><span class="v">{fmtTok(selectedNode.tokens.total.max)}</span></div>
            <div><span class="k">fill rate</span><span class="v">{fmtPct(selectedNode.fill_rate)}</span></div>
            <div><span class="k">cost</span><span class="v">{fmtUsd(selectedNode.cost.per_instance)}</span></div>
          </section>

          {#if selectedNode.array_stats}
            <section class="detail-section">
              <h3>Array Stats</h3>
              <div class="stats-grid compact">
                <div><span class="k">avg items</span><span class="v">{selectedNode.array_stats.avg_items.toFixed(2)}</span></div>
                <div><span class="k">max items</span><span class="v">{selectedNode.array_stats.max_items}</span></div>
                <div><span class="k">p95 items</span><span class="v">{selectedNode.array_stats.p95_items.toFixed(1)}</span></div>
              </div>
            </section>
          {/if}

          {#if selectedNode.string_stats}
            <section class="detail-section">
              <h3>String Stats</h3>
              <div class="stats-grid compact">
                <div><span class="k">avg length</span><span class="v">{selectedNode.string_stats.avg_length.toFixed(1)} ch</span></div>
                <div><span class="k">diversity</span><span class="v">{selectedNode.string_stats.value_diversity.toFixed(2)}</span></div>
                <div><span class="k">unique</span><span class="v">{selectedNode.string_stats.unique_count}</span></div>
              </div>
            </section>
          {/if}

          {#if (selectedNode.examples?.length ?? 0) > 0}
            <section class="detail-section">
              <h3>Examples</h3>
              <div class="examples-list">
                {#each selectedNode.examples.slice(0, 5) as example}
                  <pre>{JSON.stringify(example, null, 2)}</pre>
                {/each}
              </div>
            </section>
          {/if}

          <section class="detail-section">
            <h3>Insights</h3>
            <div class="insight-list detail">
              {#if insightFor(selectedNode.path).length === 0}
                <div class="muted">No direct insights on this node.</div>
              {:else}
                {#each insightFor(selectedNode.path) as insight}
                  <div class="insight-card">
                    <div class="insight-card-head">
                      <span class="insight-type">{insight.type.replaceAll('_', ' ')}</span>
                      <span class="insight-save">{fmtUsd(insight.savings_usd_per_10k)}/10K</span>
                    </div>
                    <div class="insight-msg">{insight.message}</div>
                    <div class="insight-detail">{insight.detail}</div>
                  </div>
                {/each}
              {/if}
            </div>
          </section>
        </aside>
      {/if}
    </div>

    {#if hover && hoveredNode}
      <div class="tooltip" style={`left:${hover.x + 14}px; top:${hover.y + 14}px;`}>
        <div class="tooltip-head">
          <div class="tooltip-title">{shortPath(hoveredNode.path)}</div>
          <span class="type-badge" data-type={hoveredNode.type}>{hoveredNode.type}</span>
        </div>
        <div class="tooltip-sub">{fmtPct(hoveredNode.fill_rate)} fill • {fmtUsd(hoveredNode.cost.per_instance)}/inst</div>
        <div class="tooltip-grid">
          <div><span class="k">avg</span><span class="v">{fmtTok(hoveredNode.tokens.total.avg)}</span></div>
          <div><span class="k">p95</span><span class="v">{fmtTok(hoveredNode.tokens.total.p95)}</span></div>
          <div><span class="k">schema</span><span class="v">{fmtTok(hoveredNode.tokens.schema_overhead)}</span></div>
          <div><span class="k">null</span><span class="v">{fmtTok(hoveredNode.tokens.null_waste)}</span></div>
        </div>
      </div>
    {/if}

    {#if error}
      <div class="error-banner">{error}</div>
    {/if}
  </div>
{/if}

<style>
  .app-shell {
    height: 100dvh;
    display: grid;
    grid-template-rows: 56px minmax(0, 1fr);
    background: var(--bg-root);
  }

  .topbar {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: var(--space-4);
    padding: 0 var(--space-4);
    background: color-mix(in srgb, var(--bg-surface) 92%, transparent);
    border-bottom: 1px solid var(--border-subtle);
    backdrop-filter: blur(8px);
    position: relative;
    z-index: 10;
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    min-width: 0;
  }

  .brand-button {
    font-family: var(--font-display);
    font-size: 24px;
    color: var(--text-primary);
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
  }

  .view-toggles {
    display: inline-flex;
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--space-0-5);
    gap: 2px;
  }

  .toggle {
    border: 0;
    background: transparent;
    color: var(--text-secondary);
    font-family: var(--font-body);
    font-size: 12px;
    font-weight: 600;
    text-transform: capitalize;
    padding: var(--space-2) var(--space-3);
    border-radius: calc(var(--radius-md) - 2px);
    cursor: pointer;
    transition: background var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out);
  }

  .toggle.active {
    color: var(--text-primary);
    background: var(--bg-elevated);
    box-shadow: 0 0 0 1px var(--border-default) inset;
  }

  .summary-strip {
    display: grid;
    grid-template-columns: repeat(4, minmax(120px, 1fr));
    gap: var(--space-2);
    min-width: 0;
  }

  .stat-block {
    background: rgba(255,255,255,0.02);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .stat-label {
    font-family: var(--font-body);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-tertiary);
  }

  .stat-value {
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .topbar-actions {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  .upload-btn,
  .ghost-btn {
    border: 1px solid var(--border-default);
    background: var(--bg-surface);
    color: var(--text-primary);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: border-color var(--duration-fast) var(--ease-out), background var(--duration-fast) var(--ease-out);
  }

  .upload-btn {
    background: var(--accent-muted);
    border-color: color-mix(in srgb, var(--accent) 35%, var(--border-default));
    color: var(--accent-hover);
  }

  .ghost-btn:hover,
  .upload-btn:hover {
    border-color: var(--border-strong);
    background: var(--bg-elevated);
  }

  .body-shell {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    min-height: 0;
  }

  .sidebar {
    width: 248px;
    border-right: 1px solid var(--border-subtle);
    background: color-mix(in srgb, var(--bg-surface) 88%, transparent);
    backdrop-filter: blur(10px);
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    overflow: auto;
    transition: width var(--duration-normal) var(--ease-in-out), padding var(--duration-normal) var(--ease-in-out);
  }

  .sidebar.collapsed {
    width: 0;
    padding: 0;
    overflow: hidden;
    border-right: 0;
  }

  .panel {
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    box-shadow: var(--shadow-sm);
  }

  .panel.accent {
    border-left: 2px solid var(--accent);
  }

  .panel h2 {
    margin: 0 0 var(--space-3);
    font-family: var(--font-display);
    font-size: 22px;
    font-weight: 400;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-bottom: var(--space-3);
  }

  .field > span {
    font-size: 11px;
    color: var(--text-secondary);
    font-family: var(--font-mono);
  }

  .field input[type='text'],
  .field input[type='number'] {
    width: 100%;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    color: var(--text-primary);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: 12px;
  }

  .field input[type='range'] {
    width: 100%;
    accent-color: var(--accent);
  }

  .mini-toggle-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-1);
  }

  .mini-toggle {
    border: 1px solid var(--border-subtle);
    background: var(--bg-elevated);
    color: var(--text-secondary);
    padding: var(--space-2);
    border-radius: var(--radius-md);
    font-size: 11px;
    text-transform: capitalize;
    cursor: pointer;
  }

  .mini-toggle.active {
    color: var(--text-primary);
    border-color: color-mix(in srgb, var(--accent) 45%, var(--border-default));
    box-shadow: inset 0 0 0 1px var(--accent-muted);
  }

  .small-meta {
    font-size: 11px;
    color: var(--text-tertiary);
    font-family: var(--font-mono);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .insight-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .insight-item,
  .insight-card {
    width: 100%;
    text-align: left;
    border: 1px solid var(--border-subtle);
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    color: inherit;
  }

  .insight-item {
    cursor: pointer;
    transition: border-color var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
  }

  .insight-item:hover {
    border-color: var(--border-strong);
    transform: translateY(-1px);
  }

  .insight-type {
    display: block;
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: var(--space-1);
  }

  .insight-msg {
    display: block;
    color: var(--text-primary);
    font-size: 12px;
    line-height: 1.45;
  }

  .insight-save {
    display: block;
    margin-top: var(--space-1);
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-size: 11px;
  }

  .main-stage {
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-rows: minmax(0, 1fr) 36px;
  }

  .viz-surface {
    position: relative;
    min-height: 0;
    background: radial-gradient(circle at 30% 25%, rgba(59, 139, 212, 0.08), transparent 45%),
                radial-gradient(circle at 80% 70%, rgba(212, 43, 123, 0.08), transparent 40%),
                var(--bg-root);
  }

  .viz-grid {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0.45;
    background-image: radial-gradient(circle, var(--text-ghost) 1px, transparent 1px);
    background-size: 32px 32px;
    mask-image: radial-gradient(circle at center, black, transparent 90%);
  }

  .viz-canvas {
    position: absolute;
    inset: 0;
    padding: var(--space-2);
  }

  .viz-canvas svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  .viz-label {
    fill: var(--text-primary);
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.01em;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.7);
  }

  .breadcrumb-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-4);
    border-top: 1px solid var(--border-subtle);
    background: color-mix(in srgb, var(--bg-surface) 90%, transparent);
    padding: 0 var(--space-4);
    font-family: var(--font-mono);
    font-size: 12px;
    min-width: 0;
  }

  .breadcrumb-left,
  .breadcrumb-right {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .crumb,
  .crumb-reset {
    border: none;
    background: transparent;
    color: var(--text-secondary);
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;
    padding: 0;
  }

  .crumb.active { color: var(--text-primary); }
  .crumb:hover,
  .crumb-reset:hover { color: var(--text-primary); }
  .crumb-reset { color: var(--accent); margin-left: var(--space-2); }
  .crumb-sep { color: var(--text-ghost); }

  .detail-panel {
    width: 360px;
    border-left: 1px solid var(--border-subtle);
    background: color-mix(in srgb, var(--bg-surface) 94%, transparent);
    backdrop-filter: blur(12px);
    padding: var(--space-4);
    overflow: auto;
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    align-items: flex-start;
    margin-bottom: var(--space-4);
  }

  .detail-title {
    font-family: var(--font-display);
    font-size: 24px;
    line-height: 1.1;
  }

  .detail-path {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-secondary);
    margin-top: var(--space-1);
    word-break: break-word;
  }

  .detail-actions {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: var(--space-2);
  }

  .type-badge {
    font-family: var(--font-mono);
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: var(--space-1) var(--space-2);
    border-radius: var(--radius-full);
    border: 1px solid transparent;
  }

  .type-badge[data-type='string'] { color: var(--type-string); background: color-mix(in srgb, var(--type-string) 12%, transparent); }
  .type-badge[data-type='number'] { color: var(--type-number); background: color-mix(in srgb, var(--type-number) 12%, transparent); }
  .type-badge[data-type='boolean'] { color: var(--type-boolean); background: color-mix(in srgb, var(--type-boolean) 12%, transparent); }
  .type-badge[data-type='object'] { color: var(--type-object); background: color-mix(in srgb, var(--type-object) 12%, transparent); }
  .type-badge[data-type='array'] { color: var(--type-array); background: color-mix(in srgb, var(--type-array) 12%, transparent); }
  .type-badge[data-type='null'] { color: var(--type-null); background: color-mix(in srgb, var(--type-null) 12%, transparent); }

  .detail-section {
    border: 1px solid var(--border-subtle);
    background: var(--bg-elevated);
    border-radius: var(--radius-lg);
    padding: var(--space-3);
    margin-bottom: var(--space-3);
  }

  .detail-section h3 {
    margin: 0 0 var(--space-2);
    font-family: var(--font-body);
    font-size: 13px;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .token-bar {
    display: flex;
    height: 8px;
    background: var(--bg-overlay);
    border-radius: var(--radius-full);
    overflow: hidden;
    gap: 2px;
  }

  .token-seg.schema { background: var(--weight-schema); }
  .token-seg.value { background: var(--weight-value); }
  .token-seg.nul { background: var(--weight-null); }

  .token-legend {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2px;
    margin-top: var(--space-2);
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-secondary);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }

  .stats-grid.compact {
    grid-template-columns: 1fr;
  }

  .stats-grid :global(div) {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    border-bottom: 1px dashed var(--border-subtle);
    padding-bottom: var(--space-1);
  }

  .stats-grid :global(.k) {
    color: var(--text-tertiary);
    font-family: var(--font-mono);
    font-size: 11px;
    text-transform: lowercase;
  }

  .stats-grid :global(.v) {
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: 11px;
  }

  .examples-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .examples-list pre {
    margin: 0;
    background: rgba(255,255,255,0.02);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--space-2);
    color: var(--text-secondary);
    font-family: var(--font-mono);
    font-size: 11px;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .insight-card-head {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
    align-items: baseline;
    margin-bottom: var(--space-1);
  }

  .insight-detail {
    margin-top: var(--space-1);
    color: var(--text-secondary);
    font-size: 12px;
    line-height: 1.45;
  }

  .diet-summary {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
    margin: var(--space-2) 0 var(--space-3);
  }

  .diet-summary > div {
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--space-2);
  }

  .diet-number {
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 600;
  }

  .diet-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    max-height: 52vh;
    overflow: auto;
  }

  .diet-row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: var(--space-2);
    align-items: center;
    padding: var(--space-2);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    background: var(--bg-elevated);
  }

  .diet-row input[type='checkbox'] {
    accent-color: var(--accent);
  }

  .diet-row-main {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .diet-path {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .diet-meta,
  .diet-savings {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-secondary);
  }

  .tooltip {
    position: fixed;
    z-index: 40;
    width: 280px;
    background: rgba(26, 26, 33, 0.96);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    box-shadow: var(--shadow-lg);
    pointer-events: none;
    backdrop-filter: blur(12px);
  }

  .tooltip-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .tooltip-title {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-primary);
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tooltip-sub {
    margin-top: 2px;
    color: var(--text-secondary);
    font-size: 11px;
  }

  .tooltip-grid {
    margin-top: var(--space-2);
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-1) var(--space-3);
  }

  .tooltip-grid :global(div) {
    display: flex;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .tooltip-grid :global(.k) {
    color: var(--text-tertiary);
    font-family: var(--font-mono);
    font-size: 10px;
  }

  .tooltip-grid :global(.v) {
    color: var(--text-primary);
    font-family: var(--font-mono);
    font-size: 10px;
  }

  .empty-state {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    background: var(--bg-root);
  }

  .empty-card {
    width: min(560px, 92vw);
    background: var(--bg-surface);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-xl);
    padding: var(--space-8);
  }

  .empty-card .brand {
    font-family: var(--font-display);
    font-size: 40px;
    margin-bottom: var(--space-2);
  }

  .empty-card h1 {
    margin: 0;
    font-size: 18px;
    color: var(--text-secondary);
    font-weight: 500;
  }

  .muted {
    color: var(--text-tertiary);
    font-size: 12px;
  }

  .error,
  .error-banner {
    color: #ffb4bf;
  }

  .error-banner {
    position: fixed;
    left: 50%;
    bottom: 12px;
    transform: translateX(-50%);
    background: rgba(224, 69, 98, 0.12);
    border: 1px solid rgba(224, 69, 98, 0.3);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
    font-size: 12px;
    z-index: 50;
  }

  @media (max-width: 1280px) {
    .summary-strip {
      grid-template-columns: repeat(2, minmax(110px, 1fr));
    }

    .topbar {
      grid-template-columns: 1fr auto;
      grid-template-areas:
        'left actions'
        'summary summary';
      height: auto;
      padding-top: var(--space-2);
      padding-bottom: var(--space-2);
    }

    .topbar-left { grid-area: left; }
    .topbar-actions { grid-area: actions; }
    .summary-strip { grid-area: summary; }
  }

  @media (max-width: 980px) {
    .body-shell {
      grid-template-columns: minmax(0, 1fr);
    }

    .sidebar {
      display: none;
    }

    .detail-panel {
      position: fixed;
      right: 0;
      top: 56px;
      bottom: 0;
      width: min(420px, 92vw);
      z-index: 30;
      box-shadow: -12px 0 32px rgba(0, 0, 0, 0.4);
    }
  }

  @media (max-width: 720px) {
    .view-toggles {
      display: none;
    }
    .breadcrumb-right {
      display: none;
    }
    .topbar-actions {
      flex-wrap: wrap;
      justify-content: flex-end;
    }
  }
</style>
