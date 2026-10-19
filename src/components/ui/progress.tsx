import styles from './progress.module.css'

type Tone = 'primary' | 'mint' | 'warning' | 'muted'

interface ProgressProps {
  // Between 0 and 1. Anything above 1 is clipped.
  value: number
  tone?: Tone
  className?: string
}

export function Progress({
  value,
  tone = 'primary',
  className,
}: ProgressProps) {
  const pct = Math.min(Math.max(value, 0), 1) * 100
  return (
    <span
      className={[styles.track, className].filter(Boolean).join(' ')}
      aria-hidden
    >
      <span
        className={`${styles.fill} ${styles[tone]}`}
        style={{ width: `${pct}%` }}
      />
    </span>
  )
}
