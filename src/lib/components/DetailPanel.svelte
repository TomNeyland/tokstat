<script lang="ts">
  import type { AnalysisNode, Insight } from '../../engine/types'
  import Badge from './Badge.svelte'
  import TokenBar from './TokenBar.svelte'
  import FillRate from './FillRate.svelte'

  interface Props {
    node: AnalysisNode
    insights: Insight[]
    visible: boolean
    onclose: () => void
  }

  let { node, insights, visible, onclose }: Props = $props()

  let relevantInsights = $derived(
    insights.filter(i => i.path === node.path)
  )
</script>

{#if visible}
  <aside class="detail-panel">
    <div class="panel-header">
      <div class="header-info">
        <span class="field-path">{node.path}</span>
        <Badge type={node.type} />
      </div>
      <button class="close-btn" onclick={onclose} aria-label="Close detail panel">
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
          <line x1="5" y1="5" x2="15" y2="15" />
          <line x1="15" y1="5" x2="5" y2="15" />
        </svg>
      </button>
    </div>

    <div class="panel-body">
      <!-- Token Breakdown -->
      <div class="section">
        <span class="section-label">Token Breakdown</span>
        <TokenBar
          schema={node.tokens.schema_overhead}
          value={node.tokens.value_payload}
          nullWaste={node.tokens.null_waste}
        />
      </div>

      <!-- Stats Table -->
      <div class="section">
        <span class="section-label">Token Statistics</span>
        <div class="stats-table">
          <div class="stats-row">
            <span class="stats-key">avg</span>
            <span class="stats-val">{node.tokens.total.avg} tok</span>
          </div>
          <div class="stats-row">
            <span class="stats-key">min</span>
            <span class="stats-val">{node.tokens.total.min} tok</span>
          </div>
          <div class="stats-row">
            <span class="stats-key">max</span>
            <span class="stats-val">{node.tokens.total.max} tok</span>
          </div>
          <div class="stats-row">
            <span class="stats-key">p50</span>
            <span class="stats-val">{node.tokens.total.p50} tok</span>
          </div>
          <div class="stats-row">
            <span class="stats-key">p95</span>
            <span class="stats-val">{node.tokens.total.p95} tok</span>
          </div>
        </div>
      </div>

      <!-- Fill Rate -->
      <div class="section">
        <span class="section-label">Fill Rate</span>
        <FillRate rate={node.fill_rate} />
      </div>

      <!-- Cost -->
      <div class="section">
        <span class="section-label">Cost</span>
        <div class="stats-table">
          <div class="stats-row">
            <span class="stats-key">per instance</span>
            <span class="stats-val cost">${node.cost.per_instance.toFixed(5)}</span>
          </div>
          <div class="stats-row">
            <span class="stats-key">total corpus</span>
            <span class="stats-val cost">${node.cost.total_corpus.toFixed(4)}</span>
          </div>
        </div>
      </div>

      <!-- Array Stats -->
      {#if node.array_stats}
        <div class="section">
          <span class="section-label">Array Stats</span>
          <div class="stats-table">
            <div class="stats-row">
              <span class="stats-key">avg items</span>
              <span class="stats-val">{node.array_stats.avg_items}</span>
            </div>
            <div class="stats-row">
              <span class="stats-key">min items</span>
              <span class="stats-val">{node.array_stats.min_items}</span>
            </div>
            <div class="stats-row">
              <span class="stats-key">max items</span>
              <span class="stats-val">{node.array_stats.max_items}</span>
            </div>
          </div>
        </div>
      {/if}

      <!-- String Stats -->
      {#if node.string_stats}
        <div class="section">
          <span class="section-label">String Stats</span>
          <div class="stats-table">
            <div class="stats-row">
              <span class="stats-key">avg length</span>
              <span class="stats-val">{node.string_stats.avg_length} chars</span>
            </div>
            <div class="stats-row">
              <span class="stats-key">diversity</span>
              <span class="stats-val">{(node.string_stats.value_diversity * 100).toFixed(0)}%</span>
            </div>
            <div class="stats-row">
              <span class="stats-key">unique values</span>
              <span class="stats-val">{node.string_stats.unique_count}</span>
            </div>
          </div>
        </div>
      {/if}

      <!-- Examples -->
      {#if node.examples.length > 0}
        <div class="section">
          <span class="section-label">Example Values</span>
          <div class="examples">
            {#each node.examples.slice(0, 5) as ex}
              <code class="example">{JSON.stringify(ex)}</code>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Insights -->
      {#if relevantInsights.length > 0}
        <div class="section">
          <span class="section-label">Insights</span>
          {#each relevantInsights as insight}
            <div class="insight" class:high={insight.severity === 'high'} class:medium={insight.severity === 'medium'}>
              <span class="insight-severity">{insight.severity}</span>
              <p class="insight-message">{insight.message}</p>
              <span class="insight-savings">
                Saves {insight.savings_tokens} tok/instance (${insight.savings_usd_per_10k.toFixed(2)}/10K)
              </span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </aside>
{/if}

<style>
  .detail-panel {
    width: 360px;
    background: var(--bg-surface);
    border-left: 1px solid var(--border-subtle);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    flex-shrink: 0;
    animation: slide-in var(--duration-normal) var(--ease-out);
  }

  @keyframes slide-in {
    from { transform: translateX(100%); }
    to { transform: translateX(0); }
  }

  .panel-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: var(--space-4);
    border-bottom: 1px solid var(--border-subtle);
    gap: var(--space-3);
  }

  .header-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;
  }

  .field-path {
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    word-break: break-all;
  }

  .close-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    cursor: pointer;
    flex-shrink: 0;
    transition: color var(--duration-instant), border-color var(--duration-instant);
  }

  .close-btn:hover {
    color: var(--text-primary);
    border-color: var(--border-default);
  }

  .close-btn svg {
    width: 14px;
    height: 14px;
  }

  .panel-body {
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .section-label {
    font-family: var(--font-body);
    font-size: 11px;
    font-weight: 500;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .stats-table {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .stats-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: var(--space-1) 0;
  }

  .stats-key {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-tertiary);
  }

  .stats-val {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
  }

  .cost {
    color: var(--thermal-5);
  }

  .examples {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .example {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-secondary);
    background: var(--bg-elevated);
    padding: var(--space-1-5) var(--space-3);
    border-radius: var(--radius-sm);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .insight {
    background: var(--bg-elevated);
    border: 1px solid var(--border-subtle);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-1-5);
  }

  .insight.high {
    border-left: 3px solid var(--thermal-8);
  }

  .insight.medium {
    border-left: 3px solid var(--thermal-5);
  }

  .insight-severity {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-tertiary);
  }

  .insight-message {
    font-size: 13px;
    color: var(--text-primary);
    line-height: 1.5;
  }

  .insight-savings {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--thermal-2);
    font-weight: 500;
  }
</style>
