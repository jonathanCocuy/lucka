'use client'

import { useState } from 'react'
import { formatAmount, parseAmount, typedAmount } from '@/lib/finance/format'
import { usePreferences } from '@/lib/i18n/context'
import styles from './money-input.module.css'

interface MoneyInputProps {
  // Cents.
  value: number
  onChange: (value: number) => void
  label?: string
  size?: 'md' | 'lg' | 'hero'
  autoFocus?: boolean
  name?: string
}

// Groups thousands while typing. Saves only the number, in cents.
export function MoneyInput({
  value,
  onChange,
  label,
  size = 'md',
  autoFocus,
  name,
}: MoneyInputProps) {
  const { prefs } = usePreferences()
  const [typed, setTyped] = useState('')
  // What was typed wins while it still means the value ("4." is 4). If the value
  // changed from outside (a reset, another currency), the value wins.
  const text =
    parseAmount(typed, prefs) === value
      ? typed
      : value
        ? formatAmount(value, prefs)
        : ''

  return (
    <label className={`${styles.field} ${styles[size]}`}>
      {label && <span className={styles.label}>{label}</span>}
      <span className={styles.control}>
        <span className={styles.prefix}>$</span>
        <input
          name={name}
          inputMode={prefs.currency === 'USD' ? 'decimal' : 'numeric'}
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="0"
          // In hero size the input grows with the number so the $ stays attached and centered.
          size={size === 'hero' ? Math.max(text.length, 1) : undefined}
          value={text}
          onChange={e => {
            const next = typedAmount(e.target.value, prefs)
            setTyped(next)
            onChange(parseAmount(next, prefs))
          }}
        />
      </span>
    </label>
  )
}
