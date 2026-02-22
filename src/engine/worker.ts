import { inferSchema } from './schemaInference.ts'
import { tokenizeFile, collectValues, getEncoding } from './tokenization.ts'
import { aggregate } from './aggregation.ts'
import { detectInsights } from './insights.ts'
import { calculateCosts } from './costCalculation.ts'
import { getModelPricing } from './pricing.ts'
import { detectCohorts } from './cohorts.ts'
import type { AnalysisOutput, CohortedOutput, FileTokens, ModelPricing } from './types.ts'
import type { Tiktoken } from 'js-tiktoken'

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
  data: CohortedOutput
}

export type WorkerMessage = ProgressMessage | ResultMessage

self.onmessage = (e: MessageEvent<WorkerInput>) => {
  const { files, model } = e.data
  const pricing = getModelPricing(model)
  const encoding = getEncoding(pricing.tokenizer)

  // Parse all files
  const documents = files.map(f => JSON.parse(f.content))

  // Detect cohorts
  const cohorts = detectCohorts(documents)

  // Total tokenization passes: combined + per-cohort
  const totalPasses = documents.length * (1 + cohorts.length)
  let progress = 0

  function reportProgress() {
    progress++
    self.postMessage({ type: 'progress', filesProcessed: progress, totalFiles: totalPasses } satisfies ProgressMessage)
  }

  // Analyze combined
  const combined = analyzeDocuments(documents, pricing, encoding, `${files.length} uploaded files`, reportProgress)

  // Analyze per cohort
  const per_cohort: Record<string, AnalysisOutput> = {}
  for (const cohort of cohorts) {
    const cohortDocs = cohort.file_indices.map(i => documents[i])
    per_cohort[cohort.id] = analyzeDocuments(
      cohortDocs, pricing, encoding,
      `${cohort.label} (${cohort.file_count} files)`,
      reportProgress,
    )
  }

  const result: CohortedOutput = { schema: 'tokstat/v1', cohorts, combined, per_cohort }
  self.postMessage({ type: 'result', data: result } satisfies ResultMessage)
}

function analyzeDocuments(
  documents: unknown[],
  pricing: ModelPricing,
  encoding: Tiktoken,
  glob: string,
  onFileProcessed: () => void,
): AnalysisOutput {
  // Schema inference
  const schema = inferSchema(documents)

  // Tokenization with progress
  const perFileTokens: Map<string, FileTokens>[] = []
  const perFileValues: Map<string, unknown[]>[] = []

  for (const doc of documents) {
    perFileTokens.push(tokenizeFile(doc, schema, encoding))
    perFileValues.push(collectValues(doc, schema))
    onFileProcessed()
  }

  // Aggregation
  const tree = aggregate(schema, perFileTokens, perFileValues, 5)

  // Cost calculation
  calculateCosts(tree, pricing, documents.length)

  // Insights
  const pricePerToken = pricing.output_per_1m / 1_000_000
  const insights = detectInsights(tree, pricePerToken)

  // Build summary
  const avgTokens = tree.tokens.total.avg
  const costPerInstance = avgTokens * pricePerToken

  const summary = {
    file_count: documents.length,
    glob,
    model: pricing.model_id,
    tokenizer: pricing.tokenizer,
    output_price_per_1m: pricing.output_per_1m,
    corpus_total_tokens: avgTokens * documents.length,
    corpus_total_cost: costPerInstance * documents.length,
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

  return { schema: 'tokstat/v1', summary, tree, insights }
}
