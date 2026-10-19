'use client'

import { useRef, type DragEvent, type ReactNode } from 'react'
import { Icon } from '@/components/ui/icon'
import type { WidgetSize } from '@/lib/dashboard/layout'
import styles from './widget.module.css'

const SIZE_LABELS: Record<WidgetSize, string> = {
  third: '1/3',
  half: '1/2',
  'two-thirds': '2/3',
  full: 'completo',
}

export interface WidgetEdit {
  dragging: boolean
  over: boolean
  resizing: boolean
  onHide: () => void
  onBack?: () => void
  onForward?: () => void
  onDragStart: () => void
  onDragOver: (e: DragEvent) => void
  onDrop: () => void
  onDragEnd: () => void
  // `width` = px from the widget's left edge to the pointer.
  onResize: (width: number) => void
  onResizeStart: () => void
  onResizeEnd: () => void
  onCycleSize: () => void
}

interface WidgetProps {
  title: string
  action?: ReactNode
  size: WidgetSize
  edit?: WidgetEdit
  children: ReactNode
}

export function Widget({ title, action, size, edit, children }: WidgetProps) {
  // Synchronous: state arrives too late and the move drag would start anyway.
  const resizing = useRef(false)
  // Left edge at the start: if the widget jumps rows, the width doesn't flicker.
  const startLeft = useRef(0)

  return (
    <section
      className={styles.widget}
      data-size={size}
      data-editing={edit ? true : undefined}
      data-dragging={edit?.dragging || undefined}
      data-over={edit?.over || undefined}
      data-resizing={edit?.resizing || undefined}
      draggable={Boolean(edit)}
      onDragStart={
        edit &&
        (e => {
          if (resizing.current) {
            e.preventDefault()
            return
          }
          e.dataTransfer.effectAllowed = 'move'
          // WebKit won't start a drag without data.
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
            {/* Keyboard fallback for dragging. */}
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
              className={styles.tool}
              aria-label={`Tamaño de ${title}: ${SIZE_LABELS[size]}. Cambiar`}
              title={SIZE_LABELS[size]}
              onClick={edit.onCycleSize}
            >
              <Icon name="resize" size={16} />
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
      {edit && (
        // Mouse only. The keyboard uses the size button.
        <span
          className={styles.resize}
          aria-hidden
          onPointerDown={e => {
            e.preventDefault()
            e.stopPropagation()
            e.currentTarget.setPointerCapture(e.pointerId)
            resizing.current = true
            startLeft.current =
              e.currentTarget.parentElement?.getBoundingClientRect().left ?? 0
            edit.onResizeStart()
          }}
          onPointerMove={e => {
            if (resizing.current) edit.onResize(e.clientX - startLeft.current)
          }}
          onPointerUp={() => {
            resizing.current = false
            edit.onResizeEnd()
          }}
          onPointerCancel={() => {
            resizing.current = false
            edit.onResizeEnd()
          }}
        />
      )}
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
