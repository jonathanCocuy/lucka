'use client'

import { Icon } from '@/components/ui/icon'
import { Progress } from '@/components/ui/progress'
import type { Summary } from '@/lib/finance/calc'
import { usePreferences } from '@/lib/i18n/context'
import styles from './panel.module.css'

interface BudgetPanelProps {
  summary: Summary
  onOver: () => void
  onAdd: (categoryId: string) => void
}

export function BudgetPanel({ summary, onOver, onAdd }: BudgetPanelProps) {
  const { t, money } = usePreferences()
  const copy = t.budgets
  const over = summary.overBudget
  const overTotal = over.reduce((sum, c) => sum + c.over, 0)
  const spent = summary.categories.reduce((sum, c) => sum + c.spent, 0)
  const budget = summary.categories.reduce(
    (sum, c) => sum + c.category.budget,
    0,
  )
  // The ones closest to going over, on top.
  const items = [...summary.categories].sort((a, b) => b.ratio - a.ratio)

  return (
    <>
      <div className={styles.summary}>
        <p className={styles.big}>
          {budget ? Math.round((spent / budget) * 100) : 0}%
          <span>{copy.used}</span>
        </p>
        <p className={styles.muted}>
          {money(spent)} {t.common.of} <strong>{money(budget)}</strong>
        </p>
      </div>

      {over.length > 0 && (
        <button type="button" className={styles.alert} onClick={onOver}>
          <Icon name="alert" size={18} />
          <span>
            <strong>{copy.overCount(over.length)}</strong> ·{' '}
            {copy.overPlan(money(overTotal))}
          </span>
        </button>
      )}

      <ul className={styles.list}>
        {items.map(({ category, spent, ratio, over }) => {
          const noBudget = category.budget === 0
          const isOver = over > 0 && !noBudget
          return (
            <li key={category.id}>
              <button
                type="button"
                className={`${styles.row} ${styles.budgetRow}`}
                data-over={isOver || undefined}
                onClick={() => onAdd(category.id)}
                title={copy.addTo(category.name)}
              >
                <span className={styles.name}>
                  {category.name}
                  <small>
                    {noBudget
                      ? copy.noBudget
                      : isOver
                        ? `+${money(over)}`
                        : copy.left(money(category.budget - spent))}
                  </small>
                </span>
                <span className={styles.amount}>
                  {money(spent)}
                  <small>
                    {t.common.of} {money(category.budget)}
                  </small>
                </span>
                <Progress
                  className={styles.bar}
                  value={noBudget ? 0 : ratio}
                  tone={isOver ? 'warning' : ratio >= 0.8 ? 'muted' : 'primary'}
                />
              </button>
            </li>
          )
        })}
        {items.length === 0 && <li className={styles.empty}>{copy.empty}</li>}
      </ul>
    </>
  )
}
