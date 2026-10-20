import { resolve, type ResolveContext } from './resolve'

const pesos: ResolveContext = {
  today: '2026-10-16',
  currency: 'COP',
  categories: [
    { id: 'cat-cafe', name: 'Café' },
    { id: 'cat-food', name: 'Food' },
  ],
  fixed: [
    { id: 'fix-rent', name: 'Rent', pending: 120_000_000, isPaid: false },
    { id: 'fix-internet', name: 'Internet', pending: 0, isPaid: true },
  ],
}

const dollars: ResolveContext = { ...pesos, currency: 'USD' }

const item = (over: Record<string, unknown>) => ({
  type: 'expense',
  amount: 20_000,
  description: 'Something',
  category: '',
  budget: 0,
  date: '2026-10-15',
  ...over,
})

describe('resolve', () => {
  it('proposes a new category with the budget the user said, or 0', () => {
    const draft = resolve(
      {
        items: [
          item({ category: 'gifts', budget: 100_000 }),
          item({ category: 'Pets' }),
        ],
      },
      pesos,
    )

    expect(draft.newCategories).toEqual([
      { name: 'Gifts', budget: 10_000_000 },
      { name: 'Pets', budget: 0 },
    ])
    expect(draft.items[0]).toMatchObject({
      target: { kind: 'new', name: 'Gifts' },
    })
  })

  it('creates one new category even if it is mentioned twice', () => {
    const draft = resolve(
      {
        items: [
          item({ category: 'Gifts' }),
          item({ category: 'gifts', budget: 50_000 }),
        ],
      },
      pesos,
    )

    expect(draft.newCategories).toEqual([{ name: 'Gifts', budget: 5_000_000 }])
    expect(draft.items).toHaveLength(2)
  })

  it('matches the category regardless of accents and case', () => {
    const draft = resolve({ items: [item({ category: ' CAFE ' })] }, pesos)

    expect(draft.items[0]).toMatchObject({
      target: { kind: 'category', id: 'cat-cafe' },
    })
    expect(draft.newCategories).toEqual([])
  })

  it('uses what is pending on the fixed expense when no amount was said', () => {
    const draft = resolve(
      {
        items: [
          item({
            type: 'fixed',
            amount: 0,
            description: 'Rent',
            category: '',
          }),
        ],
      },
      pesos,
    )

    expect(draft.items).toEqual([
      {
        kind: 'fixed',
        fixedId: 'fix-rent',
        amount: 120_000_000,
        description: 'Rent',
        date: '2026-10-15',
      },
    ])
  })

  it('drops items with an invalid amount or unknown type, with a warning', () => {
    const draft = resolve(
      {
        items: [
          item({ amount: 0, description: 'Taxi' }),
          item({ type: 'transfer', description: 'Savings' }),
        ],
      },
      pesos,
    )

    expect(draft.items).toEqual([])
    expect(draft.warnings).toEqual([
      { kind: 'badAmount', label: 'Taxi' },
      { kind: 'unknownType', label: 'Savings' },
    ])
  })

  it('skips a fixed expense that is already paid or does not exist, with a warning', () => {
    const draft = resolve(
      {
        items: [
          item({ type: 'fixed', category: 'Internet', description: '' }),
          item({ type: 'fixed', category: 'Gym', description: '' }),
        ],
      },
      pesos,
    )

    expect(draft.items).toEqual([])
    expect(draft.warnings).toEqual([
      { kind: 'fixedPaid', label: 'Internet' },
      { kind: 'notAFixed', label: 'Gym' },
    ])
  })

  it('uses today when the date is missing or invalid', () => {
    const draft = resolve(
      {
        items: [
          item({ category: 'Food', date: '' }),
          item({ category: 'Food', date: '2026-13-45' }),
        ],
      },
      pesos,
    )

    expect(draft.items.map(i => i.date)).toEqual(['2026-10-16', '2026-10-16'])
  })

  it('turns 4.5 dollars into 450 cents', () => {
    const draft = resolve(
      { items: [item({ amount: 4.5, category: 'Food' })] },
      dollars,
    )

    expect(draft.items[0]).toMatchObject({ amount: 450 })
  })

  it('turns 20000 pesos into 2000000 cents', () => {
    const draft = resolve(
      { items: [item({ amount: 20_000, category: 'Food' })] },
      pesos,
    )

    expect(draft.items[0]).toMatchObject({ amount: 2_000_000 })
  })

  it('warns when the amount is negative or not a number', () => {
    const draft = resolve(
      {
        items: [
          item({ amount: -4.5, description: 'Bread' }),
          item({ amount: '4.50', description: 'Coffee' }),
        ],
      },
      dollars,
    )

    expect(draft.items).toEqual([])
    expect(draft.warnings).toEqual([
      { kind: 'badAmount', label: 'Bread' },
      { kind: 'badAmount', label: 'Coffee' },
    ])
  })
})
