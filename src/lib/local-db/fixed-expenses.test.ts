import { clearPayments } from './fixed-expenses'

const mockDb = { execute: jest.fn(), select: jest.fn() }
jest.mock('@tauri-apps/plugin-sql', () => ({
  __esModule: true,
  default: { load: () => Promise.resolve(mockDb) },
}))

describe('clearPayments', () => {
  it('responde 404 y no borra pagos si el fijo no existe', async () => {
    mockDb.select.mockResolvedValueOnce([])

    await expect(
      clearPayments('no-existe', '2026-10-15', '2026-11-15'),
    ).rejects.toMatchObject({
      status: 404,
      message: 'Gasto fijo no encontrado',
    })
    expect(mockDb.execute).not.toHaveBeenCalled()
  })
})
