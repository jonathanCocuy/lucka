'use client'

import Link from 'next/link'
import reveal from '@/components/ui/reveal.module.css'
import styles from './settings.module.css'

export function Settings() {
  return (
    <main className={styles.page}>
      <header className={reveal.reveal}>
        <p className={styles.eyebrow}>Ajustes</p>
        <h1 className={styles.title}>Tus datos</h1>
      </header>
      <p className={styles.back}>
        <Link href="/">Volver</Link>
      </p>
    </main>
  )
}
