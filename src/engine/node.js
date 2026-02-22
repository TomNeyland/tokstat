// @ts-nocheck
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { glob } from 'node:fs/promises'
import { analyzeRecords } from '../core/analyze.js'

export async function readJsonRecords(globPattern, options = {}) {
  const cwd = options.cwd ?? process.cwd()
  const paths = []
  for await (const match of glob(globPattern, { cwd })) {
    paths.push(match)
  }
  paths.sort((a, b) => a.localeCompare(b))
  if (paths.length === 0) {
    throw new Error(`No files matched glob: ${globPattern}`)
  }

  const records = []
  for (const relativePath of paths) {
    const fullPath = resolve(cwd, relativePath)
    const content = await readFile(fullPath, 'utf8')
    let parsed
    try {
      parsed = JSON.parse(content)
    }
    catch (error) {
      throw new Error(`Invalid JSON in ${relativePath}: ${error.message}`)
    }
    records.push({ path: relativePath, full_path: fullPath, content, parsed })
  }

  return records
}

export async function analyzeGlob(globPattern, options = {}) {
  const records = await readJsonRecords(globPattern, options)
  return analyzeRecords(records, {
    glob: globPattern,
    model: options.model,
    tokenizer: options.tokenizer,
    costPer1k: options.costPer1k,
    sampleValues: options.sampleValues,
  })
}

export async function writeOutputFile(path, content) {
  const abs = resolve(path)
  await mkdir(dirname(abs), { recursive: true })
  await writeFile(abs, content, 'utf8')
  return abs
}
