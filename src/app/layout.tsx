import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { en } from '@/lib/i18n/en'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
})

export const metadata: Metadata = {
  title: 'Lucka',
  description: en.meta.description,
}

// `lang` changes at runtime with the saved language (preferences-provider.tsx).
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  )
}
