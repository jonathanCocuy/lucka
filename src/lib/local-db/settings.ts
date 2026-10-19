import { ApiClientError } from '@/lib/api-client/http'
import type { FinanceProfile } from '@/lib/finance/types'
import { getDb, now } from './db'

interface Row {
  name: string
  monthly_income: number
  payday: number
  onboarded_at: string | null
}

export async function getSettings() {
  const db = await getDb()
  const [row] = await db.select<Row[]>(
    'SELECT name, monthly_income, payday, onboarded_at FROM finance_settings WHERE id = 1',
  )
  if (!row) return null
  const profile: FinanceProfile = {
    name: row.name,
    monthlyIncome: row.monthly_income,
    payday: row.payday,
  }
  return { profile, onboarded: row.onboarded_at !== null }
}

// onboarded_at is left alone: the profile is also edited after the onboarding.
export async function saveSettings(profile: FinanceProfile) {
  const db = await getDb()
  await db.execute(
    `INSERT INTO finance_settings (id, name, monthly_income, payday) VALUES (1, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET name = excluded.name,
       monthly_income = excluded.monthly_income, payday = excluded.payday`,
    [profile.name, profile.monthlyIncome, profile.payday],
  )
}

// The onboarding saves step by step. This is the last one: it opens the dashboard.
export async function completeOnboarding() {
  const settings = await getSettings()
  if (!settings) throw new ApiClientError(422, 'Primero guarda tu ingreso')
  if (settings.onboarded) {
    throw new ApiClientError(409, 'El onboarding ya está completo')
  }
  const db = await getDb()
  await db.execute(
    'UPDATE finance_settings SET onboarded_at = ? WHERE id = 1',
    [now()],
  )
}
