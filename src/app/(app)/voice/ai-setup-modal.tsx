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
import { errorMessage } from '@/lib/api-client/http'
import {
  ONLINE_IDS,
  ONLINE_PROVIDERS,
  type OnlineProviderId,
} from '@/lib/ai/catalog'
import forms from '../dashboard/forms.module.css'
import { formatSize, type AiConfig } from './use-ai'
import styles from './voice.module.css'

export type SetupStep = 'intro' | 'provider' | 'whisper' | 'mic' | 'done'

interface AiSetupModalProps {
  open: boolean
  startAt: SetupStep
  config: AiConfig
  onChange: () => Promise<unknown>
  onClose: () => void
}

const TITLES: Record<SetupStep, string> = {
  intro: 'Registra hablando',
  provider: 'Elige tu IA',
  whisper: 'Modelo de voz',
  mic: 'Micrófono',
  done: '¡Listo!',
}

export function AiSetupModal(props: AiSetupModalProps) {
  const [step, setStep] = useState(props.startAt)
  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      eyebrow="IA"
      title={TITLES[step]}
    >
      {/* Se monta de cero en cada apertura. */}
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
  // Quien ya tenía Whisper solo agregó otra IA: no hay que repetir el resto.
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
        <p className={styles.lead}>
          Dile a Lucka en qué gastaste, por ejemplo: «20 mil en almuerzo y pagué
          el arriendo». La IA lo entiende y tú solo confirmas.
        </p>
        <p className={forms.hint}>
          Necesitas un modelo de voz (se baja una vez) y una IA: un modelo en tu
          equipo o tu key de OpenAI, Claude o Gemini.
        </p>
        <div className={styles.actions}>
          <Button type="button" onClick={() => answer(true)}>
            Sí, configurar
          </Button>
          <Button type="button" variant="ghost" onClick={() => answer(false)}>
            Ahora no
          </Button>
        </div>
        <p className={forms.hint}>Puedes activarlo luego en Ajustes.</p>
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
        <p className={styles.lead}>
          Convierte tu voz en texto. Corre en tu equipo: el audio nunca sale de
          aquí.
        </p>
        <ModelPicker
          models={config.models.filter(m => m.kind === 'whisper')}
          action="Descargar"
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
      <p className={styles.lead}>
        Toca el micrófono abajo a la derecha, di en qué gastaste y vuelve a
        tocarlo. Antes de guardar te mostramos un resumen.
      </p>
      <Button type="button" block onClick={onClose}>
        Entendido
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
  const [mode, setMode] = useState<'local' | 'online'>('local')
  return (
    <div className={forms.form}>
      <div className={forms.segment} role="radiogroup" aria-label="Tipo de IA">
        {(['local', 'online'] as const).map(m => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
          >
            {m === 'local' ? 'En mi equipo' : 'Con mi key'}
          </button>
        ))}
      </div>
      {mode === 'local' ? (
        <>
          <div className={styles.note}>
            <strong>100% privado.</strong> Todo se procesa en este equipo, sin
            internet. Ocupa espacio en disco y tarda unos segundos por frase.
          </div>
          <ModelPicker
            models={config.models.filter(m => m.kind === 'llm')}
            action="Descargar y usar"
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
        setError(errorMessage(err))
      }
    })
  }

  return (
    <form className={forms.form} onSubmit={submit}>
      <div className={forms.group}>
        <p className={forms.groupLabel}>Proveedor</p>
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
        <p className={forms.groupLabel}>Modelo</p>
        <div className={forms.options}>
          {info.models.map(m => (
            <button
              key={m.id}
              type="button"
              className={forms.option}
              aria-pressed={model === m.id}
              onClick={() => setModel(m.id)}
            >
              {m.name} {m.recommended && <small>Recomendado</small>}
            </button>
          ))}
        </div>
      </div>

      <label className={field.field}>
        <span className={field.label}>API key</span>
        <input
          className={field.input}
          type="password"
          autoComplete="off"
          spellCheck={false}
          placeholder="Pega tu key aquí"
          value={key}
          onChange={e => setKey(e.target.value)}
        />
        <span className={forms.hint}>La consigues en {info.keyUrl}</span>
      </label>

      <div className={styles.note}>
        <strong>Tu key está segura.</strong>
        <ul>
          <li>Se guarda en el llavero de tu sistema, no en Lucka.</li>
          <li>No va en el archivo de datos ni en los respaldos.</li>
          <li>Solo se usa para hablar con {info.name}. Nadie más la ve.</li>
        </ul>
        <span>
          Ojo: el texto de lo que dices y los nombres de tus categorías se
          envían a {info.name} para entenderlos. El audio no sale de tu equipo.
        </span>
      </div>

      {error && (
        <p className={forms.error} role="alert">
          {error}
        </p>
      )}
      <Button type="submit" block disabled={!key.trim() || saving}>
        {saving ? 'Probando la key…' : 'Probar y guardar'}
      </Button>
    </form>
  )
}

// Lista de modelos de un tipo. Si ya hay uno en disco, se usa sin bajar nada.
function ModelPicker({
  models,
  action,
  onDone,
}: {
  models: LocalModel[]
  action: string
  onDone: (id: string) => Promise<void>
}) {
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
        setError(errorMessage(err))
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
              {m.installed ? 'Descargado' : formatSize(m.size)}
              {m.recommended && ' · Recomendado'}
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
            ? 'Descargando…'
            : 'Guardando…'
          : model?.installed
            ? 'Usar este'
            : action}
      </Button>
      {installed && model && model.id !== installed.id && (
        <p className={forms.hint}>Reemplaza a {installed.name}.</p>
      )}
    </div>
  )
}

function MicStep({ onDone }: { onDone: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [busy, startBusy] = useTransition()
  const test = () =>
    startBusy(async () => {
      setError(null)
      try {
        await checkMic()
        onDone()
      } catch (err) {
        setError(errorMessage(err))
      }
    })
  return (
    <div className={forms.form}>
      <p className={styles.lead}>
        Lucka necesita permiso para usar el micrófono. Tu sistema te lo va a
        pedir ahora.
      </p>
      {error && (
        <p className={forms.error} role="alert">
          {error}
        </p>
      )}
      <Button type="button" block disabled={busy} onClick={test}>
        {busy ? 'Escuchando…' : 'Dar permiso y probar'}
      </Button>
    </div>
  )
}
