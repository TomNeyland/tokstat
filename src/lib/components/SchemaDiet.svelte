<script lang="ts">
  import type { AnalysisNode } from '../../engine/types'

  interface DietField {
    path: string
    name: string
    fillRate: number
    avgTokens: number
    wasteCost: number
  }

  interface Props {
    tree: AnalysisNode
    scale: number
    visible: boolean
    onclose: () => void
  }

  let { tree, scale, visible, onclose }: Props = $props()

  let checked = $state<Set<string>>(new Set())

  // Collect all leaf/low-fill fields from the tree
  function collectFields(node: AnalysisNode, results: DietField[] = []): DietField[] {
    if (node.children.length === 0 && node.fill_rate < 0.8) {
      results.push({
        path: node.path,
        name: node.name,
        fillRate: node.fill_rate,
        avgTokens: node.tokens.total.avg,
        wasteCost: node.cost.per_instance * (1 - node.fill_rate),
      })
    }
    for (const child of node.children) {
      collectFields(child, results)
    }
    return results
  }

  let fields = $derived(collectFields(tree).sort((a, b) => b.wasteCost - a.wasteCost))

  let totalSavingsTokens = $derived(
    fields
      .filter(f => checked.has(f.path))
      .reduce((sum, f) => sum + f.avgTokens, 0)
  )

  let totalSavingsCost = $derived(
    fields
      .filter(f => checked.has(f.path))
      .reduce((sum, f) => sum + f.wasteCost, 0)
  )

  let scaledSavings = $derived(totalSavingsCost * scale)

  function toggle(path: string) {
    const next = new Set(checked)
    if (next.has(path)) {
      next.delete(path)
    } else {
      next.add(path)
    }
    checked = next
  }
</script>

{#if visible}
  <div class="diet-panel">
    <div class="diet-header">
      <div class="diet-title-row">
        <h3 class="diet-title">Schema Diet</h3>
        <button class="close-btn" onclick={onclose} aria-label="Close schema diet">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
            <line x1="5" y1="5" x2="15" y2="15" />
            <line x1="15" y1="5" x2="5" y2="15" />
          </svg>
        </button>
      </div>
      <p class="diet-desc">Select fields to cut. See projected savings.</p>
    </div>

    {#if checked.size > 0}
      <div class="savings-banner">
        <span class="savings-label">Projected Savings</span>
        <span class="savings-tokens">{totalSavingsTokens} tok/instance</span>
        <span class="savings-cost">${scaledSavings.toFixed(2)} at {scale.toLocaleString()} generations</span>
      </div>
    {/if}

    <div class="field-list">
      {#each fields as field}
        <label class="field-row" class:selected={checked.has(field.path)}>
          <input
            type="checkbox"
            checked={checked.has(field.path)}
            onchange={() => toggle(field.path)}
          />
          <div class="field-info">
            <span class="field-name">{field.path}</span>
            <div class="field-meta">
              <span class="field-fill">{Math.round(field.fillRate * 100)}% fill</span>
              <span class="field-tokens">{field.avgTokens} tok</span>
            </div>
          </div>
        </label>
      {/each}
    </div>
  </div>
{/if}

<style>
  .diet-panel {
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

  .diet-header {
    padding: var(--space-4);
    border-bottom: 1px solid var(--border-subtle);
  }

  .diet-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .diet-title {
    font-family: var(--font-display);
    font-size: 22px;
    color: var(--text-primary);
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

  .diet-desc {
    font-size: 13px;
    color: var(--text-tertiary);
    margin-top: var(--space-1);
  }

  .savings-banner {
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border-subtle);
    padding: var(--space-3) var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-0-5);
  }

  .savings-label {
    font-family: var(--font-body);
    font-size: 10px;
    font-weight: 500;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .savings-tokens {
    font-family: var(--font-mono);
    font-size: 18px;
    font-weight: 600;
    color: var(--thermal-2);
  }

  .savings-cost {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-secondary);
  }

  .field-list {
    display: flex;
    flex-direction: column;
  }

  .field-row {
    display: flex;
    align-items: flex-start;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--border-subtle);
    cursor: pointer;
    transition: background var(--duration-instant);
  }

  .field-row:hover {
    background: var(--bg-elevated);
  }

  .field-row.selected {
    background: color-mix(in srgb, var(--thermal-2) 8%, transparent);
  }

  .field-row input[type="checkbox"] {
    accent-color: var(--accent);
    margin-top: var(--space-0-5);
  }

  .field-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-0-5);
    min-width: 0;
  }

  .field-name {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--text-primary);
    word-break: break-all;
  }

  .field-meta {
    display: flex;
    gap: var(--space-4);
  }

  .field-fill {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--fill-sparse);
  }

  .field-tokens {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-tertiary);
  }
</style>
