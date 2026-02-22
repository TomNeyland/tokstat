# tokstat — Project Spec

## Vision

Anyone running LLM structured generation at scale is flying blind on per-field economics. They know their total spend. They don't know that `adverse_events[].mechanism_of_action` costs 340 tokens/instance average, is null 60% of the time, and is burning $47/run on a field nobody reads.

tokstat makes that visible — not as a table of numbers, but as a spatial, interactive, animated visualization you genuinely want to use.

**The UX is the product.** This cannot be overstated. An ugly tokstat is a dead tokstat — nobody will open a tool that feels like a 2003 dashboard when they could just grep the JSON. The entire justification for the visual mode (vs. `--format json`, which we also ship) is that it needs to be so beautiful, so fluid, so satisfying to interact with that you _want_ to explore your schema. Not because you have to. Because it's a pleasure.

The conceptual ancestor is WinDirStat/Baobab — those tools proved that making data _spatial_ and _fun to explore_ is what drives adoption. But tokstat should look nothing like them. They're ugly. The concept (hierarchical cost visualization with drill-down) is right; the aesthetic is 20 years out of date. tokstat should feel like a precision instrument designed by someone who cares about every pixel.

## Core Concepts

### Schema Hierarchy

Given a corpus of JSON files, tokstat infers a unified schema tree:

```
root
├── pmid (string, 100% fill)
├── title (string, 100% fill)
├── endpoints[] (array, 100% fill, avg 4.2 items)
│   ├── endpoint_phrase (string, 100% fill)
│   ├── point_estimate (number, 56% fill)
│   ├── confidence_interval (object, 48% fill)
│   │   ├── lower (number)
│   │   └── upper (number)
│   └── adverse_events[] (array, 23% fill)
│       ├── event (string)
│       └── mechanism_of_action (string, 40% fill)
└── population (object, 95% fill)
    ├── description (string)
    └── sample_size (number)
```

Each node carries aggregated statistics from the corpus.

### Token Weight Decomposition

Every node's token cost is decomposed into:

1. **Schema weight** — the tokens consumed by structure: field names, `{}`, `[]`, `:`, `,`, `""`. This is overhead you pay regardless of the value. Long field names, deep nesting, and arrays of objects with repeated keys all inflate this.

2. **Value weight** — the tokens consumed by actual data: string content, numbers, booleans, nulls.

3. **Null weight** — the cost of fields that exist in the schema but are null/empty in practice. This is pure waste: you're paying for the LLM to generate `"mechanism_of_action": null` when 60% of the time there's no mechanism to report.

The visualization shows all three. You can toggle between "total cost", "schema overhead only", "value payload only", and "waste (null fields)" views.

### Cost Modeling

Token counts are converted to dollar costs using per-model output pricing:

- User selects a model (gpt-4o, gpt-4o-mini, claude-sonnet, etc.)
- Pricing table is bundled and updatable
- Cost shown per-field, per-instance, per-corpus, and projected (e.g., "at 10K generations/month, this field costs $470/month")

## Visualization Modes

All modes render the same `d3.hierarchy()` data structure. Switching between them animates nodes from one layout to another.

### Treemap (`d3.treemap()`)
Rectangles sized by token cost. Best for answering "where is the money going." The default view. Color encodes depth or a secondary metric (fill rate, schema-vs-value ratio).

### Sunburst (`d3.partition()` radial)
Concentric rings. Inner ring = top-level fields, outer rings = nested fields. Best for seeing depth and structure. Click a slice to zoom into that subtree (the slice becomes the new center).

### Circle Pack (`d3.pack()`)
Nested circles. Best for spotting outliers — a giant circle among small ones is immediately visible. Also good for seeing natural clustering of similarly-sized fields.

### Icicle (`d3.partition()` linear)
Horizontal stacked bars. Best for comparing depth without the distortion of radial layout. Clean, scannable.

### View Transitions
When switching between modes, nodes animate from their current position/shape to their new one. Rectangles morph to circles, arcs straighten to bars. Svelte's `tweened` stores with spring physics handle interpolation. This is where the tool goes from "useful" to "delightful."

## Interaction Design

### Drill-down
Click any node in any view to zoom into that subtree. The visualization re-renders with the clicked node as root. Breadcrumb trail shows path back to root. Animated zoom transition.

### Hover Detail
Hover any node to see a tooltip panel:
- Field name and JSON path
- Type (string, number, object, array)
- Token stats: avg / min / max / p50 / p95
- Fill rate (% of instances where non-null)
- Schema overhead vs. value payload ratio
- Estimated cost at selected model pricing
- Array fields: avg item count, cost per item

### Example Values
Click a node to see sampled real values from the corpus in a sidebar panel. For strings, show a few representative values. For objects/arrays, show a compact JSON preview. This grounds the statistics in reality — you can see _what_ the LLM is actually generating for that field.

### Color Modes
Toggle between color encodings:
- **Cost** — red = expensive, green = cheap (default)
- **Fill rate** — green = always populated, red = mostly null (find waste)
- **Overhead ratio** — purple = mostly schema overhead, blue = mostly value payload
- **Depth** — categorical palette by nesting level

