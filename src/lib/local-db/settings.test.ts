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
  it('responde 422 si aún no hay perfil guardado', async () => {
    mockDb.select.mockResolvedValueOnce([])

    await expect(completeOnboarding()).rejects.toMatchObject({
      status: 422,
      message: 'Primero guarda tu ingreso',
    })
    expect(mockDb.execute).not.toHaveBeenCalled()
  })

  it('responde 409 si el onboarding ya estaba completo', async () => {
    mockDb.select.mockResolvedValueOnce([
      { ...savedProfile, onboarded_at: '2026-10-01T00:00:00.000Z' },
    ])

    await expect(completeOnboarding()).rejects.toMatchObject({
      status: 409,
      message: 'El onboarding ya está completo',
    })
    expect(mockDb.execute).not.toHaveBeenCalled()
  })
})
