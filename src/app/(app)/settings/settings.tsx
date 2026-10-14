'use client'

import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
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
import styles from './settings.module.css'

type Message = { kind: 'notice' | 'error'; text: string } | null

export function Settings() {
  const [info, setInfo] = useState<{ version: string; dbPath: string }>()
  const [message, setMessage] = useState<Message>(null)
  const [busy, startBusy] = useTransition()

  useEffect(() => {
    appInfo().then(setInfo, () => null)
  }, [])

  // `done` = aviso si terminó. Cancelar no muestra nada.
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
    <main className={styles.page}>
      <header className={reveal.reveal}>
        <p className={styles.eyebrow}>Ajustes</p>
        <h1 className={styles.title}>Tus datos</h1>
      </header>

      <section
        className={`${reveal.reveal} ${styles.section}`}
        style={stagger(1)}
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
            variant="outline"
            disabled={busy}
            onClick={() => run(importFromFile, 'Datos importados.')}
          >
            Importar datos
          </Button>
        </div>
        {message && (
          <p
            className={message.kind === 'error' ? styles.error : styles.notice}
            role={message.kind === 'error' ? 'alert' : 'status'}
          >
            {message.text}
          </p>
        )}
      </section>

      <section
        className={`${reveal.reveal} ${styles.section}`}
        style={stagger(2)}
      >
        <h2>Borrar todo</h2>
        <p className={styles.hint}>
          Deja Lucka como nueva y vuelves al inicio.
        </p>
        <div className={styles.actions}>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() =>
              startBusy(async () => {
                setMessage(null)
                try {
                  // Recarga completa: el panel vuelve a leer la base vacía.
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
          style={stagger(3)}
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

      <p className={styles.back}>
        <Link href="/">Volver</Link>
      </p>
    </main>
  )
}
