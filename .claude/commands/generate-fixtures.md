---
name: generate-fixtures
description: Use when developing viz modes or testing the engine — creates realistic mock JSON corpora with controlled properties like deep nesting, sparse fills, and cost distribution.
---

# Generate Fixtures

Create realistic test JSON files that exercise specific properties of the analysis engine and visualization. Good fixtures make development fast. Bad fixtures hide bugs.

## When to Use

- Before developing a new viz mode (need data with the right shape)
- When testing engine edge cases (deeply nested, very sparse, huge arrays)
- When the existing fixtures don't cover a scenario
- When creating demo data for screenshots/documentation

## Fixture Categories

### Basic corpus
A simple, well-behaved set of ~20 JSON files with:
- 3-4 levels of nesting
- Mix of types (string, number, boolean, object, array, null)
- ~80% fill rate on optional fields
- Moderate field name lengths

### Deep nesting
Files with 6+ levels of nesting. Tests that icicle/sunburst handle depth without label overlap.

### Sparse fields
Files where most optional fields are null. Tests fill rate visualization and "waste" identification.

### Hot/cold distribution
Files where one subtree is extremely expensive (long strings, many array items) and others are cheap. Tests that the thermal scale creates visible contrast.

### Array variance
Files where an array field has 2 items in some files and 50+ in others. Tests aggregation stats (avg vs p95) and treemap cell sizing.

### Verbose schema
Files with very long field names (`mechanism_of_action_detailed_description`). Tests schema overhead calculation.

### Minimal
Files with a single flat object, 3 fields. Tests that the viz handles trivially small data gracefully.

## Output

Write fixtures to `tests/fixtures/{category}/`. Each category gets its own directory. Files should be valid JSON and look like plausible LLM output — not random noise.
