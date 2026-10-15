'use client'

import styles from './day-picker.module.css'

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

interface DayPickerProps {
  value: number
  onChange: (day: number) => void
  label: string
}

// Grid 1-31 en vez de input numérico: un clic y el número siempre se ve.
export function DayPicker({ value, onChange, label }: DayPickerProps) {
  return (
    <div className={styles.grid} role="radiogroup" aria-label={label}>
      {DAYS.map(day => (
        <button
          key={day}
          type="button"
          role="radio"
          aria-checked={day === value}
          className={styles.day}
          onClick={() => onChange(day)}
        >
          {day}
        </button>
      ))}
    </div>
  )
}
