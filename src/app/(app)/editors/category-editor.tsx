'use client'

import field from '@/components/ui/field.module.css'
import { Icon } from '@/components/ui/icon'
import { MoneyInput } from '@/components/ui/money-input'
import type { Category } from '@/lib/finance/types'
import { usePreferences } from '@/lib/i18n/context'
import { newId } from '../finance-provider'
import styles from './editor.module.css'

interface CategoryEditorProps {
  items: Category[]
  onChange: (items: Category[]) => void
}

export function CategoryEditor({ items, onChange }: CategoryEditorProps) {
  const { t } = usePreferences()
  const copy = t.categoryEditor
  const patch = (id: string, change: Partial<Category>) =>
    onChange(items.map(c => (c.id === id ? { ...c, ...change } : c)))
  const used = new Set(items.map(c => c.name.trim().toLowerCase()))
  const add = (name = '') =>
    onChange([...items, { id: newId(), name, budget: 0 }])

  return (
    <div className={styles.editor}>
      <div className={styles.chips}>
        {copy.suggestions
          .filter(s => !used.has(s.toLowerCase()))
          .map(s => (
            <button
              key={s}
              type="button"
              className={styles.chip}
              onClick={() => add(s)}
            >
              + {s}
            </button>
          ))}
      </div>
      <div className={`${styles.row} ${styles.head} ${styles.categoryRow}`}>
        <span>{copy.category}</span>
        <span>{copy.budget}</span>
        <span />
      </div>
      <div className={styles.list}>
        {items.map(c => (
          <div key={c.id} className={`${styles.row} ${styles.categoryRow}`}>
            <input
              className={field.input}
              placeholder={copy.placeholder}
              value={c.name}
              onChange={e => patch(c.id, { name: e.target.value })}
            />
            <MoneyInput
              value={c.budget}
              onChange={budget => patch(c.id, { budget })}
            />
            <button
              type="button"
              className={styles.remove}
              aria-label={t.common.removeItem(c.name)}
              onClick={() => onChange(items.filter(x => x.id !== c.id))}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className={styles.add} onClick={() => add()}>
        <Icon name="plus" size={16} /> {copy.add}
      </button>
    </div>
  )
}
