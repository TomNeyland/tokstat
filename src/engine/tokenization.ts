import { getEncoding as getTiktokenEncoding, type Tiktoken } from 'js-tiktoken'
import type { SchemaNode, CharSpan, FileTokens } from './types.ts'

// ── Character offset map builder ─────────────────────────────────────────────

interface OffsetMapEntry {
  path: string
  category: CharSpan['category']
}

/**
 * Serialize a parsed JSON value to minified JSON while building
 * a character-level offset map that records which schema node and
 * category each character belongs to.
 */
function buildOffsetMap(
  value: unknown,
  node: SchemaNode,
): { json: string; map: OffsetMapEntry[] } {
  const chars: string[] = []
  const map: OffsetMapEntry[] = []

  function emit(s: string, path: string, category: CharSpan['category']): void {
    for (const ch of s) {
      chars.push(ch)
      map.push({ path, category })
    }
  }

  function walk(val: unknown, schemaNode: SchemaNode): void {
    if (val === null) {
      emit('null', schemaNode.path, 'null_value')
      return
    }

    if (Array.isArray(val)) {
      emit('[', schemaNode.path, 'structural')
      const itemNode = schemaNode.children.get('[]')!
      for (let i = 0; i < val.length; i++) {
        if (i > 0) emit(',', schemaNode.path, 'structural')
        walk(val[i], itemNode)
      }
      emit(']', schemaNode.path, 'structural')
      return
    }

    if (typeof val === 'object') {
      emit('{', schemaNode.path, 'structural')
      const keys = Object.keys(val as Record<string, unknown>)
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i]
        if (i > 0) emit(',', schemaNode.path, 'structural')

        const childNode = schemaNode.children.get(key)!
        // Key span: "field_name": (opening quote through colon)
        emit(JSON.stringify(key), childNode.path, 'key')
        emit(':', childNode.path, 'key')

        // Value span
        const childValue = (val as Record<string, unknown>)[key]
        walk(childValue, childNode)
      }
      emit('}', schemaNode.path, 'structural')
      return
    }

    // Primitive: string, number, boolean
    const serialized = JSON.stringify(val)
    emit(serialized, schemaNode.path, 'value')
  }

  walk(value, node)

  return { json: chars.join(''), map }
}

// ── Token attribution ────────────────────────────────────────────────────────

interface NodeAccumulator {
  schema_overhead: number
  value_payload: number
  null_waste: number
}

/**
 * Tokenize a single file and attribute tokens to schema nodes.
 * Returns per-node token counts for this file.
 */
export function tokenizeFile(
  parsed: unknown,
  schema: SchemaNode,
  encoding: Tiktoken,
): Map<string, FileTokens> {
  const { json, map } = buildOffsetMap(parsed, schema)

  // Tokenize the full JSON string
  const tokens = encoding.encode(json)

  // Build a map of path -> accumulator
  const accumulators = new Map<string, NodeAccumulator>()

  function ensureAccumulator(path: string): NodeAccumulator {
    let acc = accumulators.get(path)
    if (!acc) {
      acc = { schema_overhead: 0, value_payload: 0, null_waste: 0 }
      accumulators.set(path, acc)
    }
    return acc
  }

  // For each token, we need to know what character range it spans.
  // js-tiktoken's encode returns token IDs. We decode each token to get its text length.
  let charPos = 0
  for (const tokenId of tokens) {
    const tokenText = encoding.decode([tokenId])
    const tokenLen = tokenText.length

    // Count characters per (path, category) within this token
    const votes = new Map<string, { path: string; category: CharSpan['category']; count: number }>()

    for (let i = 0; i < tokenLen && charPos + i < map.length; i++) {
      const entry = map[charPos + i]
      const key = `${entry.path}|${entry.category}`
      const existing = votes.get(key)
      if (existing) {
        existing.count++
      } else {
        votes.set(key, { path: entry.path, category: entry.category, count: 1 })
      }
    }

    // Attribute the full token to whichever (path, category) owns the majority
    let winner: { path: string; category: CharSpan['category'] } | null = null
    let maxCount = 0
    for (const vote of votes.values()) {
      if (vote.count > maxCount) {
        maxCount = vote.count
        winner = { path: vote.path, category: vote.category }
      }
    }

    if (winner) {
      const acc = ensureAccumulator(winner.path)
      if (winner.category === 'key' || winner.category === 'structural') {
        acc.schema_overhead++
      } else if (winner.category === 'null_value') {
        acc.null_waste++
      } else {
        acc.value_payload++
      }
    }

    charPos += tokenLen
  }

  // Convert accumulators to FileTokens
  const result = new Map<string, FileTokens>()
  for (const [path, acc] of accumulators) {
    result.set(path, {
      total: acc.schema_overhead + acc.value_payload + acc.null_waste,
      schema_overhead: acc.schema_overhead,
      value_payload: acc.value_payload,
      null_waste: acc.null_waste,
    })
  }

  return result
}

// ── Encoding factory ─────────────────────────────────────────────────────────

let cachedEncoding: Tiktoken | null = null
let cachedEncodingName: string | null = null

export function getEncoding(tokenizer: string): Tiktoken {
  if (cachedEncoding && cachedEncodingName === tokenizer) {
    return cachedEncoding
  }
  cachedEncoding = getTiktokenEncoding(tokenizer as Parameters<typeof getTiktokenEncoding>[0])
  cachedEncodingName = tokenizer
  return cachedEncoding
}

// ── Value collector (for aggregation) ────────────────────────────────────────

/**
 * Collect string values and sample values from a document for aggregation.
 * Returns a map of path -> collected values.
 */
export function collectValues(
  parsed: unknown,
  schema: SchemaNode,
): Map<string, unknown[]> {
  const result = new Map<string, unknown[]>()

  function ensure(path: string): unknown[] {
    let arr = result.get(path)
    if (!arr) {
      arr = []
      result.set(path, arr)
    }
    return arr
  }

  function walk(val: unknown, node: SchemaNode): void {
    if (val === null) return

    if (Array.isArray(val)) {
      const itemNode = node.children.get('[]')!
      for (const item of val) {
        walk(item, itemNode)
      }
      return
    }

    if (typeof val === 'object') {
      const obj = val as Record<string, unknown>
      for (const [key, childVal] of Object.entries(obj)) {
        const childNode = node.children.get(key)
        if (childNode) {
          walk(childVal, childNode)
        }
      }
      return
    }

    // Leaf value — collect it
    ensure(node.path).push(val)
  }

  walk(parsed, schema)
  return result
}
