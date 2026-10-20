import { completeOnboarding } from './settings'

const mockDb = { execute: jest.fn(), select: jest.fn() }
jest.mock('@tauri-apps/plugin-sql', () => ({
  __esModule: true,
  default: { load: () => Promise.resolve(mockDb) },
}))

const savedProfile = {
  name: 'Ana',
  monthly_income: 1_000_000,
  payday: 15,
}

describe('completeOnboarding', () => {
  it('throws 422 when no profile is saved yet', async () => {
    mockDb.select.mockResolvedValueOnce([])

    await expect(completeOnboarding()).rejects.toMatchObject({
      status: 422,
      code: 'saveIncomeFirst',
    })
    expect(mockDb.execute).not.toHaveBeenCalled()
  })

  it('throws 409 when the onboarding is already complete', async () => {
    mockDb.select.mockResolvedValueOnce([
      { ...savedProfile, onboarded_at: '2026-10-01T00:00:00.000Z' },
    ])

    await expect(completeOnboarding()).rejects.toMatchObject({
      status: 409,
      code: 'onboardingDone',
    })
    expect(mockDb.execute).not.toHaveBeenCalled()
  })
})
