# Phase 3: Multi-Viz

## Goal

All four visualization layouts — treemap, sunburst, circle pack, icicle — working, with animated transitions between them that make you understand the data better, not just look cool.

This is the phase that makes tokstat memorable. Anyone can build a treemap. The morph from treemap to sunburst, rectangles flowing into arcs, the same data revealed from a different angle — that's what people will screenshot and share.

## End state

A `ToggleGroup` in the top bar lets you switch between Treemap, Sunburst, Pack, and Icicle. Clicking a different mode triggers an 800ms animated transition where every node morphs from its current shape and position to the target layout. Same data, same thermal colors, different spatial arrangement.

All four layouts support hover (tooltip), and the thermal scale works identically across all of them.

## Why four layouts

Each layout answers a different question:

**Treemap** — "Where is the money going?" Area = cost. The biggest rectangle is the most expensive subtree. Best for relative comparison. This is the default because it's the most immediately useful.

**Sunburst** — "What does the nesting look like?" Concentric rings = depth levels. Best for understanding structure. The center is the root; each ring outward is a deeper level. Click a slice to make it the new center (drill-down).

**Circle Pack** — "What are the outliers?" Nested circles with size = cost. A giant circle among small ones is immediately visible. Best for spotting anomalies — the one field that's 10x more expensive than everything else.

**Icicle** — "What's at each depth level?" Horizontal stacked bars, top to bottom. Best for scanning. Every field at the same depth is in the same row, making it easy to compare siblings. The most "table-like" layout for people who want structure.

The user doesn't need to know this rationale. They'll figure out which view answers their current question by switching between them. The tool should make switching so effortless and beautiful that exploring different views is the natural behavior.

## The transitions

This is the hard part and the most important part.

### Stable identity

Every node has a unique `path` (e.g., `root.endpoints[].endpoint_phrase`). This path is the same in every layout. When transitioning, the system looks up each node by path in both the source and target layouts and interpolates between the two positions.

Without stable identity, nodes would just fade out and fade in. With it, you can track a specific field as it moves from a rectangle to an arc to a circle. This is what makes transitions educational, not just pretty.

### What to interpolate

For each node, the transition interpolates:
- **Position**: x, y (center point or anchor)
- **Size**: width/height (treemap/icicle), radius (pack), start/end angle + inner/outer radius (sunburst)
- **Shape**: This is the hard one. A rectangle can't smoothly become an arc with just position interpolation. You need to either:
  - Use a common primitive (e.g., `<path>` elements that morph their `d` attribute)
  - Cross-fade shapes (opacity of old shape decreases while opacity of new shape increases, both moving to the target position)

The cross-fade approach is simpler and looks good enough. The pure path morphing approach is more impressive but significantly more complex. Start with cross-fade; upgrade to path morphing if it feels good enough to invest the time.

### Timing and easing

- Duration: 800ms (`--duration-viz`)
- Easing: `--ease-in-out` (smooth, not bouncy — this is data, not a toy)
- Stagger: None for transitions between views. All nodes move simultaneously. Stagger is for initial load and drill-down, not view switching.
- Labels: Hide during transition, show after settle. Moving labels are unreadable and distracting.

### Svelte implementation

Each node's visual properties (x, y, width, height, opacity, etc.) live in Svelte `tweened` stores. When the layout changes:
1. Compute new layout positions with D3
2. Update the tweened stores — Svelte automatically interpolates
3. SVG elements reactively update from the stores

The `tweened` function takes a duration and easing function, which map directly to the design tokens.

## Building each layout

### Sunburst

`d3.partition()` with radial projection. The key difference from treemap: it shows depth explicitly (each ring = one depth level).

- Inner radius: ~60px. The center shows the current root node name and total cost.
- Arc padding: 1px between slices.
- Labels: Along the arc for large slices, radial for medium, hidden for small. Text along a curved path is SVG's `<textPath>` — test readability at different sizes.

### Circle Pack

`d3.pack()` with padding 4px.

- Circle stroke: 1.5px in the node's thermal color
- Circle fill: thermal color at 15% opacity (transparent enough to see nesting)
- Labels: Centered inside circles large enough to fit text. This layout has the most label collision potential — be aggressive about hiding labels on small circles.

### Icicle

`d3.partition()` with linear (not radial) projection. Horizontal bars stacked top to bottom.

- Row height proportional to token cost
- Left-aligned labels in each bar, `--font-mono`
- This is the most information-dense layout — it's almost a table. Make sure it's scannable: consistent alignment, enough contrast between depth levels.

## How to know you're done

1. Switch between all four layouts. Every transition is smooth — no jumps, no flickering, no nodes appearing from nowhere.
2. Hover a field in treemap, note its thermal color. Switch to sunburst. Find the same field. Same color.
3. The toggle group in the top bar has the sliding active indicator from DESIGN.md.
4. Each layout is readable with real data — not just fixtures. Load a corpus with 50+ schema fields and verify nothing overlaps, nothing is unreadable, nothing is ugly.
5. You can tell which layout answers which question just by looking at them.
6. Someone watching over your shoulder says "whoa" when you switch layouts.
