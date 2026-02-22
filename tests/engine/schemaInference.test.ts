import { describe, it, expect } from 'vitest'
import { inferSchema } from '../../src/engine/schemaInference.ts'

describe('inferSchema', () => {
  it('builds a root object node from a simple document', () => {
    const schema = inferSchema([{ a: 1, b: 'hello' }])

    expect(schema.name).toBe('root')
    expect(schema.path).toBe('root')
    expect(schema.depth).toBe(0)
    expect(schema.type).toBe('object')
    expect(schema.instance_count).toBe(1)
    expect(schema.present_count).toBe(1)
    expect(schema.children.size).toBe(2)

    const childA = schema.children.get('a')!
    expect(childA.type).toBe('number')
    expect(childA.path).toBe('root.a')
    expect(childA.depth).toBe(1)
    expect(childA.instance_count).toBe(1)
    expect(childA.present_count).toBe(1)

    const childB = schema.children.get('b')!
    expect(childB.type).toBe('string')
  })

  it('merges union of different object shapes', () => {
    const schema = inferSchema([
      { a: 1, b: 2 },
      { b: 3, c: 4 },
    ])

    expect(schema.children.size).toBe(3) // a, b, c
    expect(schema.children.get('a')!.present_count).toBe(1)
    expect(schema.children.get('a')!.instance_count).toBe(2) // fixInstanceCounts bumps to parent's present_count
    expect(schema.children.get('b')!.present_count).toBe(2)
    expect(schema.children.get('c')!.present_count).toBe(1)
  })

  it('tracks null values correctly — instance_count increments, present_count does not', () => {
    const schema = inferSchema([
      { x: 'hello' },
      { x: null },
      { x: null },
    ])

    const x = schema.children.get('x')!
    expect(x.instance_count).toBe(3)
    expect(x.present_count).toBe(1)
    expect(x.observed_types.has('null')).toBe(true)
    expect(x.observed_types.has('string')).toBe(true)
    expect(x.type).toBe('string') // most common non-null type
  })

  it('handles arrays with item schema union', () => {
    const schema = inferSchema([
      { items: [{ a: 1 }, { a: 2, b: 'extra' }] },
      { items: [{ a: 3 }] },
    ])

    const items = schema.children.get('items')!
    expect(items.type).toBe('array')
    expect(items.array_item_counts).toEqual([2, 1])

    const itemSchema = items.children.get('[]')!
    expect(itemSchema.children.size).toBe(2) // a and b
    expect(itemSchema.children.get('a')!.present_count).toBe(3) // 3 items total
    expect(itemSchema.children.get('b')!.present_count).toBe(1)
    expect(itemSchema.children.get('b')!.instance_count).toBe(3) // all 3 items
  })

  it('handles nested objects inside arrays', () => {
    const schema = inferSchema([
      { arr: [{ nested: { x: 1 } }] },
    ])

    const arr = schema.children.get('arr')!
    const item = arr.children.get('[]')!
    const nested = item.children.get('nested')!
    expect(nested.type).toBe('object')
    expect(nested.path).toBe('root.arr[].nested')
    expect(nested.children.get('x')!.path).toBe('root.arr[].nested.x')
  })

  it('records observed types for type conflicts', () => {
    const schema = inferSchema([
      { x: 'hello' },
      { x: 42 },
    ])

    const x = schema.children.get('x')!
    expect(x.observed_types.has('string')).toBe(true)
    expect(x.observed_types.has('number')).toBe(true)
  })

  it('handles empty arrays', () => {
    const schema = inferSchema([
      { items: [] },
      { items: [{ a: 1 }] },
    ])

    const items = schema.children.get('items')!
    expect(items.array_item_counts).toEqual([0, 1])
    expect(items.children.has('[]')).toBe(true)
  })

  it('handles deeply nested structures', () => {
    const schema = inferSchema([
      { a: { b: { c: { d: 1 } } } },
    ])

    const d = schema.children.get('a')!
      .children.get('b')!
      .children.get('c')!
      .children.get('d')!
    expect(d.path).toBe('root.a.b.c.d')
    expect(d.depth).toBe(4)
    expect(d.type).toBe('number')
  })
})
