import { createServer, type InlineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { AnalysisOutput } from '../engine/types.ts'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = resolve(__dirname, '../..')

/**
 * Start a Vite dev server with analysis data injected as a global.
 */
export async function startDevServer(
  data: AnalysisOutput,
  port: number,
  autoOpen: boolean,
): Promise<void> {
  const dataJson = JSON.stringify(data)

  const config: InlineConfig = {
    root: projectRoot,
    plugins: [svelte()],
    define: {
      '__TOKSTAT_DATA_JSON__': dataJson,
    },
    server: {
      port,
      open: autoOpen,
      strictPort: true,
    },
    // Suppress Vite's own logging — we print our own messages
    logLevel: 'warn',
  }

  const server = await createServer(config)
  await server.listen()

  console.log(`\n  Report available at http://localhost:${port}`)
  console.log('  Press Ctrl+C to exit\n')
}
