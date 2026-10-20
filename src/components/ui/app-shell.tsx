'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Messages } from '@/lib/i18n/en'
import { usePreferences } from '@/lib/i18n/context'
import styles from './app-shell.module.css'
import { Icon, type IconName } from './icon'
import { Wordmark } from './wordmark'

const NAV: { href: string; label: keyof Messages['nav']; icon: IconName }[] = [
  { href: '/', label: 'dashboard', icon: 'grid' },
  { href: '/settings', label: 'settings', icon: 'settings' },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { t } = usePreferences()
  return (
    <div className={styles.shell}>
      <aside className={styles.side}>
        <Wordmark compact className={styles.brand} />
        <nav className={styles.nav}>
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={styles.link}
              aria-current={pathname === item.href ? 'page' : undefined}
              title={t.nav[item.label]}
            >
              <Icon name={item.icon} size={22} />
              <span className={styles.label}>{t.nav[item.label]}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <div className={styles.content}>{children}</div>
    </div>
  )
}
