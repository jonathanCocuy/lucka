import type {
  Category,
  Expense,
  FinanceProfile,
  FixedExpense,
  Income,
  Investment,
} from '@/lib/finance/types'
import {
  listActiveCategories,
  replaceCategories,
} from '@/lib/local-db/categories'
import {
  addExpense,
  listExpenses,
  removeExpense,
} from '@/lib/local-db/expenses'
import {
  clearPayments,
  listActiveFixed,
  replaceFixed,
} from '@/lib/local-db/fixed-expenses'
import { addIncome, listIncomes, removeIncome } from '@/lib/local-db/incomes'
import { getInvestment, saveInvestment } from '@/lib/local-db/investment'
import {
  completeOnboarding,
  getSettings,
  saveSettings,
} from '@/lib/local-db/settings'

// Several records at once (voice). `categories` = the full list if there are new ones.
export interface Batch {
  categories: Category[] | null
  previousCategories: Category[]
  expenses: Expense[]
  incomes: Income[]
}

// What the user has saved.
export interface FinanceSnapshot {
  onboarded: boolean
  profile: FinanceProfile | null // null = onboarding not started
  investment: Investment
  fixed: FixedExpense[]
  categories: Category[]
  expenses: Expense[]
  incomes: Income[]
}

export type FinanceApi = ReturnType<typeof createFinanceApi>

const NO_INVESTMENT: Investment = {
  hasInvestments: false,
  monthlyContribution: 0,
  totalBalance: 0,
}

// The front's only door to the data. Today: local SQLite (src/lib/local-db).
export function createFinanceApi() {
  return {
    async load(): Promise<FinanceSnapshot> {
      const [settings, investment, fixed, categories, expenses, incomes] =
        await Promise.all([
          getSettings(),
          getInvestment(),
          listActiveFixed(),
          listActiveCategories(),
          listExpenses(),
          listIncomes(),
        ])
      return {
        onboarded: settings?.onboarded ?? false,
        profile: settings?.profile ?? null,
        investment: investment ?? NO_INVESTMENT,
        fixed,
        categories,
        expenses,
        incomes,
      }
    },

    saveProfile: saveSettings,
    completeOnboarding,
    // `fixed` = the investment fixed expense, already synced (or null with no contribution).
    saveInvestment,
    saveFixed: replaceFixed,
    saveCategories: replaceCategories,
    addExpense,
    removeExpense,
    // Unmarking a paid fixed expense: deletes its payments from `from` (inclusive) to `to`.
    clearPayments,
    addIncome,
    removeIncome,

    // All or nothing: if something fails, whatever got in is deleted.
    async addMany(batch: Batch) {
      const added = { expenses: [] as string[], incomes: [] as string[] }
      try {
        if (batch.categories) await replaceCategories(batch.categories)
        for (const expense of batch.expenses) {
          await addExpense(expense)
          added.expenses.push(expense.id)
        }
        for (const income of batch.incomes) {
          await addIncome(income)
          added.incomes.push(income.id)
        }
      } catch (error) {
        // No transactions (see db.ts): undone by hand.
        await Promise.allSettled([
          ...added.expenses.map(id => removeExpense(id)),
          ...added.incomes.map(id => removeIncome(id)),
        ])
        if (batch.categories) {
          await replaceCategories(batch.previousCategories).catch(() => null)
        }
        throw error
      }
    },
  }
}
