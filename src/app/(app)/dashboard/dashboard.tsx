'use client'

import { useRef, useState, type ReactNode } from 'react'
import { AppShell } from '@/components/ui/app-shell'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import {
  hide,
  loadLayout,
  move,
  nextSize,
  resize,
  saveLayout,
  show,
  sizeOf,
  snapSize,
  type Layout,
  type WidgetId,
} from '@/lib/dashboard/layout'
import type { ExpenseTarget } from '@/lib/finance/types'
import { formatShortDate } from '@/lib/finance/format'
import { useFinance } from '../finance-provider'
import { VoiceButton } from '../voice/voice-button'
import { AvailablePanel } from './available-panel'
import { BudgetPanel } from './budget-panel'
import styles from './dashboard.module.css'
import { EditModal, type EditKind } from './edit-modal'
import { FixedPanel } from './fixed-panel'
import { MovementsModal } from './movements-modal'
import { OverBudgetModal } from './over-budget-modal'
import { RecentPanel } from './recent-panel'
import { RegisterModal } from './register-modal'
import { Widget, WidgetAction, type WidgetEdit } from './widget'

type Open =
  | { kind: 'add'; target?: ExpenseTarget }
  | { kind: 'movements' | 'over' }
  | { kind: 'edit'; edit: EditKind }
  | null

const TITLES: Record<WidgetId, string> = {
  available: 'Disponible',
  budgets: 'Presupuestos',
  fixed: 'Gastos fijos',
  recent: 'Últimos movimientos',
}

