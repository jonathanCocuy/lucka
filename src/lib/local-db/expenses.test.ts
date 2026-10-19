import { removeExpense } from './expenses'

const mockDb = { execute: jest.fn(), select: jest.fn() }
jest.mock('@tauri-apps/plugin-sql', () => ({
  __esModule: true,
  default: { load: () => Promise.resolve(mockDb) },
}))

describe('removeExpense', () => {
  it('throws 404 when the expense does not exist', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 0 })

    await expect(removeExpense('no-existe')).rejects.toMatchObject({
      status: 404,
      message: 'Gasto no encontrado',
    })
  })
})
