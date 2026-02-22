export type ModelOption = {
  id: string
  name: string
  completionPerTokenUsd: number | null
  promptPerTokenUsd: number | null
  provider?: string
}

export const FALLBACK_MODEL_OPTIONS: ModelOption[] = [
  { id: 'gpt-5-mini', name: 'OpenAI: GPT-5 mini', completionPerTokenUsd: 0.000002, promptPerTokenUsd: 0.0000005, provider: 'openai' },
  { id: 'gpt-4o', name: 'OpenAI: GPT-4o', completionPerTokenUsd: 0.000015, promptPerTokenUsd: 0.000005, provider: 'openai' },
  { id: 'gpt-4o-mini', name: 'OpenAI: GPT-4o mini', completionPerTokenUsd: 0.0000006, promptPerTokenUsd: 0.00000015, provider: 'openai' },
  { id: 'anthropic/claude-sonnet-4.6', name: 'Anthropic: Claude Sonnet 4.6', completionPerTokenUsd: 0.000015, promptPerTokenUsd: 0.000003, provider: 'anthropic' },
  { id: 'anthropic/claude-haiku-4.5', name: 'Anthropic: Claude Haiku 4.5', completionPerTokenUsd: 0.00000125, promptPerTokenUsd: 0.00000025, provider: 'anthropic' },
  { id: 'google/gemini-3.1-pro-preview', name: 'Google: Gemini 3.1 Pro Preview', completionPerTokenUsd: 0.000012, promptPerTokenUsd: 0.000002, provider: 'google' },
]

export async function fetchOpenRouterModelCatalog(signal?: AbortSignal): Promise<ModelOption[]> {
  const response = await fetch('https://openrouter.ai/api/v1/models', { signal })
  if (!response.ok) {
    throw new Error(`OpenRouter models fetch failed (${response.status})`)
  }
  const json = await response.json()
  const rows = Array.isArray(json?.data) ? json.data : []
  const parsed = rows.map(parseOpenRouterModel).filter(Boolean)
  return dedupeAndSort(parsed)
}

export function dedupeAndSort(models: ModelOption[]): ModelOption[] {
  const map = new Map<string, ModelOption>()
  for (const model of models) {
    const prev = map.get(model.id)
    if (!prev) {
      map.set(model.id, model)
      continue
    }
    map.set(model.id, {
      ...prev,
      ...model,
      completionPerTokenUsd: model.completionPerTokenUsd ?? prev.completionPerTokenUsd,
      promptPerTokenUsd: model.promptPerTokenUsd ?? prev.promptPerTokenUsd,
    })
  }
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id))
}

export function completionPer1kUsd(modelId: string, catalog: ModelOption[]): number | null {
  const row = catalog.find((m) => m.id === modelId)
  if (!row || row.completionPerTokenUsd == null) return null
  return row.completionPerTokenUsd * 1000
}

function parseOpenRouterModel(row: any): ModelOption | null {
  if (!row?.id) return null
  const completion = parseNullableNumber(row?.pricing?.completion)
  const prompt = parseNullableNumber(row?.pricing?.prompt)
  return {
    id: String(row.id),
    name: String(row.name ?? row.id),
    completionPerTokenUsd: completion,
    promptPerTokenUsd: prompt,
    provider: String(row.id).split('/')[0],
  }
}

function parseNullableNumber(value: unknown): number | null {
  if (value == null) return null
  const num = typeof value === 'number' ? value : Number(String(value))
  return Number.isFinite(num) ? num : null
}
