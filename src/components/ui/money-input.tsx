'use client'

import { formatNumber } from '@/lib/finance/format'
import styles from './money-input.module.css'

interface MoneyInputProps {
  value: number
  onChange: (value: number) => void
  label?: string
  size?: 'md' | 'lg' | 'hero'
  autoFocus?: boolean
  name?: string
}

// Muestra miles con punto (es-CO) mientras se escribe. Guarda solo el número.
export function MoneyInput({
  value,
  onChange,
  label,
  size = 'md',
  autoFocus,
  name,
}: MoneyInputProps) {
  const text = value ? formatNumber(value) : ''
  return (
    <label className={`${styles.field} ${styles[size]}`}>
      {label && <span className={styles.label}>{label}</span>}
      <span className={styles.control}>
        <span className={styles.prefix}>$</span>
        <input
          name={name}
          inputMode="numeric"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="0"
          // En hero el input crece con la cifra para que el $ quede pegado y centrado.
          size={size === 'hero' ? Math.max(text.length, 1) : undefined}
          value={text}
          onChange={e => onChange(Number(e.target.value.replace(/\D/g, '')))}
        />
      </span>
    </label>
  )
}
