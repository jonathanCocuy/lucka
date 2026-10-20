'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { removeProvider, setDefaultProvider } from '@/lib/api-client/ai'
import { modelName, providerName, type AiProvider } from '@/lib/ai/catalog'
import { usePreferences } from '@/lib/i18n/context'
import settings from '../settings/settings.module.css'
import { AiSetupModal, type SetupStep } from './ai-setup-modal'
import { useAi } from './use-ai'
import styles from './voice.module.css'

// Content of the "AI and voice" section in Settings.
export function AiSettings() {
  const { config, refresh } = useAi()
  const { t, error: errorFor } = usePreferences()
  const copy = t.ai
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
        setError(errorFor(err))
      }
    })

  // For the local model, show the catalog name, not the id.
  const label = (p: AiProvider) =>
    p.id === 'local'
      ? (config.models.find(m => m.id === p.model)?.name ?? p.model)
      : modelName(p)

  return (
    <>
      <p className={settings.hint}>{copy.hint}</p>

      {config.providers.length > 0 && (
        <ul className={styles.providers}>
          {config.providers.map(p => (
            <li key={p.id} className={styles.provider}>
              <span className={styles.providerName}>
                {providerName(p.id, copy.localModel)}
                <small>
                  {label(p)}
                  {p.isDefault && ` · ${copy.usedWhenTalking}`}
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
                    {copy.useWhenTalking}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  className={settings.danger}
                  disabled={busy}
                  onClick={() => run(() => removeProvider(p))}
                >
                  {t.common.remove}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className={settings.hint}>
        {copy.voiceModel(config.whisper?.name ?? null)}
      </p>

      <div className={settings.actions}>
        <Button
          type="button"
          disabled={busy}
          onClick={() =>
            setSetup(config.providers.length ? 'provider' : 'intro')
          }
        >
          {config.providers.length ? copy.addAnother : copy.setUp}
        </Button>
        <Button
          type="button"
          variant="soft"
          disabled={busy}
          onClick={() => setSetup('whisper')}
        >
          {config.whisper ? copy.changeVoice : copy.downloadVoice}
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
