import { removeIncome } from './incomes'

const mockDb = { execute: jest.fn(), select: jest.fn() }
jest.mock('@tauri-apps/plugin-sql', () => ({
  __esModule: true,
  default: { load: () => Promise.resolve(mockDb) },
}))

describe('removeIncome', () => {
  it('throws 404 when the income does not exist', async () => {
    mockDb.execute.mockResolvedValueOnce({ rowsAffected: 0 })

    await expect(removeIncome('no-existe')).rejects.toMatchObject({
      status: 404,
      message: 'Ingreso no encontrado',
    })
  })
})