export function Dashboard() {
  const { data, summary } = useFinance()
  const [open, setOpen] = useState<Open>(null)
  const [layout, setLayout] = useState<Layout>(loadLayout)
  // Borrador mientras se personaliza. null = modo normal.
  const [draft, setDraft] = useState<Layout | null>(null)
  const [dragging, setDragging] = useState<WidgetId | null>(null)
  const [over, setOver] = useState<WidgetId | null>(null)
  const [resizing, setResizing] = useState<WidgetId | null>(null)
  const grid = useRef<HTMLElement>(null)
  if (!data || !summary) return null

  const close = () => setOpen(null)
  const edit = (kind: EditKind) => setOpen({ kind: 'edit', edit: kind })
  const current = draft ?? layout
  const { cycle } = summary
  const lastDay = new Date(cycle.end)
  lastDay.setDate(lastDay.getDate() - 1)

  const finish = () => {
    if (draft) {
      setLayout(draft)
      saveLayout(draft)
    }
    setDraft(null)
  }

  const content: Record<WidgetId, { body: ReactNode; action?: ReactNode }> = {
    available: {
      body: <AvailablePanel summary={summary} />,
      action: (
        <WidgetAction label="Editar ingreso" onClick={() => edit('profile')}>
          <Icon name="pencil" size={16} />
        </WidgetAction>
      ),
    },
    budgets: {
      body: (
        <BudgetPanel
          summary={summary}
          onOver={() => setOpen({ kind: 'over' })}
          onAdd={id =>
            setOpen({ kind: 'add', target: { kind: 'category', id } })
          }
        />
      ),
      action: (
        <WidgetAction
          label="Editar presupuestos"
          onClick={() => edit('categories')}
        >
          <Icon name="pencil" size={16} />
        </WidgetAction>
      ),
    },
    fixed: {
      body: <FixedPanel summary={summary} />,
      action: (
        <WidgetAction label="Editar gastos fijos" onClick={() => edit('fixed')}>
          <Icon name="pencil" size={16} />
        </WidgetAction>
      ),
    },
    recent: {
      body: (
        <RecentPanel
          summary={summary}
          data={data}
          onMore={() => setOpen({ kind: 'movements' })}
        />
      ),
    },
  }

  // Al soltar: si viene de antes, cae después del destino; si viene de después, antes.
  const drop = (target: WidgetId) => {
    if (!draft || !dragging || dragging === target) return
    const { visible } = draft
    const from = visible.indexOf(dragging)
    const to = visible.indexOf(target)
    const before = from < to ? (visible[to + 1] ?? null) : target
    setDraft(move(draft, dragging, before))
  }

  // px arrastrados → columnas de la grilla de 6 → paso más cercano.
  const resizeTo = (id: WidgetId, width: number) => {
    if (!draft || !grid.current) return
    const gap = parseFloat(getComputedStyle(grid.current).columnGap) || 0
    const column = (grid.current.clientWidth - gap * 5) / 6
    const size = snapSize((width + gap) / (column + gap))
    if (size !== sizeOf(draft, id)) setDraft(resize(draft, id, size))
  }

  const editProps = (id: WidgetId, index: number): WidgetEdit | undefined => {
    if (!draft) return undefined
    const { visible } = draft
    const prev = visible[index - 1]
    const next = visible[index + 1]
    return {
      dragging: dragging === id,
      over: over === id && dragging !== id,
      resizing: resizing === id,
      onHide: () => setDraft(hide(draft, id)),
      onBack: prev ? () => setDraft(move(draft, id, prev)) : undefined,
      onForward: next ? () => setDraft(move(draft, next, id)) : undefined,
      onDragStart: () => setDragging(id),
      onDragOver: e => {
        e.preventDefault()
        if (over !== id) setOver(id)
      },
      onDrop: () => drop(id),
      onDragEnd: () => {
        setDragging(null)
        setOver(null)
      },
      onResize: width => resizeTo(id, width),
      onResizeStart: () => setResizing(id),
      onResizeEnd: () => setResizing(null),
      onCycleSize: () =>
        setDraft(resize(draft, id, nextSize(sizeOf(draft, id)))),
    }
  }

  return (
    <AppShell>
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <h1 className={styles.title}>Hola, {data.profile.name}</h1>
            <p className={styles.cycle}>
              {formatShortDate(cycle.start)} – {formatShortDate(lastDay)} ·{' '}
              <strong>
                {summary.daysToPayday === 1
                  ? 'mañana te pagan'
                  : `${summary.daysToPayday} días para tu pago`}
              </strong>
            </p>
          </div>
          <div className={styles.actions}>
            {draft ? (
              <Button type="button" onClick={finish}>
                <Icon name="check" size={18} /> Listo
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setDraft(layout)}
                >
                  <Icon name="layout" size={18} /> Personalizar
                </Button>
                <Button type="button" onClick={() => setOpen({ kind: 'add' })}>
                  <Icon name="plus" size={18} /> Registrar
                </Button>
              </>
            )}
          </div>
        </header>

        {current.visible.length > 0 ? (
          <main ref={grid} className={styles.grid}>
            {current.visible.map((id, index) => (
              <Widget
                key={id}
                title={TITLES[id]}
                action={content[id].action}
                size={sizeOf(current, id)}
                edit={editProps(id, index)}
              >
                {content[id].body}
              </Widget>
            ))}
          </main>
        ) : (
          <div className={styles.empty}>
            <p>Tu panel está vacío.</p>
            {!draft && (
              <Button
                type="button"
                variant="soft"
                onClick={() => setDraft(layout)}
              >
                Personalizar
              </Button>
            )}
          </div>
        )}

        {draft && (
          <section className={styles.tray} aria-label="Widgets ocultos">
            <p>
              {draft.hidden.length > 0
                ? 'Toca para agregar al panel'
                : 'Arrastra las tarjetas para ordenarlas. Con − las ocultas.'}
            </p>
            <div className={styles.trayItems}>
              {draft.hidden.map(id => (
                <button
                  key={id}
                  type="button"
                  className={styles.trayItem}
                  onClick={() => setDraft(show(draft, id))}
                >
                  <Icon name="plus" size={16} /> {TITLES[id]}
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <RegisterModal
        open={open?.kind === 'add'}
        initialTarget={open?.kind === 'add' ? open.target : undefined}
        onClose={close}
      />
      <MovementsModal open={open?.kind === 'movements'} onClose={close} />
      <OverBudgetModal open={open?.kind === 'over'} onClose={close} />
      <EditModal
        edit={open?.kind === 'edit' ? open.edit : null}
        onClose={close}
      />
      {/* Fuera del modo personalizar: estorba al mover widgets. */}
      {!draft && <VoiceButton />}
    </AppShell>
  )
}
