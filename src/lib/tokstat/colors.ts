const THERMAL = ['#2E5EAA', '#3B8BD4', '#47BFA8', '#6BD48E', '#B8D44A', '#F0C63A', '#F09A3A', '#EB6E45', '#E04562', '#D42B7B']
const FILL_STOPS = [
  { t: 0, c: '#5C5C73' },
  { t: 0.2, c: '#F09A3A' },
  { t: 0.5, c: '#F0C63A' },
  { t: 1, c: '#47BFA8' },
]

export type ColorMode = 'cost' | 'fill' | 'overhead' | 'depth'

export function thermalColor(t: number): string {
  return interpolateStops(THERMAL, clamp01(t))
}

export function fillRateColor(fillRate: number): string {
  const t = clamp01(fillRate)
  for (let i = 0; i < FILL_STOPS.length - 1; i += 1) {
    const a = FILL_STOPS[i]
    const b = FILL_STOPS[i + 1]
    if (t >= a.t && t <= b.t) {
      return mixHex(a.c, b.c, (t - a.t) / (b.t - a.t || 1))
    }
  }
  return FILL_STOPS.at(-1)!.c
}

export function overheadColor(schemaRatio: number): string {
  return mixHex('#47BFA8', '#8B7FFF', clamp01(schemaRatio))
}

export function depthColor(depth: number): string {
  const palette = ['#3B8BD4', '#47BFA8', '#F0C63A', '#EB6E45', '#8B7FFF', '#D42B7B']
  return palette[Math.abs(depth) % palette.length]
}

export function nodeColorForMode(node: any, mode: ColorMode, context: { maxCost: number }) {
  if (mode === 'fill') return fillRateColor(node.fill_rate ?? 0)
  if (mode === 'overhead') {
    const total = node.tokens?.total?.avg ?? 0
    const ratio = total > 0 ? (node.tokens.schema_overhead ?? 0) / total : 0
    return overheadColor(ratio)
  }
  if (mode === 'depth') return depthColor(node.depth ?? 0)
  const cost = node.tokens?.total?.avg ?? 0
  const maxCost = Math.max(context.maxCost, 1)
  const t = Math.log1p(cost) / Math.log1p(maxCost)
  return thermalColor(t)
}

export function glowForColor(hex: string, intensity = 0.3) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${clamp01(intensity)})`
}

function interpolateStops(colors: string[], t: number): string {
  const scaled = t * (colors.length - 1)
  const i = Math.floor(scaled)
  const j = Math.min(colors.length - 1, i + 1)
  const frac = scaled - i
  return mixHex(colors[i], colors[j], frac)
}

function mixHex(a: string, b: string, t: number): string {
  const ar = hexToRgb(a)
  const br = hexToRgb(b)
  const r = Math.round(ar.r + (br.r - ar.r) * t)
  const g = Math.round(ar.g + (br.g - ar.g) * t)
  const b2 = Math.round(ar.b + (br.b - ar.b) * t)
  return `#${toHex(r)}${toHex(g)}${toHex(b2)}`
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  }
}

function toHex(n: number) {
  return n.toString(16).padStart(2, '0')
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n || 0))
}
