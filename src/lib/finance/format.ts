import { LOCALES, type Language, type Preferences } from '@/lib/i18n/locale'

// Amounts are cents. Separators follow the language; decimals follow the currency.

const DECIMAL: Record<Language, string> = { en: '.', es: ',' }

const formatters = new Map<string, Intl.NumberFormat>()

function numberFormat(language: Language, options: Intl.NumberFormatOptions) {
  const key = `${language}:${JSON.stringify(options)}`
  let format = formatters.get(key)
  if (!format) {
    format = new Intl.NumberFormat(LOCALES[language], options)
    formatters.set(key, format)
  }
  return format
}

// COP has no cents in practice. USD shows them only when there are some.
function fractionDigits(cents: number, { currency }: Preferences) {
  return currency === 'USD' && cents % 100 !== 0 ? 2 : 0
}

export function formatMoney(cents: number, prefs: Preferences) {
  const digits = fractionDigits(cents, prefs)
  return numberFormat(prefs.language, {
    style: 'currency',
    currency: prefs.currency,
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(cents / 100)
}

const group = (units: number, language: Language) =>
  numberFormat(language, { maximumFractionDigits: 0 }).format(units)

// The number inside a money input, without the symbol.
export function formatAmount(cents: number, prefs: Preferences) {
  const units = Math.floor(cents / 100)
  if (fractionDigits(cents, prefs) === 0) {
    return group(Math.round(cents / 100), prefs.language)
  }
  const rest = String(cents % 100).padStart(2, '0')
  return `${group(units, prefs.language)}${DECIMAL[prefs.language]}${rest}`
}

// Cleans what's being typed but keeps a trailing decimal mark, so "4." can become "4.5".
export function typedAmount(text: string, prefs: Preferences) {
  const decimal = DECIMAL[prefs.language]
  const at = text.indexOf(decimal)
  const whole = (at === -1 ? text : text.slice(0, at)).replace(/\D/g, '')
  const grouped = whole ? group(Number(whole), prefs.language) : ''
  if (prefs.currency === 'COP' || at === -1) return grouped
  const fraction = text
    .slice(at + 1)
    .replace(/\D/g, '')
    .slice(0, 2)
  return `${grouped || '0'}${decimal}${fraction}`
}

export function parseAmount(text: string, prefs: Preferences) {
  const [whole, fraction = ''] = text.split(DECIMAL[prefs.language])
  const units = Number(whole.replace(/\D/g, '') || 0)
  if (prefs.currency === 'COP') return units * 100
  const cents = Number(`${fraction.replace(/\D/g, '')}00`.slice(0, 2))
  return units * 100 + cents
}

export function formatShortDate(date: Date, language: Language) {
  return new Intl.DateTimeFormat(LOCALES[language], {
    day: 'numeric',
    month: 'short',
  })
    .format(date)
    .replace('.', '')
}

export function formatSize(bytes: number, language: Language) {
  const gb = bytes / 1_000_000_000
  return gb >= 1
    ? `${numberFormat(language, { maximumFractionDigits: 1 }).format(gb)} GB`
    : `${Math.round(bytes / 1_000_000)} MB`
}
