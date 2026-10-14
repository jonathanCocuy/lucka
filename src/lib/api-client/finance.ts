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

// Lo que el usuario tiene guardado.
export interface FinanceSnapshot {
  onboarded: boolean
  profile: FinanceProfile | null // null = onboarding sin empezar
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

// Única puerta del front a los datos. Hoy: SQLite local (src/lib/local-db).
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
    // `fixed` = el fijo de inversión ya sincronizado (o null si no hay aporte).
    saveInvestment,
    saveFixed: replaceFixed,
    saveCategories: replaceCategories,
    addExpense,
    removeExpense,
    // Desmarcar un fijo pagado: borra sus pagos entre `from` (incluido) y `to`.
    clearPayments,
    addIncome,
    removeIncome,
  }
}
