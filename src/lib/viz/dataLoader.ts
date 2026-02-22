import type { CohortedOutput } from '../../engine/types'
import type { WorkerMessage } from '../../engine/worker'
import AnalysisWorker from '../../engine/worker?worker&inline'

// Vite's `define` replaces this identifier with the literal JSON string at
// serve/build time. When running `vite dev` without the tokstat CLI, this
// evaluates to `undefined` (the identifier is never defined).
declare const __TOKSTAT_DATA_JSON__: string | undefined

/**
 * Load analysis data from the appropriate source.
 *
 * Priority:
 * 1. Embedded <script id="tokstat-data"> tag (self-contained HTML)
 * 2. Vite `define`-injected JSON (CLI dev server mode)
 * 3. null (dev mode without data — app shows mock/reference)
 */
export function loadAnalysisData(): CohortedOutput | null {
  // Try embedded script tag first (self-contained HTML build)
  const scriptEl = document.getElementById('tokstat-data')
  if (scriptEl && scriptEl.textContent) {
    return JSON.parse(scriptEl.textContent) as CohortedOutput
  }

  // Try Vite define-injected data (CLI dev server mode)
  try {
    if (typeof __TOKSTAT_DATA_JSON__ !== 'undefined') {
      return JSON.parse(__TOKSTAT_DATA_JSON__) as CohortedOutput
    }
  } catch {
    // __TOKSTAT_DATA_JSON__ not defined — not running via CLI
  }

  // No data available
  return null
}

/**
 * Create a Web Worker pipeline for browser-local analysis.
 * Returns typed callbacks for progress and result events.
 */
export function createWorkerPipeline(): {
  analyze: (files: { name: string; content: string }[], model: string) => void
  onprogress: (cb: (processed: number, total: number) => void) => void
  onresult: (cb: (data: CohortedOutput) => void) => void
  terminate: () => void
} {
  const worker: Worker = new AnalysisWorker()

  let progressCb: ((processed: number, total: number) => void) | null = null
  let resultCb: ((data: CohortedOutput) => void) | null = null

  worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
    const msg = e.data
    if (msg.type === 'progress' && progressCb) {
      progressCb(msg.filesProcessed, msg.totalFiles)
    } else if (msg.type === 'result' && resultCb) {
      resultCb(msg.data)
    }
  }

  return {
    analyze(files, model) {
      worker.postMessage({ files, model })
    },
    onprogress(cb) {
      progressCb = cb
    },
    onresult(cb) {
      resultCb = cb
    },
    terminate() {
      worker.terminate()
    },
  }
}
