import { ApiClientError } from './http'
import { createFinanceApi } from './finance'
import { replaceCategories } from '@/lib/local-db/categories'
import { addExpense, removeExpense } from '@/lib/local-db/expenses'
import { addIncome, removeIncome } from '@/lib/local-db/incomes'

jest.mock('@/lib/local-db/categories')
jest.mock('@/lib/local-db/expenses')
jest.mock('@/lib/local-db/incomes')
jest.mock('@/lib/local-db/fixed-expenses')
jest.mock('@/lib/local-db/investment')
jest.mock('@/lib/local-db/settings')

const previous = [{ id: 'cat-1', name: 'Comida', budget: 0 }]
const created = { id: 'cat-2', name: 'Regalos', budget: 50_000 }
const expense = (id: string) => ({
  id,
  amount: 10_000,
  description: '',
  date: '2026-10-16',
  target: { kind: 'category' as const, id: 'cat-2' },
})

describe('addMany', () => {
  it('deletes what it saved and rethrows when an insert fails halfway', async () => {
    const failure = new ApiClientError(422, 'Elige a qué va el gasto')
    jest.mocked(replaceCategories).mockResolvedValue(undefined)
    jest
      .mocked(addExpense)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(failure)

    await expect(
      createFinanceApi().addMany({
        categories: [...previous, created],
        previousCategories: previous,
        expenses: [expense('exp-1'), expense('exp-2')],
        incomes: [
          {
            id: 'inc-1',
            amount: 1,
            description: '',
            date: '2026-10-16',
          },
        ],
      }),
    ).rejects.toBe(failure)

    expect(removeExpense).toHaveBeenCalledTimes(1)
    expect(removeExpense).toHaveBeenCalledWith('exp-1')
    expect(addIncome).not.toHaveBeenCalled()
    expect(removeIncome).not.toHaveBeenCalled()
    expect(replaceCategories).toHaveBeenLastCalledWith(previous)
  })
})
