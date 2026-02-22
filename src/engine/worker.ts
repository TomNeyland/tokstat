import { inferSchema } from './schemaInference.ts'
import { tokenizeFile, collectValues, getEncoding } from './tokenization.ts'
import { aggregate } from './aggregation.ts'
import { detectInsights } from './insights.ts'
import { calculateCosts } from './costCalculation.ts'
import { getModelPricing } from './pricing.ts'
import type { AnalysisOutput, FileTokens } from './types.ts'

interface WorkerInput {
  files: { name: string; content: string }[]
  model: string
}

interface ProgressMessage {
  type: 'progress'
  filesProcessed: number
  totalFiles: number
}

interface ResultMessage {
  type: 'result'
  data: AnalysisOutput
}

export type WorkerMessage = ProgressMessage | ResultMessage

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { files, model } = e.data
  const pricing = getModelPricing(model)
  const encoding = getEncoding(pricing.tokenizer)

  // Parse all files
  const parsed = files.map(f => ({ path: f.name, parsed: JSON.parse(f.content) }))

  // Schema inference
  const schema = inferSchema(parsed.map(p => p.parsed))

  // Tokenization with progress
  const perFileTokens: Map<string, FileTokens>[] = []
  const perFileValues: Map<string, unknown[]>[] = []

  for (let i = 0; i < parsed.length; i++) {
    perFileTokens.push(tokenizeFile(parsed[i].parsed, schema, encoding))
    perFileValues.push(collectValues(parsed[i].parsed, schema))
    self.postMessage({ type: 'progress', filesProcessed: i + 1, totalFiles: files.length } satisfies ProgressMessage)
  }

  // Aggregation
  const tree = aggregate(schema, perFileTokens, perFileValues, 5)

  // Cost calculation
  calculateCosts(tree, pricing, files.length)

  // Insights
  const pricePerToken = pricing.output_per_1m / 1_000_000
  const insights = detectInsights(tree, pricePerToken)

  // Build summary
  const avgTokens = tree.tokens.total.avg
  const costPerInstance = avgTokens * pricePerToken

  const summary = {
    file_count: files.length,
    glob: `${files.length} uploaded files`,
    model: pricing.model_id,
    tokenizer: pricing.tokenizer,
    output_price_per_1m: pricing.output_per_1m,
    corpus_total_tokens: avgTokens * files.length,
    corpus_total_cost: costPerInstance * files.length,
    avg_tokens_per_instance: avgTokens,
    cost_per_instance: costPerInstance,
    overhead_ratio: avgTokens > 0 ? tree.tokens.schema_overhead / avgTokens : 0,
    null_waste_ratio: avgTokens > 0 ? tree.tokens.null_waste / avgTokens : 0,
    cost_at_1k: costPerInstance * 1_000,
    cost_at_10k: costPerInstance * 10_000,
    cost_at_100k: costPerInstance * 100_000,
    cost_at_1m: costPerInstance * 1_000_000,
    top_insights: insights.slice(0, 5),
  }

  const result: AnalysisOutput = { schema: 'tokstat/v1', summary, tree, insights }
  self.postMessage({ type: 'result', data: result } satisfies ResultMessage)
}
