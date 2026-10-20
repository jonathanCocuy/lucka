'use client'

import { useState } from 'react'
import field from '@/components/ui/field.module.css'
import { formatMoney } from '@/lib/finance/format'
import { usePreferences } from '@/lib/i18n/context'
import { CURRENCIES, LANGUAGES } from '@/lib/i18n/locale'
import styles from './editor.module.css'

// The same amount in both: it shows how separators and cents look.
const SAMPLE = { USD: 124_050, COP: 124_000_000 } as const

// Saves on every click: the whole app switches language at once.
export function PreferencesEditor({ currencyLocked = false }) {
  const { prefs, t, setLanguage, setCurrency } = usePreferences()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className={styles.stack}>
      <div className={field.field}>
        <span className={field.label}>{t.preferences.language}</span>
        <div
          className={styles.toggle}
          role="radiogroup"
          aria-label={t.preferences.language}
        >
          {LANGUAGES.map(language => (
            <button
              key={language}
              type="button"
              role="radio"
              lang={language}
              aria-checked={prefs.language === language}
              className={styles.toggleOption}
              onClick={async () => setError(await setLanguage(language))}
            >
              {t.preferences.languages[language]}
            </button>
          ))}
        </div>
      </div>

      <div className={field.field}>
        <span className={field.label}>{t.preferences.currency}</span>
        <div
          className={styles.toggle}
          role="radiogroup"
          aria-label={t.preferences.currency}
        >
          {CURRENCIES.map(currency => (
            <button
              key={currency}
              type="button"
              role="radio"
              aria-checked={prefs.currency === currency}
              disabled={currencyLocked}
              className={styles.toggleOption}
              onClick={async () => setError(await setCurrency(currency))}
            >
              {t.preferences.currencies[currency]} ({currency})
            </button>
          ))}
        </div>
        <span className={styles.hint}>
          {currencyLocked
            ? t.settings.currencyLocked(prefs.currency)
            : t.preferences.sample(formatMoney(SAMPLE[prefs.currency], prefs))}
        </span>
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
