'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Progress } from '@/components/ui/progress'
import { Wordmark } from '@/components/ui/wordmark'
import { syncInvestmentFixed, unassigned } from '@/lib/finance/calc'
import type {
  Category,
  FinanceProfile,
  FixedExpense,
  Investment,
} from '@/lib/finance/types'
import { usePreferences } from '@/lib/i18n/context'
import { CategoryEditor } from '../editors/category-editor'
import { FixedEditor } from '../editors/fixed-editor'
import { InvestmentEditor } from '../editors/investment-editor'
import { PreferencesEditor } from '../editors/preferences-editor'
import { ProfileEditor } from '../editors/profile-editor'
import { useFinance } from '../finance-provider'
import styles from './onboarding.module.css'

const STEPS = [
  'preferences',
  'income',
  'fixed',
  'categories',
  'investments',
  'recap',
] as const

const cleanFixed = (items: FixedExpense[]) =>
  items.filter(f => f.isInvestment || (f.name.trim() && f.amount > 0))
const cleanCategories = (items: Category[]) => items.filter(c => c.name.trim())

export function Onboarding() {
  const finance = useFinance()
  const prefs = usePreferences()
  const { t } = prefs
  const saved = finance.draft
  const [index, setIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()
  // Starts from what's saved: reload halfway and you pick up where you left off.
  const [profile, setProfile] = useState<FinanceProfile>(
    saved?.profile ?? { name: '', monthlyIncome: 0, payday: 30 },
  )
  const [fixed, setFixed] = useState<FixedExpense[]>(saved?.fixed ?? [])
  const [categories, setCategories] = useState<Category[]>(
    saved?.categories ?? [],
  )
  const [investment, setInvestment] = useState<Investment>(
    saved?.investment ?? {
      hasInvestments: false,
      monthlyContribution: 0,
      totalBalance: 0,
    },
  )

  const step = STEPS[index]

  // Each step saves when you move on. The last one finishes the onboarding.
  const saveStep = () => {
    if (step === 'preferences') return prefs.save()
    if (step === 'income') return finance.setProfile(profile)
    if (step === 'fixed') return finance.setFixed(cleanFixed(fixed))
    if (step === 'categories') {
      return finance.setCategories(cleanCategories(categories))
    }
    if (step === 'investments') return finance.setInvestment(investment)
    return finance.complete()
  }

  const draft = {
    profile,
    fixed: syncInvestmentFixed(cleanFixed(fixed), investment),
    categories: cleanCategories(categories),
    investment,
  }
  const current = t.onboarding.steps[step]
  const isLast = index === STEPS.length - 1
  const canContinue =
    step !== 'income' ||
    (profile.name.trim() !== '' && profile.monthlyIncome > 0)

  return (
    <main className={styles.page}>
      <header className={styles.top}>
        <Wordmark />
        <ol className={styles.steps}>
          {STEPS.map((id, i) => (
            <li
              key={id}
              className={styles.step}
              data-state={i === index ? 'current' : i < index ? 'done' : 'next'}
            >
              <span className={styles.stepDot}>
                {i < index ? (
                  <Icon name="check" size={12} strokeWidth={3} />
                ) : (
                  i + 1
                )}
              </span>
              <span className={styles.stepLabel}>
                {t.onboarding.steps[id].label}
              </span>
            </li>
          ))}
        </ol>
        <p className={styles.hello}>
          {t.onboarding.hello(profile.name.trim())}
        </p>
      </header>

      <section className={styles.content}>
        <Progress
          className={styles.progress}
          value={(index + 1) / STEPS.length}
        />

        <form
          key={step}
          className={styles.form}
          onSubmit={e => {
            e.preventDefault()
            if (!canContinue || saving) return
            startSaving(async () => {
              const failed = await saveStep()
              setError(failed)
              if (!failed && !isLast) setIndex(index + 1)
            })
          }}
        >
          <div className={styles.heading}>
            <p className={styles.eyebrow}>
              {t.onboarding.stepOf(index + 1, STEPS.length)}
            </p>
            <h1 className={styles.title}>{current.title}</h1>
            <p className={styles.hint}>{current.hint}</p>
          </div>

          <div className={styles.body}>
            {step === 'preferences' && <PreferencesEditor />}
            {step === 'income' && (
              <ProfileEditor value={profile} onChange={setProfile} />
            )}
            {step === 'fixed' && (
              <FixedEditor items={fixed} onChange={setFixed} />
            )}
            {step === 'categories' && (
              <CategoryEditor items={categories} onChange={setCategories} />
            )}
            {step === 'investments' && (
              <InvestmentEditor value={investment} onChange={setInvestment} />
            )}
            {step === 'recap' && <Recap draft={draft} />}
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <footer className={styles.footer}>
            <Button
              type="button"
              variant="ghost"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
            >
              <Icon name="chevronLeft" size={18} /> {t.onboarding.back}
            </Button>
            <Button type="submit" disabled={!canContinue || saving}>
              {saving
                ? t.common.saving
                : isLast
                  ? t.onboarding.start
                  : t.onboarding.next}
              {!saving && <Icon name="chevronRight" size={18} />}
            </Button>
          </footer>
        </form>
      </section>
    </main>
  )
}

function Recap({ draft }: { draft: Parameters<typeof unassigned>[0] }) {
  const { t, money } = usePreferences()
  const copy = t.onboarding.recap
  const fixedTotal = draft.fixed.reduce((sum, f) => sum + f.amount, 0)
  const budgetTotal = draft.categories.reduce((sum, c) => sum + c.budget, 0)
  const free = unassigned(draft)
  const rows = [
    [
      copy.income,
      draft.profile.monthlyIncome,
      copy.payday(draft.profile.payday),
    ],
    [copy.fixed, -fixedTotal, copy.fixedCount(draft.fixed.length)],
    [copy.budgets, -budgetTotal, copy.categoryCount(draft.categories.length)],
  ] as const

  return (
    <div className={styles.recap}>
      {rows.map(([label, amount, note]) => (
        <div key={label} className={styles.recapRow}>
          <span className={styles.recapLabel}>
            {label}
            <small>{note}</small>
          </span>
          <span className={styles.recapAmount}>{money(amount)}</span>
        </div>
      ))}
      <div className={`${styles.recapRow} ${styles.recapTotal}`}>
        <span className={styles.recapLabel}>
          {copy.unassigned}
          <small>{free < 0 ? copy.overIncome : copy.margin}</small>
        </span>
        <span
          className={styles.recapAmount}
          data-negative={free < 0 || undefined}
        >
          {money(free)}
        </span>
      </div>
      {draft.investment.hasInvestments && (
        <p className={styles.hint}>
          {copy.investments(money(draft.investment.totalBalance))}
        </p>
      )}
    </div>
  )
}
