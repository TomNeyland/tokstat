// ── JSON Types ──────────────────────────────────────────────────────────────

export type JsonType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null'

// ── Schema Inference ────────────────────────────────────────────────────────

export interface SchemaNode {
  name: string              // field name ("endpoints", "pmid", etc.)
  path: string              // dotted path from root ("root.endpoints[].endpoint_phrase")
  depth: number             // nesting level (root = 0)

  // Type info
  type: JsonType            // most common observed type
  observed_types: Set<JsonType>  // all types seen across corpus

  // Presence tracking (for fill rate)
  instance_count: number    // how many times this field's parent was instantiated
  present_count: number     // how many times this field was non-null

  // Array tracking
  array_item_counts: number[]  // per-instance item counts (for avg/min/max/p95)

  // Children (objects and array items)
  children: Map<string, SchemaNode>
}

// ── Tokenization ────────────────────────────────────────────────────────────

export interface FileTokens {
  total: number
  schema_overhead: number
  value_payload: number
  null_waste: number
}

export interface CharSpan {
  start: number
  end: number
  path: string             // schema node path this span belongs to
  category: 'key' | 'value' | 'null_value' | 'structural'
}

// ── Aggregation ─────────────────────────────────────────────────────────────

export interface Stats {
  avg: number
  min: number
  max: number
  p50: number
  p95: number
}

export interface AnalysisNode {
  // Identity
  name: string
  path: string
  depth: number
  type: JsonType

  // Token statistics
  tokens: {
    total: Stats            // total tokens for this subtree
    schema_overhead: number // avg tokens for structural elements
    value_payload: number   // avg tokens for actual content
    null_waste: number      // avg tokens for null/empty values
  }

  // Field statistics
  fill_rate: number         // 0-1: present_count / instance_count
  instance_count: number    // total instances across corpus

  // Array stats (only for type === "array")
  array_stats: {
    avg_items: number
    min_items: number
    max_items: number
    p95_items: number
  } | null

  // String stats (only for type === "string")
  string_stats: {
    avg_length: number       // avg character length of values
    value_diversity: number  // unique_values / present_count (0-1)
    unique_count: number     // count of distinct values
  } | null

  // Sample values
  examples: unknown[]       // up to N sampled real values

  // Children
  children: AnalysisNode[]

  // Cost (computed after aggregation, per-model)
  cost: {
    per_instance: number    // USD cost for this subtree per generation
    total_corpus: number    // USD cost across entire corpus
  }
}

// ── Insights ────────────────────────────────────────────────────────────────

export type InsightType =
  | 'null_tax'              // field is mostly null, structural cost wasted
  | 'hollow_object'         // object where overhead > value payload
  | 'array_repetition_tax'  // field names repeated across array items
  | 'boilerplate'           // string field with low value diversity
  | 'length_variance'       // string field with high length variance

export type InsightSeverity = 'high' | 'medium' | 'low'

export interface Insight {
  type: InsightType
  path: string              // schema path of the affected node
  severity: InsightSeverity
  message: string           // human-readable one-liner
  detail: string            // longer explanation
  savings_tokens: number    // tokens saved per instance if acted on
  savings_usd_per_10k: number  // dollars saved per 10K generations
}

// ── Cost ────────────────────────────────────────────────────────────────────

export interface ModelPricing {
  model_id: string          // "gpt-4o", "claude-sonnet-4-5", etc.
  provider: string          // "openai", "anthropic", "google"
  output_per_1m: number     // USD per 1M output tokens
  tokenizer: string         // encoding name ("o200k_base", "cl100k_base")
}

// ── Summary ─────────────────────────────────────────────────────────────────

export interface AnalysisSummary {
  // Corpus info
  file_count: number
  glob: string

  // Model info
  model: string
  tokenizer: string
  output_price_per_1m: number

  // Corpus totals
  corpus_total_tokens: number     // avg_tokens_per_instance * file_count
  corpus_total_cost: number       // cost_per_instance * file_count

  // Headline numbers
  avg_tokens_per_instance: number
  cost_per_instance: number
  overhead_ratio: number          // schema_overhead / total
  null_waste_ratio: number        // null_waste / total

  // Scale projections
  cost_at_1k: number
  cost_at_10k: number
  cost_at_100k: number
  cost_at_1m: number

  // Top insights (by savings)
  top_insights: Insight[]         // top 5 by savings_tokens
}

// ── Pipeline Output ─────────────────────────────────────────────────────────

export interface AnalysisOutput {
  schema: 'tokstat/v1'
  summary: AnalysisSummary
  tree: AnalysisNode
  insights: Insight[]
}

// ── CLI Options ─────────────────────────────────────────────────────────────

export interface CliOptions {
  glob: string
  model: string
  format: 'interactive' | 'json' | 'llm'
  tokenizer: string
  out: string | null
  port: number
  noOpen: boolean
  costPer1k: number | null
  sampleValues: number
}
