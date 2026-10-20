'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/icon'
import { Modal } from '@/components/ui/modal'
import { parseISODate } from '@/lib/finance/calc'
import { usePreferences } from '@/lib/i18n/context'
import { useFinance } from '../finance-provider'
import styles from './forms.module.css'

interface MovementsModalProps {
  open: boolean
  onClose: () => void
}

export function MovementsModal({ open, onClose }: MovementsModalProps) {
  const { summary, data, removeExpense, removeIncome } = useFinance()
  const { t, money, date, fixedName } = usePreferences()
  const copy = t.movements
  const [error, setError] = useState<string | null>(null)
  if (!summary || !data) return null

  const targetName = (kind: string, id: string) => {
    if (kind === 'category') {
      return data.categories.find(c => c.id === id)?.name ?? '—'
    }
    const fixed = data.fixed.find(f => f.id === id)
    return copy.fixed(fixed ? fixedName(fixed) : '—')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={copy.eyebrow}
      title={copy.title}
      wide
    >
      <ul className={styles.table}>
        {summary.cycleExpenses.map(e => (
          <li key={e.id} className={styles.item}>
            <span className={styles.date}>{date(parseISODate(e.date))}</span>
            <span className={styles.desc}>
              {e.description || t.common.noDescription}
              <small>{targetName(e.target.kind, e.target.id)}</small>
            </span>
            <span className={styles.money}>{money(e.amount)}</span>
            <button
              type="button"
              className={styles.remove}
              aria-label={copy.deleteExpense}
              onClick={async () => setError(await removeExpense(e.id))}
            >
              <Icon name="close" size={16} />
            </button>
          </li>
        ))}
        {summary.cycleExpenses.length === 0 && (
          <li className={styles.hint}>{copy.empty}</li>
        )}
      </ul>
      {error && <p className={styles.error}>{error}</p>}
      <p className={styles.total}>
        {copy.totalSpent} <strong>{money(summary.spent)}</strong>
      </p>

      {summary.cycleIncomes.length > 0 && (
        <>
          <h3 className={styles.sectionTitle}>{copy.extraIncome}</h3>
          <ul className={styles.table}>
            {summary.cycleIncomes.map(i => (
              <li key={i.id} className={styles.item}>
                <span className={styles.date}>
                  {date(parseISODate(i.date))}
                </span>
                <span className={styles.desc}>
                  {i.description || t.common.noDescription}
                </span>
                <span className={styles.money} data-income>
                  +{money(i.amount)}
                </span>
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={copy.deleteIncome}
                  onClick={async () => setError(await removeIncome(i.id))}
                >
                  <Icon name="close" size={16} />
                </button>
              </li>
            ))}
          </ul>
          <p className={styles.total}>
            {copy.totalExtra} <strong>+{money(summary.extraIncome)}</strong>
          </p>
        </>
      )}
    </Modal>
  )
}
