import { describe, it, expect } from 'vitest'
import { inferSchema } from '../../src/engine/schemaInference.ts'
import { tokenizeFile, collectValues, getEncoding } from '../../src/engine/tokenization.ts'
import { aggregate } from '../../src/engine/aggregation.ts'

const encoding = getEncoding('o200k_base')

function runAggregation(docs: unknown[], sampleCount = 5) {
  const schema = inferSchema(docs)
  const perFileTokens = docs.map(doc => tokenizeFile(doc, schema, encoding))
  const perFileValues = docs.map(doc => collectValues(doc, schema))
  return aggregate(schema, perFileTokens, perFileValues, sampleCount)
}

describe('aggregate', () => {
  it('computes token stats across multiple files', () => {
    const docs = [
      { name: 'short' },
      { name: 'a longer string value here' },
    ]
    const tree = runAggregation(docs)

    expect(tree.tokens.total.min).toBeLessThan(tree.tokens.total.max)
    expect(tree.tokens.total.avg).toBeGreaterThan(0)
  })

  it('computes fill rate correctly', () => {
    const docs = [
      { x: 'present', y: null },
      { x: 'present', y: null },
      { x: 'present', y: 'here' },
    ]
    const tree = runAggregation(docs)

    const xNode = tree.children.find(c => c.name === 'x')!
    const yNode = tree.children.find(c => c.name === 'y')!
    expect(xNode.fill_rate).toBe(1)
    expect(yNode.fill_rate).toBeCloseTo(1 / 3, 2)
  })

  it('computes array stats', () => {
    const docs = [
      { items: [1, 2, 3] },
      { items: [1] },
      { items: [1, 2, 3, 4, 5] },
    ]
    const tree = runAggregation(docs)

    const items = tree.children.find(c => c.name === 'items')!
    expect(items.array_stats).not.toBeNull()
    expect(items.array_stats!.min_items).toBe(1)
    expect(items.array_stats!.max_items).toBe(5)
    expect(items.array_stats!.avg_items).toBe(3)
  })

  it('computes string stats', () => {
    const docs = [
      { status: 'active' },
      { status: 'active' },
      { status: 'inactive' },
      { status: 'active' },
    ]
    const tree = runAggregation(docs)

    const status = tree.children.find(c => c.name === 'status')!
    expect(status.string_stats).not.toBeNull()
    expect(status.string_stats!.unique_count).toBe(2)
    expect(status.string_stats!.value_diversity).toBe(0.5)
  })

  it('collects example values', () => {
    const docs = [
      { x: 'alpha' },
      { x: 'beta' },
      { x: 'gamma' },
    ]
    const tree = runAggregation(docs, 5)

    const xNode = tree.children.find(c => c.name === 'x')!
    expect(xNode.examples.length).toBe(3) // fewer than sample count, so all included
    expect(xNode.examples).toContain('alpha')
  })

  it('limits example values to sample count', () => {
    const docs = Array.from({ length: 20 }, (_, i) => ({ x: `value_${i}` }))
    const tree = runAggregation(docs, 3)

    const xNode = tree.children.find(c => c.name === 'x')!
    expect(xNode.examples.length).toBe(3)
  })

  it('computes p50 and p95 correctly', () => {
    // 10 docs with varying token counts
    const docs = Array.from({ length: 10 }, (_, i) => ({
      text: 'x'.repeat(i * 5 + 1),
    }))
    const tree = runAggregation(docs)

    expect(tree.tokens.total.p50).toBeGreaterThan(0)
    expect(tree.tokens.total.p95).toBeGreaterThanOrEqual(tree.tokens.total.p50)
    expect(tree.tokens.total.p95).toBeLessThanOrEqual(tree.tokens.total.max)
  })
})
