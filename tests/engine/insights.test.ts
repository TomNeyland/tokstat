import { describe, it, expect } from 'vitest'
import { inferSchema } from '../../src/engine/schemaInference.ts'
import { tokenizeFile, collectValues, getEncoding } from '../../src/engine/tokenization.ts'
import { aggregate } from '../../src/engine/aggregation.ts'
import { calculateCosts } from '../../src/engine/costCalculation.ts'
import { detectInsights } from '../../src/engine/insights.ts'
import type { ModelPricing } from '../../src/engine/types.ts'

const encoding = getEncoding('o200k_base')
const testPricing: ModelPricing = {
  model_id: 'test',
  provider: 'test',
  output_per_1m: 10.0,
  tokenizer: 'o200k_base',
}
const pricePerToken = testPricing.output_per_1m / 1_000_000

function buildTree(docs: unknown[]) {
  const schema = inferSchema(docs)
  const perFileTokens = docs.map(doc => tokenizeFile(doc, schema, encoding))
  const perFileValues = docs.map(doc => collectValues(doc, schema))
  const tree = aggregate(schema, perFileTokens, perFileValues, 5)
  calculateCosts(tree, testPricing, docs.length)
  return tree
}

describe('detectInsights', () => {
  it('detects null_tax on fields with low fill rate', () => {
    const docs = [
      { a: 'present', b: null },
      { a: 'present', b: null },
      { a: 'present', b: null },
      { a: 'present', b: 'rare' },
    ]
    const tree = buildTree(docs)
    const insights = detectInsights(tree, pricePerToken)

    const nullTax = insights.filter(i => i.type === 'null_tax')
    expect(nullTax.length).toBeGreaterThan(0)
    expect(nullTax.some(i => i.path === 'root.b')).toBe(true)
  })

  it('detects array_repetition_tax on arrays with multiple items', () => {
    const docs = [
      { items: [{ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 }, { x: 7, y: 8, z: 9 }] },
      { items: [{ x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 }] },
    ]
    const tree = buildTree(docs)
    const insights = detectInsights(tree, pricePerToken)

    const repTax = insights.filter(i => i.type === 'array_repetition_tax')
    expect(repTax.length).toBeGreaterThan(0)
    expect(repTax[0].savings_tokens).toBeGreaterThan(0)
  })

  it('detects hollow_object when overhead ratio is high', () => {
    // An object with many short-valued fields = high overhead ratio
    const docs = [
      { data: { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8 } },
      { data: { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7, h: 8 } },
    ]
    const tree = buildTree(docs)
    const insights = detectInsights(tree, pricePerToken)

    const hollow = insights.filter(i => i.type === 'hollow_object')
    expect(hollow.length).toBeGreaterThan(0)
  })

  it('detects boilerplate on low-diversity string fields', () => {
    // 20 instances with only 1 unique value = very low diversity
    const docs = Array.from({ length: 20 }, () => ({
      status: 'completed',
      name: 'always the same',
    }))
    const tree = buildTree(docs)
    const insights = detectInsights(tree, pricePerToken)

    const boilerplate = insights.filter(i => i.type === 'boilerplate')
    expect(boilerplate.length).toBeGreaterThan(0)
  })

  it('returns insights sorted by savings_tokens descending', () => {
    const docs = [
      { a: null, items: [{ x: 1 }, { x: 2 }, { x: 3 }] },
      { a: null, items: [{ x: 1 }, { x: 2 }] },
      { a: null, items: [{ x: 1 }] },
    ]
    const tree = buildTree(docs)
    const insights = detectInsights(tree, pricePerToken)

    for (let i = 1; i < insights.length; i++) {
      expect(insights[i - 1].savings_tokens).toBeGreaterThanOrEqual(insights[i].savings_tokens)
    }
  })

  it('includes savings_usd_per_10k on every insight', () => {
    const docs = [
      { a: null, b: 'present' },
      { a: null, b: 'present' },
      { a: null, b: 'present' },
    ]
    const tree = buildTree(docs)
    const insights = detectInsights(tree, pricePerToken)

    for (const insight of insights) {
      expect(insight.savings_usd_per_10k).toBeGreaterThan(0)
    }
  })
})
