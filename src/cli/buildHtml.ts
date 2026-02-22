import { build, type InlineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { resolve } from 'node:path'
import { readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { mkdtempSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { AnalysisOutput } from '../engine/types.ts'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = resolve(__dirname, '../..')

/**
 * Build a self-contained HTML file with the analysis data embedded.
 */
export async function buildSelfContainedHtml(
  data: AnalysisOutput,
  outPath: string,
): Promise<void> {
  const dataJson = JSON.stringify(data)

  // Build to a temp dir
  const tmpDir = mkdtempSync(resolve(tmpdir(), 'tokstat-build-'))

  const config: InlineConfig = {
    root: projectRoot,
    plugins: [
      svelte(),
      viteSingleFile(),
    ],
    define: {
      '__TOKSTAT_DATA_JSON__': dataJson,
    },
    build: {
      outDir: tmpDir,
      emptyOutDir: true,
      // Inline everything
      assetsInlineLimit: Infinity,
      cssCodeSplit: false,
    },
    logLevel: 'warn',
  }

  await build(config)

  // Read the built HTML and inject the data as a script tag
  const htmlPath = resolve(tmpDir, 'index.html')
  let html = readFileSync(htmlPath, 'utf-8')

  // Insert the data script tag before closing </head>
  const dataScript = `<script id="tokstat-data" type="application/json">${dataJson}</script>`
  html = html.replace('</head>', `${dataScript}\n</head>`)

  writeFileSync(outPath, html, 'utf-8')
}
