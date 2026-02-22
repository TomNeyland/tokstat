# Phase 4: Insights

## Goal

Transform tokstat from "beautiful data browser" into "I know exactly what to change." This is the phase that justifies the tool's existence beyond novelty.

## End state

The user opens tokstat, glances at the headline stats, sees insight annotations on the visualization, opens the schema diet panel, checks three fields to cut, and knows they'll save $1,200/year. Under 60 seconds from open to decision.

## The difference this phase makes

After Phase 3, a user looks at the treemap and thinks "ok, `endpoints[]` is big and red." They know WHERE the cost is but not WHAT TO DO. Phase 4 answers "so what?" with specific, quantified, actionable recommendations.

The insights layer doesn't just decorate the visualization — it changes how you read it. A treemap without insights is a map. A treemap with insights is a treasure map with X marks.

## What to build, in order

### 1. Summary bar

The hero stats across the top of every view. This is the first thing the user's eye hits.

3-4 `StatBlock` components in a horizontal row:
- **$X.XX/instance** — the per-generation cost (mono-2xl, primary)
- **XX% overhead** — the schema overhead ratio, thermal-colored (the headline number from the brainstorm)
- **XX% null waste** — what fraction of tokens are spent generating nulls
- One-liner insight: the single most impactful recommendation as a sentence

These already partially exist from Phase 2 (the top bar stats). Phase 4 adds the overhead ratio, null waste ratio, and the one-liner insight.

### 2. Insight annotations on the visualization

Nodes that have associated insights get a visual indicator in every layout mode. Something subtle but discoverable — a small pulsing dot, a dashed border segment, a tiny icon in the corner of the treemap cell.

The annotation must:
- Be visible without hovering (it's a discovery affordance)
- Not overwhelm the viz when many nodes have insights (cap at top 10 most impactful)
- Use a consistent visual language across all four layouts
- Not interfere with the thermal color encoding

Clicking an annotation opens the insight detail inline — either in the tooltip or in the detail panel.

### 3. Drill-down

Click any node in any layout to zoom into that subtree. The clicked node becomes the new root. The visualization re-renders with just that subtree's children. The breadcrumb updates to show the path back.

The animation: the clicked node expands to fill the view while its siblings fade out. Children that were invisible (too small) become visible. This is a zoom, not a page transition.

Click any breadcrumb ancestor to zoom back out. The reverse animation: children shrink back, siblings fade in, the parent contracts to its original position.

Drill-down works identically in all four layouts. The breadcrumb bar is the universal navigation control.

### 4. Detail panel

A slide-in panel from the right (360px width, pushes the viz area) that shows full details for a selected node.

The panel contains:
- Field name, path, and type badge
- Token breakdown: `TokenBar` component showing schema/value/null decomposition
- Stats table: avg, min, max, p50, p95 token counts
- Fill rate bar
- Cost at selected model
- Array stats (if array): avg/min/max items
- String stats (if string): avg length, value diversity
- Example values: 3-5 sampled real values from the corpus
- Associated insights (if any): the full insight text with savings numbers

The panel opens on click (single click = drill-down AND panel open, or: click = drill-down, double-click = panel? This needs UX testing — try both and see which feels right. The important thing is that getting to the detail feels instant and effortless.)

### 5. Schema diet

The flagship insight feature. A dedicated view (tab or panel mode) that shows all fields below a configurable fill rate threshold, ranked by waste.

The interaction: a list of fields with checkboxes. Each row shows: field name, fill rate, avg token cost, waste cost. Checking a field "simulates" removing it — a running total updates: "Removing these 4 fields saves 142 tok/instance ($1,720/year at 100K generations)."

The user isn't actually removing anything. They're exploring "what if I cut these?" and seeing the projected impact. This is the feature that makes people come back to tokstat — it turns analysis into a planning tool.

The scale projection (100K, 1M generations, etc.) needs to be settable. A simple input or slider. Different users operate at different scales, and the dollar number is what makes the decision.

### 6. Color encoding modes

The toggle group for switching how nodes are colored:

- **Cost** (default): Thermal scale by token cost. Where is the money going.
- **Fill Rate**: Green (full) → red (sparse). Where is the waste.
- **Overhead**: Violet (schema-heavy) → teal (value-heavy). What's structure vs. content.
- **Depth**: Categorical palette by nesting level. Just the shape.

Switching color modes is instant — no layout transition, just a recolor. Each color mode reveals a different dimension of the same spatial arrangement. "Cost" and "Fill Rate" in particular are complementary: cost shows you where the money is, fill rate shows you where the money is wasted.

### 7. Left sidebar

Controls that were deferred from earlier phases:
- Model selector (dropdown of supported models, affects cost calculations)
- Color mode toggle (the four modes above)
- View mode toggle (the four layouts — moves from top bar to sidebar)
- Fill rate threshold slider (for schema diet filtering)
- Search input (type a field name, matching nodes highlight in the viz)

The sidebar is 240px, collapsible to 48px (icons only). It's not the star — the visualization is. The sidebar serves the viz.

## The insight integration philosophy

Insights are not a separate page, a separate mode, or a separate panel that competes with the visualization. They are woven INTO the visualization experience.

The user doesn't go to the "insights tab." They see insight annotations while exploring the treemap, click one, see the recommendation in context, check the schema diet to see the aggregate impact. The flow is continuous: explore → discover → quantify → decide.

The LLM and JSON output modes also carry insights (from Phase 1), so the CLI-only workflow also benefits. But the visual integration is where insights become delightful instead of just useful.

## How to know you're done

1. Open tokstat on a real corpus. Within 60 seconds, without reading any documentation, you can identify the top 3 changes to make and the dollar savings for each.
2. The schema diet panel feels like a shopping list — check things off, see the savings update. It's satisfying.
3. Drill down into a subtree, inspect a field in the detail panel, see its example values, and understand why it's expensive or wasteful.
4. Switch between cost and fill rate color modes. The treemap tells a different story in each mode, and both stories are useful.
5. The insight annotations are discoverable but not distracting. A first-time user notices them within 30 seconds of exploring.
