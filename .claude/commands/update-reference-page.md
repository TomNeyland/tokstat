---
name: update-reference-page
description: Use after adding or changing any design token, component, or visual pattern — ensures the reference page stays current as the living styleguide.
---

# Update Reference Page

The design reference page IS the test suite for the design system. If a token or component isn't on the reference page, it doesn't exist. If it changed but the reference page didn't, the reference page is lying.

## When to Use

- After adding a new CSS custom property to `tokens.css`
- After creating a new component (should already happen via `/new-component`)
- After changing any existing token value
- After modifying a component's visual behavior

## Process

### For new tokens

1. Read `src/styles/tokens.css` — find the new/changed token.
2. Open `src/lib/reference/DesignReference.svelte`.
3. Add the token to the appropriate section:
   - Color → palette grid, thermal scale, or semantic colors
   - Typography → type scale table
   - Spacing → spacing scale
   - Radius/shadow/motion → relevant section
4. Show the token visually — a swatch, a bar, an animated demo. Not just text.

### For changed tokens

1. Find every place the old value appears on the reference page.
2. Verify it renders correctly with the new value.
3. If the change is significant (not just a hex tweak), add a visual comparison or note.

### For new components

This should already be handled by `/new-component`. Verify:
- Component appears in the Components section
- Shows primary state and key variants
- Uses real-looking mock data, not "Lorem ipsum"

### For changed components

1. Update the demo to reflect the new behavior.
2. If the change affects interaction (hover, click, animation), make sure the demo is interactive, not just a static preview.
