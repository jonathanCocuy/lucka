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

// Varios registros de una vez (voz). `categories` = lista completa si hay nuevas.
export interface Batch {
  categories: Category[] | null
  previousCategories: Category[]
  expenses: Expense[]
  incomes: Income[]
}

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

    // Todo o nada: si algo falla, se borra lo que alcanzó a entrar.
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
        // Sin transacciones (ver db.ts): se deshace a mano.
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
