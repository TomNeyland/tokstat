import type { SchemaNode, JsonType } from './types.ts'

function getJsonType(value: unknown): JsonType {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  const t = typeof value
  if (t === 'string') return 'string'
  if (t === 'number') return 'number'
  if (t === 'boolean') return 'boolean'
  if (t === 'object') return 'object'
  throw new Error(`Unexpected JSON value type: ${t}`)
}

function createNode(name: string, path: string, depth: number): SchemaNode {
  return {
    name,
    path,
    depth,
    type: 'null',
    observed_types: new Set<JsonType>(),
    instance_count: 0,
    present_count: 0,
    array_item_counts: [],
    children: new Map<string, SchemaNode>(),
  }
}

/**
 * Merge a single JSON value into a schema node.
 * The node already exists — we're updating it with this instance's data.
 */
function mergeValue(node: SchemaNode, value: unknown): void {
  node.instance_count++

  if (value === null) {
    node.observed_types.add('null')
    // null: instance_count increments but present_count does NOT
    return
  }

  node.present_count++
  const type = getJsonType(value)
  node.observed_types.add(type)

  if (type === 'object') {
    const obj = value as Record<string, unknown>
    for (const key of Object.keys(obj)) {
      const childPath = `${node.path}.${key}`
      if (!node.children.has(key)) {
        node.children.set(key, createNode(key, childPath, node.depth + 1))
      }
      mergeValue(node.children.get(key)!, obj[key])
    }
  } else if (type === 'array') {
    const arr = value as unknown[]
    node.array_item_counts.push(arr.length)

    // All items contribute to a single virtual "[]" child
    const itemPath = `${node.path}[]`
    if (!node.children.has('[]')) {
      node.children.set('[]', createNode('[]', itemPath, node.depth + 1))
    }
    const itemNode = node.children.get('[]')!

    for (const item of arr) {
      mergeValue(itemNode, item)
    }
  }
}

/**
 * After all files are merged, resolve the `type` field on every node
 * to the most common observed type (excluding 'null').
 */
function resolveTypes(node: SchemaNode): void {
  // Pick most common non-null type; if only null was observed, type stays 'null'
  const types = [...node.observed_types].filter(t => t !== 'null')
  if (types.length > 0) {
    // For most schemas there's only one non-null type. If multiple, just pick the first.
    // A proper frequency count would need per-file type tracking — overkill for v1.
    node.type = types[0]
  } else if (node.observed_types.has('null')) {
    node.type = 'null'
  }

  for (const child of node.children.values()) {
    resolveTypes(child)
  }
}

/**
 * Ensure all children of an object node have correct instance_count
 * relative to their siblings. If parent was instantiated N times but
 * a child was only seen M < N times, the child still needs instance_count = N
 * (because it was absent in N - M instances).
 */
function fixInstanceCounts(node: SchemaNode): void {
  if (node.type === 'object') {
    for (const child of node.children.values()) {
      // The child's instance_count should equal the parent's present_count
      // (every time the parent object exists, the child field is "instantiated" —
      // it either has a value or is absent/null)
      if (child.instance_count < node.present_count) {
        // Fields absent in some files: they don't count as present
        // but they do count as instances (the parent existed but the field was missing)
        child.instance_count = node.present_count
      }
      fixInstanceCounts(child)
    }
  } else if (node.type === 'array') {
    // Array items: the [] child's instance_count is already correct
    // (it was incremented once per array item)
    for (const child of node.children.values()) {
      fixInstanceCounts(child)
    }
  }
}

export function inferSchema(documents: unknown[]): SchemaNode {
  const root = createNode('root', 'root', 0)

  for (const doc of documents) {
    mergeValue(root, doc)
  }

  resolveTypes(root)
  fixInstanceCounts(root)

  return root
}
