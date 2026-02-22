// @ts-nocheck
const DEFAULT_MODEL_PRICING = {
  'gpt-5-mini': { model_id: 'gpt-5-mini', provider: 'openai', output_per_1m: 2, tokenizer: 'o200k_base' },
  'gpt-4o': { model_id: 'gpt-4o', provider: 'openai', output_per_1m: 15, tokenizer: 'o200k_base' },
  'gpt-4o-mini': { model_id: 'gpt-4o-mini', provider: 'openai', output_per_1m: 0.6, tokenizer: 'o200k_base' },
  'claude-sonnet': { model_id: 'claude-sonnet', provider: 'anthropic', output_per_1m: 15, tokenizer: 'cl100k_base' },
  'claude-haiku': { model_id: 'claude-haiku', provider: 'anthropic', output_per_1m: 1.25, tokenizer: 'cl100k_base' },
}

const ZERO_BREAKDOWN = Object.freeze({ schema: 0, value: 0, null: 0 })

export function getDefaultPricingTable() {
  return { ...DEFAULT_MODEL_PRICING }
}

export function analyzeRecords(records, options = {}) {
  const {
    glob = null,
    model = 'gpt-5-mini',
    tokenizer = null,
    costPer1k = null,
    sampleValues = 5,
    ignorePatterns = [],
  } = options

  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('No JSON records provided')
  }

  const pricing = resolvePricing({ model, tokenizer, costPer1k })
  const shouldIgnorePath = createIgnoreMatcher(ignorePatterns)
  const schemaRoot = createSchemaNode('root', 'root', 0)
  schemaRoot.present_count = records.length
  schemaRoot.seen_count = records.length

  for (const record of records) {
    const parsed = record.parsed
    if (!isPlainObject(parsed)) {
      throw new Error(`Top-level JSON must be an object (${record.path})`)
    }
    observeObjectShape(schemaRoot, parsed, sampleValues, shouldIgnorePath)
  }

  for (const node of walkSchema(schemaRoot)) {
    node._series = {
      total: [],
      schema: [],
      value: [],
      null: [],
    }
  }

  for (const record of records) {
    const directMap = new Map()
    measureRootObject(record.parsed, schemaRoot, directMap, shouldIgnorePath)
    foldFileTotals(schemaRoot, directMap)
  }

  const analysisRoot = buildAnalysisTree(schemaRoot, {
    fileCount: records.length,
    pricing,
    parentInstances: records.length,
    isRoot: true,
  })

  const insights = collectInsights(analysisRoot, pricing)
  const summary = buildSummary({
    root: analysisRoot,
    insights,
    fileCount: records.length,
    glob,
    pricing,
  })

  return {
    schema: 'tokstat/v1',
    summary,
    tree: analysisRoot,
    insights,
    meta: {
      model: pricing.model_id,
      tokenizer: pricing.tokenizer,
      output_price_per_1m: pricing.output_per_1m,
    },
  }
}

function resolvePricing({ model, tokenizer, costPer1k }) {
  const base = DEFAULT_MODEL_PRICING[model] ?? {
    model_id: model,
    provider: 'custom',
    output_per_1m: 15,
    tokenizer: 'approx_json_lex',
  }
  let output_per_1m = base.output_per_1m
  if (costPer1k != null) {
    output_per_1m = Number(costPer1k) * 1000
    if (!Number.isFinite(output_per_1m) || output_per_1m < 0) {
      throw new Error(`Invalid --cost-per-1k value: ${costPer1k}`)
    }
  }
  return {
    ...base,
    output_per_1m,
    tokenizer: tokenizer ?? base.tokenizer,
  }
}

function createSchemaNode(name, path, depth) {
  return {
    name,
    path,
    depth,
    observed_type_counts: new Map(),
    present_count: 0,
    seen_count: 0,
    array_item_counts: [],
    array_object_item_count: 0,
    children: new Map(),
    string_lengths: [],
    unique_values: new Map(),
    examples: [],
    _series: null,
  }
}

function ensureArrayPathSuffix(node) {
  if (node.path.endsWith('[]')) {
    return
  }
  node.path = `${node.path}[]`
  for (const child of node.children.values()) {
    rebaseChildPath(child, node.path)
  }
}