### Filtering
- Hide fields below a token threshold
- Hide fields above a fill rate (show only the waste)
- Filter to a specific depth level
- Search by field name with live highlighting

## Output Modes

### Interactive (default)
Opens a browser tab with the full visualization. Analysis data is embedded in the HTML as a `<script>` tag — the HTML file is fully self-contained and can be saved/shared.

### JSON (`--format json`)
Structured output of the full analysis tree. Every node includes all computed statistics. Designed for CI pipelines, diffing between schema versions, programmatic consumption.

```json
{
  "schema": "tokstat/v1",
  "corpus": { "file_count": 551, "glob": "./papers/**/*.json" },
  "model": "gpt-4o",
  "tree": {
    "name": "root",
    "tokens": { "avg": 1847, "min": 340, "max": 4200, "p50": 1650, "p95": 3800 },
    "cost_per_instance_usd": 0.0092,
    "children": [
      {
        "name": "endpoints",
        "type": "array",
        "fill_rate": 1.0,
        "avg_items": 4.2,
        "tokens": { "avg": 1200, "schema_overhead": 380, "value_payload": 820 },
        "children": [...]
      }
    ]
  }
}
```

### LLM Context (`--format llm`)
Token-optimized text summary designed to be pasted into an LLM conversation for schema auditing. Focuses on actionable insights: the most expensive fields, the highest-waste fields, the schema overhead hotspots.

```
tokstat analysis: 551 files, model gpt-4o

Top cost fields (avg tokens/instance):
  endpoints[].endpoint_phrase        — 142 tok, 100% fill, $0.0007/instance
  endpoints[].conclusion             — 98 tok, 94% fill, $0.0005/instance
  endpoints[].mechanism_of_action    — 87 tok, 40% fill, $0.0004/instance  ⚠️ 60% null

High waste (low fill, high cost):
  adverse_events[].severity_grading  — 34 tok avg, 12% fill — $312/10K runs wasted
  drug_interactions[].evidence_level — 28 tok avg, 8% fill — $258/10K runs wasted

Schema overhead hotspots:
  endpoints[] array: 380 tok overhead per instance (repeated field names × 4.2 items avg)
  population object: 45 tok overhead (8 field names × ~5.6 tok each)
```

## Technical Architecture

### Analysis Engine (Node/Bun, TypeScript)

1. **File reader** — Glob input files, stream-parse JSON. No full corpus in memory.
2. **Schema inferrer** — Walk all files, build a unified schema tree. Track types, optionality, array cardinality.
3. **Tokenizer** — js-tiktoken (cl100k_base for GPT-4, o200k_base for GPT-4o). Tokenize each field name, each value, each structural character. Aggregate per-node stats.
4. **Cost calculator** — Apply per-model output token pricing to token counts.
5. **Output serializer** — Emit analysis tree as JSON (embedded in HTML for interactive mode, or standalone for --format json/llm).

### Visualization (Svelte 5, D3, SVG)

1. **Data layer** — Analysis tree loaded from embedded JSON. `d3.hierarchy()` computed once.
2. **Layout layer** — Current visualization mode calls appropriate D3 layout function. Returns positioned nodes.
3. **Render layer** — Svelte `{#each}` over positioned nodes. SVG `<rect>`, `<circle>`, `<path>` elements with bound positions.
4. **Transition layer** — Svelte `tweened` stores interpolate between layouts. Spring physics for organic feel.
5. **Interaction layer** — Click handlers for drill-down, hover for tooltips, sidebar for example values. Svelte stores for global state (current root, color mode, view mode).

### Self-Contained HTML

The interactive mode bundles everything into a single HTML file:
- Svelte app compiled to vanilla JS
- Analysis data as embedded JSON
- No external dependencies, no server needed after generation
- File can be saved, emailed, opened months later

## CLI Interface

```
tokstat <glob> [options]

Arguments:
  glob                    Glob pattern for JSON files to analyze

Options:
  --model <model>         Model for cost estimation (default: gpt-4o)
  --format <format>       Output format: interactive (default), json, llm
  --port <port>           Port for local server (default: 3742)
  --no-open               Don't auto-open browser
  --tokenizer <enc>       Tokenizer encoding (default: o200k_base)
  --out <path>            Write output to file instead of stdout/browser
  --cost-per-1k <price>   Custom output token price per 1K tokens
  --sample-values <n>     Number of example values to collect per field (default: 5)
```

## Non-Goals

- **Not a monitor.** tokstat is a snapshot tool — `du`, not `top`. You point it at files that already exist and it analyzes them. No time series, no "per month" projections, no recurring tracking, no observability. Use Langfuse for that.
- **Not a schema editor.** It shows you what's expensive; it doesn't help you rewrite your schema. (Though the LLM output mode is designed to feed into exactly that workflow.)
- **Not a JSON viewer.** JSON Crack exists. tokstat is specifically about token economics, not general JSON exploration.
- **No desktop wrapper.** Distribution is npm. The tool runs in a browser. If someone wants to wrap it in Tauri later, the architecture supports it, but it's not a goal.
