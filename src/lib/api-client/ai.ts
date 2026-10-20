import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import type {
  AiProvider,
  AiProviderId,
  OnlineProviderId,
} from '@/lib/ai/catalog'
import {
  listAiProviders,
  markAiPrompted,
  removeAiProvider,
  saveAiProvider,
  setDefaultAiProvider,
  wasAiPrompted,
} from '@/lib/local-db/ai-providers'
import type { Language, Preferences } from '@/lib/i18n/locale'
import { ApiClientError, isErrorCode, type ErrorParams } from './http'

export interface LocalModel {
  id: string
  kind: 'whisper' | 'llm'
  name: string
  size: number
  recommended: boolean
  installed: boolean
}

export interface InterpretContext extends Preferences {
  text: string
  today: string
  categories: string[]
  fixed: string[]
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

// Rust sends { code, provider?, status? } (src-tauri/src/error.rs).
// Anything else, like a bad argument caught by Tauri, gets the generic message.
export function nativeError(error: unknown) {
  if (!isObject(error) || !isErrorCode(error.code)) {
    return new ApiClientError(422, 'generic')
  }
  const params: ErrorParams = {}
  if (typeof error.provider === 'string') params.provider = error.provider
  if (typeof error.status === 'number') params.status = error.status
  return new ApiClientError(422, error.code, params)
}

async function call<T>(command: string, args?: Record<string, unknown>) {
  try {
    return await invoke<T>(command, args)
  } catch (error) {
    throw nativeError(error)
  }
}

export const listModels = () => call<LocalModel[]>('models_status')

export async function downloadModel(
  id: string,
  onProgress: (fraction: number) => void,
) {
  const stop = await listen<{ id: string; downloaded: number; total: number }>(
    'models://progress',
    e => {
      if (e.payload.id === id)
        onProgress(e.payload.downloaded / e.payload.total)
    },
  )
  try {
    await call('model_download', { id })
  } finally {
    stop()
  }
}

export const deleteModel = (id: string) => call('model_delete', { id })

export const startRecording = () => call('voice_start')
// Whisper listens in the app's language.
export const stopRecording = (language: Language) =>
  call<string>('voice_stop', { language })
export const checkMic = () => call('voice_check_mic')

export const listProviders = listAiProviders
export const setDefaultProvider = setDefaultAiProvider
export const wasPrompted = wasAiPrompted
export const markPrompted = markAiPrompted

// The key is tested and stored in the keychain before the provider is saved.
export async function addOnlineProvider(
  id: OnlineProviderId,
  model: string,
  key: string,
) {
  await call('ai_save_key', { provider: id, key })
  await saveAiProvider(id, model)
}

export async function addLocalProvider(model: string) {
  await saveAiProvider('local', model)
}

// Removing = also deleting the key from the keychain or the model from disk.
export async function removeProvider(provider: AiProvider) {
  if (provider.id === 'local') await deleteModel(provider.model)
  else await call('ai_delete_key', { provider: provider.id })
  await removeAiProvider(provider.id)
}

export function interpret(
  provider: { id: AiProviderId; model: string },
  context: InterpretContext,
) {
  return call<unknown>('ai_interpret', {
    provider: provider.id,
    model: provider.model,
    context,
  })
}
