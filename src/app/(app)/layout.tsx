import { ViewTransition } from 'react'
import { PreferencesProvider } from './preferences-provider'
import { UpdateBanner } from './update-banner'

// Cross-fade between the dashboard and Settings.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PreferencesProvider>
      <ViewTransition>{children}</ViewTransition>
      <UpdateBanner />
    </PreferencesProvider>
  )
}
