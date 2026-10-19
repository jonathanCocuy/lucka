import { ViewTransition } from 'react'
import { UpdateBanner } from './update-banner'

// Cross-fade between the dashboard and Settings.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ViewTransition>{children}</ViewTransition>
      <UpdateBanner />
    </>
  )
}
