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
} from '@/lib/ai/resolve'
import { normalize } from '@/lib/ai/resolve'
import { parseISODate } from '@/lib/finance/calc'
import { formatShortDate } from '@/lib/finance/format'
import type { Category, Expense } from '@/lib/finance/types'
import forms from '../dashboard/forms.module.css'
import { newId, useFinance } from '../finance-provider'
import styles from './voice.module.css'

interface VoiceSummaryModalProps {
  draft: Draft
  heard: string
  onClose: () => void
}

const KIND_LABEL: Record<DraftItem['kind'], string> = {
  expense: 'Gasto',
  fixed: 'Gasto fijo',
  income: 'Ingreso',
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
  const [items, setItems] = useState(draft.items)
  const [newCategories, setNewCategories] = useState(draft.newCategories)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()
  if (!data) return null

  const fixedName = (id: string) =>
    data.fixed.find(f => f.id === id)?.name ?? 'Gasto fijo'
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
    <Modal open onClose={onClose} eyebrow="Por voz" title="¿Guardo esto?" wide>
      <div className={forms.form}>
        <p className={styles.heard}>«{heard}»</p>

        {draft.warnings.length > 0 && (
          <ul className={styles.warnings}>
            {draft.warnings.map(w => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}

        {items.length === 0 ? (
          <p className={forms.hint}>No quedó nada para guardar.</p>
        ) : (
          <ul className={styles.items}>
            {items.map((item, index) => (
              <li key={index} className={styles.item}>
                <div className={styles.itemInfo}>
                  <span className={styles.itemTitle}>
                    {item.description ||
                      (item.kind === 'fixed'
                        ? fixedName(item.fixedId)
                        : KIND_LABEL[item.kind])}
                  </span>
                  <span className={styles.itemMeta}>
                    <span className={styles.tag} data-kind={item.kind}>
                      {KIND_LABEL[item.kind]}
                    </span>
                    {item.kind === 'fixed' && fixedName(item.fixedId)}
                    {item.kind === 'expense' && (
                      <select
                        className={styles.select}
                        aria-label="Categoría"
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
                            {c.name} (nueva)
                          </option>
                        ))}
                      </select>
                    )}
                    <span>{formatShortDate(parseISODate(item.date))}</span>
                  </span>
                </div>
                <MoneyInput
                  value={item.amount}
                  onChange={amount => update(index, { amount })}
                />
                <button
                  type="button"
                  className={styles.remove}
                  aria-label="Quitar"
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
            <p className={forms.groupLabel}>Categorías nuevas</p>
            {usedNew.map(c => (
              <div key={c.name} className={styles.newCategory}>
                <span>{c.name}</span>
                <MoneyInput
                  label="Presupuesto (opcional)"
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
            {saving
              ? 'Guardando…'
              : `Guardar ${items.length === 1 ? '1 registro' : `${items.length} registros`}`}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Descartar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
