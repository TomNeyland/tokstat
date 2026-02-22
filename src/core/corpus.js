// @ts-nocheck
import { analyzeRecords } from './analyze.js'

export function analyzeCorpusWithCohorts(records, options = {}) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('No JSON records provided')
  }

  const combined = analyzeRecords(records, options)
  const threshold = Number(options.cohortSimilarityThreshold ?? 0.72)
  const groups = clusterRecordsBySchema(records, { threshold })

  const cohorts = groups
    .map((group, index) => ({
      id: `cohort-${index + 1}`,
      label: `Cohort ${index + 1}`,
      file_count: group.records.length,
      sample_files: group.records.slice(0, 4).map((r) => r.path),
      top_level_keys: [...group.topKeys].sort(),
      similarity_note: group.note,
      report: analyzeRecords(group.records, {
        ...options,
        glob: `${group.records.length} files (${group.records.slice(0, 2).map((r) => r.path).join(', ')}${group.records.length > 2 ? ', …' : ''})`,
      }),
    }))
    .sort((a, b) => b.file_count - a.file_count || b.report.tree.tokens.total.avg - a.report.tree.tokens.total.avg)
    .map((cohort, index) => ({ ...cohort, label: `Cohort ${index + 1}` }))

  return {
    schema: 'tokstat/corpus-bundle/v1',
    combined,
    cohorts,
    cohorting: {
      enabled: true,
      file_count: records.length,
      cohort_count: cohorts.length,
      threshold,
      mixed_schema_detected: cohorts.length > 1,
    },
  }
}

export function clusterRecordsBySchema(records, options = {}) {
  const threshold = Number(options.threshold ?? 0.72)
  const profiles = records
    .map((record) => ({ record, profile: fingerprintRecord(record.parsed) }))
    .sort((a, b) => a.record.path.localeCompare(b.record.path))

  const groups = []

  for (const item of profiles) {
    let best = null
    for (const group of groups) {
      const score = similarityToGroup(item.profile, group)
      if (!best || score > best.score) {
        best = { group, score }
      }
    }

    if (!best || best.score < threshold) {
      groups.push(createGroup(item))
      continue
    }

    addToGroup(best.group, item)
  }

  return groups
}

function createGroup(item) {
  return {
    records: [item.record],
    profiles: [item.profile],
    unionFeatures: new Map(item.profile.features),
    topKeys: new Set(item.profile.topKeys),
    depths: [item.profile.maxDepth],
    note: `seed top keys: ${[...item.profile.topKeys].slice(0, 4).join(', ')}`,
  }
}

function addToGroup(group, item) {
  group.records.push(item.record)
  group.profiles.push(item.profile)
  for (const [feature, weight] of item.profile.features.entries()) {
    const prev = group.unionFeatures.get(feature) ?? 0
    group.unionFeatures.set(feature, Math.max(prev, weight))
  }
  for (const key of item.profile.topKeys) {
    group.topKeys.add(key)
  }
  group.depths.push(item.profile.maxDepth)
}

function similarityToGroup(profile, group) {
  // Blend top-level key similarity with weighted structural path/type similarity.
  const top = jaccardSet(profile.topKeys, group.topKeys)
  const struct = weightedJaccard(profile.features, group.unionFeatures)
  const depthDelta = Math.abs(profile.maxDepth - median(group.depths))
  const depthPenalty = Math.min(0.2, depthDelta * 0.04)
  return 0.6 * top + 0.4 * struct - depthPenalty
}

function fingerprintRecord(rootValue) {
  if (!isPlainObject(rootValue)) {
    throw new Error('Top-level JSON must be an object for cohorting')
  }

  const features = new Map()
  const topKeys = new Set(Object.keys(rootValue))
  let maxDepth = 0

  walk(rootValue, 'root', 0)

  return { features, topKeys, maxDepth }

  function walk(value, path, depth) {
    maxDepth = Math.max(maxDepth, depth)
    const type = getJsonType(value)
    addFeature(`${path}:${type}`, depth, 1.2)

    if (value === null) return

    if (Array.isArray(value)) {
      addFeature(`${path}:array_items`, depth, 0.8)
      const sample = value.slice(0, Math.min(3, value.length))
      for (const item of sample) {
        walk(item, `${path}[]`, depth + 1)
      }
      return
    }

    if (isPlainObject(value)) {
      const keys = Object.keys(value).sort()
      addFeature(`${path}:{${keys.join('|')}}`, depth, depth <= 1 ? 1.5 : 0.5)
      for (const key of keys) {
        walk(value[key], `${path}.${key}`, depth + 1)
      }
    }
  }

  function addFeature(feature, depth, scale = 1) {
    const weight = depth === 0 ? 4 * scale : depth === 1 ? 3 * scale : depth === 2 ? 2 * scale : 1 * scale
    const prev = features.get(feature) ?? 0
    features.set(feature, Math.max(prev, weight))
  }
}

function weightedJaccard(a, b) {
  const keys = new Set([...a.keys(), ...b.keys()])
  let minSum = 0
  let maxSum = 0
  for (const key of keys) {
    const av = a.get(key) ?? 0
    const bv = b.get(key) ?? 0
    minSum += Math.min(av, bv)
    maxSum += Math.max(av, bv)
  }
  return maxSum > 0 ? minSum / maxSum : 1
}

function jaccardSet(a, b) {
  const union = new Set([...a, ...b])
  if (union.size === 0) return 1
  let intersection = 0
  for (const value of a) {
    if (b.has(value)) intersection += 1
  }
  return intersection / union.size
}

function median(values) {
  if (!values.length) return 0
  const sorted = [...values].sort((x, y) => x - y)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function getJsonType(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (isPlainObject(value)) return 'object'
  return typeof value
}
