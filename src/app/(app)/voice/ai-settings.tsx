'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { removeProvider, setDefaultProvider } from '@/lib/api-client/ai'
import { errorMessage } from '@/lib/api-client/http'
import { modelName, providerName, type AiProvider } from '@/lib/ai/catalog'
import settings from '../settings/settings.module.css'
import { AiSetupModal, type SetupStep } from './ai-setup-modal'
import { useAi } from './use-ai'
import styles from './voice.module.css'

// Contenido de la sección "IA y voz" de Ajustes.
export function AiSettings() {
  const { config, refresh } = useAi()
  const [setup, setSetup] = useState<SetupStep | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, startBusy] = useTransition()
  if (!config) return null

  const run = (action: () => Promise<unknown>) =>
    startBusy(async () => {
      setError(null)
      try {
        await action()
        await refresh()
      } catch (err) {
        setError(errorMessage(err))
      }
    })

  // Para el modelo local se muestra el nombre del catálogo, no el id.
  const label = (p: AiProvider) =>
    p.id === 'local'
      ? (config.models.find(m => m.id === p.model)?.name ?? p.model)
      : modelName(p)

  return (
    <>
      <p className={settings.hint}>
        Registra gastos hablando. La voz se procesa en este equipo. Si usas una
        key, solo el texto va al proveedor que elijas.
      </p>

      {config.providers.length > 0 && (
        <ul className={styles.providers}>
          {config.providers.map(p => (
            <li key={p.id} className={styles.provider}>
              <span className={styles.providerName}>
                {providerName(p.id)}
                <small>
                  {label(p)}
                  {p.isDefault && ' · Se usa al hablar'}
                </small>
              </span>
              <span className={styles.actions}>
                {!p.isDefault && (
                  <Button
                    type="button"
                    variant="soft"
                    disabled={busy}
                    onClick={() => run(() => setDefaultProvider(p.id))}
                  >
                    Usar al hablar
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  className={settings.danger}
                  disabled={busy}
                  onClick={() => run(() => removeProvider(p))}
                >
                  Quitar
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className={settings.hint}>
        Modelo de voz: {config.whisper?.name ?? 'sin descargar'}
      </p>

      <div className={settings.actions}>
        <Button
          type="button"
          disabled={busy}
          onClick={() =>
            setSetup(config.providers.length ? 'provider' : 'intro')
          }
        >
          {config.providers.length ? 'Agregar otra IA' : 'Configurar IA'}
        </Button>
        <Button
          type="button"
          variant="soft"
          disabled={busy}
          onClick={() => setSetup('whisper')}
        >
          {config.whisper ? 'Cambiar modelo de voz' : 'Descargar modelo de voz'}
        </Button>
      </div>

      {error && (
        <p className={settings.error} role="alert">
          {error}
        </p>
      )}

      {setup && (
        <AiSetupModal
          open
          startAt={setup}
          config={config}
          onChange={refresh}
          onClose={() => setSetup(null)}
        />
      )}
    </>
  )
}
