import { Command } from 'commander'
import { writeFileSync } from 'node:fs'
import open from 'open'
import type { CliOptions } from '../engine/types.ts'
import { runPipeline, runCohortedPipeline } from '../engine/pipeline.ts'
import { formatJson } from '../formatters/jsonFormatter.ts'
import { formatLlm } from '../formatters/llmFormatter.ts'
import { startServer } from './server.ts'

const APP_URL = 'https://tomneyland.github.io/tokstat/other/'

const program = new Command()
  .name('tokstat')
  .description('Visualize per-field token costs across a corpus of LLM-generated JSON')
  .argument('[glob]', 'Glob pattern for JSON files')
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

// No glob — just open the web app
if (!glob) {
  console.log(`  Opening ${APP_URL}`)
  await open(APP_URL)
  process.exit(0)
}

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
    const cohortedOutput = runCohortedPipeline(options)
    log(`  ${cohortedOutput.cohorts.length} schema cohort(s) detected`)

    if (options.out) {
      // Fetch app HTML, inject data, write to file
      log('  Building self-contained HTML...')
      const resp = await fetch('https://tomneyland.github.io/tokstat/other/index.html')
      const html = await resp.text()
      const dataScript = `<script id="tokstat-data" type="application/json">${JSON.stringify(cohortedOutput)}</script>`
      const injectedHtml = html.replace('</head>', `${dataScript}\n</head>`)
      writeFileSync(options.out, injectedHtml, 'utf-8')
      log(`  Written to ${options.out}`)
    } else {
      // Serve locally
      log('  Starting visualization server...')
      await startServer(cohortedOutput, options.port, !options.noOpen)
    }
    break
  }

  default:
    throw new Error(`Unknown format: ${options.format}`)
}
