import { ApiClientError } from '@/lib/api-client/http'
import type { Preferences } from '@/lib/i18n/locale'
import { getDb } from './db'

// null = not chosen yet: the app uses the system language.
export async function getPreferences(): Promise<Preferences | null> {
  const db = await getDb()
  const [row] = await db.select<Preferences[]>(
    'SELECT language, currency FROM preferences WHERE id = 1',
  )
  return row ?? null
}

export async function hasMovements() {
  const db = await getDb()
  const [row] = await db.select<{ found: number }[]>(
    'SELECT EXISTS (SELECT 1 FROM expenses) OR EXISTS (SELECT 1 FROM incomes) AS found',
  )
  return row?.found === 1
}

// Recorded amounts already belong to a currency: there's no rate to convert them.
export async function savePreferences(next: Preferences) {
  const current = await getPreferences()
  if (current && current.currency !== next.currency && (await hasMovements())) {
    throw new ApiClientError(409, 'currencyLocked')
  }
  const db = await getDb()
  await db.execute(
    `INSERT INTO preferences (id, language, currency) VALUES (1, ?, ?)
     ON CONFLICT (id) DO UPDATE SET language = excluded.language, currency = excluded.currency`,
    [next.language, next.currency],
  )
}
