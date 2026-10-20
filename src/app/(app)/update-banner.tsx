'use client'

import { useEffect, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  findUpdate,
  installAndRestart,
  type Update,
} from '@/lib/api-client/updater'
import { usePreferences } from '@/lib/i18n/context'
import styles from './update-banner.module.css'

export function UpdateBanner() {
  const { t } = usePreferences()
  const copy = t.update
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
        {failed ? copy.failed : copy.available(update.version)}
      </p>
      <div className={styles.actions}>
        <Button type="button" disabled={busy} onClick={install}>
          {busy ? copy.updating : copy.update}
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={busy}
          onClick={() => setUpdate(null)}
        >
          {t.common.notNow}
        </Button>
      </div>
    </aside>
  )
}
