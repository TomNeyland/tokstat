---
name: analyze-fixture
description: Use when developing or testing the engine — runs tokstat's own analysis on fixture/test JSON to validate output correctness and eat our own dogfood.
---

# Analyze Fixture

Run tokstat's engine on a JSON corpus and inspect the output. The dogfooding skill — if our own tool can't produce useful analysis of test data, nothing else matters.

## When to Use

- After changing any engine code (schema inference, tokenization, aggregation)
- After adding a new stat (p50, fill rate, etc.) to verify it computes correctly
- When writing fixture data to verify edge cases
- When you want to sanity-check that the analysis tree is shaped correctly for the viz

## Process

1. Identify fixture corpus. Check `tests/fixtures/` for existing JSON files. If none exist or none cover the case, use `/generate-fixtures` first.

2. Run the engine CLI on the fixtures:
   ```bash
   npx tokstat ./tests/fixtures/**/*.json --format json
   ```

3. Inspect the output tree. For each node, verify:
   - [ ] `tokens.avg`, `tokens.min`, `tokens.max` are plausible
   - [ ] `tokens.schema_overhead` + `tokens.value_payload` + `tokens.null_waste` = `tokens.avg`
   - [ ] `fill_rate` matches manual count of non-null instances
   - [ ] `type` matches the actual JSON type in fixtures
   - [ ] `children` are present for objects/arrays, absent for scalars
   - [ ] `path` is the correct dotted JSON path

4. Run the LLM output mode and read it:
   ```bash
   npx tokstat ./tests/fixtures/**/*.json --format llm
   ```
   Ask: would this text actually help someone audit their schema? Is anything confusing or missing?

## Red Flags

- A node with `tokens.avg: 0` that has actual content in fixtures
- `fill_rate: 1.0` on a field that's null in some fixture files
- `schema_overhead` that's larger than `tokens.avg` (impossible)
- Missing children on an object/array node
