'use client'

import { DayPicker } from '@/components/ui/day-picker'
import field from '@/components/ui/field.module.css'
import { MoneyInput } from '@/components/ui/money-input'
import type { FinanceProfile } from '@/lib/finance/types'
import { NAME_MAX } from '@/lib/finance/validate'
import styles from './editor.module.css'

interface ProfileEditorProps {
  value: FinanceProfile
  onChange: (value: FinanceProfile) => void
}

export function ProfileEditor({ value, onChange }: ProfileEditorProps) {
  return (
    <div className={styles.stack}>
      <label className={field.field}>
        <span className={field.label}>¿Cómo te llamas?</span>
        <input
          className={field.input}
          autoFocus
          maxLength={NAME_MAX}
          autoComplete="given-name"
          value={value.name}
          onChange={e => onChange({ ...value, name: e.target.value })}
        />
      </label>
      <MoneyInput
        label="Ingreso mensual neto"
        size="lg"
        value={value.monthlyIncome}
        onChange={monthlyIncome => onChange({ ...value, monthlyIncome })}
      />
      <div className={field.field}>
        <span className={field.label}>Día en que te pagan</span>
        <DayPicker
          label="Día en que te pagan"
          value={value.payday}
          onChange={payday => onChange({ ...value, payday })}
        />
        <span className={styles.hint}>
          Tu mes va de pago a pago. Si el mes no tiene ese día, se toma el
          último.
        </span>
      </div>
    </div>
  )
}
