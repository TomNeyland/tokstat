# Phase 2: First Light

## Goal

`npx tokstat ./data/**/*.json` opens a browser and shows a working treemap of real data. The first time the visualization comes alive with actual token cost data.

This is where the design system stops being theoretical and starts being tested against reality. Every token, every color, every component — proven against real data.

## End state

The browser opens to a full-viewport dark canvas with:
- A treemap filling the main area, colored by the thermal scale
- Rectangles sized by token cost, colored by relative cost (cool blue → hot magenta)
- Hover any rectangle: tooltip appears with field name, type badge, token stats, cost
- A top bar with the headline stats: total cost/instance, overhead ratio, file count
- A breadcrumb bar at the bottom showing "root" and total cost

No sidebar yet. No drill-down. No other viz modes. No insights panel. Just a treemap that's correct and beautiful.

## The moment that matters

First light is the moment you look at the treemap and think "oh, THAT'S where the money goes." The big red rectangle that turns out to be your `endpoints[]` array, the tiny cold-blue sliver that's your `pmid` field. It should be immediately legible without clicking anything.

If the treemap doesn't produce that "oh" moment with real data, something is wrong — either the thermal scale doesn't create enough contrast, the cell sizing isn't proportional enough, or the layout doesn't let the eye find the expensive fields. Fix it before moving on.

## What to build, in order

### 1. App shell

The outer chrome: top bar, main visualization area, breadcrumb bar. No sidebar yet — the full width is the treemap.

Build this with mock data first (hardcoded analysis tree). The chrome must match DESIGN.md exactly: `--bg-root` background, `--bg-surface` for the bars, correct fonts, correct spacing. Run `/design-audit` on every component.

The top bar shows 3-4 `StatBlock` components: avg tokens/instance, cost/instance, overhead ratio, file count. These are the numbers from `AnalysisSummary`.

The breadcrumb bar shows the current path (just "root" for now) and total cost.

### 2. Engine integration

Replace the mock data with the real engine. The CLI, when run without `--format`, needs to:
1. Run the analysis pipeline
2. Serialize the output to JSON
3. Start a local dev server
4. Serve an HTML page with the analysis JSON embedded
5. Open the browser

For development, you can skip the self-contained HTML — just serve the Vite dev app with the analysis data injected. Self-contained HTML is a Phase 5 concern.

The data flow: engine produces `AnalysisNode` tree → JSON → embedded in page → Svelte app reads it on mount → `d3.hierarchy()` → treemap layout → rendered SVG.

### 3. Treemap

The first visualization. `d3.treemap()` with `d3.treemapSquarify` tiling.

**Input**: `d3.hierarchy()` from the root `AnalysisNode`, with `.sum()` using `tokens.total.avg` as the size metric.

**Rendering**: Svelte `{#each}` over the treemap's leaf nodes. Each node is an SVG `<rect>` with:
- Position and size from the layout
- Fill color from the thermal scale (normalized cost relative to siblings)
- 1px gap between cells (`--bg-root` color, creating the grid)
- Subtle glow in the thermal color (hotter = more glow)

**Labels**: Field name rendered inside cells that are large enough (width > 60px). `--font-mono` at `--text-mono-xs`. Truncated with ellipsis if too long. Hidden on cells that are too small.

**Hover**: Instant (50ms) highlight — cell border brightens, glow intensifies. Tooltip appears with full field details (see DESIGN.md tooltip spec). The tooltip follows the cursor or anchors to the cell, whichever feels better.

### 4. Thermal scale tuning

The thermal scale on paper and the thermal scale with real data are different things. With real data:
- Cost distribution might be heavily skewed (one field 10x more expensive than the rest)
- Linear mapping might make everything look the same except the outlier
- The scale needs normalization that creates visual contrast across the actual distribution

You'll likely need to normalize by rank or log scale rather than linear. `d3.scaleSequential` with `d3.interpolateRgbBasis()` across the 10 thermal stops, but the input might be `d3.scaleLog()` or `d3.scalePow()` domain.

Tune this with real data until the treemap has a visible gradient from cold to hot across most of the cells. If everything is blue except one red cell, the normalization is wrong.

### 5. Responsive layout

The treemap must fill the available space and respond to window resizing. `ResizeObserver` on the main area, recompute treemap layout on size change (debounced). The transition between sizes should be smooth — cells interpolate to new positions.

## How to know you're done

1. Open the browser with a real corpus (not fixtures — actual LLM-generated JSON if you have it, or substantial fixtures if not).
2. The treemap is immediately legible — you can see which fields are expensive without clicking.
3. Hover any cell and the tooltip shows correct stats that match `--format json` output.
4. The headline stats in the top bar match the JSON output.
5. It looks like it belongs on the design reference page. Same fonts, same colors, same quality of interaction.
6. You want to keep looking at it. That's the test.
