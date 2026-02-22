import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import open from 'open'
import type { CohortedOutput } from '../engine/types.ts'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = resolve(__dirname, '../..')

/**
 * Start a Vite dev server with analysis data available to the app.
 *
 * We spawn vite as a subprocess to avoid tsx's module loader
 * interfering with Svelte compilation.
 */
export async function startDevServer(
  data: CohortedOutput,
  port: number,
  autoOpen: boolean,
): Promise<void> {
  const tmpDir = mkdtempSync(resolve(tmpdir(), 'tokstat-serve-'))
  const dataPath = resolve(tmpDir, 'tokstat-data.json')

  // Write analysis data so Vite plugin can read it
  writeFileSync(dataPath, JSON.stringify(data), 'utf-8')

  const viteProcess = spawn(
    resolve(projectRoot, 'node_modules/.bin/vite'),
    ['--port', String(port), '--strictPort'],
    {
      cwd: projectRoot,
      env: {
        ...process.env,
        TOKSTAT_DATA_PATH: dataPath,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  // Wait for server to be ready, then print the URL
  const url = `http://localhost:${port}`

  viteProcess.stdout.on('data', (chunk: Buffer) => {
    const text = chunk.toString()
    // Vite prints "Local: http://..." when ready
    if (text.includes('Local:') || text.includes('localhost')) {
      console.log(`\n  Report available at ${url}`)
      console.log('  Press Ctrl+C to exit\n')
      if (autoOpen) {
        open(url)
      }
    }
  })

  viteProcess.stderr.on('data', (chunk: Buffer) => {
    process.stderr.write(chunk)
  })

  // Forward signals to the child
  process.on('SIGINT', () => {
    viteProcess.kill('SIGINT')
    process.exit(0)
  })
  process.on('SIGTERM', () => {
    viteProcess.kill('SIGTERM')
    process.exit(0)
  })

  // Keep the parent alive
  await new Promise<void>((_, reject) => {
    viteProcess.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        reject(new Error(`Vite exited with code ${code}`))
      }
    })
  })
}
