import type { AnalysisOutput } from '../engine/types.ts'

/**
 * Serialize the full analysis output as JSON.
 * Sets are converted to arrays for JSON compatibility.
 */
export function formatJson(output: AnalysisOutput): string {
  return JSON.stringify(output, null, 2)
}
