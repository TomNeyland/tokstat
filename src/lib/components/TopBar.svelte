<script lang="ts">
  import type { AnalysisSummary } from '../../engine/types'
  import SearchInput from './SearchInput.svelte'

  type VizMode = 'Treemap' | 'Sunburst' | 'Pack' | 'Icicle'

  interface Props {
    summary: AnalysisSummary
    searchQuery: string
    vizMode: VizMode
    onsearch: (query: string) => void
    onvizchange: (mode: string) => void
    onloadjson?: () => void
  }

  let { summary, searchQuery, vizMode, onsearch, onvizchange, onloadjson }: Props = $props()

  const vizOptions: VizMode[] = ['Treemap', 'Sunburst', 'Pack', 'Icicle']

  // Corpus cost
  let corpusCost = $derived('$' + summary.corpus_total_cost.toFixed(2))
  let instanceCost = $derived('$' + summary.cost_per_instance.toFixed(4) + '/instance')

  // Corpus tokens
  let corpusTokens = $derived(Math.round(summary.corpus_total_tokens).toLocaleString() + ' tok')
  let instanceTokens = $derived(Math.round(summary.avg_tokens_per_instance).toLocaleString() + ' tok/instance')

  // Schema overhead
  let overheadPct = $derived(Math.round(summary.overhead_ratio * 100) + '%')
  let overheadTokens = $derived(Math.round(summary.avg_tokens_per_instance * summary.overhead_ratio).toLocaleString() + ' tok corpus')

  // Null waste
  let nullPct = $derived(Math.round(summary.null_waste_ratio * 100) + '%')
  let nullDetail = $derived(
    Math.round(summary.avg_tokens_per_instance * summary.null_waste_ratio).toLocaleString() + ' tok corpus • ' + summary.file_count + ' files'
  )
</script>

<header class="top-bar">
  <div class="brand">
    <span class="logo">tokstat</span>
  </div>

  <div class="layout-tabs">
    {#each vizOptions as opt}
      <button
        class="tab-pill"
        class:active={vizMode === opt}
        onclick={() => onvizchange(opt)}
      >
        {opt}
      </button>
    {/each}
  </div>

  <div class="stats">
    <div class="stat-card">
      <span class="stat-label">CORPUS COST</span>
      <span class="stat-primary">{corpusCost}</span>
      <span class="stat-secondary">{instanceCost}</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">CORPUS TOKENS</span>
      <span class="stat-primary">{corpusTokens}</span>
      <span class="stat-secondary">{instanceTokens}</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">SCHEMA OVERHEAD</span>
      <span class="stat-primary overhead">{overheadPct}</span>
      <span class="stat-secondary">{overheadTokens}</span>
    </div>
    <div class="stat-card">
      <span class="stat-label">NULL WASTE</span>
      <span class="stat-primary waste">{nullPct}</span>
      <span class="stat-secondary">{nullDetail}</span>
    </div>
  </div>

  <div class="actions">
    {#if onloadjson}
      <button class="load-btn" onclick={onloadjson}>Load JSON</button>
    {/if}
    <SearchInput value={searchQuery} oninput={onsearch} />
  </div>
</header>

<style>
  .top-bar {
    min-height: 48px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-4);
    padding: var(--space-2) var(--space-4);
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
  }

  .brand {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  .logo {
    font-family: var(--font-display);
    font-size: 22px;
    color: var(--text-primary);
    letter-spacing: -0.02em;
  }

  .layout-tabs {
    display: flex;
    gap: var(--space-1);
    flex-shrink: 0;
  }

  .tab-pill {
    font-family: var(--font-body);
    font-size: 12px;
    font-weight: 500;
    color: var(--text-secondary);
    background: none;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-full);
    padding: var(--space-1) var(--space-3);
    cursor: pointer;
    transition: color var(--duration-instant), background var(--duration-instant), border-color var(--duration-instant);
  }

  .tab-pill:hover {
    color: var(--text-primary);
    border-color: var(--border-default);
  }

  .tab-pill.active {
    color: var(--text-primary);
    background: var(--accent-muted);
    border-color: var(--accent);
  }

  .stats {
    display: flex;
    gap: var(--space-6);
    flex: 1;
    justify-content: center;
    flex-wrap: wrap;
  }

  .stat-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
    min-width: 0;
  }

  .stat-label {
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 500;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    line-height: 1.2;
  }

  .stat-primary {
    font-family: var(--font-display);
    font-size: 18px;
    color: var(--text-primary);
    line-height: 1.2;
    white-space: nowrap;
  }

  .stat-secondary {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-secondary);
    line-height: 1.3;
    white-space: nowrap;
  }

  .overhead {
    color: var(--weight-schema);
  }

  .waste {
    color: var(--thermal-7);
  }

  .load-btn {
    font-family: var(--font-body);
    font-size: 12px;
    font-weight: 600;
    color: white;
    background: var(--accent);
    border: none;
    border-radius: var(--radius-md);
    padding: var(--space-1-5) var(--space-3);
    cursor: pointer;
    white-space: nowrap;
    transition: background var(--duration-instant);
  }

  .load-btn:hover {
    background: var(--accent-hover);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-shrink: 0;
  }
</style>
