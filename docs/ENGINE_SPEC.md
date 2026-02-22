# Engine Spec

The engine is the brain. A pure function: JSON files in, analysis tree out. No DOM, no UI, no side effects. The visualization is a dumb display for the engine's output.

## Pipeline

```
Files (glob) → Parse → Schema Inference → Tokenization → Aggregation → Insights → Output
```

Six stages, each a pure transform. No stage has side effects or depends on the environment.

---

## Stage 1: File Reader

**Input**: Glob pattern (e.g., `./data/**/*.json`)

**Output**: Stream of `{ path: string, content: string, parsed: any }`

- Resolve glob to file paths
- Read and parse each file as JSON
- If a file isn't valid JSON, throw (not skip, not warn — throw)
- Files are processed as a stream — don't load entire corpus into memory
- Preserve file order (alphabetical by path) for deterministic output

---

## Stage 2: Schema Inference

**Input**: Stream of parsed JSON objects

**Output**: `SchemaNode` tree (the unified schema across all files)

Walk every file in the corpus and build a union schema. The schema captures every field that appears in any file, with type and presence tracking.

### SchemaNode

```typescript
interface SchemaNode {
  name: string              // field name ("endpoints", "pmid", etc.)
  path: string              // dotted path from root ("root.endpoints[].endpoint_phrase")
  depth: number             // nesting level (root = 0)

  // Type info
  type: JsonType            // "string" | "number" | "boolean" | "object" | "array" | "null"
  observed_types: Set<JsonType>  // all types seen across corpus (usually 1; >1 = inconsistent)

  // Presence tracking (for fill rate)
  instance_count: number    // how many times this field's parent was instantiated
  present_count: number     // how many times this field was non-null

  // Array tracking
  array_item_counts: number[]  // per-instance item counts (for avg/min/max/p95)

  // Children (objects and array items)
  children: Map<string, SchemaNode>
}
```

### Rules

- **Objects**: Each key becomes a child node. If file A has `{a, b}` and file B has `{b, c}`, the schema has children `{a, b, c}` with different `present_count`.
- **Arrays**: Treated as `array` type with a single virtual child representing the item schema. All items across all instances contribute to the item schema. `array_item_counts` tracks per-instance cardinality.
- **Type conflicts**: If field `x` is a string in one file and a number in another, `observed_types` captures both. `type` is set to the most common type. This is a data quality issue — the engine surfaces it, doesn't hide it.
- **Null values**: Count as "present but null" — the field exists in the schema, the instance count increments, the present count does NOT increment (for fill rate). But the tokenization still counts the cost of emitting `null`.
- **Root**: The root node is an implicit object wrapping the top-level fields. `path = "root"`, `depth = 0`.

### Path Convention

```
root                                   — top level
root.title                             — scalar field
root.endpoints[]                       — array field
root.endpoints[].endpoint_phrase       — field inside array item
root.endpoints[].confidence_interval   — nested object
root.endpoints[].confidence_interval.lower  — field inside nested object
```

`[]` denotes "inside an array item." This path is the stable identity used to key nodes across visualization modes.

---

## Stage 3: Tokenization

**Input**: Stream of parsed JSON objects + `SchemaNode` tree

**Output**: Per-node token accumulation (raw numbers, not yet aggregated)

For each file in the corpus, tokenize the actual JSON the LLM would have generated and attribute tokens to schema nodes.

### Approach

The accurate method: reconstruct the JSON text, tokenize the entire string, then map tokens back to schema nodes via character offsets.

1. **Serialize** the parsed JSON to a minified JSON string (no whitespace — this is what LLM structured output produces).

2. **Build a character offset map**: Walk the parsed JSON recursively. For each field, record the character range in the serialized string that corresponds to:
   - **Key span**: `"field_name":` (opening quote through colon)
   - **Value span**: everything after the colon until the next sibling's key or the closing brace/bracket
   - **Structural chars**: `{`, `}`, `[`, `]`, `,` — attributed to the containing object/array node

3. **Tokenize** the full serialized string with the selected tokenizer encoding (e.g., `o200k_base` for GPT-4o).

4. **Attribute tokens**: For each token, check which character range it falls in. Map it to the corresponding schema node and category:
   - Token overlaps a **key span** → `schema_overhead` on that field's node
   - Token overlaps a **value span** and value is `null` → `null_waste` on that field's node
   - Token overlaps a **value span** and value is non-null → `value_payload` on that field's node
   - Token overlaps a **structural char** → `schema_overhead` on the containing node

5. **Accumulate**: For each schema node, append the per-file totals to a running list: `file_tokens: { total, schema_overhead, value_payload, null_waste }[]`.

### Token boundary crossing

A single token might span a character boundary between two categories (e.g., the token `":` covering the end of a key and the colon). Attribute the full token to whichever category owns the majority of the token's characters. Don't split tokens — the error is negligible and the code stays simple.

### Tokenizer

- Default: `o200k_base` (GPT-4o family)
- Configurable via `--tokenizer` flag
- Use `js-tiktoken` for encoding
- Token count is the primary metric. Dollar cost is derived later.

