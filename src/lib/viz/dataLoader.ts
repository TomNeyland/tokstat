import type { AnalysisOutput } from '../../engine/types'

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
export function loadAnalysisData(): AnalysisOutput | null {
  // Try embedded script tag first (self-contained HTML build)
  const scriptEl = document.getElementById('tokstat-data')
  if (scriptEl && scriptEl.textContent) {
    return JSON.parse(scriptEl.textContent) as AnalysisOutput
  }

  // Try Vite define-injected data (CLI dev server mode)
  try {
    if (typeof __TOKSTAT_DATA_JSON__ !== 'undefined') {
      return JSON.parse(__TOKSTAT_DATA_JSON__) as AnalysisOutput
    }
  } catch {
    // __TOKSTAT_DATA_JSON__ not defined — not running via CLI
  }

  // No data available
  return null
}
