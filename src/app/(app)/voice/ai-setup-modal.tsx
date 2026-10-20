'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import field from '@/components/ui/field.module.css'
import { Modal } from '@/components/ui/modal'
import { Progress } from '@/components/ui/progress'
import {
  addLocalProvider,
  addOnlineProvider,
  checkMic,
  downloadModel,
  markPrompted,
  type LocalModel,
} from '@/lib/api-client/ai'
import {
  ONLINE_IDS,
  ONLINE_PROVIDERS,
  type OnlineProviderId,
} from '@/lib/ai/catalog'
import { formatSize } from '@/lib/finance/format'
import { usePreferences } from '@/lib/i18n/context'
import forms from '../dashboard/forms.module.css'
import type { AiConfig } from './use-ai'
import styles from './voice.module.css'

export type SetupStep = 'intro' | 'provider' | 'whisper' | 'mic' | 'done'

interface AiSetupModalProps {
  open: boolean
  startAt: SetupStep
  config: AiConfig
  onChange: () => Promise<unknown>
  onClose: () => void
}

export function AiSetupModal(props: AiSetupModalProps) {
  const { t } = usePreferences()
  const [step, setStep] = useState(props.startAt)
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      eyebrow={t.aiSetup.eyebrow}
      title={t.aiSetup.titles[step]}
    >
      {/* Mounted fresh on every open. */}
      {props.open && <Steps {...props} step={step} setStep={setStep} />}
    </Modal>
  )
}

function Steps({
  step,
  setStep,
  startAt,
  config,
  onChange,
  onClose,
}: AiSetupModalProps & { step: SetupStep; setStep: (s: SetupStep) => void }) {
  const { t } = usePreferences()
  const copy = t.aiSetup
  // Someone who already had Whisper only added another AI: no need to repeat the rest.
  const afterProvider = (): SetupStep =>
    !config.whisper ? 'whisper' : startAt === 'intro' ? 'mic' : 'done'

  if (step === 'intro') {
    const answer = (yes: boolean) => {
      void markPrompted().catch(() => null)
      if (yes) setStep('provider')
      else onClose()
    }
    return (
      <div className={forms.form}>
        <p className={styles.lead}>{copy.introLead}</p>
        <p className={forms.hint}>{copy.introHint}</p>
        <div className={styles.actions}>
          <Button type="button" onClick={() => answer(true)}>
            {copy.yes}
          </Button>
          <Button type="button" variant="ghost" onClick={() => answer(false)}>
            {t.common.notNow}
          </Button>
        </div>
        <p className={forms.hint}>{copy.later}</p>
      </div>
    )
  }

  if (step === 'provider') {
    return (
      <ProviderStep
        config={config}
        onDone={async () => {
          await onChange()
          setStep(afterProvider())
        }}
      />
    )
  }

  if (step === 'whisper') {
    return (
      <div className={forms.form}>
        <p className={styles.lead}>{copy.whisperLead}</p>
        <ModelPicker
          models={config.models.filter(m => m.kind === 'whisper')}
          action={copy.download}
          onDone={async () => {
            await onChange()
            setStep('mic')
          }}
        />
      </div>
    )
  }

  if (step === 'mic') return <MicStep onDone={() => setStep('done')} />

  return (
    <div className={forms.form}>
      <p className={styles.lead}>{copy.doneLead}</p>
      <Button type="button" block onClick={onClose}>
        {copy.gotIt}
      </Button>
    </div>
  )
}

function ProviderStep({
  config,
  onDone,
}: {
  config: AiConfig
  onDone: () => Promise<void>
}) {
  const { t } = usePreferences()
  const copy = t.aiSetup
  const [mode, setMode] = useState<'local' | 'online'>('local')
  return (
    <div className={forms.form}>
      <div className={forms.segment} role="radiogroup" aria-label={copy.aiType}>
        {(['local', 'online'] as const).map(m => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
          >
            {m === 'local' ? copy.local : copy.online}
          </button>
        ))}
      </div>
      {mode === 'local' ? (
        <>
          <div className={styles.note}>
            <strong>{copy.privateTitle}</strong> {copy.privateText}
          </div>
          <ModelPicker
            models={config.models.filter(m => m.kind === 'llm')}
            action={copy.downloadAndUse}
            onDone={async id => {
              await addLocalProvider(id)
              await onDone()
            }}
          />
        </>
      ) : (
        <OnlineForm onDone={onDone} />
      )}
    </div>
  )
}

