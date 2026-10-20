'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  createFinanceApi,
  type FinanceApi,
  type FinanceSnapshot,
} from '@/lib/api-client/finance'
import { errorText, type AppError } from '@/lib/api-client/http'
import {
  summarize,
  syncInvestmentFixed,
  toISODate,
  type Summary,
} from '@/lib/finance/calc'
import type {
  Category,
  Expense,
  FinanceData,
  FinanceProfile,
  FixedExpense,
  Income,
  Investment,
} from '@/lib/finance/types'
import {
  validateCategories,
  validateExpense,
  validateFixed,
  validateIncome,
  validateInvestment,
  validateProfile,
} from '@/lib/finance/validate'
import { usePreferences } from '@/lib/i18n/context'

// Every action returns the error to show, or null if it saved.
type Run = Promise<string | null>

interface FinanceContextValue {
  // false while loading. Keeps the onboarding from showing to someone who has data.
  ready: boolean
  // Load error (no data, no dashboard).
  loadError: string | null
  data: FinanceData | null // null = onboarding not finished
  // What the onboarding saved, to resume it after a reload.
  draft: FinanceSnapshot | null
  summary: Summary | null
  setProfile: (profile: FinanceProfile) => Run
  setFixed: (fixed: FixedExpense[]) => Run
  setCategories: (categories: Category[]) => Run
  setInvestment: (investment: Investment) => Run
  complete: () => Run
  addExpense: (expense: Omit<Expense, 'id'>) => Run
  removeExpense: (id: string) => Run
  addIncome: (income: Omit<Income, 'id'>) => Run
  removeIncome: (id: string) => Run
  toggleFixedPaid: (id: string) => Run
  // Several records at once (voice). If one is invalid, none are saved.
  addMany: (input: ManyInput) => Run
}

export interface ManyInput {
  newCategories: Category[]
  expenses: Omit<Expense, 'id'>[]
  incomes: Omit<Income, 'id'>[]
}

// What changes on screen and how it's saved. Or the validation error.
interface Change {
  next: FinanceSnapshot
  save: (api: FinanceApi) => Promise<unknown>
}
type Plan = (s: FinanceSnapshot) => Change | AppError

const isChange = (plan: Change | AppError): plan is Change => 'next' in plan

const FinanceContext = createContext<FinanceContextValue | null>(null)

export function newId() {
  return crypto.randomUUID()
}

function toData(s: FinanceSnapshot): FinanceData | null {
  if (!s.onboarded || !s.profile) return null
  const { profile, investment, fixed, categories, expenses, incomes } = s
  return { profile, investment, fixed, categories, expenses, incomes }
}

// The investment fixed expense belongs to investments: here only its day changes.
function withInvestmentFixed(
  incoming: FixedExpense[],
  current: FixedExpense[],
  investment: Investment,
) {
  const kept = current.find(f => f.isInvestment)
  const list =
    kept && !incoming.some(f => f.isInvestment) ? [...incoming, kept] : incoming
  return syncInvestmentFixed(list, investment)
}

