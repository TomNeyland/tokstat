<script lang="ts">
  import type { AnalysisNode } from '../../engine/types'
  import Badge from './Badge.svelte'
  import TokenBar from './TokenBar.svelte'

  interface Props {
    node: AnalysisNode
    x: number
    y: number
    visible: boolean
  }

  let { node, x, y, visible }: Props = $props()
</script>

{#if visible}
  <div
    class="tooltip"
    style="left: {x + 12}px; top: {y + 12}px"
  >
    <div class="header">
      <span class="title">{node.path}</span>
      <Badge type={node.type} />
    </div>
    <span class="subtitle">{Math.round(node.fill_rate * 100)}% fill • ${node.cost.total_corpus.toFixed(2)} corpus • ${node.cost.per_instance.toFixed(4)}/inst</span>
    <div class="divider"></div>
    <div class="stats">
      <div class="stat">
        <span class="stat-label">corpus</span>
        <span class="stat-value">{Math.round(node.tokens.total.avg * node.instance_count).toLocaleString()} tok</span>
      </div>
      <div class="stat">
        <span class="stat-label">avg</span>
        <span class="stat-value">{Math.round(node.tokens.total.avg)} tok</span>
      </div>
      <div class="stat">
        <span class="stat-label">p95</span>
        <span class="stat-value">{Math.round(node.tokens.total.p95)} tok</span>
      </div>
      <div class="stat">
        <span class="stat-label">schema</span>
        <span class="stat-value">{Math.round(node.tokens.schema_overhead)} tok</span>
      </div>
      <div class="stat">
        <span class="stat-label">null</span>
        <span class="stat-value">{node.tokens.null_waste.toFixed(1)} tok</span>
      </div>
    </div>
    <div class="divider"></div>
    <div class="token-bar-section">
      <TokenBar
        schema={node.tokens.schema_overhead}
        value={node.tokens.value_payload}
        nullWaste={node.tokens.null_waste}
        height={6}
        showLabels={false}
      />
      <span class="bar-label">
        {Math.round((node.tokens.value_payload / (node.tokens.schema_overhead + node.tokens.value_payload + node.tokens.null_waste)) * 100)}% value payload
      </span>
    </div>
  </div>
{/if}

<style>
  .tooltip {
    position: fixed;
    z-index: 1000;
    background: var(--bg-elevated);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    padding: var(--space-4);
    box-shadow: var(--shadow-lg);
    min-width: 260px;
    pointer-events: none;
    animation: tooltip-in 150ms var(--ease-out);
  }

  @keyframes tooltip-in {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    margin-bottom: var(--space-1);
  }

  .title {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .subtitle {
    font-size: 11px;
    color: var(--text-secondary);
  }

  .divider {
    height: 1px;
    background: var(--border-subtle);
    margin: var(--space-3) 0;
  }

  .stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-1-5) var(--space-4);
  }

  .stat {
    display: flex;
    align-items: baseline;
    gap: var(--space-2);
  }

  .stat-label {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
  }

  .stat-value {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-primary);
    font-weight: 500;
  }

  .token-bar-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .bar-label {
    font-size: 11px;
    color: var(--text-tertiary);
  }
</style>
