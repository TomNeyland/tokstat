# tokstat

Visualizes per-field token costs across a corpus of LLM-generated JSON.

## The UX Is the Product

This is the single most important thing to understand about tokstat. Read this before writing any code.

The analysis engine is a means to an end. The JSON output mode is a fallback. The reason the interactive visualization exists — the entire justification for this project being more than a CLI script — is that exploring your schema's token economics needs to be so visually engaging, so fluid, so satisfying to interact with that you *want* to open it. An ugly tokstat is a dead tokstat. Nobody will use a tool that feels like a dashboard from 2003.

Every engineering decision should be filtered through: **does this make the experience more beautiful, more fluid, more inviting?** If a feature is useful but makes the UI worse, cut it. If an animation is technically unnecessary but makes the interaction feel alive, keep it.

This isn't a data dashboard. It's an instrument you enjoy using.

## Stack

- **Analysis engine**: TypeScript (Node/Bun)
- **Visualization**: Svelte 5 + D3 layouts + hand-crafted SVG
- **Distribution**: npm package, `npx tokstat ./glob`
- **Build**: Vite 7

## Design System

**DESIGN.md is the bible.** Read it before touching any visual code.

### The Three Laws
1. **The data is the decoration** — UI chrome is invisible. Data brings color.
2. **Transition is understanding** — Animations explain what happened, not decorate.
3. **Cost has color** — Thermal scale (cool blue → hot magenta) everywhere, always.

### Fonts
- `--font-display`: Instrument Serif (headings, hero numbers)
- `--font-body`: Manrope (labels, UI text)
- `--font-mono`: JetBrains Mono (data, field names, stats, paths)

### Color
- Base: blue-black dark theme (`#08080C` root)
- Thermal scale: 10 stops, `--thermal-0` through `--thermal-9`
- Accent: `#8B7FFF` (soft violet) — interactive elements only
- Type badges: each JSON type has a color

### CSS Tokens
All design tokens are in `src/styles/tokens.css`. Components reference tokens via CSS custom properties. Never hardcode colors, sizes, or timing values.

## Architecture (Planned)

### Engine (src/engine/)
The analysis engine is the brain. It:
1. Globs and reads JSON files
2. Infers a unified schema tree from the corpus
3. Tokenizes every field name, value, and structural character
4. Aggregates stats per node (avg, min, max, p50, p95, fill rate)
5. Computes cost estimates per model

The engine is a pure function: JSON files in → analysis tree out. No DOM, no UI, no side effects.

### CLI (src/cli/)
- `npx tokstat ./glob` — opens browser with interactive viz
- `--format json` — structured analysis output
- `--format llm` — token-optimized text for LLM consumption
- `--model gpt-4o` — model for cost estimation

### Visualization (src/lib/)
A dumb display for a smart engine. The viz receives an analysis tree and renders it.
- D3 for layout computation (treemap, pack, partition, tree)
- Svelte 5 for reactive rendering (runes, not stores)
- Hand-crafted SVG — no charting libraries

## Rules

### Visual Quality Is Non-Negotiable
Every component, every transition, every hover state must meet the bar set in DESIGN.md. If you're choosing between shipping a feature ugly or shipping it later but beautiful, ship it later. "Works but looks generic" is a bug. If it looks like it came from a template or a charting library's defaults, it's wrong.

### No Charting Libraries
No ECharts, Chart.js, Recharts, etc. D3 layout algorithms + Svelte rendering. We own every pixel. Charting libraries impose an aesthetic ceiling — they all look like charting libraries. tokstat should look like nothing else.

### No Defensive Coding
Same rules as the parent project. Fail fast, fail loud. No fallbacks.

### Svelte 5 Runes
Use `$state`, `$derived`, `$effect`. Not the old stores API.

### CSS Custom Properties
Every color, spacing, radius, shadow, easing, and duration uses a token from `tokens.css`. No raw hex values in component styles.

## Design Reference Page

Available at the root route during development. Shows every color, typeface, component, and motion pattern. This is the proof the design system works.

## Project Structure

```
tokstat/
├── src/
│   ├── main.ts
│   ├── App.svelte
│   ├── styles/
│   │   ├── tokens.css      ← Design tokens (the source of truth)
│   │   ├── reset.css        ← CSS reset
│   │   └── global.css       ← Global styles, noise texture, scrollbar
│   └── lib/
│       ├── reference/       ← Design reference page
│       ├── components/      ← Reusable UI components
│       └── viz/             ← D3-powered visualization components
├── DESIGN.md                ← Design system specification
├── PROJECT_SPEC.md          ← Product spec and vision
├── README.md
└── CLAUDE.md                ← This file
```
