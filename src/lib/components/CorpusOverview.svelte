<script lang="ts">
  import type { AnalysisSummary, AnalysisNode } from '../../engine/types'
  import TokenBar from './TokenBar.svelte'

  interface Props {
    summary: AnalysisSummary
    tree: AnalysisNode
  }

  let { summary, tree }: Props = $props()

  // Corpus headline numbers
  let corpusTokens = $derived(Math.round(summary.corpus_total_tokens).toLocaleString())
  let tokPerInstance = $derived(Math.round(summary.avg_tokens_per_instance).toLocaleString() + ' tok/instance')
  let corpusCost = $derived('$' + summary.corpus_total_cost.toFixed(2))
  let costPerInstance = $derived('$' + summary.cost_per_instance.toFixed(4) + '/instance')

  // Token breakdown
  let schemaTokens = $derived(Math.round(tree.tokens.schema_overhead).toLocaleString())
  let valueTokens = $derived(Math.round(tree.tokens.value_payload).toLocaleString())
  let nullTokens = $derived(tree.tokens.null_waste.toFixed(1))

  // Top fields by corpus cost — flatten all leaf nodes and sort
  interface RankedField {
    path: string
    corpusTokens: number
    tokPerInstance: number
    fillRate: number
  }

  function collectLeaves(node: AnalysisNode): RankedField[] {
    if (node.children.length === 0) {
      return [{
        path: node.path,
        corpusTokens: node.tokens.total.avg * node.instance_count,
        tokPerInstance: node.tokens.total.avg,
        fillRate: node.fill_rate,
      }]
    }
    const results: RankedField[] = []
    for (const child of node.children) {
      results.push(...collectLeaves(child))
    }
    return results
  }

  let topFields = $derived(
    collectLeaves(tree)
      .sort((a, b) => b.corpusTokens - a.corpusTokens)
      .slice(0, 5)
  )

  function truncatePath(path: string, maxLen: number): string {
    if (path.length <= maxLen) return path
    return path.slice(0, maxLen - 3) + '...'
  }
</script>

<div class="corpus-overview">
  <div class="header">
    <span class="title">Corpus Overview</span>
    <span class="subtitle">Always root-level totals</span>
  </div>

  <div class="metric-cards">
    <div class="metric-card">
      <span class="metric-label">CORPUS TOKENS</span>
      <span class="metric-big">{corpusTokens}</span>
      <span class="metric-small">{tokPerInstance}</span>
    </div>
    <div class="metric-card">
      <span class="metric-label">CORPUS COST</span>
      <span class="metric-big">{corpusCost}</span>
      <span class="metric-small">{costPerInstance}</span>
    </div>
  </div>

  <div class="breakdown">
    <TokenBar
      schema={tree.tokens.schema_overhead}
      value={tree.tokens.value_payload}
      nullWaste={tree.tokens.null_waste}
      height={8}
      showLabels={false}
    />
    <div class="breakdown-labels">
      <span class="breakdown-item"><span class="dot schema-dot"></span>schema {schemaTokens} tok</span>
      <span class="breakdown-item"><span class="dot value-dot"></span>value {valueTokens} tok</span>
      <span class="breakdown-item"><span class="dot null-dot"></span>null {nullTokens} tok</span>
    </div>
  </div>

  <div class="top-fields">
    <span class="section-label">Top fields by corpus cost</span>
    {#each topFields as field}
      <div class="field-row">
        <span class="field-path" title={field.path}>{truncatePath(field.path, 28)}</span>
        <div class="field-stats">
          <span class="field-corpus">{Math.round(field.corpusTokens).toLocaleString()} tok</span>
          <span class="field-instance">{field.tokPerInstance.toFixed(1)} tok/inst</span>
          <span class="field-fill">{Math.round(field.fillRate * 100)}%</span>
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .corpus-overview {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .header {
    display: flex;
    flex-direction: column;
    gap: var(--space-0-5);
  }

  .title {
    font-family: var(--font-body);
    font-size: 11px;
    font-weight: 500;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .subtitle {
    font-family: var(--font-body);
    font-size: 11px;
    color: var(--text-ghost);
  }

  .metric-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-2);
  }

  .metric-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--space-3);
    background: var(--bg-elevated);
    border-radius: var(--radius-md);
    border: 1px solid var(--border-subtle);
  }

  .metric-label {
    font-family: var(--font-body);
    font-size: 9px;
    font-weight: 500;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    line-height: 1.2;
  }

  .metric-big {
    font-family: var(--font-display);
    font-size: 20px;
    color: var(--text-primary);
    line-height: 1.3;
  }

  .metric-small {
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-secondary);
    line-height: 1.3;
  }

  .breakdown {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .breakdown-labels {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .breakdown-item {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .schema-dot { background: var(--weight-schema); }
  .value-dot { background: var(--weight-value); }
  .null-dot { background: var(--weight-null); }

  .top-fields {
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
    padding-bottom: var(--space-1);
    border-bottom: 1px solid var(--border-subtle);
  }

  .field-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-0-5);
  }

  .field-path {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .field-stats {
    display: flex;
    gap: var(--space-3);
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--text-secondary);
  }

  .field-corpus {
    color: var(--text-secondary);
  }

  .field-instance {
    color: var(--text-tertiary);
  }

  .field-fill {
    color: var(--text-tertiary);
  }
</style>
