import { describe, it, expect } from 'vitest'
import { getEncoding as getTiktokenEncoding } from 'js-tiktoken'
import { inferSchema } from '../../src/engine/schemaInference.ts'
import { tokenizeFile, getEncoding, collectValues } from '../../src/engine/tokenization.ts'

const encoding = getEncoding('o200k_base')

describe('tokenizeFile', () => {
  it('tokenizes a simple object and attributes tokens correctly', () => {
    const doc = { a: 1, b: 'hi' }
    const schema = inferSchema([doc])
    const result = tokenizeFile(doc, schema, encoding)

    // Every token should be attributed somewhere
    const totalTokens = [...result.values()].reduce((sum, ft) => sum + ft.total, 0)
    const expectedTokens = encoding.encode(JSON.stringify(doc)).length
    expect(totalTokens).toBe(expectedTokens)
  })

  it('attributes null values as null_waste', () => {
    const doc = { x: null }
    const schema = inferSchema([doc])
    const result = tokenizeFile(doc, schema, encoding)

    // Find null_waste tokens
    let totalNullWaste = 0
    for (const ft of result.values()) {
      totalNullWaste += ft.null_waste
    }
    expect(totalNullWaste).toBeGreaterThan(0)
  })

  it('attributes field keys as schema_overhead', () => {
    const doc = { field_name: 'value' }
    const schema = inferSchema([doc])
    const result = tokenizeFile(doc, schema, encoding)

    let totalOverhead = 0
    for (const ft of result.values()) {
      totalOverhead += ft.schema_overhead
    }
    expect(totalOverhead).toBeGreaterThan(0)
  })

  it('attributes non-null values as value_payload', () => {
    const doc = { x: 'hello world' }
    const schema = inferSchema([doc])
    const result = tokenizeFile(doc, schema, encoding)

    let totalPayload = 0
    for (const ft of result.values()) {
      totalPayload += ft.value_payload
    }
    expect(totalPayload).toBeGreaterThan(0)
  })

  it('total token count matches direct encoding', () => {
    const doc = {
      pmid: '12345',
      title: 'Test Study',
      year: 2024,
      endpoints: [
        { name: 'primary', value: 0.5 },
        { name: 'secondary', value: 1.2 },
      ],
    }
    const schema = inferSchema([doc])
    const result = tokenizeFile(doc, schema, encoding)

    const totalFromResult = [...result.values()].reduce((s, ft) => s + ft.total, 0)
    const directTokenCount = encoding.encode(JSON.stringify(doc)).length
    expect(totalFromResult).toBe(directTokenCount)
  })

  it('handles nested objects correctly', () => {
    const doc = { outer: { inner: 42 } }
    const schema = inferSchema([doc])
    const result = tokenizeFile(doc, schema, encoding)

    // Should have entries for root, root.outer, root.outer.inner
    expect(result.has('root')).toBe(true)
    expect(result.has('root.outer')).toBe(true)
    expect(result.has('root.outer.inner')).toBe(true)
  })

  it('handles arrays with correct subtree attribution', () => {
    const doc = { items: [1, 2, 3] }
    const schema = inferSchema([doc])
    const result = tokenizeFile(doc, schema, encoding)

    const totalFromResult = [...result.values()].reduce((s, ft) => s + ft.total, 0)
    const directTokenCount = encoding.encode(JSON.stringify(doc)).length
    expect(totalFromResult).toBe(directTokenCount)
  })
})

describe('collectValues', () => {
  it('collects leaf values from a document', () => {
    const doc = { name: 'Alice', age: 30 }
    const schema = inferSchema([doc])
    const values = collectValues(doc, schema)

    expect(values.get('root.name')).toEqual(['Alice'])
    expect(values.get('root.age')).toEqual([30])
  })

  it('collects values from array items', () => {
    const doc = { items: [{ x: 1 }, { x: 2 }] }
    const schema = inferSchema([doc])
    const values = collectValues(doc, schema)

    expect(values.get('root.items[].x')).toEqual([1, 2])
  })

  it('skips null values', () => {
    const doc = { x: null, y: 'present' }
    const schema = inferSchema([doc])
    const values = collectValues(doc, schema)

    expect(values.has('root.x')).toBe(false)
    expect(values.get('root.y')).toEqual(['present'])
  })
})
