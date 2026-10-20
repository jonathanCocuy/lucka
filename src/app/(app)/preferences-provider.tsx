'use client'

import { useEffect, useRef, useState } from 'react'
import { errorMessage } from '@/lib/api-client/http'
import { loadPreferences, storePreferences } from '@/lib/api-client/preferences'
import { formatMoney, formatShortDate } from '@/lib/finance/format'
import {
  MESSAGES,
  PreferencesContext,
  type PreferencesValue,
} from '@/lib/i18n/context'
import {
  defaultCurrency,
  detectLanguage,
  type Preferences,
} from '@/lib/i18n/locale'

function fromSystem(): Preferences {
  const language = detectLanguage(navigator.languages)
  return { language, currency: defaultCurrency(language) }
}

// Without the database the app still opens: FinanceProvider shows that error.
const read = () =>
  loadPreferences().then(
    saved => saved ?? fromSystem(),
    () => fromSystem(),
  )

export function PreferencesProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  // The latest choice, so a quick second click builds on the first one.
  const latest = useRef<Preferences | null>(null)
  const language = prefs?.language

  const show = (next: Preferences) => {
    latest.current = next
    setPrefs(next)
  }

  useEffect(() => {
    let cancelled = false
    read().then(loaded => {
      if (!cancelled) show(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (language) document.documentElement.lang = language
  }, [language])

  // Nothing renders until the language is known: no flash of the wrong one.
  if (!prefs) return null

  const t = MESSAGES[prefs.language]

  // Shown at once. If saving fails, it goes back.
  const persist = async (next: Preferences) => {
    const before = latest.current
    show(next)
    try {
      await storePreferences(next)
      return null
    } catch (error) {
      if (before) show(before)
      return errorMessage(error, MESSAGES[(before ?? next).language])
    }
  }

  const current = () => latest.current ?? prefs

  const value: PreferencesValue = {
    prefs,
    t,
    money: cents => formatMoney(cents, prefs),
    date: date => formatShortDate(date, prefs.language),
    fixedName: fixed => (fixed.isInvestment ? t.common.investment : fixed.name),
    error: error => errorMessage(error, t),
    setLanguage: next => persist({ ...current(), language: next }),
    setCurrency: next => persist({ ...current(), currency: next }),
    save: () => persist(current()),
    refresh: async () => show(await read()),
  }

  return <PreferencesContext value={value}>{children}</PreferencesContext>
}
