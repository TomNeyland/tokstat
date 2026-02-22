<script lang="ts">
  import type { AnalysisSummary } from '../../engine/types'
  import SearchInput from './SearchInput.svelte'

  interface Props {
    summary: AnalysisSummary
    searchQuery: string
    onsearch: (query: string) => void
  }

  let { summary, searchQuery, onsearch }: Props = $props()

  let costFormatted = $derived('$' + summary.cost_per_instance.toFixed(4))
  let overheadPct = $derived(Math.round(summary.overhead_ratio * 100) + '%')
  let nullWastePct = $derived(Math.round(summary.null_waste_ratio * 100) + '%')
  let avgTokens = $derived(summary.avg_tokens_per_instance.toLocaleString())
</script>

<header class="top-bar">
  <div class="brand">
    <span class="logo">tokstat</span>
  </div>

  <div class="stats">
    <div class="stat">
      <span class="stat-label">Cost/Instance</span>
      <span class="stat-value">{costFormatted}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Avg Tokens</span>
      <span class="stat-value">{avgTokens}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Overhead</span>
      <span class="stat-value overhead">{overheadPct}</span>
    </div>
    <div class="stat">
      <span class="stat-label">Null Waste</span>
      <span class="stat-value waste">{nullWastePct}</span>
    </div>
  </div>

  <div class="actions">
    <SearchInput value={searchQuery} oninput={onsearch} />
  </div>
</header>

<style>
  .top-bar {
    height: 48px;
    display: flex;
    align-items: center;
    gap: var(--space-6);
    padding: 0 var(--space-4);
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border-subtle);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .logo {
    font-family: var(--font-display);
    font-size: 22px;
    color: var(--text-primary);
    letter-spacing: -0.02em;
  }

  .stats {
    display: flex;
    gap: var(--space-6);
    flex: 1;
    justify-content: center;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
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

  .stat-value {
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.3;
  }

  .overhead {
    color: var(--weight-schema);
  }

  .waste {
    color: var(--thermal-7);
  }

  .actions {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }
</style>
