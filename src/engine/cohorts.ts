import type { Cohort } from './types.ts'

type JsonType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null'

function getJsonType(value: unknown): JsonType {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  const t = typeof value
  if (t === 'string') return 'string'
  if (t === 'number') return 'number'
  if (t === 'boolean') return 'boolean'
  if (t === 'object') return 'object'
  return 'string'
}

/**
 * Compute a schema fingerprint from a document's top-level keys and their types.
 * This captures "schema shape" without over-splitting on nested optional fields.
 * e.g., { pmid: "123", title: "foo", endpoints: [...] } → "endpoints:array|pmid:string|title:string"
 */
export function fingerprint(doc: unknown): string {
  if (typeof doc !== 'object' || doc === null || Array.isArray(doc)) {
    return `_root:${getJsonType(doc)}`
  }
  const entries: string[] = []
  for (const key of Object.keys(doc as Record<string, unknown>).sort()) {
    entries.push(`${key}:${getJsonType((doc as Record<string, unknown>)[key])}`)
  }
  return entries.join('|')
}

/**
 * Group documents into cohorts by their schema fingerprint.
 */
export function detectCohorts(documents: unknown[]): Cohort[] {
  const groups = new Map<string, number[]>()

  for (let i = 0; i < documents.length; i++) {
    const fp = fingerprint(documents[i])
    let indices = groups.get(fp)
    if (!indices) {
      indices = []
      groups.set(fp, indices)
    }
    indices.push(i)
  }

  const cohorts: Cohort[] = []
  for (const [id, file_indices] of groups) {
    cohorts.push({
      id,
      label: generateCohortLabel(id, file_indices.length),
      file_count: file_indices.length,
      file_indices,
    })
  }

  // Sort by file count descending (largest cohort first)
  cohorts.sort((a, b) => b.file_count - a.file_count)
  return cohorts
}

/**
 * Generate a human-readable label from a fingerprint.
 * Extracts the key names (dropping types) and shows the first 3.
 * e.g., "endpoints:array|pmid:string|title:string" → "endpoints, pmid, title"
 */
function generateCohortLabel(fp: string, _fileCount: number): string {
  const keys = fp.split('|').map(entry => entry.split(':')[0])
  if (keys.length <= 3) return keys.join(', ')
  return keys.slice(0, 3).join(', ') + ` +${keys.length - 3}`
}
