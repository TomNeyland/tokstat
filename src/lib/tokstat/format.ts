export function fmtUsd(value: number): string {
  if (!Number.isFinite(value)) return '$0'
  if (value >= 100) return `$${value.toFixed(0)}`
  if (value >= 1) return `$${value.toFixed(2)}`
  if (value >= 0.01) return `$${value.toFixed(3)}`
  return `$${value.toFixed(4)}`
}

export function fmtTok(value: number): string {
  if (!Number.isFinite(value)) return '0'
  if (value >= 1000) return `${Math.round(value).toLocaleString()} tok`
  return `${round(value, 1)} tok`
}

export function fmtPct(value: number): string {
  return `${Math.round((value || 0) * 100)}%`
}

export function shortPath(path: string): string {
  return path.replace(/^root\.?/, '') || 'root'
}

export function round(n: number, places = 2): number {
  const p = 10 ** places
  return Math.round((n || 0) * p) / p
}
