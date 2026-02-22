# tokstat Full Build — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build tokstat end-to-end — engine, CLI, four visualization layouts with animated transitions, insights UI, and ship as self-contained HTML via npm.

**Architecture:** Two parallel tracks sharing type definitions. The engine (pure TypeScript) produces an `AnalysisNode` tree from JSON files. The visualization (Svelte 5 + D3) renders that tree as interactive, animated layouts. Integration embeds engine output as JSON in a self-contained HTML file.

**Tech Stack:** TypeScript, Svelte 5 (runes), D3 (layout only), js-tiktoken, Vite 7

---

## Parallel Tracks

### Track 1: Engine (engine-builder)

**Owns:** `src/engine/`, `src/cli/`, `src/formatters/`, `tests/`

**Read first:**
- `docs/ENGINE_SPEC.md` — Full pipeline spec with interfaces
- `docs/PHASE_1_ENGINE.md` — Implementation order and acceptance criteria
- `docs/INSIGHTS_BRAINSTORM.md` — Insight detector details
- `src/engine/types.ts` — Shared type definitions (created by lead)

**Build order:**
1. Schema inference (`src/engine/schemaInference.ts`)
2. Tokenization with character-offset mapping (`src/engine/tokenization.ts`)
3. Aggregation: stats, fill rate, diversity (`src/engine/aggregation.ts`)
4. Insights: null tax, array repetition, hollow objects, boilerplate, length variance (`src/engine/insights.ts`)
5. Cost calculation with pricing table (`src/engine/costCalculation.ts`, `src/engine/pricing.ts`)
6. Pipeline orchestrator (`src/engine/pipeline.ts`)
7. JSON formatter (`src/formatters/jsonFormatter.ts`)
8. LLM formatter (`src/formatters/llmFormatter.ts`)
9. CLI (`src/cli/index.ts`) — parse args, run pipeline, output result

**Test strategy:** Unit tests per stage using fixtures in `fixtures/`. The "basic" fixtures have hand-calculable token counts. Verify against manual calculations.

**Key constraint:** Tokenize the FULL serialized JSON string, then attribute tokens back to nodes via character offsets. Do NOT tokenize individual fields — token boundaries cross field boundaries.

### Track 2: Visualization (viz-builder)

**Owns:** `src/lib/viz/`, `src/lib/components/`, `src/App.svelte`

**Read first:**
- `DESIGN.md` — The bible. Every visual decision.
- `docs/PHASE_2_FIRST_LIGHT.md` — Treemap and app shell
- `docs/PHASE_3_MULTIVIZ.md` — All four layouts and transitions
- `docs/PHASE_4_INSIGHTS.md` — Drill-down, detail panel, schema diet
- `PROJECT_SPEC.md` — Interaction design
- `src/lib/reference/DesignReference.svelte` — Reference implementations of components
- `src/engine/types.ts` — Shared type definitions
- `src/lib/viz/mockData.ts` — Mock data for development (created by lead)

**Build order:**
1. Extract components from DesignReference into standalone files: StatBlock, Badge, TokenBar, FillRate, Panel, ToggleGroup, Tooltip, Breadcrumb, SearchInput
2. Color scale utilities (`src/lib/viz/colorScale.ts`) — thermal interpolation via D3
3. App shell (`src/App.svelte`) — top bar, main area, breadcrumb bar
4. Treemap layout (`src/lib/viz/Treemap.svelte`) — D3 treemap, SVG rects, thermal coloring, glow
5. Sunburst layout (`src/lib/viz/Sunburst.svelte`) — D3 partition radial
6. Circle Pack layout (`src/lib/viz/CirclePack.svelte`) — D3 pack
7. Icicle layout (`src/lib/viz/Icicle.svelte`) — D3 partition linear
8. Viz container with transitions (`src/lib/viz/VizContainer.svelte`) — manages layout switching, tweened stores, 800ms cross-fade morph
9. Detail panel (`src/lib/components/DetailPanel.svelte`) — slide-in, full field stats + examples
10. Drill-down logic — click to zoom, breadcrumb navigation, animated zoom
11. Insight annotations on viz nodes
12. Schema diet panel (`src/lib/components/SchemaDiet.svelte`)
13. Left sidebar with controls (`src/lib/components/Sidebar.svelte`)
14. Color encoding modes: cost, fill rate, overhead, depth

**Key constraints:**
- D3 for layout math only. Svelte renders DOM. No D3 selections.
- Svelte 5 runes (`$state`, `$derived`, `$effect`). Not stores.
- Every visual value from `tokens.css`. No hardcoded colors/sizes.
- Hover: 50ms. Transitions: 800ms with `--ease-in-out`.
- No charting libraries.

### Track 3: Integration & Ship (lead, after tracks 1 & 2)

**Build order:**
1. Wire engine output to viz — data loading from embedded JSON
2. Vite build config for self-contained HTML (inline JS/CSS/fonts, embed analysis data)
3. npm packaging — `bin` field, CLI entry point, `files` field
4. CLI polish — progress output, error messages
5. Polish pass against DESIGN.md
6. Version 0.1.0, npm publish ready

---

## Shared Foundation (created by lead before spawning)

- `src/engine/types.ts` — All TypeScript interfaces
- `fixtures/basic/` — 5 simple JSON files with predictable structure
- `fixtures/sparse/` — 5 files with many null fields
- `fixtures/verbose/` — 3 files with deep nesting and long field names
- `src/lib/viz/mockData.ts` — Mock `AnalysisNode` tree for viz development
- Dependencies installed: js-tiktoken, d3-hierarchy, d3-scale, d3-interpolate, commander, fast-glob
