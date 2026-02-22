---
description: Create a new UI component following the tokstat design system. Ensures DESIGN.md compliance and reference page inclusion.
---

# New Component

You are creating a new Svelte component for tokstat. Follow this workflow exactly.

## Arguments

$ARGUMENTS = the component name and purpose (e.g., "StatBlock - displays a single statistic with label and delta")

## Workflow

### 1. Check DESIGN.md

Read `DESIGN.md` and find the spec for this component (under the Components section). If there's a spec:
- Implementation must match it exactly — layout, tokens, typography, spacing, states.
- Do not improvise on a specified component.

If there's no spec in DESIGN.md:
- Design it in the spirit of the existing components. Same token usage, same interaction patterns.
- Add a spec to DESIGN.md for the new component before writing code.

### 2. Create the component

Create `src/lib/components/{ComponentName}.svelte`.

Requirements:
- Svelte 5 runes (`$state`, `$derived`, `$effect`). No stores.
- All visual values from `tokens.css`. No raw hex, px, ms, or font stacks.
- Props typed with TypeScript.
- Hover states: `--duration-instant` (50ms).
- Transitions: use the appropriate `--ease-*` and `--duration-*` tokens.
- Component must be self-contained — no implicit global styles beyond tokens.

### 3. Add to reference page

Open `src/lib/reference/DesignReference.svelte`. Add a demo section for the new component:

```svelte
<!-- {ComponentName} -->
<div class="component-demo">
  <h3 class="component-name">{ComponentName}</h3>
  <p class="component-desc">{one-line description}</p>
  <div class="demo-row">
    <!-- Show the component in its primary state -->
    <!-- Show the component in variant states if applicable -->
  </div>
</div>
```

The reference page is the test suite for the design system. If the component isn't on the reference page, it doesn't exist.

### 4. Visual check

Remind the user to check the reference page in the browser. The component should:
- Look intentional, not generated
- Match the DESIGN.md spec if one exists
- Feel cohesive with the existing components on the page

### 5. Run design audit

Run the `/design-audit` skill on the new component file.
