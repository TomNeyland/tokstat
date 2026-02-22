# tokstat Design System

## Why This Document Exists

The UX is the product. Not the engine, not the CLI, not the analysis tree — the experience of interacting with your data. If tokstat isn't beautiful enough that someone opens it for the pleasure of exploring their schema, it has failed. The JSON output mode exists for CI pipelines and LLM consumption. The visual mode exists because a gorgeous, fluid, alive interface makes you _want_ to audit your token costs. An ugly version of this tool will not be used. A beautiful one will.

Every decision in this document serves that goal. Nothing here is decorative — it's all structural to making the experience feel crafted, intentional, and worth opening.

## Philosophy

Three principles guide every design decision in tokstat. They are not aspirational — they are constraints. If a design choice violates any of these, it's wrong.

### 1. The Data Is the Decoration

The UI chrome is invisible — dark, quiet, precise. All visual interest comes from the data visualization itself. Color, size, position, and glow communicate data properties. When the visualization is empty, the app should feel like a dark room waiting for the lights to turn on. When data is loaded, the visualization _is_ the interface.

No decorative illustrations. No hero images. No gradient backgrounds on panels. The data brings its own color.

### 2. Transition Is Understanding

Animated transitions between visualization modes aren't decoration — they maintain mental continuity. When a treemap rectangle morphs into a sunburst arc, you understand it's the same node viewed from a different angle. When you drill into a subtree and the parent fades to context while children expand, you understand scope.

Every animation must answer the question "what just happened?" If it can't, it's decoration and gets cut.

### 3. Cost Has Color

The primary visual language is thermal — cool blues through greens and golds to hot magentas. You should be able to glance at any view and immediately know where the money burns. This thermal metaphor is consistent across every view, every component, every interaction. A node that's hot-red in the treemap is hot-red in the sunburst is hot-red in the tooltip.

---

## Color System

### Base Palette

The foundation is a blue-black dark theme. Not pure gray (cold, sterile) — these have a slight blue undertone that creates depth and pairs naturally with the thermal data colors.

| Token | Hex | Usage |
|---|---|---|
| `--bg-root` | `#08080C` | Page background, deepest layer |
| `--bg-surface` | `#111116` | Cards, sidebar, panels |
| `--bg-elevated` | `#1A1A21` | Tooltips, dropdowns, hover states |
| `--bg-overlay` | `#22222B` | Modal backdrops, active states |
| `--border-subtle` | `#1E1E27` | Dividers, inactive borders |
| `--border-default` | `#2C2C38` | Input borders, panel edges |
| `--border-strong` | `#3E3E4D` | Focus rings, emphasis borders |
| `--text-primary` | `#E4E4ED` | Main content text |
| `--text-secondary` | `#8C8CA3` | Labels, descriptions, metadata |
| `--text-tertiary` | `#5C5C73` | Placeholders, disabled text |
| `--text-ghost` | `#3A3A4D` | Decorative, watermarks, grid dots |

### Accent

A soft violet used for interactive elements — distinct from every data color in the thermal scale.

| Token | Hex | Usage |
|---|---|---|
| `--accent` | `#8B7FFF` | Primary interactive (buttons, links, focus) |
| `--accent-hover` | `#9D93FF` | Hover state |
| `--accent-muted` | `rgba(139,127,255,0.10)` | Accent tinted backgrounds |
| `--accent-strong` | `rgba(139,127,255,0.25)` | Selected state backgrounds |

### Thermal Scale

The hero of the entire color system. A 10-stop gradient that maps token cost to color temperature. Cool is cheap. Hot is expensive.

This scale is used everywhere: treemap fill, sunburst arcs, circle borders, stat highlights, cost labels. It must be interpolated smoothly for continuous values (not stepped).

