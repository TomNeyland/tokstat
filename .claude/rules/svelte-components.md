---
paths:
  - "src/**/*.svelte"
---

# Svelte Components

The UX is the product. If this component looks like it came from a template, it's wrong.

- Every color, spacing, radius, shadow, easing, duration: use a token from `tokens.css`. No raw values.
- Svelte 5 runes: `$state`, `$derived`, `$effect`. Not stores.
- Hover states: instant (50ms). Never make the user wait for feedback.
- Transitions between states must answer "what just happened?" — if they can't, cut them.
- Check DESIGN.md component specs before building. Match the spec exactly.
