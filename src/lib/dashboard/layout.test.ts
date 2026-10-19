import { hide, move, snapSize, type Layout } from './layout'

const layout: Layout = {
  visible: ['available', 'budgets', 'fixed', 'recent'],
  hidden: [],
  sizes: {},
}

describe('move', () => {
  it('moving one before another leaves the right order', () => {
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
  it('hiding takes it out of the visible list and into the tray', () => {
    expect(hide(layout, 'budgets')).toEqual({
      visible: ['available', 'fixed', 'recent'],
      hidden: ['budgets'],
      sizes: {},
    })
  })
})

describe('snapSize', () => {
  it('dragging past the grid snaps to 1/3 or the full row', () => {
    expect(snapSize(0)).toBe('third')
    expect(snapSize(-3)).toBe('third')
    expect(snapSize(9)).toBe('full')
  })
})
