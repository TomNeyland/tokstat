import type { ModelPricing } from './types.ts'

interface OpenRouterModel {
  id: string
  name: string
  pricing: {
    completion: string  // per-token price as string
    prompt: string
  }
}

interface OpenRouterResponse {
  data: OpenRouterModel[]
}

/**
 * Fetch live model pricing from OpenRouter's public API.
 * Returns ModelPricing[] sorted by provider + model name.
 */
export async function fetchLivePricing(): Promise<ModelPricing[]> {
  const res = await fetch('https://openrouter.ai/api/v1/models')
  const json: OpenRouterResponse = await res.json()

  const models: ModelPricing[] = []

  for (const m of json.data) {
    const completionPrice = parseFloat(m.pricing.completion)
    if (!completionPrice || completionPrice <= 0) continue

    const { provider, modelId } = parseModelId(m.id)
    models.push({
      model_id: modelId,
      provider,
      output_per_1m: completionPrice * 1_000_000,
      tokenizer: 'o200k_base', // proxy for all models (matches existing convention)
    })
  }

  // Sort by provider, then model name
  models.sort((a, b) => {
    const prov = a.provider.localeCompare(b.provider)
    if (prov !== 0) return prov
    return a.model_id.localeCompare(b.model_id)
  })

  return models
}

/**
 * Parse an OpenRouter model ID like "openai/gpt-4o" into provider + model.
 */
function parseModelId(id: string): { provider: string; modelId: string } {
  const slashIdx = id.indexOf('/')
  if (slashIdx === -1) return { provider: 'unknown', modelId: id }
  return {
    provider: id.slice(0, slashIdx),
    modelId: id.slice(slashIdx + 1),
  }
}
