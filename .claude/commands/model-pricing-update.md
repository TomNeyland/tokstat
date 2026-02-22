---
name: model-pricing-update
description: Use when adding or updating LLM model pricing data — ensures the pricing table is accurate and complete for cost estimation.
---

# Model Pricing Update

tokstat estimates dollar costs from token counts using a bundled pricing table. Wrong prices = wrong recommendations. This skill ensures updates are correct.

## When to Use

- A provider changes their pricing
- Adding a new model to the supported list
- User reports cost estimates don't match their bills

## Process

1. Identify the model and provider.

2. Find the **output token price** (tokstat only cares about output — the JSON is generated output, not input).

3. Update the pricing table in the engine source. Each entry needs:
   - Model ID (e.g., `gpt-4o`, `claude-sonnet-4-5`)
   - Provider (e.g., `openai`, `anthropic`, `google`)
   - Output price per 1M tokens (USD)
   - Default tokenizer encoding (e.g., `o200k_base`, `cl100k_base`)

4. Verify against the provider's pricing page. Link the source URL in a comment.

5. Test:
   ```bash
   npx tokstat ./tests/fixtures/basic/**/*.json --model <new-model> --format json | jq '.tree.cost_per_instance_usd'
   ```
   Manually calculate expected cost from token count * price. They should match.

## Common Mistakes

- Using **input** token price instead of **output** price
- Forgetting that some providers price per 1K tokens, others per 1M
- Not updating the tokenizer encoding (different models use different tokenizers — token COUNT changes too, not just price)
- Stale prices — always check the provider's current pricing page, not blog posts or articles
