'use client'

import styles from './day-picker.module.css'

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

interface DayPickerProps {
  value: number
  onChange: (day: number) => void
  label: string
}

// A 1-31 grid instead of a number input: one click, and the number is always visible.
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