| Stop | Token | Hex | Temperature |
|---|---|---|---|
| 0 | `--thermal-0` | `#2E5EAA` | Coldest — deep blue |
| 1 | `--thermal-1` | `#3B8BD4` | Cool blue |
| 2 | `--thermal-2` | `#47BFA8` | Teal |
| 3 | `--thermal-3` | `#6BD48E` | Green |
| 4 | `--thermal-4` | `#B8D44A` | Lime |
| 5 | `--thermal-5` | `#F0C63A` | Gold |
| 6 | `--thermal-6` | `#F09A3A` | Orange |
| 7 | `--thermal-7` | `#EB6E45` | Red-orange |
| 8 | `--thermal-8` | `#E04562` | Red |
| 9 | `--thermal-9` | `#D42B7B` | Hottest — magenta |

**Interpolation**: Use D3's `d3.scaleSequential` with `d3.interpolateRgbBasis()` across these 10 stops. Input domain is [0, 1] normalized cost. This gives smooth, perceptually even transitions.

**Glow**: Each viz element emits a subtle glow in its thermal color — `drop-shadow(0 0 N color)` where N scales with the thermal value (hotter = more glow). This makes expensive fields literally glow with heat.

### Semantic Data Colors

For specific data properties outside the thermal scale.

| Token | Hex | Usage |
|---|---|---|
| `--fill-full` | `#47BFA8` | High fill rate (>80%) |
| `--fill-partial` | `#F0C63A` | Medium fill rate (30-80%) |
| `--fill-sparse` | `#F09A3A` | Low fill rate (5-30%) |
| `--fill-empty` | `#5C5C73` | Negligible fill (<5%) |
| `--weight-schema` | `#8B7FFF` | Schema overhead (field names, braces, structure) |
| `--weight-value` | `#47BFA8` | Value payload (actual content) |
| `--weight-null` | `#3A3A4D` | Null waste (generated null/empty fields) |

### Type Badge Colors

Each JSON type gets a color for use in badges and type indicators.

| Token | Hex | Type |
|---|---|---|
| `--type-string` | `#3B8BD4` | string |
| `--type-number` | `#6BD48E` | number |
| `--type-boolean` | `#F0C63A` | boolean |
| `--type-object` | `#8B7FFF` | object |
| `--type-array` | `#EB6E45` | array |
| `--type-null` | `#5C5C73` | null |

---

## Typography

### Font Stack

Three typefaces, each with a clear role. The contrast between serif display, geometric sans, and monospace data creates natural hierarchy without relying on size alone.

#### Instrument Serif — Display

Used for page titles, hero statistics, section headings.

High-contrast transitional serif. The name itself evokes scientific instruments — and the letterforms deliver. Dramatic at large sizes, refined at medium. Unexpected in a developer tool, which is exactly why it works. This is not a data dashboard — it's an instrument.

**Load**: Google Fonts, weights 400 (regular) and 400 italic.

#### Manrope — Body & UI

Used for labels, descriptions, buttons, navigation, body text.

Geometric sans-serif with distinctive letterforms (look at the lowercase 'a' and 'g'). Variable weight 200–800. Clean enough for UI labels at 11px, characterful enough to not feel like a system font.

**Load**: Google Fonts, variable weight axis (200–800).

#### JetBrains Mono — Data

Used for field names, JSON paths, token counts, cost figures, file paths.

Monospace designed for developers. Distinctive number forms (clear 0/O, 1/l differentiation), excellent at small sizes, variable weight. Numbers are what matter most here — JetBrains Mono's tabular figures make aligned columns of stats beautiful.

**Load**: Google Fonts, variable weight axis (100–800).

### Type Scale