function rebaseChildPath(node, parentPath) {
  node.path = `${parentPath}.${node.name}`
  if (node.observed_type_counts.get('array')) {
    node.path = `${node.path}[]`
  }
  for (const child of node.children.values()) {
    rebaseChildPath(child, node.path)
  }
}

function observeType(node, type) {
  node.observed_type_counts.set(type, (node.observed_type_counts.get(type) ?? 0) + 1)
}

function observeObjectShape(node, objectValue, sampleValues, shouldIgnorePath) {
  observeType(node, 'object')
  observeObjectFields(node, objectValue, sampleValues, shouldIgnorePath)
}

function observeObjectFields(node, objectValue, sampleValues, shouldIgnorePath) {
  const keys = Object.keys(objectValue)
  for (const key of keys) {
    const childValue = objectValue[key]
    const childPath = `${node.path}.${key}`
    if (shouldIgnorePath(childPath)) {
      continue
    }
    let child = node.children.get(key)
    if (!child) {
      child = createSchemaNode(key, childPath, node.depth + 1)
      node.children.set(key, child)
    }
    child.seen_count += 1
    const childType = getJsonType(childValue)
    observeType(child, childType)
    if (childType === 'array') {
      ensureArrayPathSuffix(child)
    }
    if (childValue !== null) {
      child.present_count += 1
    }
    observeShapeForValue(child, childValue, sampleValues, shouldIgnorePath)
  }
}

function observeShapeForValue(node, value, sampleValues, shouldIgnorePath) {
  const type = getJsonType(value)
  if (value === null) {
    return
  }

  if (type === 'string') {
    node.string_lengths.push(value.length)
    node.unique_values.set(value, (node.unique_values.get(value) ?? 0) + 1)
    pushExample(node, value, sampleValues)
    return
  }

  if (type === 'number' || type === 'boolean') {
    pushExample(node, value, sampleValues)
    return
  }

  if (type === 'object') {
    pushExample(node, summarizeExample(value), sampleValues)
    observeObjectShape(node, value, sampleValues, shouldIgnorePath)
    return
  }

  if (type === 'array') {
    node.array_item_counts.push(value.length)
    pushExample(node, summarizeExample(value), sampleValues)
    for (const item of value) {
      if (isPlainObject(item)) {
        node.array_object_item_count += 1
        observeObjectFields(node, item, sampleValues, shouldIgnorePath)
      }
      else if (Array.isArray(item)) {
        observeType(node, 'array')
      }
      else if (typeof item === 'string') {
        node.string_lengths.push(item.length)
      }
    }
  }
}

function pushExample(node, value, limit) {
  if (limit <= 0) {
    return
  }
  const encoded = stableStringify(value)
  for (const existing of node.examples) {
    if (stableStringify(existing) === encoded) {
      return
    }
  }
  if (node.examples.length < limit) {
    node.examples.push(value)
  }
}

function measureRootObject(objectValue, rootNode, directMap, shouldIgnorePath) {
  ensureDirect(directMap, rootNode.path)
  addSchema(directMap, rootNode.path, '{')
  const keys = Object.keys(objectValue).filter((key) => !shouldIgnorePath(`${rootNode.path}.${key}`))
  keys.forEach((key, index) => {
    if (index > 0) {
      addSchema(directMap, rootNode.path, ',')
    }
    measureField(rootNode, key, objectValue[key], directMap, shouldIgnorePath)
  })
  addSchema(directMap, rootNode.path, '}')
}

function measureField(parentNode, key, value, directMap, shouldIgnorePath) {
  const child = parentNode.children.get(key)
  if (!child) {
    throw new Error(`Schema mismatch: missing child ${parentNode.path}.${key}`)
  }
  ensureDirect(directMap, child.path)
  addSchema(directMap, child.path, `${JSON.stringify(key)}:`)
  measureNamedValue(child, value, directMap, shouldIgnorePath)
}

function measureNamedValue(node, value, directMap, shouldIgnorePath) {
  if (value === null) {
    addNull(directMap, node.path, 'null')
    return
  }

  if (typeof value === 'string') {
    addValue(directMap, node.path, JSON.stringify(value))
    return
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    addValue(directMap, node.path, JSON.stringify(value))
    return
  }

  if (Array.isArray(value)) {
    measureArrayValue(node, value, directMap, shouldIgnorePath)
    return
  }

  if (isPlainObject(value)) {
    measureObjectValue(node, value, directMap, shouldIgnorePath)
    return
  }

  addValue(directMap, node.path, JSON.stringify(String(value)))
}

