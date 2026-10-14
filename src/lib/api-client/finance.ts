import type {
  Category,
  Expense,
  FinanceProfile,
  FixedExpense,
  Income,
  Investment,
} from '@/lib/finance/types'
import { ApiClientError } from './http'

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

// Temporal: guarda en memoria hasta que llegue SQLite (fase 5).
export function createFinanceApi() {
  let store: FinanceSnapshot = {
    onboarded: false,
    profile: null,
    investment: NO_INVESTMENT,
    fixed: [],
    categories: [],
    expenses: [],
    incomes: [],
  }

  const save = (next: Partial<FinanceSnapshot>) => {
    store = { ...store, ...next }
    return Promise.resolve()
  }

  return {
    load(): Promise<FinanceSnapshot> {
      return Promise.resolve(store)
    },

    saveProfile(profile: FinanceProfile) {
      return save({ profile })
    },

    completeOnboarding() {
      if (!store.profile) {
        throw new ApiClientError(422, 'Primero guarda tu ingreso')
      }
      if (store.onboarded) {
        throw new ApiClientError(409, 'El onboarding ya está completo')
      }
      return save({ onboarded: true })
    },

    // `fixed` = el fijo de inversión ya sincronizado (o null si no hay aporte).
    saveInvestment(investment: Investment, fixed: FixedExpense | null) {
      const regular = store.fixed.filter(f => !f.isInvestment)
      return save({ investment, fixed: fixed ? [...regular, fixed] : regular })
    },

    saveFixed(fixed: FixedExpense[]) {
      return save({ fixed })
    },

    saveCategories(categories: Category[]) {
      return save({ categories })
    },

    addExpense(expense: Expense) {
      return save({ expenses: [...store.expenses, expense] })
    },

    removeExpense(id: string) {
      if (!store.expenses.some(e => e.id === id)) {
        throw new ApiClientError(404, 'Gasto no encontrado')
      }
      return save({ expenses: store.expenses.filter(e => e.id !== id) })
    },

    // Desmarcar un fijo pagado: borra sus pagos entre `from` (incluido) y `to`.
    clearPayments(fixedId: string, from: string, to: string) {
      if (!store.fixed.some(f => f.id === fixedId)) {
        throw new ApiClientError(404, 'Gasto fijo no encontrado')
      }
      const inRange = (e: Expense) =>
        e.target.kind === 'fixed' &&
        e.target.id === fixedId &&
        e.date >= from &&
        e.date < to
      return save({ expenses: store.expenses.filter(e => !inRange(e)) })
    },

    addIncome(income: Income) {
      return save({ incomes: [...store.incomes, income] })
    },

    removeIncome(id: string) {
      if (!store.incomes.some(i => i.id === id)) {
        throw new ApiClientError(404, 'Ingreso no encontrado')
      }
      return save({ incomes: store.incomes.filter(i => i.id !== id) })
    },
  }
}
