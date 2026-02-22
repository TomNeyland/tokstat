import { createServer } from 'node:http'
import open from 'open'
import type { CohortedOutput } from '../engine/types.ts'

const APP_URL = 'https://tomneyland.github.io/tokstat/other/index.html'

/**
 * Fetch the deployed tokstat app, inject analysis data, serve locally.
 *
 * The app is a single self-contained HTML file (built by vite-plugin-singlefile
 * and deployed to GH Pages). It already looks for a <script id="tokstat-data">
 * tag to load embedded analysis results.
 */
export async function startServer(
  data: CohortedOutput,
  port: number,
  autoOpen: boolean,
): Promise<void> {
  // Fetch the latest deployed app
  const resp = await fetch(APP_URL)
  const html = await resp.text()

  // Inject analysis data before </head>
  const dataScript = `<script id="tokstat-data" type="application/json">${JSON.stringify(data)}</script>`
  const injectedHtml = html.replace('</head>', `${dataScript}\n</head>`)

  const server = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(injectedHtml)
  })

  server.listen(port, () => {
    const url = `http://localhost:${port}`
    console.log(`\n  Report available at ${url}`)
    console.log('  Press Ctrl+C to exit\n')
    if (autoOpen) open(url)
  })

  process.on('SIGINT', () => { server.close(); process.exit(0) })
  process.on('SIGTERM', () => { server.close(); process.exit(0) })

  // Block forever — server runs until killed
  await new Promise(() => {})
}