| Token | Size | Line Height | Weight | Font | Usage |
|---|---|---|---|---|---|
| `--text-xs` | 11px | 1.45 | 500 | Manrope | Fine print, meta text |
| `--text-sm` | 13px | 1.5 | 400 | Manrope | Secondary labels |
| `--text-base` | 15px | 1.6 | 400 | Manrope | Body text, descriptions |
| `--text-lg` | 18px | 1.5 | 500 | Manrope | Subsection headings |
| `--text-xl` | 22px | 1.3 | 600 | Manrope | Section headings |
| `--text-2xl` | 28px | 1.2 | 400 | Instrument Serif | Page subtitles |
| `--text-3xl` | 36px | 1.1 | 400 | Instrument Serif | Page titles |
| `--text-4xl` | 48px | 1.05 | 400 | Instrument Serif | Display |
| `--text-5xl` | 64px | 1.0 | 400 | Instrument Serif | Hero numbers |
| `--text-mono-xs` | 11px | 1.45 | 400 | JetBrains Mono | Tiny data |
| `--text-mono-sm` | 12px | 1.5 | 400 | JetBrains Mono | Small data, paths |
| `--text-mono-base` | 14px | 1.5 | 400 | JetBrains Mono | Data fields, values |
| `--text-mono-lg` | 18px | 1.4 | 500 | JetBrains Mono | Stat values |
| `--text-mono-xl` | 24px | 1.2 | 600 | JetBrains Mono | Hero stats |
| `--text-mono-2xl` | 32px | 1.1 | 700 | JetBrains Mono | Giant numbers |

### Text Colors by Role

- **Primary text** (`--text-primary`): Main content, active labels
- **Secondary text** (`--text-secondary`): Descriptions, inactive labels, metadata
- **Tertiary text** (`--text-tertiary`): Placeholders, disabled states
- **Data labels**: Use `--text-secondary` for labels, `--text-primary` for values
- **Stat labels**: Uppercase, `letter-spacing: 0.08em`, `--text-xs`, `--text-tertiary`

---

## Spacing

4px base unit. Consistent spacing creates rhythm.

| Token | Value |
|---|---|
| `--space-0` | 0 |
| `--space-px` | 1px |
| `--space-0.5` | 2px |
| `--space-1` | 4px |
| `--space-1.5` | 6px |
| `--space-2` | 8px |
| `--space-3` | 12px |
| `--space-4` | 16px |
| `--space-5` | 20px |
| `--space-6` | 24px |
| `--space-8` | 32px |
| `--space-10` | 40px |
| `--space-12` | 48px |
| `--space-16` | 64px |
| `--space-20` | 80px |
| `--space-24` | 96px |

### Border Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 4px | Badges, small elements |
| `--radius-md` | 8px | Cards, inputs, buttons |
| `--radius-lg` | 12px | Panels, dialogs |
| `--radius-xl` | 16px | Feature cards, hero elements |
| `--radius-full` | 9999px | Pills, circles, toggle tracks |

---

## Shadows & Elevation

| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.4)` | Subtle lift (cards) |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.5)` | Panels, dropdowns |
| `--shadow-lg` | `0 12px 32px rgba(0,0,0,0.6)` | Modals, popovers |
| `--shadow-glow` | `0 0 20px rgba(139,127,255,0.15)` | Active elements (accent) |
| `--shadow-thermal` | `0 0 Npx color` | Viz elements glow their thermal color |

The `--shadow-thermal` is dynamic — computed per element from its thermal color at 20-30% opacity. Glow radius scales with thermal value: stop 0 = 8px, stop 9 = 24px.

---

## Motion

### Easing

| Token | Value | Usage |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Elements entering — fast start, gentle settle |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | Layout shifts, morphing between states |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful bounce — toggle switches, mode changes |

### Duration

| Token | Value | Usage |
|---|---|---|
| `--duration-instant` | 50ms | Hover color changes — must feel immediate |
| `--duration-fast` | 150ms | Button press feedback, toggle state |
| `--duration-normal` | 300ms | Panel open/close, sidebar collapse |
| `--duration-slow` | 500ms | Page transitions, large panel shifts |
| `--duration-viz` | 800ms | Viz layout transitions (treemap → sunburst) |

### Animation Rules

1. **Viz transitions are the hero.** The morph from treemap to sunburst, from sunburst to circle pack — these are the moments that make the tool memorable. Use Svelte `tweened` with spring-like stiffness. 800ms duration, custom ease-in-out.

