import type { AppError, ErrorParams } from '@/lib/api-client/http'
import type { ErrorCode } from '@/lib/i18n/en'
import {
  CURRENCIES,
  LANGUAGES,
  type Currency,
  type Language,
  type Preferences,
} from '@/lib/i18n/locale'
import type {
  Category,
  Expense,
  FinanceProfile,
  FixedExpense,
  Income,
  Investment,
} from './types'

// Input from the UI or an imported backup isn't guaranteed by the types.
export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const NAME_MAX = 40

// Stored for the investment fixed expense. The UI always shows its translation.
export const INVESTMENT_NAME = 'Investment'

const ok = <T>(value: T): Result<T> => ({ ok: true, value })
const fail = <T>(code: ErrorCode, params?: ErrorParams): Result<T> => ({
  ok: false,
  error: { code, params },
})

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null
// Money is in cents: always a whole number.
const isMoney = (v: unknown, min: number): v is number =>
  Number.isSafeInteger(v) && (v as number) >= min
const isDay = (v: unknown): v is number =>
  Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 31
const isName = (v: unknown): v is string =>
  typeof v === 'string' && v.trim().length > 0
const isId = (v: unknown): v is string => typeof v === 'string' && UUID.test(v)
const isDate = (v: unknown): v is string =>
  typeof v === 'string' && ISO_DATE.test(v) && !Number.isNaN(Date.parse(v))
const isLanguage = (v: unknown): v is Language => LANGUAGES.some(l => l === v)
const isCurrency = (v: unknown): v is Currency => CURRENCIES.some(c => c === v)

export function validateId(input: unknown): Result<string> {
  return isId(input) ? ok(input) : fail('invalidId')
}

export function validatePreferences(input: unknown): Result<Preferences> {
  if (
    !isObject(input) ||
    !isLanguage(input.language) ||
    !isCurrency(input.currency)
  ) {
    return fail('invalidData')
  }
  return ok({ language: input.language, currency: input.currency })
}

export function validateProfile(input: unknown): Result<FinanceProfile> {
  if (!isObject(input)) return fail('invalidData')
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  if (!name) return fail('nameRequired')
  if (name.length > NAME_MAX) return fail('nameTooLong', { max: NAME_MAX })
  if (!isMoney(input.monthlyIncome, 1)) return fail('incomeRequired')
  if (!isDay(input.payday)) return fail('dayOutOfRange')
  return ok({ name, monthlyIncome: input.monthlyIncome, payday: input.payday })
}

export function validateFixed(input: unknown): Result<FixedExpense[]> {
  if (!Array.isArray(input)) return fail('invalidData')
  const items: FixedExpense[] = []
  for (const f of input) {
    if (!isObject(f)) return fail('invalidData')
    if (!isDay(f.dueDay)) return fail('dayOutOfRange')
    // The investment one is managed from investments; only its day matters.
    if (f.isInvestment === true) {
      items.push({
        id: String(f.id),
        name: INVESTMENT_NAME,
        amount: 0,
        dueDay: f.dueDay,
        isInvestment: true,
      })
      continue
    }
    if (!isId(f.id)) return fail('invalidId')
    if (!isName(f.name)) return fail('fixedNameRequired')
    if (!isMoney(f.amount, 1)) return fail('amountsPositive')
    items.push({
      id: f.id,
      name: f.name.trim(),
      amount: f.amount,
      dueDay: f.dueDay,
    })
  }
  return ok(items)
}

export function validateCategories(input: unknown): Result<Category[]> {
  if (!Array.isArray(input)) return fail('invalidData')
  const items: Category[] = []
  const names = new Set<string>()
  for (const c of input) {
    if (!isObject(c) || !isId(c.id)) return fail('invalidId')
    if (!isName(c.name)) return fail('categoryNameRequired')
    if (!isMoney(c.budget, 0)) return fail('budgetNegative')
    const key = c.name.trim().toLowerCase()
    if (names.has(key)) return fail('categoryRepeated', { name: c.name.trim() })
    names.add(key)
    items.push({ id: c.id, name: c.name.trim(), budget: c.budget })
  }
  return ok(items)
}

export function validateInvestment(input: unknown): Result<Investment> {
  if (!isObject(input) || typeof input.hasInvestments !== 'boolean') {
    return fail('invalidData')
  }
  if (
    !isMoney(input.monthlyContribution, 0) ||
    !isMoney(input.totalBalance, 0)
  ) {
    return fail('amountsNotNegative')
  }
  return ok({
    hasInvestments: input.hasInvestments,
    monthlyContribution: input.monthlyContribution,
    totalBalance: input.totalBalance,
  })
}

export function validateExpense(input: unknown): Result<Omit<Expense, 'id'>> {
  if (!isObject(input) || !isObject(input.target)) return fail('invalidData')
  const { kind, id } = input.target
  if (kind !== 'fixed' && kind !== 'category') return fail('invalidData')
  if (!isId(id)) return fail('pickTarget')
  if (!isMoney(input.amount, 1)) return fail('amountRequired')
  if (!isDate(input.date)) return fail('invalidDate')
  return ok({
    amount: input.amount,
    description:
      typeof input.description === 'string' ? input.description.trim() : '',
    date: input.date,
    target: { kind, id },
  })
}

export function validateIncome(input: unknown): Result<Omit<Income, 'id'>> {
  if (!isObject(input)) return fail('invalidData')
  if (!isMoney(input.amount, 1)) return fail('amountRequired')
  if (!isDate(input.date)) return fail('invalidDate')
  return ok({
    amount: input.amount,
    description:
      typeof input.description === 'string' ? input.description.trim() : '',
    date: input.date,
  })
}