function measureObjectValue(node, objectValue, directMap, shouldIgnorePath) {
  addSchema(directMap, node.path, '{')
  const keys = Object.keys(objectValue).filter((key) => !shouldIgnorePath(`${node.path}.${key}`))
  keys.forEach((key, index) => {
    if (index > 0) {
      addSchema(directMap, node.path, ',')
    }
    measureField(node, key, objectValue[key], directMap, shouldIgnorePath)
  })
  addSchema(directMap, node.path, '}')
}

function measureArrayValue(node, arrayValue, directMap, shouldIgnorePath) {
  addSchema(directMap, node.path, '[')
  arrayValue.forEach((item, index) => {
    if (index > 0) {
      addSchema(directMap, node.path, ',')
    }
    if (item === null) {
      addNull(directMap, node.path, 'null')
      return
    }
    if (isPlainObject(item)) {
      // The item object has no standalone schema path. Attribute its structure to the array node,
      // but attribute named fields inside the item to array children (e.g. root.items[].field).
      addSchema(directMap, node.path, '{')
        const keys = Object.keys(item)
          .filter((key) => !shouldIgnorePath(`${node.path}.${key}`))
        keys.forEach((key, keyIndex) => {
          if (keyIndex > 0) {
            addSchema(directMap, node.path, ',')
          }
        measureField(node, key, item[key], directMap, shouldIgnorePath)
        })
      addSchema(directMap, node.path, '}')
      return
    }
    if (Array.isArray(item)) {
      // Nested arrays inside arrays are attributed to the parent array node in v1.
      addValue(directMap, node.path, JSON.stringify(item))
      return
    }
    addValue(directMap, node.path, JSON.stringify(item))
  })
  addSchema(directMap, node.path, ']')
}

function ensureDirect(directMap, path) {
  let current = directMap.get(path)
  if (!current) {
    current = { schema: 0, value: 0, null: 0 }
    directMap.set(path, current)
  }
  return current
}

function addSchema(directMap, path, text) {
  ensureDirect(directMap, path).schema += estimateTokens(text)
}

function addValue(directMap, path, text) {
  ensureDirect(directMap, path).value += estimateTokens(text)
}

function addNull(directMap, path, text) {
  ensureDirect(directMap, path).null += estimateTokens(text)
}

function foldFileTotals(schemaNode, directMap) {
  const direct = directMap.get(schemaNode.path) ?? ZERO_BREAKDOWN
  let schema = direct.schema
  let value = direct.value
  let nul = direct.null

  for (const child of schemaNode.children.values()) {
    const subtotal = foldFileTotals(child, directMap)
    schema += subtotal.schema
    value += subtotal.value
    nul += subtotal.null
  }

  schemaNode._series.schema.push(schema)
  schemaNode._series.value.push(value)
  schemaNode._series.null.push(nul)
  schemaNode._series.total.push(schema + value + nul)

  return { schema, value, null: nul }
}

function buildAnalysisTree(schemaNode, context) {
  const { fileCount, pricing, parentInstances, isRoot = false } = context
  const type = isRoot ? 'object' : resolveDominantType(schemaNode)
  const instanceCount = isRoot ? fileCount : parentInstances
  const fillRate = isRoot ? 1 : safeDiv(schemaNode.present_count, instanceCount)

  const childInstances =
    schemaNode.path === 'root'
      ? fileCount
      : type === 'object'
        ? schemaNode.present_count
        : type === 'array'
          ? schemaNode.array_object_item_count
          : 0

  const children = sortNodes(Array.from(schemaNode.children.values())).map((child) =>
    buildAnalysisTree(child, {
      fileCount,
      pricing,
      parentInstances: childInstances,
    }),
  )

  const totalStats = statsFromSeries(schemaNode._series.total)
  const avgSchema = mean(schemaNode._series.schema)
  const avgValue = mean(schemaNode._series.value)
  const avgNull = mean(schemaNode._series.null)
  const avgTotal = totalStats.avg
  const pricePerToken = pricing.output_per_1m / 1_000_000

  const array_stats = type === 'array'
    ? arrayStats(schemaNode.array_item_counts)
    : null

  const string_stats = schemaNode.unique_values.size > 0 || type === 'string'
    ? {
        avg_length: schemaNode.string_lengths.length ? mean(schemaNode.string_lengths) : 0,
        value_diversity: safeDiv(schemaNode.unique_values.size, schemaNode.present_count),
        unique_count: schemaNode.unique_values.size,
      }
    : null

  return {
    name: schemaNode.name,
    path: schemaNode.path,
    depth: schemaNode.depth,
    type,
    observed_types: sortObservedTypes(schemaNode.observed_type_counts),
    tokens: {
      total: totalStats,
      schema_overhead: avgSchema,
      value_payload: avgValue,
      null_waste: avgNull,
    },
    fill_rate: fillRate,
    instance_count: instanceCount,
    seen_count: schemaNode.seen_count,
    present_count: schemaNode.present_count,
    array_stats,
    string_stats,
    examples: schemaNode.examples,
    children,
    cost: {
      per_instance: avgTotal * pricePerToken,
      total_corpus: avgTotal * pricePerToken * fileCount,
    },
  }
}

