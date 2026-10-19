// Turns the AI's answer into drafts for the summary.
// The AI speaks in names; the app stores ids. This is where they meet.
import { formatMoney } from '@/lib/finance/format'

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

export interface Draft {
  items: DraftItem[]
  newCategories: NewCategory[]
  warnings: string[]
}

export interface ResolveContext {
  categories: { id: string; name: string }[]
  fixed: { id: string; name: string; pending: number; isPaid: boolean }[]
  today: string // YYYY-MM-DD
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

const amountOf = (v: unknown) =>
  typeof v === 'number' && Number.isSafeInteger(v) ? v : 0

const dateOr = (v: unknown, today: string) =>
  typeof v === 'string' && ISO_DATE.test(v) && !Number.isNaN(Date.parse(v))
    ? v
    : today

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function resolve(raw: unknown, ctx: ResolveContext): Draft {
  const draft: Draft = { items: [], newCategories: [], warnings: [] }
  const items = isObject(raw) && Array.isArray(raw.items) ? raw.items : null
  if (!items) {
    draft.warnings.push('No entendí lo que dijiste. Intenta de nuevo.')
    return draft
  }

  for (const item of items) {
    if (!isObject(item)) continue
    const amount = amountOf(item.amount)
    const description = text(item.description)
    const category = text(item.category)
    const date = dateOr(item.date, ctx.today)
    const label = description || category || 'un ítem'

    if (item.type === 'fixed') {
      // The AI sometimes puts the fixed expense's name in the description, not the category.
      const keys = [category, description].map(normalize)
      const fixed = ctx.fixed.find(f => keys.includes(normalize(f.name)))
      if (!fixed) {
        draft.warnings.push(`«${label}» no es uno de tus gastos fijos.`)
        continue
      }
      if (fixed.isPaid) {
        draft.warnings.push(`«${fixed.name}» ya está pagado este ciclo.`)
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
      draft.warnings.push(`No entendí qué hacer con «${label}».`)
      continue
    }
    if (amount <= 0) {
      draft.warnings.push(`No entendí el monto de «${label}».`)
      continue
    }

    if (item.type === 'income') {
      draft.items.push({ kind: 'income', amount, description, date })
      continue
    }

    const name = category || description
    if (!name) {
      draft.warnings.push(
        `No entendí en qué fue el gasto de ${formatMoney(amount)}.`,
      )
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
        : { kind: 'new', name: addNew(draft, name, amountOf(item.budget)) },
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
