---
paths:
  - "src/engine/**/*.ts"
---

# Engine

The engine is a pure function: JSON files in → analysis tree out. No DOM, no UI, no side effects.

- The engine exists to serve the visualization. Shape the output tree for what the viz needs.
- Every node in the output tree must carry enough data for all four viz modes and all four color encodings.
- Fail fast. No fallbacks, no defaults for missing data. If a file isn't valid JSON, throw.
- Token counts must decompose into schema weight, value weight, and null weight per node.
