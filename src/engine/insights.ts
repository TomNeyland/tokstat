import type { AnalysisNode, Insight, InsightSeverity } from './types.ts'

/**
 * Run all insight detectors against the analysis tree.
 * Returns insights sorted by savings_tokens descending.
 */
export function detectInsights(
  tree: AnalysisNode,
  pricePerToken: number,
): Insight[] {
  const insights: Insight[] = []

  walkTree(tree, (node) => {
    detectNullTax(node, pricePerToken, insights)
    detectHollowObject(node, pricePerToken, insights)
    detectArrayRepetitionTax(node, pricePerToken, insights)
    detectBoilerplate(node, pricePerToken, insights)
    detectLengthVariance(node, pricePerToken, insights)
  })

  // Sort by savings descending
  insights.sort((a, b) => b.savings_tokens - a.savings_tokens)

  return insights
}

function walkTree(node: AnalysisNode, fn: (node: AnalysisNode) => void): void {
  fn(node)
  for (const child of node.children) {
    walkTree(child, fn)
  }
}

// ── Null Tax ─────────────────────────────────────────────────────────────────

function detectNullTax(
  node: AnalysisNode,
  pricePerToken: number,
  insights: Insight[],
): void {
  // Only fire on leaf-ish fields with fill_rate < 0.5
  if (node.fill_rate >= 0.5) return
  if (node.instance_count === 0) return
  if (node.name === 'root' || node.name === '[]') return

  const nullPct = Math.round((1 - node.fill_rate) * 100)
  const savingsPerInstance = node.tokens.schema_overhead * (1 - node.fill_rate) + node.tokens.null_waste
  if (savingsPerInstance < 1) return

  const savingsUsdPer10k = savingsPerInstance * pricePerToken * 10_000

  const severity: InsightSeverity = savingsPerInstance > 20 ? 'high'
    : savingsPerInstance > 5 ? 'medium'
    : 'low'

  insights.push({
    type: 'null_tax',
    path: node.path,
    severity,
    message: `${node.name} is null ${nullPct}% of the time. Making it optional saves ${Math.round(savingsPerInstance)} tok/instance.`,
    detail: `This field exists in the schema but is null in ${nullPct}% of instances. ` +
      `Each null instance still costs ${node.tokens.schema_overhead.toFixed(1)} tokens in structural overhead ` +
      `plus ${node.tokens.null_waste.toFixed(1)} tokens for the null literal. ` +
      `Making it optional would eliminate these costs when the field has no value.`,
    savings_tokens: savingsPerInstance,
    savings_usd_per_10k: savingsUsdPer10k,
  })
}

// ── Hollow Object ────────────────────────────────────────────────────────────

function detectHollowObject(
  node: AnalysisNode,
  pricePerToken: number,
  insights: Insight[],
): void {
  if (node.type !== 'object') return
  if (node.tokens.total.avg < 5) return

  const overheadRatio = node.tokens.schema_overhead / node.tokens.total.avg
  if (overheadRatio <= 0.7) return

  const overheadPct = Math.round(overheadRatio * 100)
  const overheadTokens = Math.round(node.tokens.schema_overhead)
  const totalTokens = Math.round(node.tokens.total.avg)

  // Savings = difficult to quantify exactly; approximate as the overhead minus minimum viable structure
  const savingsPerInstance = node.tokens.schema_overhead * 0.3 // rough: restructuring could save ~30% of overhead

  const severity: InsightSeverity = overheadRatio > 0.85 ? 'high'
    : overheadRatio > 0.75 ? 'medium'
    : 'low'

  insights.push({
    type: 'hollow_object',
    path: node.path,
    severity,
    message: `${node.name} is ${overheadPct}% structural overhead. ${overheadTokens} of ${totalTokens} tokens are field names and braces.`,
    detail: `This object's structural elements (field names, braces, colons, commas) consume ${overheadPct}% of its total token cost. ` +
      `The actual value payload is only ${totalTokens - overheadTokens} tokens. ` +
      `Consider flattening or restructuring to reduce overhead.`,
    savings_tokens: savingsPerInstance,
    savings_usd_per_10k: savingsPerInstance * pricePerToken * 10_000,
  })
}

// ── Array Key Repetition Tax ─────────────────────────────────────────────────

