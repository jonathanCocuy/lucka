'use client'

import type { DragEvent, ReactNode } from 'react'
import { Icon } from '@/components/ui/icon'
import styles from './widget.module.css'

export interface WidgetEdit {
  dragging: boolean
  over: boolean
  onHide: () => void
  onBack?: () => void
  onForward?: () => void
  onDragStart: () => void
  onDragOver: (e: DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
}

interface WidgetProps {
  title: string
  action?: ReactNode
  edit?: WidgetEdit
  children: ReactNode
}

export function Widget({ title, action, edit, children }: WidgetProps) {
  return (
    <section
      className={styles.widget}
      data-editing={edit ? true : undefined}
      data-dragging={edit?.dragging || undefined}
      data-over={edit?.over || undefined}
      draggable={Boolean(edit)}
      onDragStart={
        edit &&
        (e => {
          e.dataTransfer.effectAllowed = 'move'
          // WebKit no arranca el arrastre si no hay datos.
          e.dataTransfer.setData('text/plain', title)
          edit.onDragStart()
        })
      }
      onDragOver={edit?.onDragOver}
      onDrop={
        edit &&
        (e => {
          e.preventDefault()
          edit.onDrop()
        })
      }
      onDragEnd={edit?.onDragEnd}
    >
      <header className={styles.head}>
        {edit && (
          <span className={styles.grip} aria-hidden>
            <Icon name="grip" size={18} />
          </span>
        )}
        <h2 className={styles.title}>{title}</h2>
        {edit ? (
          <div className={styles.tools}>
            {/* Respaldo de teclado para el arrastre. */}
            <button
              type="button"
              className={styles.tool}
              aria-label={`Mover ${title} antes`}
              disabled={!edit.onBack}
              onClick={edit.onBack}
            >
              <Icon name="arrowUp" size={16} />
            </button>
            <button
              type="button"
              className={styles.tool}
              aria-label={`Mover ${title} después`}
              disabled={!edit.onForward}
              onClick={edit.onForward}
            >
              <Icon name="arrowDown" size={16} />
            </button>
            <button
              type="button"
              className={`${styles.tool} ${styles.hide}`}
              aria-label={`Ocultar ${title}`}
              onClick={edit.onHide}
            >
              <Icon name="minus" size={16} />
            </button>
          </div>
        ) : (
          action
        )}
      </header>
      <div className={styles.body} inert={Boolean(edit)}>
        {children}
      </div>
    </section>
  )
}

export function WidgetAction({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={styles.action}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
