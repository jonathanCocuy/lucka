export interface FinanceProfile {
  // No account: the name is only used for greetings.
  name: string
  monthlyIncome: number
  // Day of the month the paycheck arrives. The cycle runs payday to payday.
  payday: number
}

export interface FixedExpense {
  id: string
  name: string
  amount: number
  dueDay: number
  isInvestment?: boolean
}

export interface Category {
  id: string
  name: string
  budget: number
}

export type ExpenseTarget =
  | { kind: 'fixed'; id: string }
  | { kind: 'category'; id: string }

export interface Expense {
  id: string
  amount: number
  description: string
  date: string // YYYY-MM-DD
  target: ExpenseTarget
}

// Extra money outside the salary. Counts only in the cycle of its date.
export interface Income {
  id: string
  amount: number
  description: string
  date: string // YYYY-MM-DD
}

export interface Investment {
  hasInvestments: boolean
  monthlyContribution: number
  totalBalance: number
}

export interface FinanceData {
  profile: FinanceProfile
  fixed: FixedExpense[]
  categories: Category[]
  investment: Investment
  expenses: Expense[]
  incomes: Income[]
}