function OnlineForm({ onDone }: { onDone: () => Promise<void> }) {
  const { t, error: errorFor } = usePreferences()
  const copy = t.aiSetup
  const [provider, setProvider] = useState<OnlineProviderId>('anthropic')
  const info = ONLINE_PROVIDERS[provider]
  const recommended = (id: OnlineProviderId) =>
    ONLINE_PROVIDERS[id].models.find(m => m.recommended)?.id ?? ''
  const [model, setModel] = useState(() => recommended('anthropic'))
  const [key, setKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  const pick = (id: OnlineProviderId) => {
    setProvider(id)
    setModel(recommended(id))
    setError(null)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!key.trim() || saving) return
    startSaving(async () => {
      setError(null)
      try {
        await addOnlineProvider(provider, model, key)
        await onDone()
      } catch (err) {
        setError(errorFor(err))
      }
    })
  }

  return (
    <form className={forms.form} onSubmit={submit}>
      <div className={forms.group}>
        <p className={forms.groupLabel}>{copy.provider}</p>
        <div className={forms.options}>
          {ONLINE_IDS.map(id => (
            <button
              key={id}
              type="button"
              className={forms.option}
              aria-pressed={provider === id}
              onClick={() => pick(id)}
            >
              {ONLINE_PROVIDERS[id].name}
            </button>
          ))}
        </div>
      </div>

      <div className={forms.group}>
        <p className={forms.groupLabel}>{copy.model}</p>
        <div className={forms.options}>
          {info.models.map(m => (
            <button
              key={m.id}
              type="button"
              className={forms.option}
              aria-pressed={model === m.id}
              onClick={() => setModel(m.id)}
            >
              {m.name} {m.recommended && <small>{t.common.recommended}</small>}
            </button>
          ))}
        </div>
      </div>

      <label className={field.field}>
        <span className={field.label}>{copy.keyLabel}</span>
        <input
          className={field.input}
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder={copy.keyPlaceholder}
          value={key}
          onChange={e => setKey(e.target.value)}
        />
        <span className={forms.hint}>{copy.keyWhere(info.keyUrl)}</span>
      </label>

      <div className={styles.note}>
        <strong>{copy.keySafe}</strong>
        <ul>
          <li>{copy.keychain}</li>
          <li>{copy.notInBackups}</li>
          <li>{copy.onlyFor(info.name)}</li>
        </ul>
        <span>{copy.sentTo(info.name)}</span>
      </div>

      {error && (
        <p className={forms.error} role="alert">
          {error}
        </p>
      )}
      <Button type="submit" block disabled={!key.trim() || saving}>
        {saving ? copy.testing : copy.testAndSave}
      </Button>
    </form>
  )
}

// Models of one kind. If one is already on disk, it's used without downloading anything.
function ModelPicker({
  models,
  action,
  onDone,
}: {
  models: LocalModel[]
  action: string
  onDone: (id: string) => Promise<void>
}) {
  const { t, prefs, error: errorFor } = usePreferences()
  const copy = t.aiSetup
  const installed = models.find(m => m.installed)
  const [selected, setSelected] = useState(
    () => installed?.id ?? models.find(m => m.recommended)?.id ?? '',
  )
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, startBusy] = useTransition()
  const model = models.find(m => m.id === selected)

  const run = () =>
    startBusy(async () => {
      setError(null)
      try {
        if (!model?.installed) {
          setProgress(0)
          await downloadModel(selected, setProgress)
        }
        await onDone(selected)
      } catch (err) {
        setError(errorFor(err))
      } finally {
        setProgress(null)
      }
    })

  return (
    <div className={forms.group}>
      <div className={forms.options}>
        {models.map(m => (
          <button
            key={m.id}
            type="button"
            className={forms.option}
            aria-pressed={selected === m.id}
            disabled={busy}
            onClick={() => setSelected(m.id)}
          >
            {m.name}{' '}
            <small>
              {m.installed
                ? copy.downloaded
                : formatSize(m.size, prefs.language)}
              {m.recommended && ` · ${t.common.recommended}`}
            </small>
          </button>
        ))}
      </div>
      {progress !== null && (
        <div className={styles.progress}>
          <Progress value={progress} />
          <span>{Math.round(progress * 100)}%</span>
        </div>
      )}
      {error && (
        <p className={forms.error} role="alert">
          {error}
        </p>
      )}
      <Button type="button" block disabled={!model || busy} onClick={run}>
        {busy
          ? progress !== null
            ? copy.downloading
            : t.common.saving
          : model?.installed
            ? copy.useThis
            : action}
      </Button>
      {installed && model && model.id !== installed.id && (
        <p className={forms.hint}>{copy.replaces(installed.name)}</p>
      )}
    </div>
  )
}

function MicStep({ onDone }: { onDone: () => void }) {
  const { t, error: errorFor } = usePreferences()
  const copy = t.aiSetup
  const [error, setError] = useState<string | null>(null)
  const [busy, startBusy] = useTransition()
  const test = () =>
    startBusy(async () => {
      setError(null)
      try {
        await checkMic()
        onDone()
      } catch (err) {
        setError(errorFor(err))
      }
    })
  return (
    <div className={forms.form}>
      <p className={styles.lead}>{copy.micLead}</p>
      {error && (
        <p className={forms.error} role="alert">
          {error}
        </p>
      )}
      <Button type="button" block disabled={busy} onClick={test}>
        {busy ? copy.listening : copy.allow}
      </Button>
    </div>
  )
}