2. **Stagger siblings.** When multiple elements appear (like treemap cells loading), stagger by 30ms per sibling. Creates a "cascade" feel. Max total stagger: 300ms (so first 10 elements stagger, rest appear together).

3. **Hover is instant.** 50ms opacity/color transition. Never make the user wait for visual feedback on hover. Tooltip can take 150ms to fade in, but the hover highlight is immediate.

4. **Exit is faster than enter.** Exit animations are 80% of enter duration. When drilling down, the parent fading out is faster than the children fading in. This creates a snappy, responsive feel.

5. **Only animate transform and opacity.** Never animate layout properties (width, height, top, left, padding). The viz elements use SVG transform for position and size. CSS transitions handle opacity and color.

6. **Respect reduced-motion.** `@media (prefers-reduced-motion: reduce)` disables all animation except instant state changes. The tool remains fully functional.

---

## Visual Texture

### Noise

A subtle SVG noise filter at 2% opacity over `--bg-root`. Adds warmth and prevents the background from feeling like a dead flat pixel grid. Implemented as an inline SVG `<filter>` with `feTurbulence`.

### Glow

Viz elements glow in their thermal color. Not a uniform glow — opacity and radius scale with thermal value. Cold elements barely glow. Hot elements pulse with light. This creates a "thermal imaging" feel in the visualization.

Implementation: `filter: drop-shadow(0 0 ${8 + thermalStop * 1.6}px ${thermalColor}${Math.round(0.15 + thermalStop * 0.015) * 255})` — or roughly, cold = 8px radius 15% opacity, hot = 24px radius 30% opacity.

### Grid

The main viz area has a faint dot grid — `--text-ghost` colored circles at 1px diameter, 32px spacing. Evokes graph paper, oscilloscope screens, scientific instruments. Invisible when data is dense (data covers it), visible in sparse areas (gives spatial context).

Implementation: `background-image: radial-gradient(circle, var(--text-ghost) 1px, transparent 1px); background-size: 32px 32px;`

---

## Layout

### Application Shell

```
┌──────────────────────────────────────────────────┐
│  ▪ tokstat             [search]      [export] [⚙] │  ← Top bar (48px)
├───────────┬──────────────────────────┬────────────┤
│           │                          │            │
│  Controls │     Visualization        │   Detail   │
│           │                          │   Panel    │
│  Model    │  (treemap / sunburst /   │            │
│  View     │   pack / icicle)         │ (on-demand │
│  Color    │                          │  slide-in) │
│  Filter   │                          │            │
│           │                          │            │
│           │                          │            │
├───────────┴──────────────────────────┴────────────┤
│  root › endpoints[] › adverse_events[]    $0.047  │  ← Breadcrumb (36px)
└──────────────────────────────────────────────────┘
```

**Dimensions:**
- Top bar: 48px height, fixed
- Left sidebar: 240px width, collapsible to 48px (icons only)
- Right detail panel: 360px width, slides in on node click, pushes main area
- Breadcrumb bar: 36px height, fixed bottom
- Main viz area: fills remaining space

**Responsive behavior:**
- Below 1200px: sidebar auto-collapses to icon mode
- Below 900px: detail panel overlays instead of pushing
- Below 600px: breadcrumb wraps, sidebar hidden (hamburger menu)

---

## Components

### StatBlock

Displays a single statistic with label, value, and optional delta.

```
 TOTAL COST
 $47.20
 ▲ 12% vs last run
```

| Element | Style |
|---|---|
| Label | `--text-xs`, `--text-tertiary`, uppercase, `letter-spacing: 0.08em` |
| Value | `--text-mono-xl`, `--text-primary` |
| Delta | `--text-xs`, green (positive) / red (negative) / `--text-tertiary` (neutral) |

Padding: `--space-4`. Optional left border accent (4px, colored by context).

