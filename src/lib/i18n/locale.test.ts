import { detectLanguage } from './locale'

describe('detectLanguage', () => {
  it('picks Spanish for es-CO', () => {
    expect(detectLanguage(['es-CO', 'en-US'])).toBe('es')
  })

  it('picks English for en-GB and for an unsupported language like fr', () => {
    expect(detectLanguage(['en-GB'])).toBe('en')
    expect(detectLanguage(['fr'])).toBe('en')
  })
})
