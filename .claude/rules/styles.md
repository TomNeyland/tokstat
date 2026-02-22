---
paths:
  - "src/**/*.css"
---

# Styles

- `tokens.css` is the source of truth. All other CSS references tokens via `var(--*)`.
- No hex colors in component styles. No pixel values for spacing. No hardcoded easings.
- The dark theme is not optional — it's the product. There is no light mode.
- `@media (prefers-reduced-motion: reduce)` — all animation off, tool still fully functional.