const targetExists = (s: FinanceSnapshot, target: Expense['target']) =>
  target.kind === 'fixed'
    ? s.fixed.some(f => f.id === target.id)
    : s.categories.some(c => c.id === target.id)

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { t, error: errorFor } = usePreferences()
  const [snapshot, setSnapshot] = useState<FinanceSnapshot | null>(null)
  // Wrapped: whatever was thrown, even undefined, still counts as an error.
  const [loadError, setLoadError] = useState<{ error: unknown } | null>(null)
  // Refs: actions are queued and each one starts from the state the previous one left.
  const latest = useRef<FinanceSnapshot | null>(null)
  const api = useRef<FinanceApi | null>(null)
  const queue = useRef<Promise<unknown>>(Promise.resolve())

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const client = createFinanceApi()
      try {
        const loaded = await client.load()
        if (cancelled) return
        api.current = client
        latest.current = loaded
        setSnapshot(loaded)
      } catch (error) {
        console.error('Could not open the data', error)
        if (!cancelled) setLoadError({ error })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const show = (next: FinanceSnapshot) => {
    latest.current = next
    setSnapshot(next)
  }

  // The change shows instantly. If saving fails, it rolls back.
  const run = (plan: Plan): Run => {
    const task = queue.current.then(async (): Run => {
      const current = latest.current
      if (!current || !api.current) return errorText(t, { code: 'notLoaded' })
      const change = plan(current)
      if (!isChange(change)) return errorText(t, change)

      show(change.next)
      try {
        await change.save(api.current)
        return null
      } catch (error) {
        show(current)
        return errorFor(error)
      }
    })
    queue.current = task.catch(() => null)
    return task
  }

  // Only with the onboarding finished (expenses, incomes, payments).
  const inPanel = (
    plan: (s: FinanceSnapshot, d: FinanceData) => Change | AppError,
  ) =>
    run(s => {
      const d = toData(s)
      return d ? plan(s, d) : { code: 'profileFirst' }
    })

  const addExpenseTo = (s: FinanceSnapshot, expense: Expense): Change => ({
    next: { ...s, expenses: [...s.expenses, expense] },
    save: client => client.addExpense(expense),
  })

  const data = snapshot && toData(snapshot)

  const value: FinanceContextValue = {
    ready: snapshot !== null || loadError !== null,
    loadError: loadError && errorFor(loadError.error),
    data,
    draft: snapshot,
    summary: data ? summarize(data, new Date()) : null,

    setProfile: profile =>
      run(s => {
        const parsed = validateProfile(profile)
        if (!parsed.ok) return parsed.error
        return {
          next: { ...s, profile: parsed.value },
          save: client => client.saveProfile(parsed.value),
        }
      }),

    setFixed: fixed =>
      run(s => {
        const parsed = validateFixed(fixed)
        if (!parsed.ok) return parsed.error
        const list = withInvestmentFixed(parsed.value, s.fixed, s.investment)
        return {
          next: { ...s, fixed: list },
          save: client => client.saveFixed(list),
        }
      }),

    setCategories: categories =>
      run(s => {
        const parsed = validateCategories(categories)
        if (!parsed.ok) return parsed.error
        return {
          next: { ...s, categories: parsed.value },
          save: client => client.saveCategories(parsed.value),
        }
      }),

    setInvestment: investment =>
      run(s => {
        const parsed = validateInvestment(investment)
        if (!parsed.ok) return parsed.error
        const fixed = syncInvestmentFixed(s.fixed, parsed.value)
        const investmentFixed = fixed.find(f => f.isInvestment) ?? null
        return {
          next: { ...s, investment: parsed.value, fixed },
          save: client => client.saveInvestment(parsed.value, investmentFixed),
        }
      }),

    complete: () =>
      run(s => {
        if (s.onboarded) return { code: 'onboardingDone' }
        if (!s.profile) return { code: 'saveIncomeFirst' }
        return {
          next: { ...s, onboarded: true },
          save: client => client.completeOnboarding(),
        }
      }),

    addExpense: expense =>
      inPanel(s => {
        const parsed = validateExpense(expense)
        if (!parsed.ok) return parsed.error
        if (!targetExists(s, parsed.value.target)) {
          return { code: 'pickTarget' }
        }
        return addExpenseTo(s, { ...parsed.value, id: newId() })
      }),

    removeExpense: id =>
      inPanel(s => ({
        next: { ...s, expenses: s.expenses.filter(e => e.id !== id) },
        save: client => client.removeExpense(id),
      })),

    addIncome: income =>
      inPanel(s => {
        const parsed = validateIncome(income)
        if (!parsed.ok) return parsed.error
        const created = { ...parsed.value, id: newId() }
        return {
          next: { ...s, incomes: [...s.incomes, created] },
          save: client => client.addIncome(created),
        }
      }),

    removeIncome: id =>
      inPanel(s => ({
        next: { ...s, incomes: s.incomes.filter(i => i.id !== id) },
        save: client => client.removeIncome(id),
      })),

    // Mark paid = record what's pending. Unmark = delete its payments in the cycle.
    toggleFixedPaid: id =>
      inPanel((s, d) => {
        const summary = summarize(d, new Date())
        const status = summary.fixed.find(f => f.fixed.id === id)
        if (!status) return { code: 'fixedNotFound' }
        if (!status.isPaid) {
          return addExpenseTo(s, {
            id: newId(),
            amount: status.pending,
            // The investment one has no name of its own: the lists show it translated.
            description: status.fixed.isInvestment ? '' : status.fixed.name,
            date: toISODate(new Date()),
            target: { kind: 'fixed', id },
          })
        }
        const cycleIds = new Set(summary.cycleExpenses.map(e => e.id))
        const { start, end } = summary.cycle
        return {
          next: {
            ...s,
            expenses: s.expenses.filter(
              e =>
                !(
                  e.target.kind === 'fixed' &&
                  e.target.id === id &&
                  cycleIds.has(e.id)
                ),
            ),
          },
          save: client =>
            client.clearPayments(id, toISODate(start), toISODate(end)),
        }
      }),

    addMany: input => inPanel(s => planMany(s, input)),
  }

  return <FinanceContext value={value}>{children}</FinanceContext>
}

function planMany(s: FinanceSnapshot, input: ManyInput): Change | AppError {
  if (input.expenses.length + input.incomes.length === 0) {
    return { code: 'nothingToSave' }
  }
  const categories = validateCategories([
    ...s.categories,
    ...input.newCategories,
  ])
  if (!categories.ok) return categories.error
  const withCategories = { ...s, categories: categories.value }

  const expenses: Expense[] = []
  for (const expense of input.expenses) {
    const parsed = validateExpense(expense)
    if (!parsed.ok) return parsed.error
    if (!targetExists(withCategories, parsed.value.target)) {
      return { code: 'pickTargets' }
    }
    expenses.push({ ...parsed.value, id: newId() })
  }
  const incomes: Income[] = []
  for (const income of input.incomes) {
    const parsed = validateIncome(income)
    if (!parsed.ok) return parsed.error
    incomes.push({ ...parsed.value, id: newId() })
  }

  const hasNew = input.newCategories.length > 0
  return {
    next: {
      ...withCategories,
      expenses: [...s.expenses, ...expenses],
      incomes: [...s.incomes, ...incomes],
    },
    save: client =>
      client.addMany({
        categories: hasNew ? categories.value : null,
        previousCategories: s.categories,
        expenses,
        incomes,
      }),
  }
}

export function useFinance() {
  const ctx = useContext(FinanceContext)
  if (!ctx) throw new Error('useFinance outside FinanceProvider')
  return ctx
}
