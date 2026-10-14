import { ViewTransition } from 'react'

// Fundido entre el panel y Ajustes.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <ViewTransition>{children}</ViewTransition>
}
