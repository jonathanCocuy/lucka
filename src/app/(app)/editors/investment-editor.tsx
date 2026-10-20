'use client'

import { MoneyInput } from '@/components/ui/money-input'
import type { Investment } from '@/lib/finance/types'
import { usePreferences } from '@/lib/i18n/context'
import styles from './editor.module.css'

interface InvestmentEditorProps {
  value: Investment
  onChange: (value: Investment) => void
}

export function InvestmentEditor({ value, onChange }: InvestmentEditorProps) {
  const { t } = usePreferences()
  const copy = t.investmentEditor
  return (
    <div className={styles.stack}>
      <div className={styles.toggle} role="radiogroup" aria-label={copy.label}>
        {[true, false].map(option => (
          <button
            key={String(option)}
            type="button"
            role="radio"
            aria-checked={value.hasInvestments === option}
            className={styles.toggleOption}
            onClick={() => onChange({ ...value, hasInvestments: option })}
          >
            {option ? copy.yes : copy.no}
          </button>
        ))}
      </div>
      {value.hasInvestments && (
        <div className={styles.pair}>
          <MoneyInput
            label={copy.contribution}
            value={value.monthlyContribution}
            onChange={monthlyContribution =>
              onChange({ ...value, monthlyContribution })
            }
          />
          <MoneyInput
            label={copy.balance}
            value={value.totalBalance}
            onChange={totalBalance => onChange({ ...value, totalBalance })}
          />
          <p className={styles.hint}>{copy.hint}</p>
        </div>
      )}
    </div>
  )
}
