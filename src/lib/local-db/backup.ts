import { ApiClientError } from '@/lib/api-client/http'
import type {
  Category,
  Expense,
  FinanceProfile,
  FixedExpense,
  Income,
  Investment,
} from '@/lib/finance/types'
import {
  validateCategories,
  validateExpense,
  validateFixed,
  validateId,
  validateIncome,
  validateInvestment,
  validateProfile,
} from '@/lib/finance/validate'
import { listExpenses } from './expenses'
import { bit, getDb, type Db } from './db'
import { listIncomes } from './incomes'
import { getInvestment } from './investment'
import { getSettings } from './settings'

export const BACKUP_VERSION = 1

// Archived rows included: old expenses point to them.
type Archivable<T> = T & { archivedAt: string | null }

export interface BackupData {
  profile: FinanceProfile | null
  onboarded: boolean
  investment: Investment | null
  fixed: Archivable<FixedExpense>[]
  categories: Archivable<Category>[]
  expenses: Expense[]
  incomes: Income[]
}

export interface Backup {
  version: typeof BACKUP_VERSION
  exportedAt: string
  data: BackupData
}

interface FixedRow {
  id: string
  name: string
  amount: number
  due_day: number
  is_investment: number
  archived_at: string | null
}

interface CategoryRow {
  id: string
  name: string
  budget: number
  archived_at: string | null
}

export async function exportBackup(): Promise<Backup> {
  const db = await getDb()
  const [settings, investment, fixed, categories, expenses, incomes] =
    await Promise.all([
      getSettings(),
      getInvestment(),
      db.select<FixedRow[]>(
        `SELECT id, name, amount, due_day, is_investment, archived_at
         FROM fixed_expenses ORDER BY created_at, rowid`,
      ),
      db.select<CategoryRow[]>(
        'SELECT id, name, budget, archived_at FROM categories ORDER BY created_at, rowid',
      ),
      listExpenses(),
      listIncomes(),
    ])
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      profile: settings?.profile ?? null,
      onboarded: settings?.onboarded ?? false,
      investment,
      fixed: fixed.map(f => ({
        id: f.id,
        name: f.name,
        amount: f.amount,
        dueDay: f.due_day,
        ...(f.is_investment === 1 && { isInvestment: true }),
        archivedAt: f.archived_at,
      })),
      categories: categories.map(c => ({
        id: c.id,
        name: c.name,
        budget: c.budget,
        archivedAt: c.archived_at,
      })),
      // Reversed: on import they end up in the order they were created.
      expenses: expenses.toReversed(),
      incomes: incomes.toReversed(),
    },
  }
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null

const isArchivedAt = (v: unknown): v is string | null =>
  v === null || (typeof v === 'string' && !Number.isNaN(Date.parse(v)))

const invalid = (detail: string) =>
  new ApiClientError(422, `El archivo no es válido: ${detail}`)

// Returns the validated value or throws that row's error.
function take<T>(
  result: { ok: true; value: T } | { ok: false; error: string },
): T {
  if (!result.ok) throw invalid(result.error.toLowerCase())
  return result.value
}

function list(input: unknown, name: string): unknown[] {
  if (!Array.isArray(input)) throw invalid(`falta "${name}"`)
  return input
}

function parseFixed(input: unknown): Archivable<FixedExpense> {
  if (!isObject(input) || !isArchivedAt(input.archivedAt)) {
    throw invalid('gasto fijo inválido')
  }
  // validateFixed wipes the investment one's name and amount: validate it as a normal one.
  const [f] = take(validateFixed([{ ...input, isInvestment: false }]))
  return {
    ...f,
    ...(input.isInvestment === true && { isInvestment: true }),
    archivedAt: input.archivedAt,
  }
}

function parseCategory(input: unknown): Archivable<Category> {
  if (!isObject(input) || !isArchivedAt(input.archivedAt)) {
    throw invalid('categoría inválida')
  }
  // One by one: an archived one may share a name with an active one.
  const [c] = take(validateCategories([input]))
  return { ...c, archivedAt: input.archivedAt }
}

const withId = <T>(input: unknown, value: T): T & { id: string } => ({
  ...value,
  id: take(validateId(isObject(input) ? input.id : null)),
})

