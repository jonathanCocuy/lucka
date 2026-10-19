import { ApiClientError } from '@/lib/api-client/http'
import type { Expense } from '@/lib/finance/types'
import { getDb } from './db'

interface Row {
  id: string
  amount: number
  description: string
  spent_on: string
  fixed_expense_id: string | null
  category_id: string | null
}

export async function listExpenses(): Promise<Expense[]> {
  const db = await getDb()
  const rows = await db.select<Row[]>(
    `SELECT id, amount, description, spent_on, fixed_expense_id, category_id
     FROM expenses ORDER BY spent_on DESC, created_at DESC, rowid DESC`,
  )
  return rows.map(e => ({
    id: e.id,
    amount: e.amount,
    description: e.description,
    date: e.spent_on,
    // The table's CHECK guarantees only one of the two is set.
    target: e.fixed_expense_id
      ? { kind: 'fixed', id: e.fixed_expense_id }
      : { kind: 'category', id: e.category_id ?? '' },
  }))
}

export async function addExpense(expense: Expense) {
  const db = await getDb()
  const { target } = expense
  const table = target.kind === 'fixed' ? 'fixed_expenses' : 'categories'
  const active = await db.select<{ id: string }[]>(
    `SELECT id FROM ${table} WHERE id = ? AND archived_at IS NULL`,
    [target.id],
  )
  if (active.length === 0) {
    throw new ApiClientError(422, 'Elige a qué va el gasto')
  }
  await db.execute(
    `INSERT INTO expenses (id, amount, description, spent_on, fixed_expense_id, category_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      expense.id,
      expense.amount,
      expense.description,
      expense.date,
      target.kind === 'fixed' ? target.id : null,
      target.kind === 'category' ? target.id : null,
    ],
  )
}

export async function removeExpense(id: string) {
  const db = await getDb()
  const { rowsAffected } = await db.execute(
    'DELETE FROM expenses WHERE id = ?',
    [id],
  )
  if (rowsAffected === 0) {
    throw new ApiClientError(404, 'Gasto no encontrado')
  }
}