function collectInsights(root, pricing) {
  const insights = []
  const pricePerToken = pricing.output_per_1m / 1_000_000
  for (const node of walkAnalysis(root)) {
    if (node.path !== 'root' && node.instance_count > 0 && node.fill_rate < 0.5) {
      const savingsTokens = node.tokens.schema_overhead * (1 - node.fill_rate) + node.tokens.null_waste
      if (savingsTokens > 0.5) {
        insights.push(makeInsight({
          type: 'null_tax',
          node,
          severity: node.fill_rate < 0.2 ? 'high' : node.fill_rate < 0.35 ? 'medium' : 'low',
          message: `${node.name} is null ${Math.round((1 - node.fill_rate) * 100)}% of the time. Making it optional saves ~${round1(savingsTokens)} tok/instance.`,
          detail: `Low fill rate plus emitted key/null overhead makes this field an expensive default. If the producer omits it when absent, most of the schema and null cost disappears.`,
          savings_tokens: savingsTokens,
          savings_usd_per_10k: savingsTokens * pricePerToken * 10_000,
        }))
      }
    }

    if (node.type === 'object' && node.path !== 'root' && node.tokens.total.avg > 0) {
      const ratio = node.tokens.schema_overhead / node.tokens.total.avg
      if (ratio > 0.7) {
        insights.push(makeInsight({
          type: 'hollow_object',
          node,
          severity: ratio > 0.85 ? 'high' : ratio > 0.78 ? 'medium' : 'low',
          message: `${node.name} is ${Math.round(ratio * 100)}% structural overhead.`,
          detail: `Most tokens in this object are field names, punctuation, and braces rather than value payload. Consider flattening or collapsing the shape.`,
          savings_tokens: node.tokens.schema_overhead - node.tokens.value_payload,
          savings_usd_per_10k: (node.tokens.schema_overhead - node.tokens.value_payload) * pricePerToken * 10_000,
        }))
      }
    }

    if (node.type === 'array' && node.array_stats && node.children.length > 0 && node.array_stats.avg_items > 1) {
      const perItemKeyCost = node.children.reduce((sum, child) => sum + child.tokens.schema_overhead, 0)
      const repetitionTax = Math.max(0, perItemKeyCost * (node.array_stats.avg_items - 1))
      if (repetitionTax > 1) {
        insights.push(makeInsight({
          type: 'array_repetition_tax',
          node,
          severity: repetitionTax > 40 ? 'high' : repetitionTax > 12 ? 'medium' : 'low',
          message: `Field names inside ${node.name} repeat ~${round1(node.array_stats.avg_items)}x, creating ~${round1(repetitionTax)} tok repetition tax.`,
          detail: `Arrays of objects re-emit the same keys for every item. Compact item schemas or denser representations can reduce repeated key overhead.`,
          savings_tokens: repetitionTax,
          savings_usd_per_10k: repetitionTax * pricePerToken * 10_000,
        }))
      }
    }

    if (node.type === 'string' && node.string_stats && node.fill_rate > 0.5 && node.string_stats.value_diversity < 0.1 && node.string_stats.unique_count > 0) {
      const savingsTokens = node.tokens.value_payload * 0.4
      insights.push(makeInsight({
        type: 'boilerplate',
        node,
        severity: node.string_stats.value_diversity < 0.03 ? 'high' : 'medium',
        message: `${node.name} has low diversity (${round2(node.string_stats.value_diversity)}). Consider an enum/code.`,
        detail: `${node.string_stats.unique_count} unique values across ${node.present_count} non-null instances suggests repeated phrases or an implicit enum.`,
        savings_tokens: savingsTokens,
        savings_usd_per_10k: savingsTokens * pricePerToken * 10_000,
      }))
    }

    if (node.type === 'string' && node.tokens.total.p50 > 0 && node.tokens.total.p95 / node.tokens.total.p50 > 5) {
      const ratio = node.tokens.total.p95 / node.tokens.total.p50
      const savingsTokens = Math.max(0, node.tokens.total.p95 - node.tokens.total.p50)
      insights.push(makeInsight({
        type: 'length_variance',
        node,
        severity: ratio > 10 ? 'high' : 'medium',
        message: `${node.name} length varies ${round1(ratio)}x (p50 ${round1(node.tokens.total.p50)} tok, p95 ${round1(node.tokens.total.p95)} tok).`,
        detail: `This field is usually short but occasionally very long. Adding tighter instructions or max-length guidance may stabilize costs.`,
        savings_tokens: savingsTokens,
        savings_usd_per_10k: savingsTokens * pricePerToken * 10_000,
      }))
    }
  }

  return insights
    .filter((insight) => insight.savings_tokens > 0)
    .sort((a, b) => b.savings_tokens - a.savings_tokens)
}

