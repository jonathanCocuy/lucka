'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Modal } from '@/components/ui/modal'
import { MoneyInput } from '@/components/ui/money-input'
import type {
  Draft,
  DraftItem,
  DraftTarget,
  NewCategory,
  Warning,
} from '@/lib/ai/resolve'
import { normalize } from '@/lib/ai/resolve'
import { parseISODate } from '@/lib/finance/calc'
import type { Category, Expense } from '@/lib/finance/types'
import { usePreferences } from '@/lib/i18n/context'
import forms from '../dashboard/forms.module.css'
import { newId, useFinance } from '../finance-provider'
import styles from './voice.module.css'

interface VoiceSummaryModalProps {
  draft: Draft
  heard: string
  onClose: () => void
}

// "c:<id>" = existing category, "n:<name>" = new one.
const targetValue = (t: DraftTarget) =>
  t.kind === 'category' ? `c:${t.id}` : `n:${t.name}`
const parseTarget = (v: string): DraftTarget =>
  v.startsWith('c:')
    ? { kind: 'category', id: v.slice(2) }
    : { kind: 'new', name: v.slice(2) }

export function VoiceSummaryModal({
  draft,
  heard,
  onClose,
}: VoiceSummaryModalProps) {
  const { data, addMany } = useFinance()
  const { t, money, date, fixedName: labelOf } = usePreferences()
  const copy = t.summary
  const [items, setItems] = useState(draft.items)
  const [newCategories, setNewCategories] = useState(draft.newCategories)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()
  if (!data) return null

  const fixedName = (id: string) => {
    const fixed = data.fixed.find(f => f.id === id)
    return fixed ? labelOf(fixed) : copy.kinds.fixed
  }
  const warningText = (w: Warning) => {
    if (w.kind === 'notUnderstood') return copy.warnings.notUnderstood
    if (w.kind === 'noCategory')
      return copy.warnings.noCategory(money(w.amount))
    return copy.warnings[w.kind](w.label || copy.anItem)
  }
  // Only the new ones some expense still uses.
  const usedNew = newCategories.filter(c =>
    items.some(
      i =>
        i.kind === 'expense' &&
        i.target.kind === 'new' &&
        normalize(i.target.name) === normalize(c.name),
    ),
  )
  const valid = items.length > 0 && items.every(i => i.amount > 0)

  const update = (index: number, patch: Partial<DraftItem>) =>
    setItems(prev =>
      prev.map((item, i) =>
        i === index ? ({ ...item, ...patch } as DraftItem) : item,
      ),
    )
  const setBudget = (name: string, budget: number) =>
    setNewCategories(prev =>
      prev.map(c => (c.name === name ? { ...c, budget } : c)),
    )

  const save = () =>
    startSaving(async () => {
      setError(null)
      const created: Category[] = usedNew.map((c: NewCategory) => ({
        id: newId(),
        name: c.name,
        budget: c.budget,
      }))
      const idOf = (target: DraftTarget) =>
        target.kind === 'category'
          ? target.id
          : (created.find(c => c.name === target.name)?.id ?? '')
      const expenses: Omit<Expense, 'id'>[] = []
      const incomes = []
      for (const item of items) {
        const base = {
          amount: item.amount,
          description: item.description,
          date: item.date,
        }
        if (item.kind === 'income') incomes.push(base)
        else if (item.kind === 'fixed')
          expenses.push({
            ...base,
            target: { kind: 'fixed', id: item.fixedId },
          })
        else
          expenses.push({
            ...base,
            target: { kind: 'category', id: idOf(item.target) },
          })
      }
      const failed = await addMany({
        newCategories: created,
        expenses,
        incomes,
      })
      if (failed) setError(failed)
      else onClose()
    })

  return (
    <Modal
      open
      onClose={onClose}
      eyebrow={copy.eyebrow}
      title={copy.title}
      wide
    >
      <div className={forms.form}>
        <p className={styles.heard}>{t.common.quote(heard)}</p>

        {draft.warnings.length > 0 && (
          <ul className={styles.warnings}>
            {draft.warnings.map((w, i) => (
              <li key={i}>{warningText(w)}</li>
            ))}
          </ul>
        )}

        {items.length === 0 ? (
          <p className={forms.hint}>{copy.nothingLeft}</p>
        ) : (
          <ul className={styles.items}>
            {items.map((item, index) => (
              <li key={index} className={styles.item}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemTitle}>
                    {item.description ||
                      (item.kind === 'fixed'
                        ? fixedName(item.fixedId)
                        : copy.kinds[item.kind])}
                  </span>
                  <span className={styles.itemMeta}>
                    <span className={styles.tag} data-kind={item.kind}>
                      {copy.kinds[item.kind]}
                    </span>
                    {item.kind === 'fixed' && fixedName(item.fixedId)}
                    {item.kind === 'expense' && (
                      <select
                        className={styles.select}
                        aria-label={copy.category}
                        value={targetValue(item.target)}
                        onChange={e =>
                          update(index, { target: parseTarget(e.target.value) })
                        }
                      >
                        {data.categories.map(c => (
                          <option key={c.id} value={`c:${c.id}`}>
                            {c.name}
                          </option>
                        ))}
                        {newCategories.map(c => (
                          <option key={c.name} value={`n:${c.name}`}>
                            {copy.newCategory(c.name)}
                          </option>
                        ))}
                      </select>
                    )}
                    <span>{date(parseISODate(item.date))}</span>
                  </span>
                </div>
                <MoneyInput
                  value={item.amount}
                  onChange={amount => update(index, { amount })}
                />
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={t.common.remove}
                  onClick={() =>
                    setItems(prev => prev.filter((_, i) => i !== index))
                  }
                >
                  <Icon name="close" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}

        {usedNew.length > 0 && (
          <div className={forms.group}>
            <p className={forms.groupLabel}>{copy.newCategories}</p>
            {usedNew.map(c => (
              <div key={c.name} className={styles.newCategory}>
                <span>{c.name}</span>
                <MoneyInput
                  label={copy.budget}
                  value={c.budget}
                  onChange={budget => setBudget(c.name, budget)}
                />
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className={forms.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <Button type="button" disabled={!valid || saving} onClick={save}>
            {saving ? t.common.saving : copy.save(items.length)}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            {copy.discard}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
