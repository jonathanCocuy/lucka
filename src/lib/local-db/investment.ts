import { ApiClientError } from '@/lib/api-client/http'
import type { FixedExpense, Investment } from '@/lib/finance/types'
import { bit, getDb } from './db'
import { archiveFixed, upsertFixed } from './fixed-expenses'

interface Row {
  has_investments: number
  monthly_contribution: number
  total_balance: number
}

export async function getInvestment(): Promise<Investment | null> {
  const db = await getDb()
  const [row] = await db.select<Row[]>(
    'SELECT has_investments, monthly_contribution, total_balance FROM investments WHERE id = 1',
  )
  return (
    row && {
      hasInvestments: row.has_investments === 1,
      monthlyContribution: row.monthly_contribution,
      totalBalance: row.total_balance,
    }
  )
}

// A single active investment fixed expense. With no contribution, it's archived.
export async function saveInvestment(
  investment: Investment,
  fixed: FixedExpense | null,
) {
  const db = await getDb()
  const [active] = await db.select<{ id: string }[]>(
    'SELECT id FROM fixed_expenses WHERE is_investment = 1 AND archived_at IS NULL',
  )

  if (investment.hasInvestments && fixed) {
    if (active && active.id !== fixed.id) {
      throw new ApiClientError(409, 'Ya tienes otro fijo de inversión')
    }
    await upsertFixed(db, { ...fixed, isInvestment: true })
  } else if (active) {
    await archiveFixed(db, [active.id])
  }

  await db.execute(
    `INSERT INTO investments (id, has_investments, monthly_contribution, total_balance)
     VALUES (1, ?, ?, ?)
     ON CONFLICT (id) DO UPDATE SET has_investments = excluded.has_investments,
       monthly_contribution = excluded.monthly_contribution,
       total_balance = excluded.total_balance`,
    [
      bit(investment.hasInvestments),
      investment.monthlyContribution,
      investment.totalBalance,
    ],
  )
}
