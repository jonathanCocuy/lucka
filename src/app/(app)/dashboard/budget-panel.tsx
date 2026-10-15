'use client'

import { Icon } from '@/components/ui/icon'
import { Progress } from '@/components/ui/progress'
import type { Summary } from '@/lib/finance/calc'
import { formatMoney } from '@/lib/finance/format'
import styles from './panel.module.css'

interface BudgetPanelProps {
  summary: Summary
  onOver: () => void
  onAdd: (categoryId: string) => void
}

export function BudgetPanel({ summary, onOver, onAdd }: BudgetPanelProps) {
  const over = summary.overBudget
  const overTotal = over.reduce((sum, c) => sum + c.over, 0)
  const spent = summary.categories.reduce((sum, c) => sum + c.spent, 0)
  const budget = summary.categories.reduce(
    (sum, c) => sum + c.category.budget,
    0,
  )
  // Las más cerca de pasarse, arriba.
  const items = [...summary.categories].sort((a, b) => b.ratio - a.ratio)

  return (
    <>
      <div className={styles.summary}>
        <p className={styles.big}>
          {budget ? Math.round((spent / budget) * 100) : 0}%<span>usado</span>
        </p>
        <p className={styles.muted}>
          {formatMoney(spent)} de <strong>{formatMoney(budget)}</strong>
        </p>
      </div>

      {over.length > 0 && (
        <button type="button" className={styles.alert} onClick={onOver}>
          <Icon name="alert" size={18} />
          <span>
            <strong>
              {over.length} {over.length === 1 ? 'excedido' : 'excedidos'}
            </strong>{' '}
            · +{formatMoney(overTotal)} sobre lo planeado
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
                title={`Registrar gasto en ${category.name}`}
              >
                <span className={styles.name}>
                  {category.name}
                  <small>
                    {noBudget
                      ? 'Sin presupuesto'
                      : isOver
                        ? `+${formatMoney(over)}`
                        : `Quedan ${formatMoney(category.budget - spent)}`}
                  </small>
                </span>
                <span className={styles.amount}>
                  {formatMoney(spent)}
                  <small>de {formatMoney(category.budget)}</small>
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
        {items.length === 0 && (
          <li className={styles.empty}>Sin categorías. Agrégalas con ✎.</li>
        )}
      </ul>
    </>
  )
}