### Badge

Type indicator pill for JSON types.

| Element | Style |
|---|---|
| Container | `--radius-full`, type color at 12% opacity background |
| Text | `--text-mono-xs`, type color at full, weight 600, uppercase |
| Padding | `--space-1` vertical, `--space-2` horizontal |

Variants: `string`, `number`, `boolean`, `object`, `array`, `null` — each with their `--type-*` color.

### TokenBar

Stacked horizontal bar showing schema/value/null token decomposition.

```
 ████████████████░░░░░░░░░░░░░░░░░░▒▒▒▒▒
 schema (38%)     value (42%)       null (20%)
```

| Element | Style |
|---|---|
| Track | 8px height, `--radius-full`, `--bg-overlay` background |
| Schema segment | `--weight-schema` fill |
| Value segment | `--weight-value` fill |
| Null segment | `--weight-null` fill |

Labels appear on hover, positioned above each segment. Segments animate width on data change with `--duration-normal` + `--ease-out`.

### FillRate

Bar showing what percentage of instances have a non-null value for a field.

```
 ████████████████████░░░░░  78%
```

| Element | Style |
|---|---|
| Track | 4px height, `--radius-full`, `--bg-overlay` background |
| Fill | Color interpolated: `--fill-empty` (0%) → `--fill-sparse` (20%) → `--fill-partial` (50%) → `--fill-full` (100%) |
| Label | `--text-mono-sm`, `--text-secondary`, right-aligned |

### Panel

Container for grouped content.

| Element | Style |
|---|---|
| Background | `--bg-surface` |
| Border | 1px `--border-subtle` |
| Radius | `--radius-lg` |
| Padding | `--space-6` |
| Shadow | `--shadow-sm` |

Variants:
- **Default**: As above
- **Active**: `--border-default` border, `--shadow-md`
- **Accent**: Left 3px border in `--accent`

### ToggleGroup

Segmented control for switching viz modes, color modes, etc.

```
 ┌──────────┬──────────┬──────────┬──────────┐
 │ Treemap  │ Sunburst │   Pack   │  Icicle  │
 └──────────┴──────────┴──────────┴──────────┘
```

| Element | Style |
|---|---|
| Container | `--bg-surface`, 1px `--border-subtle`, `--radius-md` |
| Segment | `--text-sm` weight 500, `--text-secondary`, `--space-3` vertical / `--space-4` horizontal padding |
| Active segment | `--text-primary`, `--bg-elevated` background, subtle `--accent` bottom border (2px) |
| Hover (inactive) | `--text-primary`, `--bg-elevated` at 50% opacity |

Active indicator slides between segments with `--duration-fast` + `--ease-spring`.

### Tooltip

Hover detail for visualization nodes.

```
 ┌─────────────────────────────────┐
 │ endpoints[].endpoint_phrase      │
 │ string • 100% fill              │
 │                                  │
 │ avg 142 tok    $0.0007/inst     │
 │ p95 280 tok    max 412 tok      │
 │                                  │
 │ ████████████████░░░░░ 62% value │
 └─────────────────────────────────┘
```

| Element | Style |
|---|---|
| Container | `--bg-elevated`, 1px `--border-default`, `--radius-md`, `--shadow-lg` |
| Title | `--text-mono-base`, `--text-primary`, weight 600 |
| Subtitle | `--text-xs`, `--text-secondary` |
| Stats | `--text-mono-sm`, `--text-primary` (values) / `--text-tertiary` (labels) |
| Divider | 1px `--border-subtle`, `--space-3` margin |

Appears with 50ms fade-in, no hover delay. Positioned to avoid viewport edges. Small 6px triangular pointer on the edge closest to the hovered element.

### Breadcrumb

Navigation trail showing current drill-down path.

```
 root  ›  endpoints[]  ›  adverse_events[]              $0.047/instance
```

