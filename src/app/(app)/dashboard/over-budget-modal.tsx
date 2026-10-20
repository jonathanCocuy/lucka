'use client'

import { Modal } from '@/components/ui/modal'
import { usePreferences } from '@/lib/i18n/context'
import { useFinance } from '../finance-provider'
import styles from './forms.module.css'

interface OverBudgetModalProps {
  open: boolean
  onClose: () => void
}

export function OverBudgetModal({ open, onClose }: OverBudgetModalProps) {
  const { summary } = useFinance()
  const { t, money } = usePreferences()
  const copy = t.overBudget
  if (!summary) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={copy.eyebrow}
      title={copy.title}
    >
      <ul className={styles.table}>
        {summary.overBudget.map(({ category, spent, over }) => (
          <li key={category.id} className={styles.overItem}>
            <span className={styles.overName}>{category.name}</span>
            <span className={styles.overAmount}>+{money(over)}</span>
            <span className={styles.overBar} aria-hidden>
              <span style={{ width: `${(over / spent) * 100}%` }} />
            </span>
            <span className={styles.overMeta}>
              {copy.meta(money(spent), money(category.budget))}
            </span>
          </li>
        ))}
        {summary.overBudget.length === 0 && (
          <li className={styles.hint}>{copy.empty}</li>
        )}
      </ul>
    </Modal>
  )
}
