'use client'

import { parseISODate, type Summary } from '@/lib/finance/calc'
import type { FinanceData } from '@/lib/finance/types'
import { usePreferences } from '@/lib/i18n/context'
import styles from './panel.module.css'

const LIMIT = 5

interface RecentPanelProps {
  summary: Summary
  data: FinanceData
  onMore: () => void
}

export function RecentPanel({ summary, data, onMore }: RecentPanelProps) {
  const { t, money, date, fixedName } = usePreferences()
  const copy = t.recent
  const targetName = (kind: string, id: string) => {
    if (kind === 'category') {
      return data.categories.find(c => c.id === id)?.name ?? copy.noCategory
    }
    const fixed = data.fixed.find(f => f.id === id)
    return fixed ? fixedName(fixed) : copy.fixed
  }

  const items = [
    ...summary.cycleExpenses.map(e => ({
      id: e.id,
      date: e.date,
      amount: e.amount,
      income: false,
      label: targetName(e.target.kind, e.target.id),
      description: e.description,
    })),
    ...summary.cycleIncomes.map(i => ({
      id: i.id,
      date: i.date,
      amount: i.amount,
      income: true,
      label: copy.extraIncome,
      description: i.description,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, LIMIT)

  return (
    <>
      <ul className={styles.list}>
        {items.map(item => (
          <li key={item.id} className={`${styles.row} ${styles.recentRow}`}>
            <span
              className={styles.avatar}
              data-income={item.income || undefined}
              aria-hidden
            >
              {item.label.charAt(0).toUpperCase()}
            </span>
            <span className={styles.name}>
              {item.description || item.label}
              <small>
                {item.description ? `${item.label} · ` : ''}
                {date(parseISODate(item.date))}
              </small>
            </span>
            <span
              className={styles.amount}
              data-income={item.income || undefined}
            >
              {item.income ? '+' : '−'}
              {money(item.amount)}
            </span>
          </li>
        ))}
        {items.length === 0 && <li className={styles.empty}>{copy.empty}</li>}
      </ul>
      {items.length > 0 && (
        <button type="button" className={styles.more} onClick={onMore}>
          {copy.seeAll}
        </button>
      )}
    </>
  )
}