---

## Stage 4: Aggregation

**Input**: `SchemaNode` tree with per-file token accumulations

**Output**: `AnalysisNode` tree with computed statistics

Transform raw per-file data into the statistics the viz and insights need.

### AnalysisNode

```typescript
interface AnalysisNode {
  // Identity
  name: string
  path: string
  depth: number
  type: JsonType

  // Token statistics
  tokens: {
    total: Stats            // total tokens for this subtree
    schema_overhead: number // avg tokens for structural elements (keys, braces, colons, commas)
    value_payload: number   // avg tokens for actual content
    null_waste: number      // avg tokens for null/empty values
  }

  // Field statistics
  fill_rate: number         // 0–1: present_count / instance_count
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
    value_diversity: number  // unique_values / present_count (0–1)
    unique_count: number     // count of distinct values
  } | null

  // Sample values
  examples: unknown[]       // up to N sampled real values (default 5)

  // Children
  children: AnalysisNode[]

  // Cost (computed after aggregation, per-model)
  cost: {
    per_instance: number    // USD cost for this subtree per generation
    total_corpus: number    // USD cost across entire corpus
  }
}

interface Stats {
  avg: number
  min: number
  max: number
  p50: number
  p95: number
}
```

### Computing Stats

Per-node, we have `file_tokens[].total` — an array of numbers, one per file.

- `avg` = mean
- `min`, `max` = extremes
- `p50`, `p95` = 50th and 95th percentiles (sort and index — exact, not approximate)
- For small corpora (<10K files), store all values and sort. No sketches needed.

### Fill Rate

```
fill_rate = present_count / instance_count
```

Where `instance_count` is how many times the parent object/array was instantiated, and `present_count` is how many of those had a non-null value for this field.

### Value Diversity

For string fields, collect all non-null values during tokenization. Compute:

```
value_diversity = unique_values.size / present_count
```

- 1.0 = every value is unique (high diversity, likely free-form text)
- 0.01 = almost all values are the same (low diversity, likely an implicit enum or boilerplate)

### Example Values

Reservoir sampling during tokenization: collect up to `--sample-values N` (default 5) representative values per field. Prefer diverse examples over random ones.

---

## Stage 5: Insights

**Input**: `AnalysisNode` tree

**Output**: `Insight[]` array attached to the tree

The insights layer computes actionable recommendations from the analysis tree. Each insight is attached to a specific node and quantifies a concrete action with estimated savings.

### Insight

```typescript
interface Insight {
  type: InsightType
  path: string              // schema path of the affected node
  severity: "high" | "medium" | "low"
  message: string           // human-readable one-liner
  detail: string            // longer explanation
  savings_tokens: number    // tokens saved per instance if acted on
  savings_usd_per_10k: number  // dollars saved per 10K generations
}

type InsightType =
  | "null_tax"              // field is mostly null, structural cost is wasted
  | "hollow_object"         // object where overhead > value payload
  | "array_repetition_tax"  // field names repeated across array items
  | "boilerplate"           // string field with low value diversity
  | "length_variance"       // string field with high length variance (p95/p50 > 5)
```

### v1 Insight Detectors

**Null Tax** — For each field where `fill_rate < 0.5`:
```
wasted_tokens = tokens.schema_overhead × (1 - fill_rate) × instance_count
savings_per_instance = tokens.schema_overhead × (1 - fill_rate) + tokens.null_waste
```
Message: `"{name} is null {pct}% of the time. Making it optional saves {n} tok/instance."`

**Hollow Object** — For each object node where `tokens.schema_overhead / tokens.total.avg > 0.7`:
Message: `"{name} is {pct}% structural overhead. {n} of {m} tokens are field names and braces."`

**Array Key Repetition Tax** — For each array node:
```
per_item_key_cost = sum(child.tokens.schema_overhead for child in children)
repetition_tax = per_item_key_cost × (array_stats.avg_items - 1)
```
Message: `"Field names in {name} repeat {n}x per instance, costing {m} tokens in repetition."`

**Boilerplate** — For each string field where `string_stats.value_diversity < 0.1` and `fill_rate > 0.5`:
Message: `"{name} has {n} unique values across {m} instances. Consider replacing with an enum."`

**Length Variance** — For each string field where `p95 / p50 > 5`:
Message: `"{name} length varies {n}x (p50: {a} tok, p95: {b} tok). Consider adding length guidance."`

### Insight Ranking

Sort all insights by `savings_tokens` descending. The top N appear in the summary bar. All appear in the insights panel.

---

## Stage 6: Cost Calculation

**Input**: `AnalysisNode` tree + model pricing

**Output**: Populated `cost` on every node

### Pricing Table

Bundled, updatable. Each entry:

```typescript
interface ModelPricing {
  model_id: string          // "gpt-4o", "claude-sonnet-4-5", etc.
  provider: string          // "openai", "anthropic", "google"
  output_per_1m: number     // USD per 1M output tokens
  tokenizer: string         // encoding name ("o200k_base", "cl100k_base")
}
```