function detectArrayRepetitionTax(
  node: AnalysisNode,
  pricePerToken: number,
  insights: Insight[],
): void {
  if (node.type !== 'array') return
  if (!node.array_stats) return
  if (node.array_stats.avg_items <= 1) return

  // Sum the schema_overhead of all children of the array item node
  const itemChildren = node.children.filter(c => c.name === '[]')
  if (itemChildren.length === 0) return
  const itemNode = itemChildren[0]

  const perItemKeyCost = itemNode.children.reduce(
    (sum, child) => sum + child.tokens.schema_overhead,
    0,
  )
  if (perItemKeyCost < 1) return

  const repetitionTax = perItemKeyCost * (node.array_stats.avg_items - 1)
  const avgItems = node.array_stats.avg_items

  const severity: InsightSeverity = repetitionTax > 50 ? 'high'
    : repetitionTax > 15 ? 'medium'
    : 'low'

  insights.push({
    type: 'array_repetition_tax',
    path: node.path,
    severity,
    message: `Field names in ${node.name} repeat ${avgItems.toFixed(1)}x per instance, costing ${Math.round(repetitionTax)} tokens in repetition.`,
    detail: `Each item in this array repeats ${itemNode.children.length} field names, costing ~${perItemKeyCost.toFixed(1)} tokens per item. ` +
      `With an average of ${avgItems.toFixed(1)} items, the first item's field names are repeated ${(avgItems - 1).toFixed(1)} additional times. ` +
      `A header+values format would eliminate this repetition.`,
    savings_tokens: repetitionTax,
    savings_usd_per_10k: repetitionTax * pricePerToken * 10_000,
  })
}

// ── Boilerplate ──────────────────────────────────────────────────────────────

function detectBoilerplate(
  node: AnalysisNode,
  pricePerToken: number,
  insights: Insight[],
): void {
  if (node.type !== 'string') return
  if (!node.string_stats) return
  if (node.fill_rate <= 0.5) return
  if (node.string_stats.value_diversity >= 0.1) return

  const uniqueCount = node.string_stats.unique_count
  const totalInstances = node.instance_count

  // Savings: replacing verbose repeated strings with short enum values
  const savingsPerInstance = node.tokens.value_payload * 0.7 // enum is ~30% the cost of a full string

  const severity: InsightSeverity = savingsPerInstance > 10 ? 'high'
    : savingsPerInstance > 3 ? 'medium'
    : 'low'

  insights.push({
    type: 'boilerplate',
    path: node.path,
    severity,
    message: `${node.name} has ${uniqueCount} unique values across ${totalInstances} instances. Consider replacing with an enum.`,
    detail: `This string field has very low value diversity (${(node.string_stats.value_diversity * 100).toFixed(1)}%). ` +
      `Only ${uniqueCount} distinct values appear across ${totalInstances} instances. ` +
      `The repetitive content costs ~${node.tokens.value_payload.toFixed(1)} tokens per instance. ` +
      `Replacing with an enum or shorter values would significantly reduce cost.`,
    savings_tokens: savingsPerInstance,
    savings_usd_per_10k: savingsPerInstance * pricePerToken * 10_000,
  })
}

// ── Length Variance ──────────────────────────────────────────────────────────

function detectLengthVariance(
  node: AnalysisNode,
  pricePerToken: number,
  insights: Insight[],
): void {
  if (node.type !== 'string') return
  // Use the token stats total for variance detection
  if (node.tokens.total.p50 === 0) return

  const ratio = node.tokens.total.p95 / node.tokens.total.p50
  if (ratio <= 5) return

  const p50 = Math.round(node.tokens.total.p50)
  const p95 = Math.round(node.tokens.total.p95)

  // Savings: if we cap at a reasonable length, we save the tail
  const savingsPerInstance = (node.tokens.total.p95 - node.tokens.total.p50) * 0.05 // only 5% of instances are in the tail

  const severity: InsightSeverity = ratio > 20 ? 'high'
    : ratio > 10 ? 'medium'
    : 'low'

  insights.push({
    type: 'length_variance',
    path: node.path,
    severity,
    message: `${node.name} length varies ${ratio.toFixed(0)}x (p50: ${p50} tok, p95: ${p95} tok). Consider adding length guidance.`,
    detail: `This string field has high length variance with a ${ratio.toFixed(1)}x spread between median and 95th percentile. ` +
      `The median instance costs ${p50} tokens but the 95th percentile costs ${p95} tokens. ` +
      `Adding max_length guidance in your schema description would reduce outlier costs.`,
    savings_tokens: savingsPerInstance,
    savings_usd_per_10k: savingsPerInstance * pricePerToken * 10_000,
  })
}
