'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Icon } from '@/components/ui/icon'
import {
  interpret,
  startRecording,
  stopRecording,
  wasPrompted,
} from '@/lib/api-client/ai'
import { errorMessage } from '@/lib/api-client/http'
import { resolve, type Draft } from '@/lib/ai/resolve'
import { toISODate } from '@/lib/finance/calc'
import { useFinance } from '../finance-provider'
import { AiSetupModal, type SetupStep } from './ai-setup-modal'
import { useAi } from './use-ai'
import { VoiceSummaryModal } from './voice-summary-modal'
import styles from './voice.module.css'

type State = 'idle' | 'recording' | 'transcribing' | 'thinking'

const LABELS: Record<State, string> = {
  idle: 'Registrar hablando',
  recording: 'Parar y procesar',
  transcribing: 'Escuchando lo que dijiste…',
  thinking: 'Entendiendo…',
}

export function VoiceButton() {
  const { data, summary } = useFinance()
  const { config, refresh } = useAi()
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)
  const [setup, setSetup] = useState<SetupStep | null>(null)
  const [result, setResult] = useState<{ draft: Draft; heard: string } | null>(
    null,
  )

  // Una sola vez: a quien nunca se le preguntó, se le ofrece la IA.
  useEffect(() => {
    let cancelled = false
    wasPrompted().then(
      prompted => {
        if (!cancelled && !prompted) setSetup('intro')
      },
      () => null,
    )
    return () => {
      cancelled = true
    }
  }, [])

  if (!data || !summary || !config) return null

  const process = async () => {
    const provider = config.defaultProvider
    if (!provider) return
    setState('transcribing')
    const heard = await stopRecording()
    setState('thinking')
    const today = toISODate(new Date())
    const raw = await interpret(provider, {
      text: heard,
      today,
      categories: data.categories.map(c => c.name),
      fixed: summary.fixed.filter(f => !f.isPaid).map(f => f.fixed.name),
    })
    const draft = resolve(raw, {
      today,
      categories: data.categories,
      fixed: summary.fixed.map(f => ({
        id: f.fixed.id,
        name: f.fixed.name,
        pending: f.pending,
        isPaid: f.isPaid,
      })),
    })
    setResult({ draft, heard })
  }

  const click = async () => {
    setError(null)
    if (!config.ready) {
      setSetup(config.providers.length === 0 ? 'provider' : 'whisper')
      return
    }
    try {
      if (state === 'idle') {
        await startRecording()
        setState('recording')
      } else if (state === 'recording') {
        await process()
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setState(s => (s === 'recording' ? s : 'idle'))
    }
  }

  const busy = state === 'transcribing' || state === 'thinking'

  return (
    <>
      <div className={styles.dock}>
        {(error || busy) && (
          <div
            className={styles.bubble}
            data-tone={error ? 'error' : undefined}
            role={error ? 'alert' : 'status'}
          >
            {error ?? LABELS[state]}
            {error && <Link href="/settings">Revisar en Ajustes</Link>}
          </div>
        )}
        <button
          type="button"
          className={styles.fab}
          data-state={state}
          aria-label={LABELS[state]}
          title={LABELS[state]}
          disabled={busy}
          onClick={click}
        >
          {busy ? (
            <span className={styles.spinner} />
          ) : (
            <Icon name={state === 'recording' ? 'stop' : 'mic'} size={28} />
          )}
        </button>
      </div>

      {setup && (
        <AiSetupModal
          open
          startAt={setup}
          config={config}
          onChange={refresh}
          onClose={() => setSetup(null)}
        />
      )}
      {result && (
        <VoiceSummaryModal
          draft={result.draft}
          heard={result.heard}
          onClose={() => setResult(null)}
        />
      )}
    </>
  )
}
