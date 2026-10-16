import { resolve, type ResolveContext } from './resolve'

const ctx: ResolveContext = {
  today: '2026-10-16',
  categories: [
    { id: 'cat-cafe', name: 'Café' },
    { id: 'cat-comida', name: 'Comida' },
  ],
  fixed: [
    { id: 'fix-arriendo', name: 'Arriendo', pending: 1_200_000, isPaid: false },
    { id: 'fix-internet', name: 'Internet', pending: 0, isPaid: true },
  ],
}

const item = (over: Record<string, unknown>) => ({
  type: 'expense',
  amount: 20_000,
  description: 'Algo',
  category: '',
  budget: 0,
  date: '2026-10-15',
  ...over,
})

describe('resolve', () => {
  it('propone una categoría nueva con el presupuesto que dijo, o 0', () => {
    const draft = resolve(
      {
        items: [
          item({ category: 'regalos', budget: 100_000 }),
          item({ category: 'Mascotas' }),
        ],
      },
      ctx,
    )

    expect(draft.newCategories).toEqual([
      { name: 'Regalos', budget: 100_000 },
      { name: 'Mascotas', budget: 0 },
    ])
    expect(draft.items[0]).toMatchObject({
      target: { kind: 'new', name: 'Regalos' },
    })
  })

  it('crea una sola categoría nueva aunque se mencione dos veces', () => {
    const draft = resolve(
      {
        items: [
          item({ category: 'Regalos' }),
          item({ category: 'regalos', budget: 50_000 }),
        ],
      },
      ctx,
    )

    expect(draft.newCategories).toEqual([{ name: 'Regalos', budget: 50_000 }])
    expect(draft.items).toHaveLength(2)
  })

  it('reconoce la categoría sin importar tildes ni mayúsculas', () => {
    const draft = resolve({ items: [item({ category: ' CAFE ' })] }, ctx)

    expect(draft.items[0]).toMatchObject({
      target: { kind: 'category', id: 'cat-cafe' },
    })
    expect(draft.newCategories).toEqual([])
  })

  it('usa lo pendiente del fijo cuando no dijo el monto', () => {
    const draft = resolve(
      {
        items: [
          item({
            type: 'fixed',
            amount: 0,
            description: 'Arriendo',
            category: '',
          }),
        ],
      },
      ctx,
    )

    expect(draft.items).toEqual([
      {
        kind: 'fixed',
        fixedId: 'fix-arriendo',
        amount: 1_200_000,
        description: 'Arriendo',
        date: '2026-10-15',
      },
    ])
  })

  it('descarta ítems con monto inválido o tipo desconocido y avisa', () => {
    const draft = resolve(
      {
        items: [
          item({ amount: 0, description: 'Taxi' }),
          item({ amount: -5_000, description: 'Pan' }),
          item({ type: 'transfer', description: 'Ahorro' }),
        ],
      },
      ctx,
    )

    expect(draft.items).toEqual([])
    expect(draft.warnings).toEqual([
      'No entendí el monto de «Taxi».',
      'No entendí el monto de «Pan».',
      'No entendí qué hacer con «Ahorro».',
    ])
  })

  it('no registra un fijo ya pagado o que no existe y avisa', () => {
    const draft = resolve(
      {
        items: [
          item({ type: 'fixed', category: 'Internet', description: '' }),
          item({ type: 'fixed', category: 'Gimnasio', description: '' }),
        ],
      },
      ctx,
    )

    expect(draft.items).toEqual([])
    expect(draft.warnings).toEqual([
      '«Internet» ya está pagado este ciclo.',
      '«Gimnasio» no es uno de tus gastos fijos.',
    ])
  })

  it('usa la fecha de hoy si no hay fecha o es inválida', () => {
    const draft = resolve(
      {
        items: [
          item({ category: 'Comida', date: '' }),
          item({ category: 'Comida', date: '2026-13-45' }),
        ],
      },
      ctx,
    )

    expect(draft.items.map(i => i.date)).toEqual(['2026-10-16', '2026-10-16'])
  })
})
