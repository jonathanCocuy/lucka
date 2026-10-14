import { ApiClientError } from '@/lib/api-client/http'
import type { FixedExpense } from '@/lib/finance/types'
import { bit, getDb, marks, now, type Db } from './db'

interface Row {
  id: string
  name: string
  amount: number
  due_day: number
  is_investment: number
}

export async function listActiveFixed(): Promise<FixedExpense[]> {
  const db = await getDb()
  const rows = await db.select<Row[]>(
    `SELECT id, name, amount, due_day, is_investment FROM fixed_expenses
     WHERE archived_at IS NULL ORDER BY due_day, created_at, rowid`,
  )
  return rows.map(f => ({
    id: f.id,
    name: f.name,
    amount: f.amount,
    dueDay: f.due_day,
    ...(f.is_investment === 1 && { isInvestment: true }),
  }))
}

export async function archiveFixed(db: Db, ids: string[]) {
  if (ids.length === 0) return
  await db.execute(
    `UPDATE fixed_expenses SET archived_at = ? WHERE id IN (${marks(ids)})`,
    [now(), ...ids],
  )
}

export async function upsertFixed(db: Db, f: FixedExpense) {
  await db.execute(
    `INSERT INTO fixed_expenses (id, name, amount, due_day, is_investment)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET name = excluded.name, amount = excluded.amount,
       due_day = excluded.due_day, is_investment = excluded.is_investment`,
    [f.id, f.name, f.amount, f.dueDay, bit(f.isInvestment === true)],
  )
}

// Reemplaza la lista: upsert por id y archiva los que no vienen.
// El fijo de inversión nunca se archiva ni se edita aquí, salvo su día.
export async function replaceFixed(items: FixedExpense[]) {
  const db = await getDb()
  const active = await listActiveFixed()
  const investmentId = active.find(f => f.isInvestment)?.id

  const regular = items.filter(f => !f.isInvestment)
  if (regular.some(f => f.id === investmentId)) {
    throw new ApiClientError(422, 'La inversión se edita desde inversiones')
  }
  const keep = new Set(regular.map(f => f.id))
  const missing = active
    .filter(f => !f.isInvestment && !keep.has(f.id))
    .map(f => f.id)

  for (const f of regular) await upsertFixed(db, f)
  await archiveFixed(db, missing)

  const investment = items.find(f => f.isInvestment)
  if (investment && investment.id === investmentId) {
    await db.execute('UPDATE fixed_expenses SET due_day = ? WHERE id = ?', [
      investment.dueDay,
      investment.id,
    ])
  }
}

// Desmarcar pagado = borrar sus pagos entre `from` (incluido) y `to`.
export async function clearPayments(fixedId: string, from: string, to: string) {
  const db = await getDb()
  const found = await db.select<{ id: string }[]>(
    'SELECT id FROM fixed_expenses WHERE id = ?',
    [fixedId],
  )
  if (found.length === 0) {
    throw new ApiClientError(404, 'Gasto fijo no encontrado')
  }
  await db.execute(
    `DELETE FROM expenses WHERE fixed_expense_id = ? AND spent_on >= ? AND spent_on < ?`,
    [fixedId, from, to],
  )
}
