import {
  hierarchy,
  pack,
  partition,
  treemap,
  treemapSquarify,
  type HierarchyNode,
  type HierarchyRectangularNode,
  type HierarchyCircularNode,
} from 'd3'

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

function treemapLayout(rootNode: AnalysisNode, width: number, height: number): TreemapShape[] {
  const root = hierarchyFor(rootNode)

  const layoutRoot = treemap<AnalysisNode>()
    .size([width, height])
    .paddingOuter(2)
    .paddingInner(2)
    .paddingTop((node: HierarchyRectangularNode<AnalysisNode>) => (node.depth === 0 ? 2 : 1))
    .tile(treemapSquarify)
    (root) as HierarchyRectangularNode<AnalysisNode>

  const shapes: TreemapShape[] = []
  layoutRoot.descendants().forEach((node) => {
    if (!node.parent) return
    const datum = node.data
    shapes.push({
      kind: 'rect',
      node: datum,
      path: datum.path,
      depth: datum.depth,
      label: datum.name,
      value: datum.tokens?.total?.avg ?? 0,
      hasChildren: (datum.children?.length ?? 0) > 0,
      x: node.x0,
      y: node.y0,
      width: Math.max(0, node.x1 - node.x0),
      height: Math.max(0, node.y1 - node.y0),
    })
  })

  return shapes
}

function icicleLayout(rootNode: AnalysisNode, width: number, height: number): IcicleShape[] {
  const root = hierarchyFor(rootNode)

  const layoutRoot = partition<AnalysisNode>()
    .size([width, height])
    .padding(1)
    (root) as HierarchyRectangularNode<AnalysisNode>

  const shapes: IcicleShape[] = []
  layoutRoot.descendants().forEach((node) => {
    if (!node.parent) return
    const datum = node.data
    shapes.push({
      kind: 'rect',
      node: datum,
      path: datum.path,
      depth: datum.depth,
      label: datum.name,
      value: datum.tokens?.total?.avg ?? 0,
      hasChildren: (datum.children?.length ?? 0) > 0,
      x: node.x0,
      y: node.y0,
      width: Math.max(0, node.x1 - node.x0),
      height: Math.max(0, node.y1 - node.y0),
    })
  })

  return shapes
}

function sunburstLayout(rootNode: AnalysisNode, width: number, height: number): SunburstShape[] {
  const root = hierarchyFor(rootNode)
  const radius = Math.max(40, Math.min(width, height) / 2 - 12)

  const layoutRoot = partition<AnalysisNode>()
    .size([Math.PI * 2, radius])
    .padding(0.002)
    (root) as HierarchyRectangularNode<AnalysisNode>

  const cx = width / 2
  const cy = height / 2
  const shapes: SunburstShape[] = []

  layoutRoot.descendants().forEach((node) => {
    if (!node.parent) return
    const datum = node.data
    const inner = Math.max(0, node.y0)
    const outer = Math.max(inner + 0.0001, node.y1)
    shapes.push({
      kind: 'arc',
      node: datum,
      path: datum.path,
      depth: datum.depth,
      label: datum.name,
      value: datum.tokens?.total?.avg ?? 0,
      hasChildren: (datum.children?.length ?? 0) > 0,
      cx,
      cy,
      innerR: inner,
      outerR: outer,
      startAngle: node.x0,
      endAngle: node.x1,
    })
  })

  return shapes
}

function packLayout(rootNode: AnalysisNode, width: number, height: number): PackShape[] {
  const root = hierarchyFor(rootNode)

  const layoutRoot = pack<AnalysisNode>()
    .size([width, height])
    .padding(4)
    (root) as HierarchyCircularNode<AnalysisNode>

  const shapes: PackShape[] = []
  layoutRoot.descendants().forEach((node) => {
    if (!node.parent) return
    const datum = node.data
    shapes.push({
      kind: 'circle',
      node: datum,
      path: datum.path,
      depth: datum.depth,
      label: datum.name,
      value: datum.tokens?.total?.avg ?? 0,
      hasChildren: (datum.children?.length ?? 0) > 0,
      cx: node.x,
      cy: node.y,
      r: node.r,
    })
  })

  return shapes
}

function hierarchyFor(rootNode: AnalysisNode): HierarchyNode<AnalysisNode> {
  return hierarchy(rootNode, (node: AnalysisNode) => (node.children ?? []).filter((child: AnalysisNode) => (child.tokens?.total?.avg ?? 0) > 0))
    .sum((node: AnalysisNode) => Math.max(0, node.tokens?.total?.avg ?? 0))
    .sort((a: HierarchyNode<AnalysisNode>, b: HierarchyNode<AnalysisNode>) => (b.value ?? 0) - (a.value ?? 0))
}

function walk(node: AnalysisNode, fn: (node: AnalysisNode) => void) {
  fn(node)
  for (const child of node.children ?? []) {
    walk(child, fn)
  }
}

function polar(cx: number, cy: number, r: number, a: number) {
  return { x: cx + Math.cos(a - Math.PI / 2) * r, y: cy + Math.sin(a - Math.PI / 2) * r }
}