### Calculation

```
node.cost.per_instance = node.tokens.total.avg × (pricing.output_per_1m / 1_000_000)
node.cost.total_corpus = node.cost.per_instance × corpus_file_count
```

Cost is computed per-node after aggregation, so the entire tree has cost attribution.

---

## Top-Level Summary

Computed from the root node and the insights array.

```typescript
interface AnalysisSummary {
  // Corpus info
  file_count: number
  glob: string

  // Model info
  model: string
  tokenizer: string
  output_price_per_1m: number

  // Headline numbers
  avg_tokens_per_instance: number
  cost_per_instance: number
  overhead_ratio: number          // schema_overhead / total (the hero number)
  null_waste_ratio: number        // null_waste / total

  // Scale projections
  cost_at_1k: number
  cost_at_10k: number
  cost_at_100k: number
  cost_at_1m: number

  // Top insights (by savings)
  top_insights: Insight[]         // top 5 by savings_tokens
}
```

The `overhead_ratio` is the headline number the brainstorm identified — "Your schema is 41% overhead." It's the first thing the user sees.

---

## Output Formats

### Interactive (default)

1. Compute the full `AnalysisNode` tree + `AnalysisSummary` + `Insight[]`
2. Serialize to JSON
3. Embed in a self-contained HTML file as `<script id="tokstat-data" type="application/json">`
4. Bundle the compiled Svelte app + D3 into the same HTML
5. Open in browser (or write to `--out` path)

### JSON (`--format json`)

Write the raw output:

```json
{
  "schema": "tokstat/v1",
  "summary": { ... },
  "tree": { ... },
  "insights": [ ... ]
}
```

### LLM (`--format llm`)

Generate token-efficient text optimized for pasting into an LLM conversation:

```
tokstat analysis: 551 files, gpt-4o (o200k_base)

HEADLINE: $0.0092/instance, 41% schema overhead, 18% null waste

TOP SAVINGS:
  1. endpoints[].mechanism_of_action — null 78%, saves 34 tok/inst ($412/10K)
  2. adverse_events[].severity_grading — null 88%, saves 28 tok/inst ($340/10K)
  3. endpoints[] array keys repeat 4.2x — 380 tok overhead/inst ($462/10K)

SCHEMA OVERHEAD HOTSPOTS:
  endpoints[] items: 12 field names × 4.2 avg items = 50.4 key emissions/inst
  population object: 8 field names, 73% overhead ratio

HIGH WASTE (low fill, high cost):
  adverse_events[].severity_grading — 28 tok avg, 12% fill
  drug_interactions[].evidence_level — 22 tok avg, 8% fill

BOILERPLATE:
  study_design_description — 12 unique values across 551 instances (diversity: 0.02)
```

---

## CLI Interface

```
tokstat <glob> [options]

Arguments:
  glob                    Glob pattern for JSON files

Options:
  --model <model>         Model for cost estimation (default: gpt-4o)
  --format <fmt>          Output: interactive (default), json, llm
  --tokenizer <enc>       Tokenizer encoding (default: auto from model)
  --out <path>            Write to file instead of stdout/browser
  --port <port>           Dev server port (default: 3742)
  --no-open               Don't auto-open browser
  --cost-per-1k <n>       Custom output token price per 1K tokens
  --sample-values <n>     Example values per field (default: 5)
```

---

## Performance

For a corpus of 1,000 files averaging 5KB each:

- **File reading**: Stream, don't batch. ~5MB total, trivial.
- **Schema inference**: Single pass, incremental union. O(files × fields).
- **Tokenization**: One `tiktoken.encode()` per file. The tokenizer is the bottleneck — ~1ms per file for 5KB. 1,000 files ≈ 1 second.
- **Aggregation**: Sort per-node arrays for percentiles. O(files × log(files)) per node. Trivial.
- **Total**: Under 5 seconds for 1,000 files. Under 30 seconds for 10,000 files.

No parallelism needed for v1. The tokenizer is synchronous and fast.

---

## Testing Strategy

The engine is pure functions — every stage is independently testable.

### Unit tests per stage

- **File reader**: Valid JSON parses. Invalid JSON throws. Glob resolves correctly.
- **Schema inference**: Union of two different schemas produces correct merged tree. Array items merge. Nulls tracked. Type conflicts recorded.
- **Tokenization**: Known JSON string → known token count. Schema/value/null attribution matches manual calculation. Character offset mapping is correct.
- **Aggregation**: Known input arrays → correct avg/min/max/p50/p95. Fill rate computed correctly.
- **Insights**: Known tree shape → correct insight detection. Null tax computes correct savings. Boilerplate detection fires at right threshold.
- **Cost**: Known token count × known price = correct dollar amount.

### Integration tests

- Small fixture corpus → full pipeline → verify output JSON schema.
- Compare engine output to manual token count of a single file.
- Verify self-contained HTML embeds data correctly.

### Fixture corpora

See `/generate-fixtures` skill for creating test data with controlled properties.
