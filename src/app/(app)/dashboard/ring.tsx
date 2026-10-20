'use client'

import { usePreferences } from '@/lib/i18n/context'
import styles from './ring.module.css'

const R = 92
const C = 2 * Math.PI * R

interface RingProps {
  income: number
  spent: number
  committed: number
  available: number
}

export function Ring({ income, spent, committed, available }: RingProps) {
  const { t, money } = usePreferences()
  const base = Math.max(income, 1)
  const spentLen = Math.min(spent / base, 1) * C
  const committedLen = Math.min(committed / base, 1 - spentLen / C) * C
  const negative = available < 0

  return (
    <div className={styles.ring}>
      <svg viewBox="0 0 220 220" className={styles.svg} aria-hidden>
        <g transform="rotate(-90 110 110)">
          <circle className={styles.track} cx="110" cy="110" r={R} />
          {/* With round caps, a zero-length arc would show as a dot. */}
          {committedLen > 0 && (
            <circle
              className={styles.committed}
              cx="110"
              cy="110"
              r={R}
              strokeDasharray={`${committedLen} ${C}`}
              strokeDashoffset={-spentLen}
            />
          )}
          {spentLen > 0 && (
            <circle
              className={styles.spent}
              cx="110"
              cy="110"
              r={R}
              strokeDasharray={`${spentLen} ${C}`}
            />
          )}
        </g>
      </svg>
      <div className={styles.center}>
        <p className={styles.label}>
          {negative ? t.available.over : t.available.label}
        </p>
        <p className={styles.amount} data-negative={negative || undefined}>
          {money(available)}
        </p>
        <p className={styles.sub}>{t.available.ofIncome(money(income))}</p>
      </div>
    </div>
  )
}
