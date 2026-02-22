import type { AnalysisOutput, AnalysisNode, Insight } from '../engine/types.ts'

/**
 * Generate token-efficient text format optimized for LLM consumption.
 * Designed to be pasted into an LLM conversation for schema auditing.
 */
export function formatLlm(output: AnalysisOutput): string {
  const { summary, tree, insights } = output
  const lines: string[] = []

  // Header
  lines.push(
    `tokstat analysis: ${summary.file_count} files, ${summary.model} (${summary.tokenizer})`,
  )
  lines.push('')

  // Headline
  lines.push(
    `HEADLINE: $${summary.cost_per_instance.toFixed(4)}/instance, ` +
    `${Math.round(summary.overhead_ratio * 100)}% schema overhead, ` +
    `${Math.round(summary.null_waste_ratio * 100)}% null waste`,
  )
  lines.push('')

  // Scale projections
  lines.push('SCALE:')
  lines.push(`  1K: $${summary.cost_at_1k.toFixed(2)}`)
  lines.push(`  10K: $${summary.cost_at_10k.toFixed(2)}`)
  lines.push(`  100K: $${summary.cost_at_100k.toFixed(2)}`)
  lines.push(`  1M: $${summary.cost_at_1m.toFixed(2)}`)
  lines.push('')

  // Top savings
  if (insights.length > 0) {
    lines.push('TOP SAVINGS:')
    const topInsights = insights.slice(0, 5)
    for (let i = 0; i < topInsights.length; i++) {
      const insight = topInsights[i]
      lines.push(`  ${i + 1}. ${formatInsightLine(insight)}`)
    }
    lines.push('')
  }

  // Schema overhead hotspots
  const hotspots = findOverheadHotspots(tree)
  if (hotspots.length > 0) {
    lines.push('SCHEMA OVERHEAD HOTSPOTS:')
    for (const hotspot of hotspots.slice(0, 5)) {
      lines.push(`  ${hotspot}`)
    }
    lines.push('')
  }

  // High waste fields (low fill, high cost)
  const wasteFields = findHighWasteFields(tree)
  if (wasteFields.length > 0) {
    lines.push('HIGH WASTE (low fill, high cost):')
    for (const field of wasteFields.slice(0, 5)) {
      lines.push(`  ${field}`)
    }
    lines.push('')
  }

  // Boilerplate
  const boilerplateInsights = insights.filter(i => i.type === 'boilerplate')
  if (boilerplateInsights.length > 0) {
    lines.push('BOILERPLATE:')
    for (const insight of boilerplateInsights.slice(0, 3)) {
      lines.push(`  ${insight.message}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

function formatInsightLine(insight: Insight): string {
  const savings = Math.round(insight.savings_tokens)
  const usd = insight.savings_usd_per_10k.toFixed(2)
  return `${insight.path} — ${insight.message.split('.')[0]}, saves ${savings} tok/inst ($${usd}/10K)`
}

function findOverheadHotspots(tree: AnalysisNode): string[] {
  const hotspots: { text: string; overhead: number }[] = []

  function walk(node: AnalysisNode): void {
    if (node.type === 'array' && node.array_stats && node.array_stats.avg_items > 1) {
      const itemNode = node.children.find(c => c.name === '[]')
      if (itemNode) {
        const fieldCount = itemNode.children.length
        const avgItems = node.array_stats.avg_items
        hotspots.push({
          text: `${node.path} items: ${fieldCount} field names x ${avgItems.toFixed(1)} avg items = ${(fieldCount * avgItems).toFixed(1)} key emissions/inst`,
          overhead: fieldCount * avgItems,
        })
      }
    }

    if (node.type === 'object' && node.tokens.total.avg > 0) {
      const ratio = node.tokens.schema_overhead / node.tokens.total.avg
      if (ratio > 0.6 && node.children.length > 2) {
        hotspots.push({
          text: `${node.path} object: ${node.children.length} field names, ${Math.round(ratio * 100)}% overhead ratio`,
          overhead: node.tokens.schema_overhead,
        })
      }
    }

    for (const child of node.children) {
      walk(child)
    }
  }

  walk(tree)
  hotspots.sort((a, b) => b.overhead - a.overhead)
  return hotspots.map(h => h.text)
}

function findHighWasteFields(tree: AnalysisNode): string[] {
  const fields: { text: string; waste: number }[] = []

  function walk(node: AnalysisNode): void {
    if (node.fill_rate < 0.5 && node.fill_rate > 0 && node.tokens.total.avg > 0 && node.name !== 'root') {
      const fillPct = Math.round(node.fill_rate * 100)
      const avgTokens = Math.round(node.tokens.total.avg)
      fields.push({
        text: `${node.path} — ${avgTokens} tok avg, ${fillPct}% fill`,
        waste: node.tokens.total.avg * (1 - node.fill_rate),
      })
    }
    for (const child of node.children) {
      walk(child)
    }
  }

  walk(tree)
  fields.sort((a, b) => b.waste - a.waste)
  return fields.map(f => f.text)
}
