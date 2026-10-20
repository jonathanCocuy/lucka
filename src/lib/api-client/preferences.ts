import {
  getPreferences,
  hasMovements,
  savePreferences,
} from '@/lib/local-db/preferences'

// Language and currency. The currency lock lives in local-db/preferences.ts.
export const loadPreferences = getPreferences
export const storePreferences = savePreferences
export const recordsExist = hasMovements
