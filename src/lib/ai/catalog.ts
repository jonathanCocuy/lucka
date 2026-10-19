export type OnlineProviderId = 'openai' | 'anthropic' | 'gemini'
export type AiProviderId = 'local' | OnlineProviderId

export interface AiProvider {
  id: AiProviderId
  // Local: id of the downloaded model. Online: the provider's model id.
  model: string
  isDefault: boolean
}

export interface ModelOption {
  id: string
  name: string
  recommended?: boolean
}

interface OnlineProvider {
  name: string
  // Where the user gets the key.
  keyUrl: string
  models: ModelOption[]
}

// Adding a model here = shipping a release. The recommended one is the fastest and cheapest.
export const ONLINE_PROVIDERS: Record<OnlineProviderId, OnlineProvider> = {
  openai: {
    name: 'OpenAI (ChatGPT)',
    keyUrl: 'platform.openai.com/api-keys',
    models: [
      { id: 'gpt-6-luna', name: 'GPT-6 Luna', recommended: true },
      { id: 'gpt-6.1-sol', name: 'GPT-6.1 Sol' },
    ],
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    keyUrl: 'platform.claude.com/settings/keys',
    models: [
      { id: 'claude-haiku-5-5', name: 'Claude Haiku 5.5', recommended: true },
      { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5' },
    ],
  },
  gemini: {
    name: 'Google (Gemini)',
    keyUrl: 'aistudio.google.com/apikey',
    models: [
      {
        id: 'gemini-3.5-flash-lite',
        name: 'Gemini 3.5 Flash-Lite',
        recommended: true,
      },
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash' },
    ],
  },
}

export const ONLINE_IDS = Object.keys(ONLINE_PROVIDERS) as OnlineProviderId[]

export function providerName(id: AiProviderId) {
  return id === 'local' ? 'Modelo local' : ONLINE_PROVIDERS[id].name
}

export function modelName(provider: AiProvider) {
  if (provider.id === 'local') return provider.model
  const option = ONLINE_PROVIDERS[provider.id].models.find(
    m => m.id === provider.model,
  )
  return option?.name ?? provider.model
}
