'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import field from '@/components/ui/field.module.css'
import { Icon } from '@/components/ui/icon'
import { Modal } from '@/components/ui/modal'
import { MoneyInput } from '@/components/ui/money-input'
import { toISODate } from '@/lib/finance/calc'
import { formatMoney } from '@/lib/finance/format'
import type { ExpenseTarget } from '@/lib/finance/types'
import { newId, useFinance } from '../finance-provider'
import styles from './forms.module.css'

const NEW_CATEGORY = '__new'

type Mode = 'expense' | 'income'

interface RegisterModalProps {
  open: boolean
  initialTarget?: ExpenseTarget
  onClose: () => void
}

export function RegisterModal(props: RegisterModalProps) {
  return (
    <Modal open={props.open} onClose={props.onClose} title="Registrar">
      {/* Se monta de cero en cada apertura: el form arranca limpio. */}
      <RegisterForm {...props} />
    </Modal>
  )
}

// Lo mínimo a la vista: monto + a dónde va. Descripción y fecha (hoy) quedan plegadas.
function RegisterForm({ initialTarget, onClose }: RegisterModalProps) {
  const { summary, data, addExpense, addIncome, setCategories } = useFinance()
  const [mode, setMode] = useState<Mode>('expense')
  const [amount, setAmount] = useState(0)
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(() => toISODate(new Date()))
  const [kind, setKind] = useState<ExpenseTarget['kind']>(
    initialTarget?.kind ?? 'category',
  )
  const [targetId, setTargetId] = useState(initialTarget?.id ?? '')
  const [newName, setNewName] = useState('')
  const [newBudget, setNewBudget] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()
  if (!summary || !data) return null

  const isExpense = mode === 'expense'
  const pendingFixed = summary.fixed.filter(f => !f.isPaid)
  const isNew = kind === 'category' && targetId === NEW_CATEGORY
  const valid =
    amount > 0 &&
    (!isExpense || (isNew ? newName.trim().length > 0 : targetId !== ''))

  const switchKind = (next: ExpenseTarget['kind']) => {
    setKind(next)
    setTargetId('')
  }

  const pickFixed = (id: string) => {
    setTargetId(id)
    const status = summary.fixed.find(f => f.fixed.id === id)
    if (status && amount === 0) setAmount(status.pending)
    if (status && !description) setDescription(status.fixed.name)
  }

  const saveExpense = async () => {
    let id = targetId
    if (isNew) {
      id = newId()
      const failed = await setCategories([
        ...data.categories,
        { id, name: newName.trim(), budget: newBudget },
      ])
      if (failed) return failed
    }
    return addExpense({
      amount,
      description: description.trim(),
      date,
      target: { kind, id },
    })
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || saving) return
    startSaving(async () => {
      const failed = isExpense
        ? await saveExpense()
        : await addIncome({ amount, description: description.trim(), date })
      if (failed) setError(failed)
      else onClose()
    })
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.segment} role="radiogroup" aria-label="Tipo">
        {(['expense', 'income'] as const).map(m => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
          >
            {m === 'expense' ? 'Gasto' : 'Ingreso'}
          </button>
        ))}
      </div>

      <MoneyInput
        label="¿Cuánto?"
        size="hero"
        autoFocus
        value={amount}
        onChange={setAmount}
      />

      {isExpense && kind === 'category' && (
        <div className={styles.group}>
          <p className={styles.groupLabel}>¿En qué?</p>
          <div className={styles.options}>
            {data.categories.map(c => (
              <button
                key={c.id}
                type="button"
                className={styles.option}
                aria-pressed={targetId === c.id}
                onClick={() => setTargetId(c.id)}
              >
                {c.name}
              </button>
            ))}
            <button
              type="button"
              className={styles.option}
              aria-pressed={isNew}
              onClick={() => setTargetId(NEW_CATEGORY)}
            >
              + Nueva
            </button>
          </div>
          {isNew && (
            <div className={styles.row}>
              <label className={field.field}>
                <span className={field.label}>Nombre</span>
                <input
                  className={field.input}
                  placeholder="Ej. Regalos"
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
              </label>
              <MoneyInput
                label="Presupuesto (opcional)"
                value={newBudget}
                onChange={setNewBudget}
              />
            </div>
          )}
          {pendingFixed.length > 0 && (
            <button
              type="button"
              className={styles.switch}
              onClick={() => switchKind('fixed')}
            >
              ¿Es un gasto fijo?
            </button>
          )}
        </div>
      )}

      {isExpense && kind === 'fixed' && (
        <div className={styles.group}>
          <p className={styles.groupLabel}>¿Qué fijo pagas?</p>
          <div className={styles.options}>
            {pendingFixed.map(({ fixed, pending }) => (
              <button
                key={fixed.id}
                type="button"
                className={styles.option}
                aria-pressed={targetId === fixed.id}
                onClick={() => pickFixed(fixed.id)}
              >
                {fixed.name} <small>{formatMoney(pending)}</small>
              </button>
            ))}
            {pendingFixed.length === 0 && (
              <p className={styles.hint}>Todos los fijos están pagados.</p>
            )}
          </div>
          <button
            type="button"
            className={styles.switch}
            onClick={() => switchKind('category')}
          >
            Volver a categorías
          </button>
        </div>
      )}

      <details className={styles.details}>
        <summary>
          Más detalles
          <Icon name="chevronDown" size={16} />
        </summary>
        <div className={styles.row}>
          <label className={field.field}>
            <span className={field.label}>Descripción</span>
            <input
              className={field.input}
              placeholder={isExpense ? 'Ej. Cena con amigos' : 'Ej. Bono'}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </label>
          <label className={field.field}>
            <span className={field.label}>Fecha</span>
            <input
              className={field.input}
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </label>
        </div>
        {!isExpense && (
          <p className={styles.hint}>
            Solo suma al disponible del ciclo en que cae la fecha.
          </p>
        )}
      </details>

      {error && <p className={styles.error}>{error}</p>}

      <Button type="submit" block disabled={!valid || saving}>
        {saving
          ? 'Guardando…'
          : isExpense
            ? 'Guardar gasto'
            : 'Guardar ingreso'}
      </Button>
    </form>
  )
}
