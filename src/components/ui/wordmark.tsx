import { ViewTransition } from 'react'
import styles from './wordmark.module.css'

// The "brand" name keeps the logo still while the page changes.
// `compact` = symbol only (sidebar).
export function Wordmark({
  compact,
  className,
}: {
  compact?: boolean
  className?: string
}) {
  return (
    <ViewTransition name="brand">
      <span
        className={[styles.wordmark, className].filter(Boolean).join(' ')}
        aria-label={compact ? 'Lucka' : undefined}
      >
        <svg className={styles.mark} viewBox="0 0 1024 1024" aria-hidden>
          <rect className={styles.tile} width="1024" height="1024" rx="284" />
          <circle className={styles.back} cx="612" cy="412" r="232" />
          <circle
            className={styles.backRim}
            cx="612"
            cy="412"
            r="176"
            strokeWidth="20"
          />
          {/* The tile-colored stroke opens the gap between the coins. */}
          <circle
            className={styles.front}
            cx="420"
            cy="604"
            r="266"
            strokeWidth="28"
          />
          <circle
            className={styles.frontRim}
            cx="420"
            cy="604"
            r="192"
            strokeWidth="22"
          />
        </svg>
        {!compact && 'Lucka'}
      </span>
    </ViewTransition>
  )
}
