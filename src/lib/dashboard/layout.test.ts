import { hide, move, type Layout } from './layout'

const layout: Layout = {
  visible: ['available', 'budgets', 'fixed', 'recent'],
  hidden: [],
}

describe('move', () => {
  it('mover uno antes de otro deja el orden correcto', () => {
    expect(move(layout, 'available', 'fixed').visible).toEqual([
      'budgets',
      'available',
      'fixed',
      'recent',
    ])
    expect(move(layout, 'recent', 'budgets').visible).toEqual([
      'available',
      'recent',
      'budgets',
      'fixed',
    ])
  })
})

describe('hide', () => {
  it('ocultar lo saca de visibles y lo pone en la bandeja', () => {
    expect(hide(layout, 'budgets')).toEqual({
      visible: ['available', 'fixed', 'recent'],
      hidden: ['budgets'],
    })
  })
})
