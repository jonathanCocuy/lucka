'use client'

import { createContext, useContext } from 'react'
import { en, type Messages } from './en'
import { es } from './es'
import type { Currency, Language, Preferences } from './locale'

export const MESSAGES: Record<Language, Messages> = { en, es }

export interface PreferencesValue {
  prefs: Preferences
  t: Messages
  money: (cents: number) => string
  date: (date: Date) => string
  // The investment fixed expense shows translated, not by its stored name.
  fixedName: (fixed: { name: string; isInvestment?: boolean }) => string
  // Any error → text in the current language.
  error: (error: unknown) => string
  // Each returns the error to show, or null if it saved.
  setLanguage: (language: Language) => Promise<string | null>
  setCurrency: (currency: Currency) => Promise<string | null>
  save: () => Promise<string | null>
  // Reads them again, e.g. after importing a backup.
  refresh: () => Promise<void>
}

export const PreferencesContext = createContext<PreferencesValue | null>(null)

export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences outside PreferencesProvider')
  return ctx
}
