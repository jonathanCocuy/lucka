'use client'

import { Fragment, useState } from 'react'
import { DayPicker } from '@/components/ui/day-picker'
import field from '@/components/ui/field.module.css'
import { Icon } from '@/components/ui/icon'
import { MoneyInput } from '@/components/ui/money-input'
import { formatMoney } from '@/lib/finance/format'
import type { FixedExpense } from '@/lib/finance/types'
import { newId } from '../finance-provider'
import styles from './editor.module.css'

interface FixedEditorProps {
  items: FixedExpense[]
  onChange: (items: FixedExpense[]) => void
}

export function FixedEditor({ items, onChange }: FixedEditorProps) {
  // Fila con el calendario abierto. Se abre debajo para no quedar cortado por el scroll.
  const [picking, setPicking] = useState<string | null>(null)
  const patch = (id: string, change: Partial<FixedExpense>) =>
    onChange(items.map(f => (f.id === id ? { ...f, ...change } : f)))

  return (
    <div className={styles.editor}>
      <div className={`${styles.row} ${styles.head} ${styles.fixedRow}`}>
        <span>Nombre</span>
        <span>Monto</span>
        <span>Día de pago</span>
        <span />
      </div>
      <div className={styles.list}>
        {items.map(f => (
          <Fragment key={f.id}>
            <div className={`${styles.row} ${styles.fixedRow}`}>
              {f.isInvestment ? (
                <span className={styles.locked}>
                  Inversión <small>desde inversiones</small>
                </span>
              ) : (
                <input
                  className={field.input}
                  placeholder="Ej. Arriendo"
                  value={f.name}
                  onChange={e => patch(f.id, { name: e.target.value })}
                />
              )}
              {f.isInvestment ? (
                <span className={styles.locked}>{formatMoney(f.amount)}</span>
              ) : (
                <MoneyInput
                  value={f.amount}
                  onChange={amount => patch(f.id, { amount })}
                />
              )}
              <button
                type="button"
                className={styles.dayButton}
                aria-expanded={picking === f.id}
                aria-label={`Día de pago: ${f.dueDay}`}
                onClick={() => setPicking(picking === f.id ? null : f.id)}
              >
                Día {f.dueDay}
                <Icon name="chevronDown" size={16} />
              </button>
              {f.isInvestment ? (
                <span />
              ) : (
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`Quitar ${f.name}`}
                  onClick={() => onChange(items.filter(x => x.id !== f.id))}
                >
                  <Icon name="close" size={16} />
                </button>
              )}
            </div>
            {picking === f.id && (
              <div className={styles.dayPanel}>
                <DayPicker
                  label={`Día de pago de ${f.name || 'este gasto'}`}
                  value={f.dueDay}
                  onChange={dueDay => {
                    patch(f.id, { dueDay })
                    setPicking(null)
                  }}
                />
              </div>
            )}
          </Fragment>
        ))}
      </div>
      <button
        type="button"
        className={styles.add}
        onClick={() =>
          onChange([...items, { id: newId(), name: '', amount: 0, dueDay: 1 }])
        }
      >
        <Icon name="plus" size={16} /> Agregar gasto fijo
      </button>
    </div>
  )
}
