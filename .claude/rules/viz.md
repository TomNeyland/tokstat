---
paths:
  - "src/lib/viz/**/*.{svelte,ts}"
---

# Visualization

These are the most important files in the project. The viz IS the product.

- D3 for layout math only. Svelte renders the DOM. No D3 selections, no enter/exit/update.
- Thermal scale is the hero: cool blue (#2E5EAA) → hot magenta (#D42B7B). Consistent across every view.
- Layout transitions (treemap ↔ sunburst ↔ pack ↔ icicle): 800ms, spring physics, Svelte `tweened`.
- Every node has a stable identity (its JSON path). Transitions interpolate per-node.
- Glow intensity scales with thermal value. Hot fields literally glow.
- No charting libraries. We own every pixel.
