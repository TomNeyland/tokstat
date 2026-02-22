# tokstat v2 — Team Implementation Guide

> Reference for all teammates. Read this before writing code.

## What We're Building

20 additional requirements on top of the existing tokstat. Four parallel tracks:
1. **Corpus-First UI** — TopBar, detail panel, breadcrumb, corpus overview
2. **Viz Quality** — label readability, remove spazzy animations, shallow-schema differentiation
3. **Ignore System** — engine filtering + UI panel + right-click context menu
4. **Browser-Local Analysis** — file picker, Web Worker pipeline, progress UI, static hosting

## Competitor Reference

We have screenshots of a competitor's implementation. Key layout decisions they made (and we should match or exceed):

### TopBar (48px strip across the top)
```
┌─────────┬──────────────┬──────────────┬──────────────┬──────────────┬─────────────────────────────┐
│ tokstat  │ Treemap      │ CORPUS COST  │ CORPUS TOKENS│ SCHEMA OVERH │ [Load JSON] [Schema Diet]   │
│          │ Sunburst     │ $48.15       │ 3,210,234 tok│ 54%          │ [Hide Controls]             │
│          │ Pack Icicle  │ $0.082/inst  │ 5,469 tok/in │ 1,732,043 tok│                             │
└─────────┴──────────────┴──────────────┴──────────────┴──────────────┴─────────────────────────────┘
```
- **4 stat cards**: Corpus Cost, Corpus Tokens, Schema Overhead %, Null Waste %
- Each card: **big primary number** (corpus-level) + **small secondary** (/instance or corpus breakdown)
- Null Waste card also shows file count: "103,479 tok corpus • 587 files"
- Layout tabs (Treemap/Sunburst/Pack/Icicle) are pill buttons, inline with logo
- Right side: Load JSON (accent-colored), Schema Diet, Hide Controls

### Left Sidebar
```
Controls
├── Search [field name or path]
├── Color Mode [Cost] [Fill] [Overhead] [Depth]  ← 2x2 grid
├── Hide below ▬▬○▬▬ 0 tok  ← slider
├── Null tax threshold ▬▬○▬▬ 50%  ← thermal-colored slider
├── gpt-4o • o200k_base
└── 587 uploaded files

Ignore Fields
├── Exclude non-LLM fields by pattern
├── [root.metadata.so...] [Add]
└── No ignore rules yet. Right-click a node...

Corpus Overview
├── Always root-level totals
├── ┌─────────────┬────────────┐
│   │ CORPUS TOK   │ CORPUS COST│
│   │ 3,210,234    │ $48.15     │
│   │ 5,469 tok/i  │ $0.082/ins │
│   └─────────────┴────────────┘
├── [===schema===][==value==][null]  ← token bar
├── schema 2,951 tok
├── value 2,342 tok
├── null 176.3 tok
├── ─── Top fields by corpus cost ───
├── endpoints[].consumer_hea... 58,350 tok corpus • 99.4 tok/inst • 100% fill
├── population 57,224 tok corpus • 97.5 tok/inst • 88% fill
└── endpoints[].treatment_fo... 54,395 tok corpus • 92.7 tok/inst • 66% fill
```

### Right Detail Panel (when a node is selected)
```
root                               [OBJECT]
root                               [Close]
────────────────────────────────────
[===schema===][===value===][=null=]
schema 2,951 tok
value 2,342 tok
null 176.3 tok
────────────────────────────────────
avg     5,469 tok   p50    4,364 tok
p95    12,508 tok   max   27,657 tok
fill rate    100%   /inst cost $0.082
corpus 3,210,234 tok corpus cost $48.15
────────────────────────────────────
INSIGHTS
No direct insights on this node.
```

### Tooltip (on hover)
```
┌─────────────────────────────────────────┐
│ endpoints[].intervention_me...   [NULL] │
│ 22% fill • $0.227 corpus • $0.0004/inst │
│ corpus  15,151 tok   avg    25.8 tok    │
│ p95     104.4 tok    schema 21.2 tok    │
│ null    2.1 tok                         │
└─────────────────────────────────────────┘
```

### Breadcrumb (bottom bar)
```
root    $48.15 corpus • $0.082/instance • 3,210,234 tok corpus • 5,469 tok/instance • 3 levels
```

## Architecture Decisions

### Types Changes (types.ts)

Add to `AnalysisSummary`:
```typescript
corpus_total_tokens: number    // sum of all file token counts
corpus_total_cost: number      // corpus_total_tokens * price_per_token
```

### Ignore Engine (new: src/engine/ignore.ts)

