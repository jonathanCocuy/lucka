import { ViewTransition } from 'react'
import styles from './wordmark.module.css'

// El nombre "brand" deja el logo quieto mientras la página cambia.
// `compact` = solo el símbolo (sidebar).
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
        <span className={styles.mark} aria-hidden>
          L
        </span>
        {!compact && 'Lucka'}
      </span>
    </ViewTransition>
  )
}