// Everything is validated before touching the database.
export function parseBackup(input: unknown): BackupData {
  if (!isObject(input) || !isObject(input.data)) {
    throw invalid('no es un respaldo de Lucka')
  }
  if (input.version !== BACKUP_VERSION) {
    throw invalid(`versión ${String(input.version)} no soportada`)
  }
  const { data } = input
  if (typeof data.onboarded !== 'boolean') throw invalid('falta "onboarded"')

  const profile =
    data.profile === null ? null : take(validateProfile(data.profile))
  if (data.onboarded && !profile) {
    throw invalid('onboarding completo sin perfil')
  }
  const investment =
    data.investment === null ? null : take(validateInvestment(data.investment))

  const fixed = list(data.fixed, 'fixed').map(parseFixed)
  const categories = list(data.categories, 'categories').map(parseCategory)
  const expenses = list(data.expenses, 'expenses').map(e =>
    withId(e, take(validateExpense(e))),
  )
  const incomes = list(data.incomes, 'incomes').map(i =>
    withId(i, take(validateIncome(i))),
  )

  const fixedIds = new Set(fixed.map(f => f.id))
  const categoryIds = new Set(categories.map(c => c.id))
  const orphan = expenses.some(({ target }) =>
    target.kind === 'fixed'
      ? !fixedIds.has(target.id)
      : !categoryIds.has(target.id),
  )
  if (orphan) throw invalid('hay gastos sin su fijo o categoría')
  const activeInvestments = fixed.filter(f => f.isInvestment && !f.archivedAt)
  if (activeInvestments.length > 1) {
    throw invalid('hay más de un fijo de inversión activo')
  }

  return {
    profile,
    onboarded: data.onboarded,
    investment,
    fixed,
    categories,
    expenses,
    incomes,
  }
}

// Children first: expenses point to fixed expenses and categories.
async function wipe(db: Db) {
  for (const table of [
    'expenses',
    'incomes',
    'fixed_expenses',
    'categories',
    'investments',
    'finance_settings',
  ]) {
    await db.execute(`DELETE FROM ${table}`)
  }
}

export async function wipeAll() {
  await wipe(await getDb())
}

// Replaces everything. No transaction (see db.ts): that's why it validates first.
export async function importBackup(input: unknown) {
  const data = parseBackup(input)
  const db = await getDb()
  await wipe(db)

  if (data.profile) {
    await db.execute(
      `INSERT INTO finance_settings (id, name, monthly_income, payday, onboarded_at)
       VALUES (1, ?, ?, ?, ?)`,
      [
        data.profile.name,
        data.profile.monthlyIncome,
        data.profile.payday,
        data.onboarded ? new Date().toISOString() : null,
      ],
    )
  }
  if (data.investment) {
    await db.execute(
      `INSERT INTO investments (id, has_investments, monthly_contribution, total_balance)
       VALUES (1, ?, ?, ?)`,
      [
        bit(data.investment.hasInvestments),
        data.investment.monthlyContribution,
        data.investment.totalBalance,
      ],
    )
  }
  for (const f of data.fixed) {
    await db.execute(
      `INSERT INTO fixed_expenses (id, name, amount, due_day, is_investment, archived_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        f.id,
        f.name,
        f.amount,
        f.dueDay,
        bit(f.isInvestment === true),
        f.archivedAt,
      ],
    )
  }
  for (const c of data.categories) {
    await db.execute(
      'INSERT INTO categories (id, name, budget, archived_at) VALUES (?, ?, ?, ?)',
      [c.id, c.name, c.budget, c.archivedAt],
    )
  }
  for (const e of data.expenses) {
    await db.execute(
      `INSERT INTO expenses (id, amount, description, spent_on, fixed_expense_id, category_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        e.id,
        e.amount,
        e.description,
        e.date,
        e.target.kind === 'fixed' ? e.target.id : null,
        e.target.kind === 'category' ? e.target.id : null,
      ],
    )
  }
  for (const i of data.incomes) {
    await db.execute(
      'INSERT INTO incomes (id, amount, description, received_on) VALUES (?, ?, ?, ?)',
      [i.id, i.amount, i.description, i.date],
    )
  }
}
