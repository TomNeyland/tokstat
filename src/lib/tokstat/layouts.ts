export type ViewMode = 'treemap' | 'sunburst' | 'pack' | 'icicle'

type AnalysisNode = any

type BaseShape = {
  node: AnalysisNode
  path: string
  depth: number
  label: string
  value: number
  hasChildren: boolean
}

export type TreemapShape = BaseShape & {
  kind: 'rect'
  x: number
  y: number
  width: number
  height: number
}

export type IcicleShape = BaseShape & {
  kind: 'rect'
  x: number
  y: number
  width: number
  height: number
}

export type PackShape = BaseShape & {
  kind: 'circle'
  cx: number
  cy: number
  r: number
}

export type SunburstShape = BaseShape & {
  kind: 'arc'
  cx: number
  cy: number
  innerR: number
  outerR: number
  startAngle: number
  endAngle: number
}

export function flattenNodes(root: AnalysisNode): AnalysisNode[] {
  const out: AnalysisNode[] = []
  walk(root, (node) => out.push(node))
  return out
}

export function findNode(root: AnalysisNode, path: string): AnalysisNode | null {
  let found: AnalysisNode | null = null
  walk(root, (node) => {
    if (!found && node.path === path) found = node
  })
  return found
}

export function maxDepth(root: AnalysisNode): number {
  let max = 0
  walk(root, (node) => { if (node.depth > max) max = node.depth })
  return max
}

export function computeLayout(mode: ViewMode, root: AnalysisNode, width: number, height: number) {
  const safeWidth = Math.max(240, width)
  const safeHeight = Math.max(180, height)
  if (mode === 'treemap') return treemapLayout(root, safeWidth, safeHeight)
  if (mode === 'icicle') return icicleLayout(root, safeWidth, safeHeight)
  if (mode === 'pack') return packLayout(root, safeWidth, safeHeight)
  return sunburstLayout(root, safeWidth, safeHeight)
}

export function describeArc(shape: SunburstShape): string {
  const largeArc = shape.endAngle - shape.startAngle > Math.PI ? 1 : 0
  const p1 = polar(shape.cx, shape.cy, shape.outerR, shape.startAngle)
  const p2 = polar(shape.cx, shape.cy, shape.outerR, shape.endAngle)
  const p3 = polar(shape.cx, shape.cy, shape.innerR, shape.endAngle)
  const p4 = polar(shape.cx, shape.cy, shape.innerR, shape.startAngle)
  if (shape.outerR <= 0 || shape.endAngle <= shape.startAngle) return ''
  if (shape.innerR <= 0) {
    return `M ${shape.cx} ${shape.cy} L ${p1.x} ${p1.y} A ${shape.outerR} ${shape.outerR} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`
  }
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${shape.outerR} ${shape.outerR} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${shape.innerR} ${shape.innerR} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ')
}

function treemapLayout(root: AnalysisNode, width: number, height: number): TreemapShape[] {
  const shapes: TreemapShape[] = []
  partitionTreemap(root, 0, 0, width, height, 0)
  return shapes

  function partitionTreemap(node: AnalysisNode, x: number, y: number, w: number, h: number, level: number) {
    if (node.path !== root.path) {
      shapes.push({
        kind: 'rect',
        node,
        path: node.path,
        depth: node.depth,
        label: node.name,
        value: node.tokens.total.avg,
        hasChildren: (node.children?.length ?? 0) > 0,
        x,
        y,
        width: Math.max(0, w),
        height: Math.max(0, h),
      })
    }
    const children = (node.children ?? []).filter((child: AnalysisNode) => (child.tokens?.total?.avg ?? 0) > 0)
    if (children.length === 0) return

    const gap = 2
    const innerX = x + gap
    const innerY = y + gap
    const innerW = Math.max(0, w - gap * 2)
    const innerH = Math.max(0, h - gap * 2)
    if (innerW < 8 || innerH < 8) return

    const sortedChildren = [...children].sort((a, b) => b.tokens.total.avg - a.tokens.total.avg)
    const total = sum(sortedChildren.map((c: AnalysisNode) => c.tokens.total.avg)) || 1
    const horizontal = innerW >= innerH ? level % 2 === 0 : level % 2 !== 0
    let offset = 0

    sortedChildren.forEach((child, index) => {
      const fraction = (child.tokens.total.avg || 0) / total
      if (horizontal) {
        const cw = index === sortedChildren.length - 1 ? innerW - offset : innerW * fraction
        partitionTreemap(child, innerX + offset, innerY, cw, innerH, level + 1)
        offset += cw
      }
      else {
        const ch = index === sortedChildren.length - 1 ? innerH - offset : innerH * fraction
        partitionTreemap(child, innerX, innerY + offset, innerW, ch, level + 1)
        offset += ch
      }
    })
  }
}

