import type { AiProvider, AiProviderId } from '@/lib/ai/catalog'
import { bit, getDb, now } from './db'

interface Row {
  id: AiProviderId
  model: string
  is_default: number
}

// The key doesn't live here: it goes in the OS keychain (Rust).
export async function listAiProviders(): Promise<AiProvider[]> {
  const db = await getDb()
  const rows = await db.select<Row[]>(
    'SELECT id, model, is_default FROM ai_providers ORDER BY created_at, rowid',
  )
  return rows.map(r => ({
    id: r.id,
    model: r.model,
    isDefault: r.is_default === 1,
  }))
}

// The first one configured becomes the default.
export async function saveAiProvider(id: AiProviderId, model: string) {
  const db = await getDb()
  const [{ total }] = await db.select<{ total: number }[]>(
    'SELECT COUNT(*) AS total FROM ai_providers WHERE id != ?',
    [id],
  )
  await db.execute(
    `INSERT INTO ai_providers (id, model, is_default) VALUES (?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET model = excluded.model`,
    [id, model, bit(total === 0)],
  )
}

// Clear the old one first: the unique index won't allow two defaults.
export async function setDefaultAiProvider(id: AiProviderId) {
  const db = await getDb()
  await db.execute(
    'UPDATE ai_providers SET is_default = 0 WHERE is_default = 1',
  )
  await db.execute('UPDATE ai_providers SET is_default = 1 WHERE id = ?', [id])
}

// If it was the default, the oldest remaining one takes over.
export async function removeAiProvider(id: AiProviderId) {
  const db = await getDb()
  await db.execute('DELETE FROM ai_providers WHERE id = ?', [id])
  await db.execute(
    `UPDATE ai_providers SET is_default = 1
     WHERE NOT EXISTS (SELECT 1 FROM ai_providers WHERE is_default = 1)
       AND id = (SELECT id FROM ai_providers ORDER BY created_at, rowid LIMIT 1)`,
  )
}

export async function wasAiPrompted() {
  const db = await getDb()
  const [row] = await db.select<{ ai_prompted_at: string | null }[]>(
    'SELECT ai_prompted_at FROM finance_settings WHERE id = 1',
  )
  return row?.ai_prompted_at != null
}

export async function markAiPrompted() {
  const db = await getDb()
  await db.execute(
    'UPDATE finance_settings SET ai_prompted_at = ? WHERE id = 1',
    [now()],
  )
}