| Element | Style |
|---|---|
| Path segments | `--text-mono-sm`, `--text-secondary`, clickable |
| Active (last) segment | `--text-primary` |
| Separator | `›`, `--text-tertiary` |
| Cost summary | Right-aligned, `--text-mono-sm`, `--text-secondary` |

Clicking any ancestor segment navigates up to that level with an animated zoom-out.

### SearchInput

For filtering nodes by field name.

| Element | Style |
|---|---|
| Container | `--bg-surface`, 1px `--border-default`, `--radius-md` |
| Input text | `--text-mono-base`, `--text-primary` |
| Placeholder | `--text-tertiary` |
| Focus | `--border-strong` border, `--shadow-glow` |
| Icon | Search magnifying glass, `--text-tertiary`, 16px |

Results highlight matching nodes in the visualization with `--accent` outline pulse.

---

## Data Visualization

### Color Encoding Modes

The viz supports multiple color encodings, toggled via ToggleGroup:

1. **Cost** (default) — Thermal scale. Node color = normalized token cost relative to siblings at same depth.
2. **Fill Rate** — Green (full) to red (sparse). Shows which fields are mostly null/wasted.
3. **Overhead** — Violet (schema overhead) to teal (value payload). Shows structural vs. content ratio.
4. **Depth** — Categorical palette by nesting level. Shows structure without data overlay.

### Treemap Layout

- `d3.treemap()` with `squarify` tiling (default), option for `binary` or `slice-dice`
- Cell padding: 2px between siblings, 4px between parent and children
- Labels: field name inside cell if cell is large enough (> 60px width), otherwise on hover only
- Cell border: 1px `--bg-root` (creates the grid lines between cells)
- Minimum cell size: 4x4px (below this, cells are aggregated into "other")

### Sunburst Layout

- `d3.partition()` with radial projection
- Inner radius: 60px (center shows breadcrumb/stats for hovered node)
- Arc padding: 1px
- Labels: Along the arc for large-enough segments, radial for medium, hidden for small
- Center text: current root node name + total cost

### Circle Pack Layout

- `d3.pack()` with padding 4px
- Circle stroke: 1.5px in thermal color
- Circle fill: thermal color at 15% opacity
- Labels: centered inside circles that are large enough

### Icicle Layout

- `d3.partition()` with linear (non-radial) projection
- Horizontal bars, top-to-bottom depth
- Row height: proportional to token cost
- Label: left-aligned in each bar, `--text-mono-sm`

### Transitions Between Layouts

When switching from treemap → sunburst → pack → icicle:
- Each node has a stable identity (its JSON path)
- Positions/shapes interpolate from current to target over `--duration-viz`
- Svelte `tweened` stores handle interpolation per node
- Color is preserved across transitions (same thermal value = same color)

The interpolation is the hardest part and the most rewarding. Rectangles morph to arcs, arcs morph to circles. This is where D3's layout separation pays off — we compute target positions and let Svelte interpolate.

---

## Iconography

Minimal icon set. Line style, 1.5px stroke, 20px default size.

Icons needed:
- **Search** (magnifying glass)
- **Export** (download arrow)
- **Settings** (gear)
- **Collapse sidebar** (chevron left/right)
- **Drill into** (chevron right or zoom-in)
- **Drill out** (chevron left or zoom-out)
- **Copy** (clipboard)
- **Close** (x)
- **Viz modes**: abstract icons for treemap (grid), sunburst (radial), pack (circles), icicle (bars)

Source: Lucide icons (open source, consistent style, Svelte bindings available).

---

## Accessibility

- All colors meet WCAG AA contrast on `--bg-root` / `--bg-surface`
- Thermal scale is not the only way to read data — size also encodes cost (treemap cells, circle radius)
- Keyboard navigation: tab through nodes, enter to drill down, escape to drill up
- `aria-label` on all viz nodes with full path + stats
- `prefers-reduced-motion`: all animation disabled, instant state transitions
- `prefers-color-scheme`: no light mode (dark is the product), but reduced-motion is respected
