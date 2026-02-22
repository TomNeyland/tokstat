# Phase 1: Engine

## Goal

`npx tokstat ./data/**/*.json --format json` outputs a correct, complete analysis tree. No browser, no visualization, no HTML. Just the brain.

This is the foundation everything else stands on. If the token counts are wrong, the treemap is a beautiful lie. Get this right.

## End state

Three commands work:

```bash
# Structured output — the full analysis tree as JSON
npx tokstat ./fixtures/**/*.json --format json

# LLM-optimized text — paste into a conversation for schema auditing
npx tokstat ./fixtures/**/*.json --format llm

# Interactive — for now, just prints "interactive mode not yet implemented" and exits 0
npx tokstat ./fixtures/**/*.json
```

The JSON output matches the `AnalysisNode` schema from `docs/ENGINE_SPEC.md`. Every field populated, every stat computed, every insight detected.

## What to build, in order

### 1. Fixtures first

Before writing a single line of engine code, create test fixtures. You need JSON files with known properties so you can verify the engine's output against manual calculations.

Start small: 5-10 files, 3 levels of nesting, mix of types. See the `/generate-fixtures` skill. You'll want at least:
- A "basic" set with predictable token counts you can verify by hand
- A "sparse" set where most optional fields are null (tests fill rate)
- A "verbose" set with long field names and deep nesting (tests overhead detection)

The fixtures ARE the test suite. If you can't hand-calculate the expected output for your fixtures, you can't verify the engine.

### 2. Schema inference

The first real code. Given a set of parsed JSON objects, build a `SchemaNode` tree representing the union schema.

This is a tree walk, not a complicated algorithm, but the edge cases matter:
- A field that exists in some files and not others — `instance_count` vs. `present_count`
- Arrays with varying item counts — the item schema is the union of all items across all instances
- Nested objects inside arrays inside objects — the path convention (`root.endpoints[].confidence_interval.lower`) must be consistent and unambiguous
- Null values — they count toward `instance_count` (the field exists) but not `present_count` (it has no value)

Write tests for each edge case. The schema inference output is the skeleton that every later stage hangs data on. If the skeleton is wrong, everything is wrong.

### 3. Tokenization

The hardest stage and the one most likely to have subtle bugs. You're taking a JSON file, serializing it to the exact string the LLM would have produced, tokenizing that string, and attributing each token to a schema node.

The key insight: you must tokenize the FULL string, not individual fields. Token boundaries cross field boundaries — `","` (comma-quote) might be a single token. Tokenizing `"field_name"` in isolation gives different tokens than it has in context.

The approach (detailed in `ENGINE_SPEC.md`):
1. Serialize to minified JSON
2. Build a character-to-schema-node map while serializing
3. Tokenize the full string with `js-tiktoken`
4. Map each token's character span to a schema node

The decomposition into schema overhead / value payload / null waste happens during attribution. A token that falls in a key span is schema overhead. A token in a null value span is null waste. A token in a non-null value span is value payload.

**Test this obsessively.** Take a tiny JSON file (`{"a": 1, "b": null}`), manually count the tokens, manually classify each one, and verify the engine agrees. Then scale up to your fixtures.

### 4. Aggregation

Once you have per-file token counts per node, compute statistics: avg, min, max, p50, p95.

This is straightforward math. The only subtlety is percentiles — store all per-file values in an array, sort, and index. Don't use approximate sketches for v1; the corpus sizes are small enough for exact computation.

Also compute:
- Fill rate: `present_count / instance_count`
- String value diversity: `unique_values / present_count`
- Array cardinality stats: avg/min/max/p95 of `array_item_counts`
- Example values: reservoir-sampled during tokenization

### 5. Insights

The detectors described in `ENGINE_SPEC.md`. Each one walks the analysis tree and emits `Insight` objects for nodes that match its criteria.

Start with the two highest-value ones:
- **Null tax**: fields that are mostly null, quantified waste
- **Array key repetition tax**: field names repeated across array items, quantified overhead

Then add:
- Schema overhead ratio (the headline number)
- Hollow objects
- Boilerplate detection

Each insight must include `savings_tokens` and `savings_usd_per_10k` — the numbers that make people act. "This field costs you" is information. "Removing this field saves $412 per 10K runs" is a decision.

### 6. Cost calculation

Apply model pricing to token counts. Simple multiplication, but get the pricing right — use output token prices (not input), per-1M-token pricing (not per-1K), and the correct tokenizer for each model.

Ship with pricing for GPT-4o, GPT-4o-mini, Claude Sonnet, Claude Haiku. Allow `--cost-per-1k` for custom pricing.

### 7. Output formatters

Two formatters for Phase 1:

**JSON**: Serialize the full `AnalysisNode` tree + `AnalysisSummary` + `Insight[]` as JSON. This is the machine-readable output. It should be stable (don't change the schema casually) and complete (every computed value is in the output).

**LLM**: Generate the token-efficient text format from `ENGINE_SPEC.md`. This needs to be concise (under 2000 tokens for a typical corpus) and structured for an LLM to reason about. Test it by actually pasting it into an LLM conversation and asking for schema recommendations — if the LLM gives generic advice, your output isn't surfacing the right information.

### 8. CLI

Wire it all together. `npx tokstat <glob> [options]` resolves the glob, runs the pipeline, and outputs the result.

The CLI is thin — it parses args, calls the engine, and calls a formatter. No business logic in the CLI layer.

## How to know you're done

1. Run `npx tokstat ./fixtures/basic/**/*.json --format json` and verify every field in the output against hand calculations.
2. Run `npx tokstat ./fixtures/sparse/**/*.json --format json` and verify fill rates match the actual null distribution in the fixtures.
3. Run `npx tokstat ./fixtures/**/*.json --format llm` and paste the output into an LLM. Ask it to recommend schema changes. The recommendations should be specific and reference actual field names from your fixtures.
4. The null tax insight fires on sparse fixtures and the savings numbers are correct.
5. The overhead ratio matches what you'd compute by hand on a small example.

If all five are true, the engine is ready for Phase 2.
