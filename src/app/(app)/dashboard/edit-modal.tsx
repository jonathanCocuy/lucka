'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import type { FinanceData } from '@/lib/finance/types'
import { usePreferences } from '@/lib/i18n/context'
import { CategoryEditor } from '../editors/category-editor'
import { FixedEditor } from '../editors/fixed-editor'
import { InvestmentEditor } from '../editors/investment-editor'
import { ProfileEditor } from '../editors/profile-editor'
import { useFinance } from '../finance-provider'
import styles from './forms.module.css'

export type EditKind = 'fixed' | 'categories' | 'profile'

interface EditModalProps {
  edit: EditKind | null
  onClose: () => void
}

export function EditModal({ edit, onClose }: EditModalProps) {
  const { data } = useFinance()
  const { t } = usePreferences()
  const title = t.editModal[edit ?? 'fixed']
  return (
    <Modal open={edit !== null} onClose={onClose} title={title} wide>
      {edit && data && <EditForm edit={edit} data={data} onClose={onClose} />}
    </Modal>
  )
}

// Local draft: nothing changes on the dashboard until "Save".
function EditForm({
  edit,
  data,
  onClose,
}: {
  edit: EditKind
  data: FinanceData
  onClose: () => void
}) {
  const { setFixed, setCategories, setProfile, setInvestment } = useFinance()
  const { t } = usePreferences()
  const [fixed, setFixedDraft] = useState(data.fixed)
  const [categories, setCategoriesDraft] = useState(data.categories)
  const [profile, setProfileDraft] = useState(data.profile)
  const [investment, setInvestmentDraft] = useState(data.investment)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  const persist = async () => {
    if (edit === 'fixed') {
      return setFixed(
        fixed.filter(f => f.isInvestment || (f.name.trim() && f.amount > 0)),
      )
    }
    if (edit === 'categories') {
      return setCategories(categories.filter(c => c.name.trim()))
    }
    return (await setProfile(profile)) ?? setInvestment(investment)
  }

  const save = (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    startSaving(async () => {
      const failed = await persist()
      if (failed) setError(failed)
      else onClose()
    })
  }

  return (
    <form className={styles.form} onSubmit={save}>
      {edit === 'fixed' && (
        <FixedEditor items={fixed} onChange={setFixedDraft} />
      )}
      {edit === 'categories' && (
        <CategoryEditor items={categories} onChange={setCategoriesDraft} />
      )}
      {edit === 'profile' && (
        <>
          <ProfileEditor value={profile} onChange={setProfileDraft} />
          <InvestmentEditor value={investment} onChange={setInvestmentDraft} />
        </>
      )}
      {error && <p className={styles.error}>{error}</p>}

      <Button
        type="submit"
        block
        disabled={
          saving ||
          (edit === 'profile' &&
            (profile.monthlyIncome <= 0 || !profile.name.trim()))
        }
      >
        {saving ? t.common.saving : t.common.save}
      </Button>
    </form>
  )
}
