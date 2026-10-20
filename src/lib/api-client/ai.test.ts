import { invoke } from '@tauri-apps/api/core'
import { en } from '@/lib/i18n/en'
import { stopRecording } from './ai'
import { errorMessage } from './http'

jest.mock('@tauri-apps/api/core', () => ({ invoke: jest.fn() }))
jest.mock('@tauri-apps/api/event', () => ({ listen: jest.fn() }))
jest.mock('@/lib/local-db/ai-providers')

describe('errors from Rust', () => {
  it('shows the text for a known code, with the provider name', async () => {
    jest
      .mocked(invoke)
      .mockRejectedValueOnce({ code: 'keyRejected', provider: 'OpenAI' })

    const error = await stopRecording('en').catch((e: unknown) => e)

    expect(errorMessage(error, en)).toBe(
      'OpenAI rejected the key. Check that it was copied right and is active.',
    )
  })

  it('shows the generic message for an unknown code', async () => {
    jest.mocked(invoke).mockRejectedValueOnce({ code: 'somethingNew' })

    const error = await stopRecording('en').catch((e: unknown) => e)

    expect(errorMessage(error, en)).toBe('Something went wrong. Try again.')
  })
})
