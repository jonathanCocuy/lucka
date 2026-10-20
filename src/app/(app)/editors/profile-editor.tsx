'use client'

import { DayPicker } from '@/components/ui/day-picker'
import field from '@/components/ui/field.module.css'
import { MoneyInput } from '@/components/ui/money-input'
import type { FinanceProfile } from '@/lib/finance/types'
import { NAME_MAX } from '@/lib/finance/validate'
import { usePreferences } from '@/lib/i18n/context'
import styles from './editor.module.css'

interface ProfileEditorProps {
  value: FinanceProfile
  onChange: (value: FinanceProfile) => void
}

export function ProfileEditor({ value, onChange }: ProfileEditorProps) {
  const { t } = usePreferences()
  return (
    <div className={styles.stack}>
      <label className={field.field}>
        <span className={field.label}>{t.profile.name}</span>
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
        label={t.profile.income}
        size="lg"
        value={value.monthlyIncome}
        onChange={monthlyIncome => onChange({ ...value, monthlyIncome })}
      />
      <div className={field.field}>
        <span className={field.label}>{t.profile.payday}</span>
        <DayPicker
          label={t.profile.payday}
          value={value.payday}
          onChange={payday => onChange({ ...value, payday })}
        />
        <span className={styles.hint}>{t.profile.paydayHint}</span>
      </div>
    </div>
  )
}
