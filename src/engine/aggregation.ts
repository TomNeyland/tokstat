import type { SchemaNode, AnalysisNode, Stats, FileTokens } from './types.ts'

// ── Stats computation ────────────────────────────────────────────────────────

function computeStats(values: number[]): Stats {
  if (values.length === 0) {
    return { avg: 0, min: 0, max: 0, p50: 0, p95: 0 }
  }

  const sorted = [...values].sort((a, b) => a - b)
  const sum = sorted.reduce((a, b) => a + b, 0)

  return {
    avg: sum / sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0]
  const idx = (p / 100) * (sorted.length - 1)
  const lower = Math.floor(idx)
  const upper = Math.ceil(idx)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower)
}

// ── Aggregation ──────────────────────────────────────────────────────────────

/**
 * Aggregate per-file token data and value samples into an AnalysisNode tree.
 *
 * @param schema - The inferred schema tree
 * @param perFileTokens - Array of per-file token maps (path -> FileTokens)
 * @param perFileValues - Array of per-file value maps (path -> values[])
 * @param sampleCount - Max example values to keep per node
 */
export function aggregate(
  schema: SchemaNode,
  perFileTokens: Map<string, FileTokens>[],
  perFileValues: Map<string, unknown[]>[],
  sampleCount: number,
): AnalysisNode {
  // Flatten all values per path across files
  const allValues = new Map<string, unknown[]>()
  for (const fileValues of perFileValues) {
    for (const [path, values] of fileValues) {
      let arr = allValues.get(path)
      if (!arr) {
        arr = []
        allValues.set(path, arr)
      }
      arr.push(...values)
    }
  }

  return aggregateNode(schema, perFileTokens, allValues, sampleCount)
}

function aggregateNode(
  schema: SchemaNode,
  perFileTokens: Map<string, FileTokens>[],
  allValues: Map<string, unknown[]>,
  sampleCount: number,
): AnalysisNode {
  const path = schema.path

  // Collect per-file totals for this node's subtree
  const fileTotals: number[] = []
  const fileOverheads: number[] = []
  const filePayloads: number[] = []
  const fileNullWastes: number[] = []

  for (const fileTokenMap of perFileTokens) {
    // Sum tokens for this node and all descendants
    const subtreeTokens = sumSubtree(schema, fileTokenMap)
    fileTotals.push(subtreeTokens.total)
    fileOverheads.push(subtreeTokens.schema_overhead)
    filePayloads.push(subtreeTokens.value_payload)
    fileNullWastes.push(subtreeTokens.null_waste)
  }

  // Token stats
  const totalStats = computeStats(fileTotals)
  const avgOverhead = avg(fileOverheads)
  const avgPayload = avg(filePayloads)
  const avgNullWaste = avg(fileNullWastes)

  // Fill rate
  const fillRate = schema.instance_count > 0
    ? schema.present_count / schema.instance_count
    : 0

  // Array stats
  let arrayStats: AnalysisNode['array_stats'] = null
  if (schema.type === 'array' && schema.array_item_counts.length > 0) {
    const counts = schema.array_item_counts
    const sorted = [...counts].sort((a, b) => a - b)
    arrayStats = {
      avg_items: avg(counts),
      min_items: sorted[0],
      max_items: sorted[sorted.length - 1],
      p95_items: percentile(sorted, 95),
    }
  }

  // String stats
  let stringStats: AnalysisNode['string_stats'] = null
  const values = allValues.get(path)
  if (schema.type === 'string' && values && values.length > 0) {
    const stringValues = values.filter((v): v is string => typeof v === 'string')
    if (stringValues.length > 0) {
      const uniqueSet = new Set(stringValues)
      const totalLength = stringValues.reduce((sum, s) => sum + s.length, 0)
      stringStats = {
        avg_length: totalLength / stringValues.length,
        value_diversity: uniqueSet.size / stringValues.length,
        unique_count: uniqueSet.size,
      }
    }
  }

  // Example values: reservoir sample
  const examples = sampleValues(values, sampleCount)

  // Children
  const children: AnalysisNode[] = []
  for (const childSchema of schema.children.values()) {
    children.push(aggregateNode(childSchema, perFileTokens, allValues, sampleCount))
  }

  return {
    name: schema.name,
    path: schema.path,
    depth: schema.depth,
    type: schema.type,
    tokens: {
      total: totalStats,
      schema_overhead: avgOverhead,
      value_payload: avgPayload,
      null_waste: avgNullWaste,
    },
    fill_rate: fillRate,
    instance_count: schema.instance_count,
    array_stats: arrayStats,
    string_stats: stringStats,
    examples,
    children,
    cost: {
      per_instance: 0, // filled in by cost calculation stage
      total_corpus: 0,
    },
  }
}

/**
 * Sum tokens for a schema node and all its descendants from a single file's token map.
 */
function sumSubtree(schema: SchemaNode, fileTokenMap: Map<string, FileTokens>): FileTokens {
  const self = fileTokenMap.get(schema.path)
  let total = self ? self.total : 0
  let schema_overhead = self ? self.schema_overhead : 0
  let value_payload = self ? self.value_payload : 0
  let null_waste = self ? self.null_waste : 0

  for (const child of schema.children.values()) {
    const childTokens = sumSubtree(child, fileTokenMap)
    total += childTokens.total
    schema_overhead += childTokens.schema_overhead
    value_payload += childTokens.value_payload
    null_waste += childTokens.null_waste
  }

  return { total, schema_overhead, value_payload, null_waste }
}

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function sampleValues(values: unknown[] | undefined, maxCount: number): unknown[] {
  if (!values || values.length === 0) return []
  if (values.length <= maxCount) return [...values]

  // Reservoir sampling for diverse examples
  const reservoir: unknown[] = values.slice(0, maxCount)
  for (let i = maxCount; i < values.length; i++) {
    const j = Math.floor(Math.random() * (i + 1))
    if (j < maxCount) {
      reservoir[j] = values[i]
    }
  }
  return reservoir
}
