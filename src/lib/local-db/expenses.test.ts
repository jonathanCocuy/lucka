import { removeExpense } from './expenses'

const mockDb = { execute: jest.fn(), select: jest.fn() }
jest.mock('@tauri-apps/plugin-sql', () => ({
  __esModule: true,
  default: { load: () => Promise.resolve(mockDb) },
}))

describe('removeExpense', () => {
  it('responde 404 si el gasto no existe', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 0 })

    await expect(removeExpense('no-existe')).rejects.toMatchObject({
      status: 404,
      message: 'Gasto no encontrado',
    })
  })
})
