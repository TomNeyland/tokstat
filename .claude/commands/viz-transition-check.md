---
description: Verify that all visualization layout transitions work correctly. Run after modifying any viz mode.
---

# Viz Transition Check

There are N layouts. That means N*(N-1) transitions. Every one must work.

## Process

1. Read `src/lib/viz/` to enumerate all current layout components.

2. For each pair (A → B), verify:
   - [ ] Nodes have stable identity (keyed by JSON path) across both layouts
   - [ ] Position interpolation doesn't produce NaN, Infinity, or off-screen coordinates
   - [ ] No nodes are orphaned (present in A but missing in B, or vice versa)
   - [ ] Duration is `--duration-viz` (800ms)
   - [ ] Easing is `--ease-in-out`
   - [ ] Labels are hidden during transition, re-shown after settle
   - [ ] Thermal color is preserved (same node = same color in both layouts)

3. For each layout, verify self-transition (drill down within the same layout):
   - [ ] Click a node → children expand, parent fades to context
   - [ ] Breadcrumb updates
   - [ ] Back navigation (click breadcrumb ancestor) reverses the animation

4. Edge cases:
   - [ ] Transition with only 1 node (root with no children visible)
   - [ ] Transition with 100+ nodes (performance, stagger cap at 300ms total)
   - [ ] Transition mid-transition (interrupt one animation with another)

## Output

Matrix of all transitions with pass/fail:

```
         → Treemap  → Sunburst  → Pack  → Icicle
Treemap      -         [ ]        [ ]      [ ]
Sunburst    [ ]         -         [ ]      [ ]
Pack        [ ]        [ ]         -       [ ]
Icicle      [ ]        [ ]        [ ]       -
```
