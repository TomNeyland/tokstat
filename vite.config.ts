import { defineConfig, type Plugin } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { readFileSync } from 'node:fs'

/**
 * Vite plugin that injects tokstat analysis data into the HTML.
 * Reads from TOKSTAT_DATA_PATH env var (set by the CLI).
 */
function tokstatDataPlugin(): Plugin {
  return {
    name: 'tokstat-data-inject',
    transformIndexHtml(html) {
      const dataPath = process.env.TOKSTAT_DATA_PATH
      if (!dataPath) return html

      const dataJson = readFileSync(dataPath, 'utf-8')
      const dataScript = `<script id="tokstat-data" type="application/json">${dataJson}</script>`
      return html.replace('</head>', `${dataScript}\n</head>`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    tokstatDataPlugin(),
    viteSingleFile(),
  ],
  build: {
    assetsInlineLimit: Infinity,
    cssCodeSplit: false,
  },
})