```typescript
// Pattern matching: exact paths + wildcards
// "root.metadata.*" matches root.metadata.foo but not root.metadata.foo.bar
// "root.**.timestamp" matches any .timestamp at any depth
// "root.endpoints[].p_value" matches exactly

export function matchesIgnorePattern(path: string, patterns: string[]): boolean
export function filterTree(tree: AnalysisNode, patterns: string[]): AnalysisNode
export function recomputeSummary(filteredTree: AnalysisNode, pricePerToken: number, fileCount: number): AnalysisSummary
```

When filtering:
- Remove ignored nodes from children arrays
- Recompute parent token totals (sum of remaining children)
- Recompute summary from filtered root

### Web Worker (new: src/engine/worker.ts)

The pipeline currently runs in Node. For browser-local analysis:
- Worker receives `{ files: { name: string, content: string }[], model: string }`
- Runs the full pipeline (schema inference, tokenization, aggregation, insights, cost)
- Posts progress: `{ type: 'progress', filesProcessed: number, totalFiles: number }`
- Posts result: `{ type: 'result', data: AnalysisOutput }`

js-tiktoken's WASM works in workers. Import the encoding at worker start.

### App State Flow

```
App.svelte
├── data: AnalysisOutput (from engine/loader/worker)
├── ignorePatterns: string[]
├── filteredTree: $derived (filterTree if patterns, else data.tree)
├── filteredSummary: $derived (recomputeSummary if patterns, else data.summary)
├── drillPath: AnalysisNode[]
├── currentNode: $derived (last in drillPath)
└── All children receive filtered data, never raw
```

## File Ownership (NO CONFLICTS)

### corpus-ui teammate
Owns exclusively:
- `src/lib/components/TopBar.svelte` — full rework
- `src/lib/components/Breadcrumb.svelte` — add corpus context
- `src/lib/components/CorpusOverview.svelte` — NEW, persistent overview in sidebar
- `src/engine/types.ts` — add corpus_total_tokens, corpus_total_cost to AnalysisSummary
- `src/engine/pipeline.ts` — compute new summary fields
- `src/lib/viz/mockData.ts` — update mockSummary with new fields

### viz-polish teammate
Owns exclusively:
- `src/lib/viz/Treemap.svelte` — label shadows, remove pulse animation
- `src/lib/viz/Sunburst.svelte` — label shadows, thicker strokes, shallow depth
- `src/lib/viz/CirclePack.svelte` — label contrast check
- `src/lib/viz/Icicle.svelte` — label shadows

### ignore-system teammate
Owns exclusively:
- `src/engine/ignore.ts` — NEW
- `src/lib/components/IgnorePanel.svelte` — NEW
- `src/lib/components/ContextMenu.svelte` — NEW

### browser-local teammate
Owns exclusively:
- `src/engine/worker.ts` — NEW
- `src/lib/components/FileDropZone.svelte` — NEW
- `src/lib/components/AnalysisProgress.svelte` — NEW
- `src/lib/viz/dataLoader.ts` — add browser file loading

### Lead integrates (after teammates finish)
- `src/App.svelte` — wire ignore state, corpus overview, file picker, context menu
- `src/lib/components/Sidebar.svelte` — add IgnorePanel + CorpusOverview slots

## Design Rules (ALL teammates)

1. **All colors from tokens.css** — `var(--thermal-*)`, `var(--text-*)`, `var(--bg-*)`, etc. No raw hex.
2. **Fonts**: `--font-display` for hero numbers, `--font-mono` for data/paths, `--font-body` for labels
3. **No defensive coding** — no fallbacks, no `.get()` with defaults, no try/catch swallowing
4. **Svelte 5 runes** — `$state`, `$derived`, `$effect`. Not stores.
5. **Hover states**: `transition: ... var(--duration-instant)` (50ms)
6. **Spacing**: use `var(--space-*)` tokens only
7. **Labels on bright fills**: use `text-shadow: 0 1px 2px rgba(0,0,0,0.6), 0 0 4px rgba(0,0,0,0.3)` or SVG paint-order stroke
8. **No pulsing animations** — static indicators only
9. **Section labels**: 11px, uppercase, `--text-tertiary`, `letter-spacing: 0.08em`

## Stat Display Convention

Everywhere we show metrics, follow this pattern:
- **Primary** (corpus-level): larger font, `--text-primary` color
- **Secondary** (/instance): smaller font, `--text-secondary` color
- Show both side-by-side or stacked, never toggle between them

Examples:
- TopBar stat: "**$48.15**" + "$0.082/instance" underneath
- Detail panel: "corpus 3,210,234 tok" + "corpus cost $48.15" as a row in the stats table
- Tooltip: "corpus 15,151 tok" alongside "avg 25.8 tok"
- Breadcrumb: "$48.15 corpus • $0.082/instance • 3,210,234 tok corpus • 5,469 tok/instance • 3 levels"
