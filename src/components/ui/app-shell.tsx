'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './app-shell.module.css'
import { Icon, type IconName } from './icon'
import { Wordmark } from './wordmark'

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: '/', label: 'Panel', icon: 'grid' },
  { href: '/settings', label: 'Ajustes', icon: 'settings' },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
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
              title={item.label}
            >
              <Icon name={item.icon} size={22} />
              <span className={styles.label}>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
      <div className={styles.content}>{children}</div>
    </div>
  )
}
