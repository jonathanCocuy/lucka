import { ViewTransition } from 'react'
import { UpdateBanner } from './update-banner'

// Fundido entre el panel y Ajustes.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ViewTransition>{children}</ViewTransition>
      <UpdateBanner />
    </>
  )
}
