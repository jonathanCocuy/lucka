import { savePreferences } from './preferences'

const mockDb = { execute: jest.fn(), select: jest.fn() }
jest.mock('@tauri-apps/plugin-sql', () => ({
  __esModule: true,
  default: { load: () => Promise.resolve(mockDb) },
}))

const saved = { language: 'es', currency: 'COP' }

describe('savePreferences', () => {
  it('throws 409 when the currency changes and there are records', async () => {
    mockDb.select
      .mockResolvedValueOnce([saved])
      .mockResolvedValueOnce([{ found: 1 }])

    await expect(
      savePreferences({ language: 'es', currency: 'USD' }),
    ).rejects.toMatchObject({ status: 409, code: 'currencyLocked' })
    expect(mockDb.execute).not.toHaveBeenCalled()
  })

  it('saves the new currency when there are no records', async () => {
    mockDb.select
      .mockResolvedValueOnce([saved])
      .mockResolvedValueOnce([{ found: 0 }])

    await savePreferences({ language: 'es', currency: 'USD' })

    expect(mockDb.execute).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO preferences'),
      ['es', 'USD'],
    )
  })
})
