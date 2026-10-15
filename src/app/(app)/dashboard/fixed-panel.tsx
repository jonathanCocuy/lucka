'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/icon'
import { Progress } from '@/components/ui/progress'
import type { Summary } from '@/lib/finance/calc'
import { formatMoney } from '@/lib/finance/format'
import { useFinance } from '../finance-provider'
import styles from './panel.module.css'

export function FixedPanel({ summary }: { summary: Summary }) {
  const { toggleFixedPaid } = useFinance()
  const [error, setError] = useState<string | null>(null)
  const paidCount = summary.fixed.filter(f => f.isPaid).length
  const total = summary.fixed.length
  // Pendientes primero, ordenados por día de pago.
  const items = [...summary.fixed].sort(
    (a, b) =>
      Number(a.isPaid) - Number(b.isPaid) || a.fixed.dueDay - b.fixed.dueDay,
  )

  return (
    <>
      <div className={styles.summary}>
        <p className={styles.big}>
          {paidCount}/{total}
          <span>pagados</span>
        </p>
        <p className={styles.muted}>
          Pendiente <strong>{formatMoney(summary.committed)}</strong>
        </p>
      </div>
      <Progress value={total ? paidCount / total : 0} tone="mint" />

      <ul className={styles.list}>
        {items.map(({ fixed, isPaid, paid, pending }) => (
          <li key={fixed.id}>
            <button
              type="button"
              className={`${styles.row} ${styles.fixedRow}`}
              data-paid={isPaid || undefined}
              aria-pressed={isPaid}
              onClick={async () => setError(await toggleFixedPaid(fixed.id))}
            >
              <span className={styles.check} aria-hidden>
                {isPaid && <Icon name="check" size={14} strokeWidth={3} />}
              </span>
              <span className={styles.name}>
                {fixed.name}
                <small>
                  {isPaid
                    ? 'Pagado'
                    : paid > 0
                      ? `Abonado ${formatMoney(paid)}`
                      : `Día ${fixed.dueDay}`}
                </small>
              </span>
              <span className={styles.amount}>
                {formatMoney(isPaid ? fixed.amount : pending)}
              </span>
            </button>
          </li>
        ))}
        {total === 0 && (
          <li className={styles.empty}>Sin gastos fijos. Agrégalos con ✎.</li>
        )}
      </ul>

      {error && <p className={styles.error}>{error}</p>}
    </>
  )
}
