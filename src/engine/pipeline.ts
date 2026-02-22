import fg from 'fast-glob'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { AnalysisOutput, CohortedOutput, CliOptions, FileTokens, ModelPricing } from './types.ts'
import { inferSchema } from './schemaInference.ts'
import { tokenizeFile, collectValues, getEncoding } from './tokenization.ts'
import { aggregate } from './aggregation.ts'
import { detectInsights } from './insights.ts'
import { calculateCosts } from './costCalculation.ts'
import { getModelPricing } from './pricing.ts'
import { detectCohorts } from './cohorts.ts'
import type { Tiktoken } from 'js-tiktoken'

interface ParsedFile {
  path: string
  parsed: unknown
}

/**
 * Analyze pre-parsed documents through stages 2-6 of the pipeline.
 * Pure function: documents + config in, AnalysisOutput out.
 */
export function analyzeParsedDocuments(
  documents: unknown[],
  pricing: ModelPricing,
  encoding: Tiktoken,
  glob: string,
  sampleValues: number,
): AnalysisOutput {
  // Stage 2: Schema inference
  const schema = inferSchema(documents)

  // Stage 3: Tokenization
  const perFileTokens: Map<string, FileTokens>[] = []
  const perFileValues: Map<string, unknown[]>[] = []

  for (const doc of documents) {
    perFileTokens.push(tokenizeFile(doc, schema, encoding))
    perFileValues.push(collectValues(doc, schema))
  }

  // Stage 4: Aggregation
  const tree = aggregate(schema, perFileTokens, perFileValues, sampleValues)

  // Stage 5: Cost calculation
  calculateCosts(tree, pricing, documents.length)

  // Stage 6: Insights
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

/**
 * Run the full analysis pipeline.
 * Pure function: glob pattern + options in, AnalysisOutput out.
 */
export function runPipeline(options: CliOptions): AnalysisOutput {
  const { pricing, tokenizerName } = resolvePricing(options)
  const files = readFiles(options.glob)
  const documents = files.map(f => f.parsed)
  const encoding = getEncoding(tokenizerName)
  return analyzeParsedDocuments(documents, pricing, encoding, options.glob, options.sampleValues)
}

/**
 * Run the cohorting pipeline: detect cohorts, analyze each + combined.
 */
export function runCohortedPipeline(options: CliOptions): CohortedOutput {
  const { pricing, tokenizerName } = resolvePricing(options)
  const files = readFiles(options.glob)
  const documents = files.map(f => f.parsed)
  const encoding = getEncoding(tokenizerName)

  // Detect cohorts
  const cohorts = detectCohorts(documents)

  // Analyze combined
  const combined = analyzeParsedDocuments(documents, pricing, encoding, options.glob, options.sampleValues)

  // Analyze per cohort
  const per_cohort: Record<string, AnalysisOutput> = {}
  for (const cohort of cohorts) {
    const cohortDocs = cohort.file_indices.map(i => documents[i])
    per_cohort[cohort.id] = analyzeParsedDocuments(
      cohortDocs, pricing, encoding,
      `${options.glob} [${cohort.label}]`,
      options.sampleValues,
    )
  }

  return { schema: 'tokstat/v1', cohorts, combined, per_cohort }
}

function resolvePricing(options: CliOptions): { pricing: ModelPricing; tokenizerName: string } {
  const resolvedTokenizer = options.tokenizer !== 'auto'
    ? options.tokenizer
    : options.costPer1k
      ? 'o200k_base'
      : getModelPricing(options.model).tokenizer

  const pricing = options.costPer1k
    ? {
        model_id: options.model,
        provider: 'custom',
        output_per_1m: options.costPer1k * 1000,
        tokenizer: resolvedTokenizer,
      }
    : getModelPricing(options.model)

  const tokenizerName = options.tokenizer === 'auto' ? pricing.tokenizer : options.tokenizer
  return { pricing, tokenizerName }
}

function readFiles(glob: string): ParsedFile[] {
  const paths = fg.sync(glob).sort()
  if (paths.length === 0) {
    throw new Error(`No files matched glob: "${glob}"`)
  }

  const files: ParsedFile[] = []
  for (const filePath of paths) {
    const absPath = resolve(filePath)
    const content = readFileSync(absPath, 'utf-8')
    const parsed = JSON.parse(content)
    files.push({ path: absPath, parsed })
  }

  return files
}
