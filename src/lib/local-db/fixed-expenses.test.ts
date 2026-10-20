import { clearPayments } from './fixed-expenses'

const mockDb = { execute: jest.fn(), select: jest.fn() }
jest.mock('@tauri-apps/plugin-sql', () => ({
  __esModule: true,
  default: { load: () => Promise.resolve(mockDb) },
}))

describe('clearPayments', () => {
  it('throws 404 and deletes no payments when the fixed expense does not exist', async () => {
    mockDb.select.mockResolvedValueOnce([])

    await expect(
      clearPayments('missing', '2026-10-15', '2026-11-15'),
    ).rejects.toMatchObject({
      status: 404,
      code: 'fixedNotFound',
    })
    expect(mockDb.execute).not.toHaveBeenCalled()
  })
})
