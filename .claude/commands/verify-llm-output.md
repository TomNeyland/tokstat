---
name: verify-llm-output
description: Use after changing the --format llm output — tests that the LLM-optimized text is actually useful for schema auditing conversations.
---

# Verify LLM Output

The `--format llm` output exists so you can paste it into an LLM conversation and have a productive schema audit. If the output isn't actionable in that context, it's failed.

## When to Use

- After changing the LLM output formatter
- After adding new insight types
- Before release

## Process

1. Generate LLM output on a non-trivial corpus:
   ```bash
   npx tokstat ./tests/fixtures/**/*.json --format llm
   ```

2. Read the output yourself. Ask:
   - [ ] Can you immediately identify the most expensive fields?
   - [ ] Can you immediately identify the most wasteful fields (high cost, low fill)?
   - [ ] Are the schema overhead hotspots called out?
   - [ ] Is the token/cost data specific enough to act on? (not just "endpoints is big")
   - [ ] Is it concise enough to fit in a single LLM message? (under ~2000 tokens)

3. Paste the output into an LLM conversation with the prompt:
   > "Based on this tokstat analysis, what changes would you recommend to reduce token costs while preserving the most valuable data?"

4. Evaluate the LLM's response:
   - [ ] Does it make specific, actionable recommendations?
   - [ ] Does it reference actual field names and numbers from the output?
   - [ ] Would following its advice actually reduce costs?
   - [ ] Or is it giving generic advice that ignores the data?

If the LLM gives generic advice, the output format isn't surfacing the right information.
