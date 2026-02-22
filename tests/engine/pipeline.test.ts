import { describe, it, expect } from 'vitest'
import { runPipeline } from '../../src/engine/pipeline.ts'
import type { CliOptions } from '../../src/engine/types.ts'

const baseOptions: CliOptions = {
  glob: '',
  model: 'gpt-4o',
  format: 'json',
  tokenizer: 'auto',
  out: null,
  port: 3742,
  noOpen: false,
  costPer1k: null,
  sampleValues: 5,
}

describe('pipeline integration', () => {
  it('produces valid output for basic fixtures', () => {
    const output = runPipeline({
      ...baseOptions,
      glob: './fixtures/basic/**/*.json',
    })

    expect(output.schema).toBe('tokstat/v1')
    expect(output.summary.file_count).toBe(5)
    expect(output.summary.model).toBe('gpt-4o')
    expect(output.summary.tokenizer).toBe('o200k_base')
    expect(output.summary.avg_tokens_per_instance).toBeGreaterThan(0)
    expect(output.summary.cost_per_instance).toBeGreaterThan(0)
    expect(output.summary.overhead_ratio).toBeGreaterThan(0)
    expect(output.summary.overhead_ratio).toBeLessThan(1)

    // Tree structure
    expect(output.tree.name).toBe('root')
    expect(output.tree.type).toBe('object')
    expect(output.tree.children.length).toBeGreaterThan(0)

    // Cost populated
    expect(output.tree.cost.per_instance).toBeGreaterThan(0)
    expect(output.tree.cost.total_corpus).toBeGreaterThan(0)
  })

  it('detects correct fill rates on sparse fixtures', () => {
    const output = runPipeline({
      ...baseOptions,
      glob: './fixtures/sparse/**/*.json',
    })

    expect(output.summary.file_count).toBe(5)
    expect(output.summary.null_waste_ratio).toBeGreaterThan(0)

    // Find a field that we know is often null in sparse fixtures
    // soundtrack is null in 5/5 sparse files
    const soundtrack = findNode(output.tree, 'root.soundtrack')
    expect(soundtrack).not.toBeNull()
    expect(soundtrack!.fill_rate).toBeLessThan(1)

    // distributor is null in 4/5 sparse files
    const distributor = findNode(output.tree, 'root.distributor')
    expect(distributor).not.toBeNull()
    expect(distributor!.fill_rate).toBeLessThan(0.5)
  })

  it('detects null_tax insights on sparse fixtures', () => {
    const output = runPipeline({
      ...baseOptions,
      glob: './fixtures/sparse/**/*.json',
    })

    const nullTaxInsights = output.insights.filter(i => i.type === 'null_tax')
    expect(nullTaxInsights.length).toBeGreaterThan(0)

    // Every null_tax insight should have positive savings
    for (const insight of nullTaxInsights) {
      expect(insight.savings_tokens).toBeGreaterThan(0)
      expect(insight.savings_usd_per_10k).toBeGreaterThan(0)
    }
  })

  it('detects array_repetition_tax on fixtures with arrays', () => {
    const output = runPipeline({
      ...baseOptions,
      glob: './fixtures/basic/**/*.json',
    })

    const repTax = output.insights.filter(i => i.type === 'array_repetition_tax')
    expect(repTax.length).toBeGreaterThan(0)
  })

  it('processes verbose fixtures without errors', () => {
    const output = runPipeline({
      ...baseOptions,
      glob: './fixtures/verbose/**/*.json',
    })

    expect(output.summary.file_count).toBe(3)
    // Verbose fixtures should have higher overhead ratio due to long field names
    expect(output.summary.overhead_ratio).toBeGreaterThan(0.3)
  })

  it('processes all fixtures together', () => {
    const output = runPipeline({
      ...baseOptions,
      glob: './fixtures/**/*.json',
    })

    expect(output.summary.file_count).toBe(13)
    expect(output.insights.length).toBeGreaterThan(0)

    // Insights should be sorted by savings descending
    for (let i = 1; i < output.insights.length; i++) {
      expect(output.insights[i - 1].savings_tokens).toBeGreaterThanOrEqual(
        output.insights[i].savings_tokens,
      )
    }
  })

  it('scale projections are consistent with per-instance cost', () => {
    const output = runPipeline({
      ...baseOptions,
      glob: './fixtures/basic/**/*.json',
    })

    const cpi = output.summary.cost_per_instance
    expect(output.summary.cost_at_1k).toBeCloseTo(cpi * 1_000, 6)
    expect(output.summary.cost_at_10k).toBeCloseTo(cpi * 10_000, 5)
    expect(output.summary.cost_at_100k).toBeCloseTo(cpi * 100_000, 4)
    expect(output.summary.cost_at_1m).toBeCloseTo(cpi * 1_000_000, 3)
  })

  it('throws on empty glob', () => {
    expect(() =>
      runPipeline({
        ...baseOptions,
        glob: './nonexistent/**/*.json',
      }),
    ).toThrow('No files matched glob')
  })

  it('supports custom cost-per-1k pricing', () => {
    const output = runPipeline({
      ...baseOptions,
      glob: './fixtures/basic/**/*.json',
      costPer1k: 0.01, // $0.01 per 1K tokens = $10 per 1M tokens
    })

    // Should use the custom pricing, not gpt-4o pricing
    expect(output.summary.output_price_per_1m).toBe(10) // 0.01 * 1000
  })
})

function findNode(
  tree: import('../../src/engine/types.ts').AnalysisNode,
  path: string,
): import('../../src/engine/types.ts').AnalysisNode | null {
  if (tree.path === path) return tree
  for (const child of tree.children) {
    const found = findNode(child, path)
    if (found) return found
  }
  return null
}
