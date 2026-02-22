import type { AnalysisNode, AnalysisSummary, Stats } from './types'

/**
 * Check if a schema path matches a single ignore pattern.
 * Patterns support:
 *   - Exact: "root.pmid" matches only root.pmid
 *   - Single wildcard: "root.metadata.*" matches root.metadata.foo but NOT root.metadata.foo.bar
 *   - Deep wildcard: "root.**.timestamp" matches root.x.timestamp, root.x.y.timestamp, etc.
 *   - Name wildcard: "*.metadata" matches any field named "metadata" at depth 1
 */
export function matchesIgnorePattern(path: string, pattern: string): boolean {
  const pathParts = path.split('.')
  const patternParts = pattern.split('.')
  return matchParts(pathParts, 0, patternParts, 0)
}

function matchParts(
  path: string[],
  pi: number,
  pattern: string[],
  qi: number
): boolean {
  // Both exhausted — match
  if (pi === path.length && qi === pattern.length) return true
  // Pattern exhausted but path remains — no match
  if (qi === pattern.length) return false
  // Path exhausted but pattern remains — no match
  if (pi === path.length) return false

  const seg = pattern[qi]

  if (seg === '**') {
    // ** matches zero or more path segments
    // Try matching ** against 0, 1, 2, ... path segments
    for (let skip = 0; skip <= path.length - pi; skip++) {
      if (matchParts(path, pi + skip, pattern, qi + 1)) return true
    }
    return false
  }

  if (seg === '*') {
    // * matches exactly one segment (any value)
    return matchParts(path, pi + 1, pattern, qi + 1)
  }

  // Literal match
  if (path[pi] === seg) {
    return matchParts(path, pi + 1, pattern, qi + 1)
  }

  return false
}

/**
 * Check if a path matches ANY of the given ignore patterns.
 */
function isIgnored(path: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (matchesIgnorePattern(path, pattern)) return true
  }
  return false
}

/**
 * Filter an AnalysisNode tree, removing nodes that match any ignore pattern.
 * Returns a NEW tree (immutable). Recomputes parent token totals from remaining children.
 */
export function filterTree(tree: AnalysisNode, patterns: string[]): AnalysisNode {
  return filterNode(tree, patterns)
}

function filterNode(node: AnalysisNode, patterns: string[]): AnalysisNode {
  // Filter children recursively, skipping ignored ones
  const filteredChildren: AnalysisNode[] = []
  for (const child of node.children) {
    if (isIgnored(child.path, patterns)) continue
    filteredChildren.push(filterNode(child, patterns))
  }

  // If this is a leaf node or no children were removed, return a shallow copy
  if (filteredChildren.length === node.children.length) {
    return { ...node, children: filteredChildren }
  }

  // Recompute token stats from remaining children
  if (filteredChildren.length === 0) {
    // All children removed — zero out this node's stats
    const zeroStats: Stats = { avg: 0, min: 0, max: 0, p50: 0, p95: 0 }
    return {
      ...node,
      children: [],
      tokens: {
        total: zeroStats,
        schema_overhead: 0,
        value_payload: 0,
        null_waste: 0,
      },
      cost: {
        per_instance: 0,
        total_corpus: 0,
      },
    }
  }

  // Sum children stats to recompute parent
  const totalAvg = filteredChildren.reduce((s, c) => s + c.tokens.total.avg, 0)
  const totalMin = filteredChildren.reduce((s, c) => s + c.tokens.total.min, 0)
  const totalMax = filteredChildren.reduce((s, c) => s + c.tokens.total.max, 0)
  const totalP50 = filteredChildren.reduce((s, c) => s + c.tokens.total.p50, 0)
  const totalP95 = filteredChildren.reduce((s, c) => s + c.tokens.total.p95, 0)
  const schemaOverhead = filteredChildren.reduce((s, c) => s + c.tokens.schema_overhead, 0)
  const valuePayload = filteredChildren.reduce((s, c) => s + c.tokens.value_payload, 0)
  const nullWaste = filteredChildren.reduce((s, c) => s + c.tokens.null_waste, 0)
  const costPerInstance = filteredChildren.reduce((s, c) => s + c.cost.per_instance, 0)
  const costTotalCorpus = filteredChildren.reduce((s, c) => s + c.cost.total_corpus, 0)

  return {
    ...node,
    children: filteredChildren,
    tokens: {
      total: {
        avg: totalAvg,
        min: totalMin,
        max: totalMax,
        p50: totalP50,
        p95: totalP95,
      },
      schema_overhead: schemaOverhead,
      value_payload: valuePayload,
      null_waste: nullWaste,
    },
    cost: {
      per_instance: costPerInstance,
      total_corpus: costTotalCorpus,
    },
  }
}

/**
 * Count the number of nodes removed by ignore patterns.
 */
export function countIgnoredFields(tree: AnalysisNode, patterns: string[]): number {
  let count = 0
  function walk(node: AnalysisNode) {
    for (const child of node.children) {
      if (isIgnored(child.path, patterns)) {
        count += countSubtree(child)
      } else {
        walk(child)
      }
    }
  }
  function countSubtree(node: AnalysisNode): number {
    let n = 1
    for (const child of node.children) {
      n += countSubtree(child)
    }
    return n
  }
  walk(tree)
  return count
}

/**
 * Rebuild an AnalysisSummary from a filtered tree.
 */
export function recomputeSummary(
  filteredTree: AnalysisNode,
  pricePerToken: number,
  fileCount: number,
  glob: string,
  model: string,
  tokenizer: string,
  outputPricePer1m: number
): AnalysisSummary {
  const avgTokens = filteredTree.tokens.total.avg
  const costPerInstance = avgTokens * pricePerToken
  const corpusTotalTokens = avgTokens * fileCount
  const corpusTotalCost = costPerInstance * fileCount

  const overhead = filteredTree.tokens.schema_overhead
  const nullWaste = filteredTree.tokens.null_waste
  const overheadRatio = avgTokens > 0 ? overhead / avgTokens : 0
  const nullWasteRatio = avgTokens > 0 ? nullWaste / avgTokens : 0

  return {
    file_count: fileCount,
    glob,
    model,
    tokenizer,
    output_price_per_1m: outputPricePer1m,
    corpus_total_tokens: corpusTotalTokens,
    corpus_total_cost: corpusTotalCost,
    avg_tokens_per_instance: avgTokens,
    cost_per_instance: costPerInstance,
    overhead_ratio: overheadRatio,
    null_waste_ratio: nullWasteRatio,
    cost_at_1k: costPerInstance * 1_000,
    cost_at_10k: costPerInstance * 10_000,
    cost_at_100k: costPerInstance * 100_000,
    cost_at_1m: costPerInstance * 1_000_000,
    top_insights: [],
  }
}
