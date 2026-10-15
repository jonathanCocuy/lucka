import { formatMoney } from '@/lib/finance/format'
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
  const base = Math.max(income, 1)
  const spentLen = Math.min(spent / base, 1) * C
  const committedLen = Math.min(committed / base, 1 - spentLen / C) * C
  const negative = available < 0

  return (
    <div className={styles.ring}>
      <svg viewBox="0 0 220 220" className={styles.svg} aria-hidden>
        <g transform="rotate(-90 110 110)">
          <circle className={styles.track} cx="110" cy="110" r={R} />
          {/* Con extremos redondos un tramo de largo 0 se vería como un punto. */}
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
        <p className={styles.label}>{negative ? 'Te pasaste' : 'Disponible'}</p>
        <p className={styles.amount} data-negative={negative || undefined}>
          {formatMoney(available)}
        </p>
        <p className={styles.sub}>de {formatMoney(income)}</p>
      </div>
    </div>
  )
}
