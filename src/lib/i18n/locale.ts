export const LANGUAGES = ['en', 'es'] as const
export type Language = (typeof LANGUAGES)[number]

export const CURRENCIES = ['USD', 'COP'] as const
export type Currency = (typeof CURRENCIES)[number]

export interface Preferences {
  language: Language
  currency: Currency
}

// Number and date formats. Colombian Spanish because that's who the app started with.
export const LOCALES: Record<Language, string> = { en: 'en-US', es: 'es-CO' }

// Before the person picks, the first supported language of the system wins.
export function detectLanguage(languages: readonly string[]): Language {
  for (const tag of languages) {
    const base = tag.toLowerCase().split('-')[0]
    if (base === 'es' || base === 'en') return base
  }
  return 'en'
}

export function defaultCurrency(language: Language): Currency {
  return language === 'es' ? 'COP' : 'USD'
}
