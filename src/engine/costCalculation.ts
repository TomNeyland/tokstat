import type { AnalysisNode, ModelPricing } from './types.ts'

/**
 * Walk the analysis tree and populate cost on every node.
 * Mutates the tree in place.
 */
export function calculateCosts(
  tree: AnalysisNode,
  pricing: ModelPricing,
  fileCount: number,
): void {
  const pricePerToken = pricing.output_per_1m / 1_000_000

  walkAndComputeCost(tree, pricePerToken, fileCount)
}

function walkAndComputeCost(
  node: AnalysisNode,
  pricePerToken: number,
  fileCount: number,
): void {
  node.cost = {
    per_instance: node.tokens.total.avg * pricePerToken,
    total_corpus: node.tokens.total.avg * pricePerToken * fileCount,
  }

  for (const child of node.children) {
    walkAndComputeCost(child, pricePerToken, fileCount)
  }
}
