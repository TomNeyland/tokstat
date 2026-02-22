---
description: Add a new D3 visualization layout to tokstat. Ensures all integration points are covered.
---

# New Visualization Mode

You are adding a new D3 layout to tokstat's visualization system. This is the most important code in the project — the viz IS the product.

## Arguments

$ARGUMENTS = the layout name and D3 function (e.g., "Sunburst using d3.partition() with radial projection")

## Checklist

### 1. Layout implementation
- [ ] Create `src/lib/viz/{LayoutName}.svelte`
- [ ] D3 computes layout positions only. Svelte renders all DOM elements.
- [ ] No D3 selections (`.select()`, `.enter()`, `.exit()`). Use `{#each}` blocks.
- [ ] Input: `d3.hierarchy()` node (same object all viz modes share)
- [ ] Output: positioned SVG elements with thermal coloring

### 2. Stable node identity
- [ ] Every node keyed by its JSON path (e.g., `root.endpoints[].adverse_events[]`)
- [ ] Key must be identical across all viz modes — this is what makes transitions work
- [ ] Use Svelte `{#each nodes as node (node.data.path)}` keyed each blocks

### 3. Thermal coloring
- [ ] Node color derived from thermal scale based on current color encoding mode
- [ ] All four color modes work: Cost, Fill Rate, Overhead, Depth
- [ ] Glow intensity scales with thermal value (cold = 8px/15%, hot = 24px/30%)

### 4. Interaction
- [ ] Click: drill down into subtree (clicked node becomes root)
- [ ] Hover: instant highlight (50ms), tooltip positioned near cursor
- [ ] The layout exposes node positions for tooltip placement

### 5. Transitions TO this layout
- [ ] From every existing layout, nodes must animate to their new positions
- [ ] Svelte `tweened` stores interpolate per-node: x, y, width/height/radius/angle
- [ ] Duration: `--duration-viz` (800ms), easing: `--ease-in-out`
- [ ] Test: switch from each existing layout to this one. No jumps, no orphans.

### 6. Transitions FROM this layout
- [ ] This layout must expose current node positions for outgoing transitions
- [ ] When switching away, nodes interpolate from current positions to target layout
- [ ] Test: switch from this layout to each existing layout

### 7. Labels
- [ ] Field name displayed inside/along the node when it's large enough
- [ ] Minimum size threshold for label visibility (avoid label soup)
- [ ] Labels hidden during transitions, shown after settle

### 8. Reference page
- [ ] Add a static/mini preview of this layout to the design reference page
- [ ] Add to the ToggleGroup options in the reference page demo

### 9. Design spec
- [ ] Add layout spec to DESIGN.md under "Data Visualization" section
- [ ] Document: tiling/packing algorithm, padding, label rules, minimum sizes
