// Turns the AI's answer into drafts for the summary.
// The AI speaks in names and whole money; the app stores ids and cents. This is where they meet.
import type { Currency } from '@/lib/i18n/locale'

export type DraftTarget =
  | { kind: 'category'; id: string }
  | { kind: 'new'; name: string }

export type DraftItem =
  | {
      kind: 'expense'
      amount: number
      description: string
      date: string
      target: DraftTarget
    }
  | {
      kind: 'fixed'
      fixedId: string
      amount: number
      description: string
      date: string
    }
  | { kind: 'income'; amount: number; description: string; date: string }

export interface NewCategory {
  name: string
  budget: number
}

// Data, not text: the summary shows them in the app's language.
export type Warning =
  | { kind: 'notUnderstood' }
  | {
      kind: 'notAFixed' | 'fixedPaid' | 'unknownType' | 'badAmount'
      label: string
    }
  | { kind: 'noCategory'; amount: number }

export interface Draft {
  items: DraftItem[]
  newCategories: NewCategory[]
  warnings: Warning[]
}

export interface ResolveContext {
  categories: { id: string; name: string }[]
  fixed: { id: string; name: string; pending: number; isPaid: boolean }[]
  today: string // YYYY-MM-DD
  currency: Currency
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// "Café" and "cafe " are the same category.
export const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

// Pesos have no cents, so they're rounded to whole pesos first. Anything odd = 0.
function centsOf(v: unknown, currency: Currency) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0
  const cents = currency === 'COP' ? Math.round(v) * 100 : Math.round(v * 100)
  return Number.isSafeInteger(cents) ? cents : 0
}

const dateOr = (v: unknown, today: string) =>
  typeof v === 'string' && ISO_DATE.test(v) && !Number.isNaN(Date.parse(v))
    ? v
    : today

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function resolve(raw: unknown, ctx: ResolveContext): Draft {
  const draft: Draft = { items: [], newCategories: [], warnings: [] }
  const items = isObject(raw) && Array.isArray(raw.items) ? raw.items : null
  if (!items) {
    draft.warnings.push({ kind: 'notUnderstood' })
    return draft
  }

  for (const item of items) {
    if (!isObject(item)) continue
    const amount = centsOf(item.amount, ctx.currency)
    const description = text(item.description)
    const category = text(item.category)
    const date = dateOr(item.date, ctx.today)
    const label = description || category

    if (item.type === 'fixed') {
      // The AI sometimes puts the fixed expense's name in the description, not the category.
      const keys = [category, description].map(normalize)
      const fixed = ctx.fixed.find(f => keys.includes(normalize(f.name)))
      if (!fixed) {
        draft.warnings.push({ kind: 'notAFixed', label })
        continue
      }
      if (fixed.isPaid) {
        draft.warnings.push({ kind: 'fixedPaid', label: fixed.name })
        continue
      }
      draft.items.push({
        kind: 'fixed',
        fixedId: fixed.id,
        amount: amount > 0 ? amount : fixed.pending,
        description: description || fixed.name,
        date,
      })
      continue
    }

    if (item.type !== 'expense' && item.type !== 'income') {
      draft.warnings.push({ kind: 'unknownType', label })
      continue
    }
    if (amount <= 0) {
      draft.warnings.push({ kind: 'badAmount', label })
      continue
    }

    if (item.type === 'income') {
      draft.items.push({ kind: 'income', amount, description, date })
      continue
    }

    const name = category || description
    if (!name) {
      draft.warnings.push({ kind: 'noCategory', amount })
      continue
    }
    const existing = ctx.categories.find(
      c => normalize(c.name) === normalize(name),
    )
    draft.items.push({
      kind: 'expense',
      amount,
      description,
      date,
      target: existing
        ? { kind: 'category', id: existing.id }
        : {
            kind: 'new',
            name: addNew(draft, name, centsOf(item.budget, ctx.currency)),
          },
    })
  }
  return draft
}

// Returns the name it ended up with: the same new category is created only once.
function addNew(draft: Draft, name: string, budget: number) {
  const found = draft.newCategories.find(
    c => normalize(c.name) === normalize(name),
  )
  if (found) {
    if (found.budget === 0 && budget > 0) found.budget = budget
    return found.name
  }
  const created = { name: capitalize(name), budget: Math.max(budget, 0) }
  draft.newCategories.push(created)
  return created.name
}
