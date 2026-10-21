'use client'

import { useEffect, useState, useTransition } from 'react'
import { AppShell } from '@/components/ui/app-shell'
import { Button } from '@/components/ui/button'
import reveal from '@/components/ui/reveal.module.css'
import { stagger } from '@/components/ui/reveal'
import {
  appInfo,
  exportToFile,
  importFromFile,
  wipeWithConfirm,
} from '@/lib/api-client/backup'
import { checkMic, openMicSettings } from '@/lib/api-client/ai'
import { ApiClientError } from '@/lib/api-client/http'
import { recordsExist } from '@/lib/api-client/preferences'
import { usePreferences } from '@/lib/i18n/context'
import { PreferencesEditor } from '../editors/preferences-editor'
import { AiSettings } from '../voice/ai-settings'
import styles from './settings.module.css'

type Message = { kind: 'notice' | 'error'; text: string } | null

export function Settings() {
  const { t, error: errorFor, refresh } = usePreferences()
  const copy = t.settings
  const [info, setInfo] = useState<{ version: string; dbPath: string }>()
  const [locked, setLocked] = useState(false)
  const [message, setMessage] = useState<Message>(null)
  const [privacyMessage, setPrivacyMessage] = useState<Message>(null)
  const [privacyMicDenied, setPrivacyMicDenied] = useState(false)
  const [busy, startBusy] = useTransition()
  const [checkingMic, startCheckingMic] = useTransition()

  useEffect(() => {
    appInfo().then(setInfo, () => null)
    recordsExist().then(setLocked, () => null)
  }, [])

  // `done` = notice when it finished. Cancelling shows nothing.
  const run = (action: () => Promise<boolean>, done: string) =>
    startBusy(async () => {
      setMessage(null)
      try {
        if (await action()) setMessage({ kind: 'notice', text: done })
      } catch (error) {
        setMessage({ kind: 'error', text: errorFor(error) })
      }
    })

  return (
    <AppShell>
      <main className={styles.page}>
        <header className={reveal.reveal}>
          <h1 className={styles.title}>{copy.title}</h1>
          <p className={styles.subtitle}>{copy.subtitle}</p>
        </header>

        <section
          className={`${reveal.reveal} ${styles.section}`}
          style={stagger(1)}
        >
          <h2>{copy.preferences}</h2>
          <PreferencesEditor currencyLocked={locked} />
        </section>

        <section
          className={`${reveal.reveal} ${styles.section}`}
          style={stagger(2)}
        >
          <h2>{copy.ai}</h2>
          <AiSettings />
        </section>

        <section
          className={`${reveal.reveal} ${styles.section}`}
          style={stagger(3)}
        >
          <h2>{copy.privacy}</h2>
          <p className={styles.hint}>{copy.privacyHint}</p>
          <div className={styles.actions}>
            <Button type="button" onClick={() => void openMicSettings()}>
              {copy.openMicSettings}
            </Button>
            <Button
              type="button"
              variant="soft"
              disabled={checkingMic}
              onClick={() =>
                startCheckingMic(async () => {
                  setPrivacyMessage(null)
                  setPrivacyMicDenied(false)
                  try {
                    await checkMic()
                    setPrivacyMessage({ kind: 'notice', text: copy.micGranted })
                  } catch (err) {
                    setPrivacyMicDenied(
                      err instanceof ApiClientError && err.code === 'micDenied',
                    )
                    setPrivacyMessage({ kind: 'error', text: errorFor(err) })
                  }
                })
              }
            >
              {copy.checkMic}
            </Button>
          </div>
          {privacyMessage && (
            <p
              className={
                privacyMessage.kind === 'error' ? styles.error : styles.notice
              }
              role={privacyMessage.kind === 'error' ? 'alert' : 'status'}
            >
              {privacyMessage.text}
              {privacyMicDenied && (
                <button
                  type="button"
                  className={styles.inlineLink}
                  onClick={() => void openMicSettings()}
                >
                  {copy.openMicSettings}
                </button>
              )}
            </p>
          )}
        </section>

        <section
          className={`${reveal.reveal} ${styles.section}`}
          style={stagger(5)}
        >
          <h2>{copy.backup}</h2>
          <p className={styles.hint}>{copy.backupHint}</p>
          <div className={styles.actions}>
            <Button
              type="button"
              disabled={busy}
              onClick={() => run(() => exportToFile(t.backup), copy.exported)}
            >
              {copy.export}
            </Button>
            <Button
              type="button"
              variant="soft"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const done = await importFromFile(t.backup)
                  // The backup brings its own language, currency and records.
                  if (done) {
                    await refresh()
                    setLocked(await recordsExist())
                  }
                  return done
                }, copy.imported)
              }
            >
              {copy.import}
            </Button>
          </div>
          {message && (
            <p
              className={
                message.kind === 'error' ? styles.error : styles.notice
              }
              role={message.kind === 'error' ? 'alert' : 'status'}
            >
              {message.text}
            </p>
          )}
        </section>

        <section
          className={`${reveal.reveal} ${styles.section}`}
          style={stagger(6)}
        >
          <h2>{copy.wipe}</h2>
          <p className={styles.hint}>{copy.wipeHint}</p>
          <div className={styles.actions}>
            <Button
              type="button"
              variant="ghost"
              className={styles.danger}
              disabled={busy}
              onClick={() =>
                startBusy(async () => {
                  setMessage(null)
                  try {
                    // Full reload: the dashboard reads the empty database again.
                    if (await wipeWithConfirm(t.backup)) {
                      window.location.replace('/')
                    }
                  } catch (error) {
                    setMessage({ kind: 'error', text: errorFor(error) })
                  }
                })
              }
            >
              {copy.wipeButton}
            </Button>
          </div>
        </section>

        {info && (
          <section
            className={`${reveal.reveal} ${styles.section}`}
            style={stagger(7)}
          >
            <h2>{copy.about}</h2>
            <dl className={styles.facts}>
              <dt>{copy.version}</dt>
              <dd>{info.version}</dd>
              <dt>{copy.dataFile}</dt>
              <dd className={styles.path}>{info.dbPath}</dd>
            </dl>
          </section>
        )}
      </main>
    </AppShell>
  )
}
