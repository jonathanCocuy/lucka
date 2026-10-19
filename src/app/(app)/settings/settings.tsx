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
import { errorMessage } from '@/lib/api-client/http'
import { AiSettings } from '../voice/ai-settings'
import styles from './settings.module.css'

type Message = { kind: 'notice' | 'error'; text: string } | null

export function Settings() {
  const [info, setInfo] = useState<{ version: string; dbPath: string }>()
  const [message, setMessage] = useState<Message>(null)
  const [busy, startBusy] = useTransition()

  useEffect(() => {
    appInfo().then(setInfo, () => null)
  }, [])

  // `done` = notice when it finished. Cancelling shows nothing.
  const run = (action: () => Promise<boolean>, done: string) =>
    startBusy(async () => {
      setMessage(null)
      try {
        if (await action()) setMessage({ kind: 'notice', text: done })
      } catch (error) {
        setMessage({ kind: 'error', text: errorMessage(error) })
      }
    })

  return (
    <AppShell>
      <main className={styles.page}>
        <header className={reveal.reveal}>
          <h1 className={styles.title}>Ajustes</h1>
          <p className={styles.subtitle}>
            Tus datos viven solo en este equipo.
          </p>
        </header>

        <section
          className={`${reveal.reveal} ${styles.section}`}
          style={stagger(1)}
        >
          <h2>IA y voz</h2>
          <AiSettings />
        </section>

        <section
          className={`${reveal.reveal} ${styles.section}`}
          style={stagger(2)}
        >
          <h2>Respaldo</h2>
          <p className={styles.hint}>
            Un archivo JSON con todo. Sirve para cambiar de equipo o guardar una
            copia.
          </p>
          <div className={styles.actions}>
            <Button
              type="button"
              disabled={busy}
              onClick={() => run(exportToFile, 'Datos exportados.')}
            >
              Exportar datos
            </Button>
            <Button
              type="button"
              variant="soft"
              disabled={busy}
              onClick={() => run(importFromFile, 'Datos importados.')}
            >
              Importar datos
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
          style={stagger(3)}
        >
          <h2>Borrar todo</h2>
          <p className={styles.hint}>
            Deja Lucka como nueva y vuelves al inicio.
          </p>
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
                    if (await wipeWithConfirm()) window.location.replace('/')
                  } catch (error) {
                    setMessage({ kind: 'error', text: errorMessage(error) })
                  }
                })
              }
            >
              Borrar todos mis datos
            </Button>
          </div>
        </section>

        {info && (
          <section
            className={`${reveal.reveal} ${styles.section}`}
            style={stagger(4)}
          >
            <h2>Sobre Lucka</h2>
            <dl className={styles.facts}>
              <dt>Versión</dt>
              <dd>{info.version}</dd>
              <dt>Archivo de datos</dt>
              <dd className={styles.path}>{info.dbPath}</dd>
            </dl>
          </section>
        )}
      </main>
    </AppShell>
  )
}
