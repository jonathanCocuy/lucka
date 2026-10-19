'use client'

import { useCallback, useEffect, useState } from 'react'
import { listModels, listProviders, type LocalModel } from '@/lib/api-client/ai'
import type { AiProvider } from '@/lib/ai/catalog'

export interface AiConfig {
  providers: AiProvider[]
  models: LocalModel[]
  defaultProvider: AiProvider | null
  whisper: LocalModel | null
  // Everything is ready to talk: Whisper + a default AI ready to use.
  ready: boolean
}

async function loadConfig(): Promise<AiConfig> {
  const [providers, models] = await Promise.all([listProviders(), listModels()])
  const defaultProvider = providers.find(p => p.isDefault) ?? null
  const whisper = models.find(m => m.kind === 'whisper' && m.installed) ?? null
  const llmReady =
    defaultProvider?.id !== 'local' ||
    models.some(m => m.id === defaultProvider.model && m.installed)
  return {
    providers,
    models,
    defaultProvider,
    whisper,
    ready: Boolean(defaultProvider && whisper && llmReady),
  }
}

export function useAi() {
  const [config, setConfig] = useState<AiConfig | null>(null)

  const refresh = useCallback(
    () =>
      loadConfig().then(setConfig, error =>
        console.error('No se pudo leer la IA', error),
      ),
    [],
  )

  useEffect(() => {
    let cancelled = false
    loadConfig().then(
      next => {
        if (!cancelled) setConfig(next)
      },
      error => console.error('No se pudo leer la IA', error),
    )
    return () => {
      cancelled = true
    }
  }, [])

  return { config, refresh }
}

export function formatSize(bytes: number) {
  const gb = bytes / 1_000_000_000
  return gb >= 1
    ? `${gb.toLocaleString('es-CO', { maximumFractionDigits: 1 })} GB`
    : `${Math.round(bytes / 1_000_000)} MB`
}
