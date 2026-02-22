import fg from 'fast-glob'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { AnalysisOutput, CliOptions, FileTokens } from './types.ts'
import { inferSchema } from './schemaInference.ts'
import { tokenizeFile, collectValues, getEncoding } from './tokenization.ts'
import { aggregate } from './aggregation.ts'
import { detectInsights } from './insights.ts'
import { calculateCosts } from './costCalculation.ts'
import { getModelPricing } from './pricing.ts'

interface ParsedFile {
  path: string
  parsed: unknown
}

/**
 * Run the full analysis pipeline.
 * Pure function: glob pattern + options in, AnalysisOutput out.
 */
export function runPipeline(options: CliOptions): AnalysisOutput {
  // Resolve tokenizer: if 'auto', derive from model; if custom pricing, default to o200k_base
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

  // Stage 1: File reading
  const files = readFiles(options.glob)

  // Stage 2: Schema inference
  const documents = files.map(f => f.parsed)
  const schema = inferSchema(documents)

  // Stage 3: Tokenization
  const encoding = getEncoding(tokenizerName)
  const perFileTokens: Map<string, FileTokens>[] = []
  const perFileValues: Map<string, unknown[]>[] = []

  for (const file of files) {
    perFileTokens.push(tokenizeFile(file.parsed, schema, encoding))
    perFileValues.push(collectValues(file.parsed, schema))
  }

  // Stage 4: Aggregation
  const tree = aggregate(schema, perFileTokens, perFileValues, options.sampleValues)

  // Stage 5: Cost calculation
  calculateCosts(tree, pricing, files.length)

  // Stage 6: Insights
  const pricePerToken = pricing.output_per_1m / 1_000_000
  const insights = detectInsights(tree, pricePerToken)

  // Build summary
  const avgTokens = tree.tokens.total.avg
  const costPerInstance = avgTokens * pricePerToken
  const totalOverhead = tree.tokens.schema_overhead
  const totalNullWaste = tree.tokens.null_waste

  const summary = {
    file_count: files.length,
    glob: options.glob,
    model: pricing.model_id,
    tokenizer: tokenizerName,
    output_price_per_1m: pricing.output_per_1m,
    avg_tokens_per_instance: avgTokens,
    cost_per_instance: costPerInstance,
    overhead_ratio: avgTokens > 0 ? totalOverhead / avgTokens : 0,
    null_waste_ratio: avgTokens > 0 ? totalNullWaste / avgTokens : 0,
    cost_at_1k: costPerInstance * 1_000,
    cost_at_10k: costPerInstance * 10_000,
    cost_at_100k: costPerInstance * 100_000,
    cost_at_1m: costPerInstance * 1_000_000,
    top_insights: insights.slice(0, 5),
  }

  return {
    schema: 'tokstat/v1',
    summary,
    tree,
    insights,
  }
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
