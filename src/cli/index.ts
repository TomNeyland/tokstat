#!/usr/bin/env node

import { Command } from 'commander'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { CliOptions } from '../engine/types.ts'
import { runPipeline } from '../engine/pipeline.ts'
import { formatJson } from '../formatters/jsonFormatter.ts'
import { formatLlm } from '../formatters/llmFormatter.ts'

const program = new Command()
  .name('tokstat')
  .description('Visualize per-field token costs across a corpus of LLM-generated JSON')
  .argument('<glob>', 'Glob pattern for JSON files')
  .option('--model <model>', 'Model for cost estimation', 'gpt-4o')
  .option('--format <fmt>', 'Output format: interactive, json, llm', 'interactive')
  .option('--tokenizer <enc>', 'Tokenizer encoding', 'auto')
  .option('--out <path>', 'Write to file instead of stdout/browser')
  .option('--port <port>', 'Dev server port', '3742')
  .option('--no-open', "Don't auto-open browser")
  .option('--cost-per-1k <n>', 'Custom output token price per 1K tokens')
  .option('--sample-values <n>', 'Example values per field', '5')
  .parse(process.argv)

const opts = program.opts()
const glob = program.args[0]

const options: CliOptions = {
  glob,
  model: opts.model,
  format: opts.format,
  tokenizer: opts.tokenizer,
  out: opts.out ?? null,
  port: parseInt(opts.port, 10),
  noOpen: opts.open === false,
  costPer1k: opts.costPer1k ? parseFloat(opts.costPer1k) : null,
  sampleValues: parseInt(opts.sampleValues, 10),
}

const isQuiet = options.format === 'json' || options.format === 'llm'

function log(msg: string): void {
  if (!isQuiet) {
    process.stderr.write(msg + '\n')
  }
}

log(`  Analyzing ${options.glob}...`)

const output = runPipeline(options)

log(`  ${output.summary.file_count} files, ${Math.round(output.summary.avg_tokens_per_instance)} avg tokens/instance`)
log(`  ${Math.round(output.summary.overhead_ratio * 100)}% schema overhead, ${Math.round(output.summary.null_waste_ratio * 100)}% null waste`)
log(`  ${output.insights.length} insights detected`)

switch (options.format) {
  case 'json': {
    const formatted = formatJson(output)
    if (options.out) {
      writeFileSync(options.out, formatted, 'utf-8')
      console.log(`Output written to ${options.out}`)
    } else {
      console.log(formatted)
    }
    break
  }

  case 'llm': {
    const formatted = formatLlm(output)
    if (options.out) {
      writeFileSync(options.out, formatted, 'utf-8')
      console.log(`Output written to ${options.out}`)
    } else {
      console.log(formatted)
    }
    break
  }

  case 'interactive': {
    if (options.out) {
      // Build self-contained HTML
      log('  Building self-contained HTML...')
      const { buildSelfContainedHtml } = await import('./buildHtml.ts')
      const outPath = resolve(options.out)
      await buildSelfContainedHtml(output, outPath)
      log(`  Written to ${outPath}`)
    } else {
      // Start dev server
      log('  Starting visualization server...')
      const { startDevServer } = await import('./server.ts')
      await startDevServer(output, options.port, !options.noOpen)
    }
    break
  }

  default:
    throw new Error(`Unknown format: ${options.format}`)
}
