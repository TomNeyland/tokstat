<script lang="ts">
  import type { AnalysisSummary } from '../../engine/types'

  interface Props {
    segments: string[]
    summary: AnalysisSummary
    currentCostPerInstance: number
    currentCorpusCost: number
    depth: number
    onnavigate: (index: number) => void
  }

  let { segments, summary, currentCostPerInstance, currentCorpusCost, depth, onnavigate }: Props = $props()

  let corpusCost = $derived('$' + currentCorpusCost.toFixed(2) + ' corpus')
  let instCost = $derived('$' + currentCostPerInstance.toFixed(4) + '/instance')
  let corpusTokens = $derived(Math.round(summary.corpus_total_tokens).toLocaleString() + ' tok corpus')
  let instTokens = $derived(Math.round(summary.avg_tokens_per_instance).toLocaleString() + ' tok/instance')
  let levels = $derived(depth + ' levels')
</script>

<div class="breadcrumb-bar">
  <div class="path">
    {#each segments as seg, i}
      {#if i > 0}
        <span class="sep">&rsaquo;</span>
      {/if}
      <button
        class="segment"
        class:active={i === segments.length - 1}
        onclick={() => onnavigate(i)}
      >
        {seg}
      </button>
    {/each}
  </div>
  <div class="context">
    <span class="ctx-item">{corpusCost}</span>
    <span class="ctx-dot">•</span>
    <span class="ctx-item">{instCost}</span>
    <span class="ctx-dot">•</span>
    <span class="ctx-item">{corpusTokens}</span>
    <span class="ctx-dot">•</span>
    <span class="ctx-item">{instTokens}</span>
    <span class="ctx-dot">•</span>
    <span class="ctx-item">{levels}</span>
  </div>
</div>

<style>
  .breadcrumb-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 36px;
    background: var(--bg-surface);
    border-top: 1px solid var(--border-subtle);
    padding: var(--space-1) var(--space-4);
    gap: var(--space-4);
  }

  .path {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .segment {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: color var(--duration-instant);
    background: none;
    border: none;
    padding: 0;
  }

  .segment:hover {
    color: var(--text-primary);
  }

  .active {
    color: var(--text-primary);
    font-weight: 500;
  }

  .sep {
    color: var(--text-ghost);
    font-size: 14px;
  }

  .context {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .ctx-item {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .ctx-dot {
    font-size: 10px;
    color: var(--text-ghost);
  }
</style>
