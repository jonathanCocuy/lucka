import { Stat } from '@/components/ui/stat'
import type { Summary } from '@/lib/finance/calc'
import { formatMoney } from '@/lib/finance/format'
import styles from './available-panel.module.css'
import { Ring } from './ring'

export function AvailablePanel({ summary }: { summary: Summary }) {
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
              <i className={styles.dotSpent} /> Gastado
            </>
          }
          value={formatMoney(summary.spent)}
        />
        <Stat
          label={
            <>
              <i className={styles.dotCommitted} /> Comprometido
            </>
          }
          value={formatMoney(summary.committed)}
        />
        <Stat
          label={
            <>
              <i className={styles.dotFree} /> Libre
            </>
          }
          value={formatMoney(free)}
          tone={free > 0 ? 'positive' : 'default'}
        />
      </dl>
    </>
  )
}
