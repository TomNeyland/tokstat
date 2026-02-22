#!/usr/bin/env node
import { analyzeGlob, writeOutputFile } from '../src/engine/node.js'
import { formatJsonReport, formatLlmReport, formatInteractiveStub } from '../src/engine/formatters.js'

async function main() {
  const args = process.argv.slice(2)
  const { positional, flags } = parseArgs(args)

  if (flags.help || flags.h) {
    printHelp()
    process.exit(0)
  }

  const globPattern = positional[0]
  if (!globPattern) {
    printHelp('Missing required glob argument')
    process.exit(1)
  }

  const format = String(flags.format ?? 'interactive')
  const model = String(flags.model ?? 'gpt-4o')
  const tokenizer = flags.tokenizer ? String(flags.tokenizer) : null
  const out = flags.out ? String(flags.out) : null
  const sampleValues = flags['sample-values'] ? Number(flags['sample-values']) : 5
  const costPer1k = flags['cost-per-1k'] != null ? Number(flags['cost-per-1k']) : null

  if (!['interactive', 'json', 'llm'].includes(format)) {
    throw new Error(`Unsupported --format: ${format}`)
  }

  const report = await analyzeGlob(globPattern, {
    model,
    tokenizer,
    sampleValues,
    costPer1k,
  })

  if (format === 'json') {
    const content = formatJsonReport(report)
    if (out) {
      const file = await writeOutputFile(out, content)
      process.stdout.write(`${file}\n`)
    }
    else {
      process.stdout.write(content + '\n')
    }
    return
  }

  if (format === 'llm') {
    const content = formatLlmReport(report)
    if (out) {
      const file = await writeOutputFile(out, content)
      process.stdout.write(`${file}\n`)
    }
    else {
      process.stdout.write(content)
    }
    return
  }

  const html = formatInteractiveStub(report, { title: `tokstat • ${globPattern}` })
  const target = out ?? 'tokstat-report.html'
  const file = await writeOutputFile(target, html)
  process.stdout.write(`Interactive report written to ${file}\n`)
  process.stdout.write(`Tip: open it in a browser, or run the Svelte app and load the same JSON via file upload for the full UI.\n`)
}

function parseArgs(argv) {
  const positional = []
  const flags = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('-')) {
      positional.push(arg)
      continue
    }
    if (arg.startsWith('--')) {
      const raw = arg.slice(2)
      const eqIndex = raw.indexOf('=')
      if (eqIndex !== -1) {
        flags[raw.slice(0, eqIndex)] = raw.slice(eqIndex + 1)
        continue
      }
      const next = argv[i + 1]
      if (next && !next.startsWith('-')) {
        flags[raw] = next
        i += 1
      }
      else {
        flags[raw] = true
      }
      continue
    }
    const letters = arg.slice(1).split('')
    for (const letter of letters) {
      flags[letter] = true
    }
  }
  return { positional, flags }
}

function printHelp(error) {
  if (error) {
    process.stderr.write(`${error}\n\n`)
  }
  process.stdout.write(`tokstat <glob> [options]\n\n`)
  process.stdout.write(`Options:\n`)
  process.stdout.write(`  --model <model>         Model for cost estimation (default: gpt-4o)\n`)
  process.stdout.write(`  --format <fmt>          interactive | json | llm (default: interactive)\n`)
  process.stdout.write(`  --tokenizer <enc>       Override tokenizer label\n`)
  process.stdout.write(`  --out <path>            Write output to file\n`)
  process.stdout.write(`  --cost-per-1k <n>       Custom output price per 1K tokens\n`)
  process.stdout.write(`  --sample-values <n>     Example values per field (default: 5)\n`)
  process.stdout.write(`  --help                  Show this help\n`)
}

main().catch((error) => {
  process.stderr.write(`tokstat: ${error.message}\n`)
  process.exit(1)
})