function icicleLayout(root: AnalysisNode, width: number, height: number): IcicleShape[] {
  const all = flattenNodes(root)
  const rootDepth = root.depth
  const localMaxDepth = Math.max(...all.map((n) => n.depth - rootDepth), 0)
  const rowHeight = height / Math.max(1, localMaxDepth + 1)
  const shapes: IcicleShape[] = []

  layoutRow(root, 0, 0, width)
  return shapes

  function layoutRow(node: AnalysisNode, x: number, startY: number, rowWidth: number) {
    const y = startY + (node.depth - rootDepth) * rowHeight
    if (node.path !== root.path) {
      shapes.push({
        kind: 'rect', node, path: node.path, depth: node.depth, label: node.name,
        value: node.tokens.total.avg, hasChildren: (node.children?.length ?? 0) > 0,
        x, y, width: rowWidth, height: rowHeight - 2,
      })
    }
    const children = (node.children ?? []).filter((c: AnalysisNode) => (c.tokens?.total?.avg ?? 0) > 0)
    const total = sum(children.map((c: AnalysisNode) => c.tokens.total.avg)) || 1
    let offset = 0
    for (const child of children) {
      const w = child === children.at(-1) ? rowWidth - offset : rowWidth * (child.tokens.total.avg / total)
      layoutRow(child, x + offset, startY, w)
      offset += w
    }
  }
}

function sunburstLayout(root: AnalysisNode, width: number, height: number): SunburstShape[] {
  const shapes: SunburstShape[] = []
  const cx = width / 2
  const cy = height / 2
  const radius = Math.max(40, Math.min(width, height) / 2 - 12)
  const localDepth = Math.max(1, maxDepth(root) - root.depth)
  const band = radius / (localDepth + 1)

  partition(root, 0, Math.PI * 2)
  return shapes

  function partition(node: AnalysisNode, startAngle: number, endAngle: number) {
    const depthOffset = node.depth - root.depth
    if (node.path !== root.path) {
      shapes.push({
        kind: 'arc',
        node,
        path: node.path,
        depth: node.depth,
        label: node.name,
        value: node.tokens.total.avg,
        hasChildren: (node.children?.length ?? 0) > 0,
        cx,
        cy,
        innerR: Math.max(0, depthOffset * band + 10),
        outerR: Math.max(0, (depthOffset + 1) * band),
        startAngle,
        endAngle,
      })
    }

    const children = (node.children ?? []).filter((c: AnalysisNode) => (c.tokens?.total?.avg ?? 0) > 0)
    const total = sum(children.map((c: AnalysisNode) => c.tokens.total.avg)) || 1
    let cursor = startAngle
    for (const child of children) {
      const span = (endAngle - startAngle) * (child.tokens.total.avg / total)
      partition(child, cursor, cursor + span)
      cursor += span
    }
  }
}

function packLayout(root: AnalysisNode, width: number, height: number): PackShape[] {
  const shapes: PackShape[] = []
  const cx = width / 2
  const cy = height / 2
  const radius = Math.max(50, Math.min(width, height) / 2 - 12)
  place(root, cx, cy, radius)
  return shapes

  function place(node: AnalysisNode, x: number, y: number, r: number) {
    if (node.path !== root.path) {
      shapes.push({
        kind: 'circle', node, path: node.path, depth: node.depth, label: node.name,
        value: node.tokens.total.avg, hasChildren: (node.children?.length ?? 0) > 0,
        cx: x, cy: y, r,
      })
    }
    const children = (node.children ?? []).filter((c: AnalysisNode) => (c.tokens?.total?.avg ?? 0) > 0)
    if (children.length === 0 || r < 18) return

    const total = sum(children.map((c: AnalysisNode) => Math.max(c.tokens.total.avg, 0.001))) || 1
    const sorted = [...children].sort((a, b) => b.tokens.total.avg - a.tokens.total.avg)
    const maxChildR = Math.max(8, r * 0.42)
    const ringR = Math.max(0, r - maxChildR - 8)

    sorted.forEach((child, i) => {
      const frac = Math.max(child.tokens.total.avg, 0.001) / total
      const childR = Math.max(8, Math.min(maxChildR, Math.sqrt(frac) * r * 0.9))
      const angle = (Math.PI * 2 * i) / sorted.length - Math.PI / 2
      const distance = sorted.length === 1 ? 0 : Math.max(0, ringR - childR * 0.25)
      place(child, x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, childR)
    })
  }
}

function walk(node: AnalysisNode, fn: (node: AnalysisNode) => void) {
  fn(node)
  for (const child of node.children ?? []) {
    walk(child, fn)
  }
}

function sum(values: number[]) {
  let total = 0
  for (const value of values) total += value || 0
  return total
}

function polar(cx: number, cy: number, r: number, a: number) {
  return { x: cx + Math.cos(a - Math.PI / 2) * r, y: cy + Math.sin(a - Math.PI / 2) * r }
}
