'use client'

import { useEffect, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  findUpdate,
  installAndRestart,
  type Update,
} from '@/lib/api-client/updater'
import styles from './update-banner.module.css'

export function UpdateBanner() {
  const [update, setUpdate] = useState<Update | null>(null)
  const [failed, setFailed] = useState(false)
  const [busy, startBusy] = useTransition()

  useEffect(() => {
    findUpdate().then(setUpdate)
  }, [])

  if (!update) return null

  const install = () =>
    startBusy(async () => {
      setFailed(false)
      try {
        await installAndRestart(update)
      } catch {
        setFailed(true)
      }
    })

  return (
    <aside className={styles.banner} role="status">
      <p className={styles.text}>
        {failed
          ? 'No se pudo actualizar. Intenta de nuevo.'
          : `Hay una versión nueva (${update.version}).`}
      </p>
      <div className={styles.actions}>
        <Button type="button" disabled={busy} onClick={install}>
          {busy ? 'Actualizando…' : 'Actualizar'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => setUpdate(null)}
        >
          Ahora no
        </Button>
      </div>
    </aside>
  )
}
