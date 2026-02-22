import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import type { CohortedOutput } from '../engine/types.ts'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = resolve(__dirname, '../..')

/**
 * Build a self-contained HTML file with the analysis data embedded.
 *
 * Spawns `vite build` as a subprocess with TOKSTAT_DATA_PATH set,
 * so the vite config's data plugin injects the JSON into the HTML.
 */
export async function buildSelfContainedHtml(
  data: CohortedOutput,
  outPath: string,
): Promise<void> {
  const dataDir = mkdtempSync(resolve(tmpdir(), 'tokstat-data-'))
  const buildDir = mkdtempSync(resolve(tmpdir(), 'tokstat-out-'))
  const dataPath = resolve(dataDir, 'tokstat-data.json')

  // Write analysis data for the Vite plugin to read
  writeFileSync(dataPath, JSON.stringify(data), 'utf-8')

  // Run vite build as a subprocess
  execFileSync(
    resolve(projectRoot, 'node_modules/.bin/vite'),
    ['build', '--outDir', buildDir, '--emptyOutDir'],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        TOKSTAT_DATA_PATH: dataPath,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  // Read the built HTML and write to the output path
  const htmlPath = resolve(buildDir, 'index.html')
  const html = readFileSync(htmlPath, 'utf-8')
  writeFileSync(outPath, html, 'utf-8')

  // Cleanup temp dirs
  try { rmSync(dataDir, { recursive: true }) } catch { /* non-critical */ }
  try { rmSync(buildDir, { recursive: true }) } catch { /* non-critical */ }
}
