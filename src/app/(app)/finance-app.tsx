'use client'

import { Dashboard } from './dashboard/dashboard'
import { useFinance } from './finance-provider'
import { Onboarding } from './onboarding/onboarding'

// No finished onboarding, no dashboard → onboarding.
export function FinanceApp() {
  const { data, ready, loadError } = useFinance()
  // Loading: never flash the onboarding at someone who already has data.
  if (!ready) return null
  if (loadError) return <p role="alert">{loadError}</p>
  return data ? <Dashboard /> : <Onboarding />
}