function makeInsight({ type, node, severity, message, detail, savings_tokens, savings_usd_per_10k }) {
  return {
    type,
    path: node.path,
    severity,
    message,
    detail,
    savings_tokens: round3(savings_tokens),
    savings_usd_per_10k: round4(savings_usd_per_10k),
  }
}

function buildSummary({ root, insights, fileCount, glob, pricing }) {
  const overheadRatio = root.tokens.total.avg > 0 ? root.tokens.schema_overhead / root.tokens.total.avg : 0
  const nullWasteRatio = root.tokens.total.avg > 0 ? root.tokens.null_waste / root.tokens.total.avg : 0
  const top_insights = insights.slice(0, 5)

  return {
    file_count: fileCount,
    glob,
    model: pricing.model_id,
    tokenizer: pricing.tokenizer,
    output_price_per_1m: pricing.output_per_1m,
    avg_tokens_per_instance: round3(root.tokens.total.avg),
    cost_per_instance: round6(root.cost.per_instance),
    overhead_ratio: round4(overheadRatio),
    null_waste_ratio: round4(nullWasteRatio),
    cost_at_1k: round4(root.cost.per_instance * 1_000),
    cost_at_10k: round4(root.cost.per_instance * 10_000),
    cost_at_100k: round2(root.cost.per_instance * 100_000),
    cost_at_1m: round2(root.cost.per_instance * 1_000_000),
    top_insights,
  }
}

function arrayStats(values) {
  if (!values.length) {
    return {
      avg_items: 0,
      min_items: 0,
      max_items: 0,
      p95_items: 0,
    }
  }
  const sorted = [...values].sort((a, b) => a - b)
  return {
    avg_items: mean(values),
    min_items: sorted[0],
    max_items: sorted.at(-1),
    p95_items: percentileSorted(sorted, 0.95),
  }
}

function statsFromSeries(values) {
  if (!values.length) {
    return { avg: 0, min: 0, max: 0, p50: 0, p95: 0 }
  }
  const sorted = [...values].sort((a, b) => a - b)
  return {
    avg: round3(mean(values)),
    min: sorted[0],
    max: sorted.at(-1),
    p50: round3(percentileSorted(sorted, 0.5)),
    p95: round3(percentileSorted(sorted, 0.95)),
  }
}

function percentileSorted(sorted, p) {
  if (sorted.length === 0) {
    return 0
  }
  if (sorted.length === 1) {
    return sorted[0]
  }
  const index = (sorted.length - 1) * p
  const lo = Math.floor(index)
  const hi = Math.ceil(index)
  if (lo === hi) {
    return sorted[lo]
  }
  const frac = index - lo
  return sorted[lo] + (sorted[hi] - sorted[lo]) * frac
}

