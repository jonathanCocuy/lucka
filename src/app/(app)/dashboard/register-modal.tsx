'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import field from '@/components/ui/field.module.css'
import { Icon } from '@/components/ui/icon'
import { Modal } from '@/components/ui/modal'
import { MoneyInput } from '@/components/ui/money-input'
import { toISODate } from '@/lib/finance/calc'
import type { ExpenseTarget } from '@/lib/finance/types'
import { usePreferences } from '@/lib/i18n/context'
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
  const { t } = usePreferences()
  return (
    <Modal open={props.open} onClose={props.onClose} title={t.register.title}>
      {/* Mounted fresh on every open: the form starts clean. */}
      <RegisterForm {...props} />
    </Modal>
  )
}

// The minimum in view: amount + where it goes. Description and date (today) stay folded.
function RegisterForm({ initialTarget, onClose }: RegisterModalProps) {
  const { summary, data, addExpense, addIncome, setCategories } = useFinance()
  const { t, money, fixedName } = usePreferences()
  const copy = t.register
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
    if (status && !description) setDescription(fixedName(status.fixed))
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
      <div className={styles.segment} role="radiogroup" aria-label={copy.type}>
        {(['expense', 'income'] as const).map(m => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => setMode(m)}
          >
            {m === 'expense' ? copy.expense : copy.income}
          </button>
        ))}
      </div>

      <MoneyInput
        label={copy.howMuch}
        size="hero"
        autoFocus
        value={amount}
        onChange={setAmount}
      />

      {isExpense && kind === 'category' && (
        <div className={styles.group}>
          <p className={styles.groupLabel}>{copy.onWhat}</p>
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
              {copy.newCategory}
            </button>
          </div>
          {isNew && (
            <div className={styles.row}>
              <label className={field.field}>
                <span className={field.label}>{copy.name}</span>
                <input
                  className={field.input}
                  placeholder={copy.namePlaceholder}
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
              </label>
              <MoneyInput
                label={copy.budget}
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
              {copy.isFixed}
            </button>
          )}
        </div>
      )}

      {isExpense && kind === 'fixed' && (
        <div className={styles.group}>
          <p className={styles.groupLabel}>{copy.whichFixed}</p>
          <div className={styles.options}>
            {pendingFixed.map(({ fixed, pending }) => (
              <button
                key={fixed.id}
                type="button"
                className={styles.option}
                aria-pressed={targetId === fixed.id}
                onClick={() => pickFixed(fixed.id)}
              >
                {fixedName(fixed)} <small>{money(pending)}</small>
              </button>
            ))}
            {pendingFixed.length === 0 && (
              <p className={styles.hint}>{copy.allPaid}</p>
            )}
          </div>
          <button
            type="button"
            className={styles.switch}
            onClick={() => switchKind('category')}
          >
            {copy.backToCategories}
          </button>
        </div>
      )}

      <details className={styles.details}>
        <summary>
          {copy.moreDetails}
          <Icon name="chevronDown" size={16} />
        </summary>
        <div className={styles.row}>
          <label className={field.field}>
            <span className={field.label}>{copy.description}</span>
            <input
              className={field.input}
              placeholder={
                isExpense ? copy.expensePlaceholder : copy.incomePlaceholder
              }
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </label>
          <label className={field.field}>
            <span className={field.label}>{copy.date}</span>
            <input
              className={field.input}
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
            />
          </label>
        </div>
        {!isExpense && <p className={styles.hint}>{copy.incomeHint}</p>}
      </details>

      {error && <p className={styles.error}>{error}</p>}

      <Button type="submit" block disabled={!valid || saving}>
        {saving
          ? t.common.saving
          : isExpense
            ? copy.saveExpense
            : copy.saveIncome}
      </Button>
    </form>
  )
}
