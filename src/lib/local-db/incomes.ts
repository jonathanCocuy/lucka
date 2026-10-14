import { ApiClientError } from '@/lib/api-client/http'
import type { Income } from '@/lib/finance/types'
import { getDb } from './db'

interface Row {
  id: string
  amount: number
  description: string
  received_on: string
}

export async function listIncomes(): Promise<Income[]> {
  const db = await getDb()
  const rows = await db.select<Row[]>(
    `SELECT id, amount, description, received_on FROM incomes
     ORDER BY received_on DESC, created_at DESC, rowid DESC`,
  )
  return rows.map(i => ({
    id: i.id,
    amount: i.amount,
    description: i.description,
    date: i.received_on,
  }))
}

export async function addIncome(income: Income) {
  const db = await getDb()
  await db.execute(
    'INSERT INTO incomes (id, amount, description, received_on) VALUES (?, ?, ?, ?)',
    [income.id, income.amount, income.description, income.date],
  )
}

export async function removeIncome(id: string) {
  const db = await getDb()
  const { rowsAffected } = await db.execute(
    'DELETE FROM incomes WHERE id = ?',
    [id],
  )
  if (rowsAffected === 0) {
    throw new ApiClientError(404, 'Ingreso no encontrado')
  }
}
