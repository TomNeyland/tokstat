---
description: Audit a component or file against the tokstat design system. Run after touching any visual code.
---

# Design Audit

You are auditing visual code against the tokstat design system. Read DESIGN.md first, then inspect the target.

## Checklist

For every file touched in the current diff (or the file the user specifies):

### Tokens
- [ ] Every color references a `--*` CSS custom property from `tokens.css`. Zero raw hex values.
- [ ] Every spacing value uses `--space-*`. No raw pixel values for padding/margin/gap.
- [ ] Every border-radius uses `--radius-*`.
- [ ] Every shadow uses `--shadow-*`.
- [ ] Every easing uses `--ease-*`. Every duration uses `--duration-*`.
- [ ] Font families use `--font-display`, `--font-body`, or `--font-mono`. No raw font stacks.

### Design Fidelity
- [ ] If DESIGN.md has a spec for this component, the implementation matches it exactly.
- [ ] Thermal scale colors are used for data cost encoding. Not repurposed for decoration.
- [ ] Accent color (`--accent`) is used only for interactive elements, never for data.
- [ ] Type badge colors match the `--type-*` tokens for the correct JSON type.

### Motion
- [ ] Hover states are instant (50ms or `--duration-instant`). No perceptible delay.
- [ ] Enter transitions use `--ease-out`. Layout shifts use `--ease-in-out`.
- [ ] Every animation answers "what just happened?" — if it's purely decorative, flag it.
- [ ] `@media (prefers-reduced-motion: reduce)` is respected or inherited from global.css.

### Visual Quality
- [ ] Does this look like it came from a template or charting library? If yes, it fails.
- [ ] Would you screenshot this for a portfolio? If no, it's not done.
- [ ] Is the component beautiful with real data AND with empty/loading states?

### Reference Page
- [ ] If this is a new component or token, has it been added to `DesignReference.svelte`?

## Output

For each issue found, state:
1. What's wrong (specific line/property)
2. What it should be (cite the DESIGN.md spec or token)
3. Severity: **break** (violates design system), **drift** (works but doesn't match spec), **polish** (could be better)
