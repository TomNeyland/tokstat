import { scaleSequential, scaleOrdinal } from 'd3-scale'
import { interpolateRgbBasis } from 'd3-interpolate'

// ── Thermal stops from tokens.css ──
const THERMAL_STOPS = [
  '#2E5EAA', // 0 — coldest
  '#3B8BD4', // 1
  '#47BFA8', // 2
  '#6BD48E', // 3
  '#B8D44A', // 4
  '#F0C63A', // 5
  '#F09A3A', // 6
  '#EB6E45', // 7
  '#E04562', // 8
  '#D42B7B', // 9 — hottest
]

// ── Thermal scale: [0,1] → color ──
export const thermalScale = scaleSequential(interpolateRgbBasis(THERMAL_STOPS)).domain([0, 1])

// ── Fill rate scale ──
const FILL_STOPS = [
  '#5C5C73', // empty
  '#F09A3A', // sparse
  '#F0C63A', // partial
  '#47BFA8', // full
]

export const fillRateScale = scaleSequential(interpolateRgbBasis(FILL_STOPS)).domain([0, 1])

// ── Overhead scale: high schema → high value ──
const OVERHEAD_STOPS = [
  '#47BFA8', // value-heavy (teal)
  '#8B7FFF', // schema-heavy (violet)
]

export const overheadScale = scaleSequential(interpolateRgbBasis(OVERHEAD_STOPS)).domain([0, 1])

// ── Depth scale: categorical palette ──
const DEPTH_COLORS = [
  '#8B7FFF', // depth 0 — accent
  '#3B8BD4', // depth 1
  '#47BFA8', // depth 2
  '#6BD48E', // depth 3
  '#F0C63A', // depth 4
  '#EB6E45', // depth 5+
]

export const depthScale = scaleOrdinal<number, string>()
  .domain([0, 1, 2, 3, 4, 5])
  .range(DEPTH_COLORS)

// ── Glow parameters based on thermal value (0-1) ──
// Subtle glow — cold nodes don't glow at all, hot nodes get a faint halo.
// In dense layouts the overlapping halos compound, so keep this restrained.
export function glowParams(t: number): { radius: number; opacity: number } {
  // Only the hottest 40% of nodes glow at all
  const intensity = Math.max(0, (t - 0.6) / 0.4)
  return {
    radius: intensity * 12, // 0px at cold → 12px at hottest
    opacity: intensity * 0.2, // 0% at cold → 20% at hottest
  }
}

// ── Normalize values to [0,1] using rank-based normalization ──
// Rank normalization handles skewed distributions much better than linear
export function rankNormalize(values: number[]): Map<number, number> {
  const sorted = [...new Set(values)].sort((a, b) => a - b)
  const n = sorted.length
  const map = new Map<number, number>()
  for (let i = 0; i < n; i++) {
    map.set(sorted[i], n === 1 ? 0.5 : i / (n - 1))
  }
  return map
}
