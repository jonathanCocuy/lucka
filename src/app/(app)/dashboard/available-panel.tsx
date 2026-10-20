'use client'

import { Stat } from '@/components/ui/stat'
import type { Summary } from '@/lib/finance/calc'
import { usePreferences } from '@/lib/i18n/context'
import styles from './available-panel.module.css'
import { Ring } from './ring'

export function AvailablePanel({ summary }: { summary: Summary }) {
  const { t, money } = usePreferences()
  const free = Math.max(summary.available, 0)
  return (
    <>
      <Ring
        income={summary.income}
        spent={summary.spent}
        committed={summary.committed}
        available={summary.available}
      />
      <dl className={styles.stats}>
        <Stat
          label={
            <>
              <i className={styles.dotSpent} /> {t.available.spent}
            </>
          }
          value={money(summary.spent)}
        />
        <Stat
          label={
            <>
              <i className={styles.dotCommitted} /> {t.available.committed}
            </>
          }
          value={money(summary.committed)}
        />
        <Stat
          label={
            <>
              <i className={styles.dotFree} /> {t.available.free}
            </>
          }
          value={money(free)}
          tone={free > 0 ? 'positive' : 'default'}
        />
      </dl>
    </>
  )
}
