import type { ModelPricing } from './types.ts'

export const MODELS: Record<string, ModelPricing> = {
  'gpt-4o': {
    model_id: 'gpt-4o',
    provider: 'openai',
    output_per_1m: 10.0,
    tokenizer: 'o200k_base',
  },
  'gpt-4o-mini': {
    model_id: 'gpt-4o-mini',
    provider: 'openai',
    output_per_1m: 0.6,
    tokenizer: 'o200k_base',
  },
  'claude-sonnet-4-5': {
    model_id: 'claude-sonnet-4-5',
    provider: 'anthropic',
    output_per_1m: 15.0,
    tokenizer: 'o200k_base', // Anthropic uses its own tokenizer but o200k_base is a reasonable proxy
  },
  'claude-haiku-4-5': {
    model_id: 'claude-haiku-4-5',
    provider: 'anthropic',
    output_per_1m: 5.0,
    tokenizer: 'o200k_base',
  },
}

export function getModelPricing(modelId: string): ModelPricing {
  const pricing = MODELS[modelId]
  if (!pricing) {
    throw new Error(`Unknown model: "${modelId}". Available: ${Object.keys(MODELS).join(', ')}`)
  }
  return pricing
}

export function getAllStaticModels(): ModelPricing[] {
  return Object.values(MODELS)
}
