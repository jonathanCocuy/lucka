import type { Category } from '@/lib/finance/types'
import { getDb, marks, now } from './db'

export async function listActiveCategories(): Promise<Category[]> {
  const db = await getDb()
  return db.select<Category[]>(
    `SELECT id, name, budget FROM categories
     WHERE archived_at IS NULL ORDER BY created_at, rowid`,
  )
}

// Reemplaza la lista: upsert por id y archiva las que no vienen.
export async function replaceCategories(items: Category[]) {
  const db = await getDb()
  const active = await listActiveCategories()
  const keep = new Set(items.map(c => c.id))
  for (const c of items) {
    await db.execute(
      `INSERT INTO categories (id, name, budget) VALUES (?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET name = excluded.name, budget = excluded.budget`,
      [c.id, c.name, c.budget],
    )
  }
  const missing = active.filter(c => !keep.has(c.id)).map(c => c.id)
  if (missing.length === 0) return
  await db.execute(
    `UPDATE categories SET archived_at = ? WHERE id IN (${marks(missing)})`,
    [now(), ...missing],
  )
}
