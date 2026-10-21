'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Icon } from '@/components/ui/icon'
import {
  cancelRecording,
  getAudioLevel,
  interpret,
  openMicSettings,
  startRecording,
  stopRecording,
  wasPrompted,
} from '@/lib/api-client/ai'
import { ApiClientError } from '@/lib/api-client/http'
import { resolve, type Draft } from '@/lib/ai/resolve'
import { toISODate } from '@/lib/finance/calc'
import { usePreferences } from '@/lib/i18n/context'
import { useFinance } from '../finance-provider'
import { AiSetupModal, type SetupStep } from './ai-setup-modal'
import { useAi } from './use-ai'
import { VoiceSummaryModal } from './voice-summary-modal'
import styles from './voice.module.css'

type State = 'idle' | 'recording' | 'transcribing' | 'thinking'

// Shape multipliers per bar: outer bars shorter, middle taller.
const BAR_MULTIPLIERS = [0.55, 0.8, 1.0, 0.8, 0.55]
const MIN_H = 4
const MAX_H = 28
const SPRING = { type: 'spring', stiffness: 280, damping: 22 } as const

function AudioWaveform({ level }: { level: number }) {
  const talking = level > 0.01
  return (
    <div className={styles.waveform} aria-hidden="true">
      {BAR_MULTIPLIERS.map((mult, i) => (
        <motion.span
          key={i}
          className={styles.bar}
          data-talking={talking}
          animate={{
            height: talking
              ? MIN_H + (MAX_H - MIN_H) * Math.min(level * 4, 1) * mult
              : MIN_H,
          }}
          transition={SPRING}
        />
      ))}
    </div>
  )
}

export function VoiceButton() {
  const { data, summary } = useFinance()
  const { config, refresh } = useAi()
  const { t, prefs, fixedName, error: errorFor } = usePreferences()
  const errorForRef = useRef(errorFor)
  useLayoutEffect(() => {
    errorForRef.current = errorFor
  })
  const labels = t.voice.states
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)
  const [micDenied, setMicDenied] = useState(false)
  const [silenceHint, setSilenceHint] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [setup, setSetup] = useState<SetupStep | null>(null)
  const [result, setResult] = useState<{ draft: Draft; heard: string } | null>(
    null,
  )

  // Cancel any active recording when navigating away.
  useEffect(() => {
    return () => {
      void cancelRecording()
    }
  }, [])

  useEffect(() => {
    if (state !== 'recording') return
    // Start a silence timer; reset it whenever the user talks.
    let silenceTimer: ReturnType<typeof setTimeout> | null = null
    const resetTimer = () => {
      if (silenceTimer) clearTimeout(silenceTimer)
      silenceTimer = setTimeout(() => {
        void cancelRecording().catch(() => null)
        setState(s => (s === 'recording' ? 'idle' : s))
        setError(errorForRef.current(new ApiClientError(422, 'notHeard')))
      }, 10000)
    }
    resetTimer()
    const id = setInterval(() => {
      void getAudioLevel()
        .then(level => {
          setAudioLevel(level)
          if (level > 0.01) {
            setSilenceHint(false)
            resetTimer()
          }
        })
        .catch(() => null)
    }, 100)
    return () => {
      clearInterval(id)
      if (silenceTimer) clearTimeout(silenceTimer)
      setSilenceHint(false)
      setAudioLevel(0)
    }
  }, [state])

  // Only once: anyone never asked gets offered the AI.
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
    const heard = await stopRecording(prefs.language)
    setState('thinking')
    const today = toISODate(new Date())
    const raw = await interpret(provider, {
      ...prefs,
      text: heard,
      today,
      categories: data.categories.map(c => c.name),
      fixed: summary.fixed.filter(f => !f.isPaid).map(f => fixedName(f.fixed)),
    })
    const draft = resolve(raw, {
      today,
      currency: prefs.currency,
      categories: data.categories,
      fixed: summary.fixed.map(f => ({
        id: f.fixed.id,
        name: fixedName(f.fixed),
        pending: f.pending,
        isPaid: f.isPaid,
      })),
    })
    if (draft.items.length === 0 && draft.warnings.length === 0) {
      throw new ApiClientError(422, 'notHeard')
    }
    setResult({ draft, heard })
  }

  const click = async () => {
    setError(null)
    setMicDenied(false)
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
      setError(errorFor(err))
      setMicDenied(err instanceof ApiClientError && err.code === 'micDenied')
    } finally {
      setState(s => (s === 'recording' ? s : 'idle'))
    }
  }

  const busy = state === 'transcribing' || state === 'thinking'

  return (
    <>
      <div className={styles.dock}>
        {state === 'recording' && <AudioWaveform level={audioLevel} />}
        {(error || busy || silenceHint) && (
          <div
            className={styles.bubble}
            data-tone={error ? 'error' : undefined}
            role={error ? 'alert' : 'status'}
          >
            {error ??
              (silenceHint && !busy ? t.voice.silenceHint : labels[state])}
            {error && !micDenied && (
              <Link href="/settings">{t.voice.checkSettings}</Link>
            )}
            {micDenied && (
              <button type="button" onClick={() => void openMicSettings()}>
                {t.voice.openMicSettings}
              </button>
            )}
          </div>
        )}
        <button
          type="button"
          className={styles.fab}
          data-state={state}
          aria-label={labels[state]}
          title={labels[state]}
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