function mean(values) {
  if (!values.length) {
    return 0
  }
  let sum = 0
  for (const value of values) {
    sum += value
  }
  return sum / values.length
}

function safeDiv(n, d) {
  return d > 0 ? n / d : 0
}

function resolveDominantType(schemaNode) {
  if (schemaNode.observed_type_counts.size === 0) {
    return 'null'
  }
  let bestType = 'null'
  let bestCount = -1
  for (const [type, count] of schemaNode.observed_type_counts.entries()) {
    if (count > bestCount) {
      bestType = type
      bestCount = count
    }
  }
  return bestType
}

function sortObservedTypes(typeCounts) {
  return [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([type]) => type)
}

function sortNodes(nodes) {
  return nodes.sort((a, b) => a.name.localeCompare(b.name))
}

function *walkSchema(node) {
  yield node
  for (const child of sortNodes(Array.from(node.children.values()))) {
    yield* walkSchema(child)
  }
}

function *walkAnalysis(node) {
  yield node
  for (const child of node.children) {
    yield* walkAnalysis(child)
  }
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function getJsonType(value) {
  if (value === null) {
    return 'null'
  }
  if (Array.isArray(value)) {
    return 'array'
  }
  if (isPlainObject(value)) {
    return 'object'
  }
  if (typeof value === 'string') {
    return 'string'
  }
  if (typeof value === 'number') {
    return 'number'
  }
  if (typeof value === 'boolean') {
    return 'boolean'
  }
  return 'string'
}

function summarizeExample(value) {
  if (Array.isArray(value)) {
    return value.slice(0, 2)
  }
  if (isPlainObject(value)) {
    const out = {}
    for (const key of Object.keys(value).slice(0, 4)) {
      out[key] = value[key]
    }
    return out
  }
  return value
}

function stableStringify(value) {
  return JSON.stringify(value)
}

function createIgnoreMatcher(patterns) {
  const normalized = (patterns ?? [])
    .map((p) => String(p ?? '').trim())
    .filter(Boolean)
  if (normalized.length === 0) {
    return () => false
  }

  const wildcardMatchers = normalized
    .filter((p) => p.includes('*'))
    .map((pattern) => ({ pattern, regex: wildcardToRegex(pattern) }))

  const exactish = normalized.filter((p) => !p.includes('*'))

  return (path) => {
    const value = String(path)
    for (const rule of exactish) {
      if (value === rule || value.startsWith(`${rule}.`)) {
        return true
      }
    }
    for (const rule of wildcardMatchers) {
      if (rule.regex.test(value)) {
        return true
      }
    }
    return false
  }
}

function wildcardToRegex(pattern) {
  const escaped = String(pattern)
    .replace(/[|\\{}()[\]^$+?.]/g, '\\$&')
    .replace(/\*/g, '.*')
  return new RegExp(`^${escaped}$`)
}

const TOKEN_ESTIMATE_CACHE = new Map()

export function estimateTokens(text) {
  const key = String(text)
  const cached = TOKEN_ESTIMATE_CACHE.get(key)
  if (cached != null) {
    return cached
  }

  let count = 0
  const re = /"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null|[{}\[\]:,]|[^\s]/g
  let match = re.exec(key)
  while (match) {
    const token = match[0]
    if (token[0] === '"') {
      count += Math.max(1, Math.ceil(token.length / 4))
    }
    else if (/^[{}\[\]:,]$/.test(token)) {
      count += 1
    }
    else if (token === 'true' || token === 'false' || token === 'null') {
      count += 1
    }
    else if (/^-?\d/.test(token)) {
      count += Math.max(1, Math.ceil(token.length / 3))
    }
    else {
      count += Math.max(1, Math.ceil(token.length / 4))
    }
    match = re.exec(key)
  }

  if (count === 0 && key.length > 0) {
    count = Math.max(1, Math.ceil(key.length / 4))
  }

  TOKEN_ESTIMATE_CACHE.set(key, count)
  return count
}

function round1(n) { return Math.round(n * 10) / 10 }
function round2(n) { return Math.round(n * 100) / 100 }
function round3(n) { return Math.round(n * 1000) / 1000 }
function round4(n) { return Math.round(n * 10000) / 10000 }
function round6(n) { return Math.round(n * 1_000_000) / 1_000_000 }
