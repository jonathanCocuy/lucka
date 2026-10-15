export const WIDGETS = ['available', 'budgets', 'fixed', 'recent'] as const
export type WidgetId = (typeof WIDGETS)[number]

export interface Layout {
  visible: WidgetId[]
  hidden: WidgetId[]
}

export const DEFAULT_LAYOUT: Layout = { visible: [...WIDGETS], hidden: [] }

const KEY = 'lucka.dashboard-layout'

const isWidget = (id: unknown): id is WidgetId =>
  WIDGETS.includes(id as WidgetId)

// `beforeId` null = al final.
export function move(
  layout: Layout,
  id: WidgetId,
  beforeId: WidgetId | null,
): Layout {
  if (id === beforeId) return layout
  const rest = layout.visible.filter(w => w !== id)
  const at = beforeId ? rest.indexOf(beforeId) : -1
  const visible =
    at === -1 ? [...rest, id] : [...rest.slice(0, at), id, ...rest.slice(at)]
  return { ...layout, visible }
}

export function hide(layout: Layout, id: WidgetId): Layout {
  return {
    visible: layout.visible.filter(w => w !== id),
    hidden: [...layout.hidden.filter(w => w !== id), id],
  }
}

export function show(layout: Layout, id: WidgetId): Layout {
  return {
    visible: [...layout.visible.filter(w => w !== id), id],
    hidden: layout.hidden.filter(w => w !== id),
  }
}

// Lo guardado puede venir roto o de otra versión: se limpia y nunca rompe el panel.
export function loadLayout(): Layout {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!raw || typeof raw !== 'object') return DEFAULT_LAYOUT
    const { visible, hidden } = raw as Record<string, unknown>
    const clean = (list: unknown) =>
      Array.isArray(list) ? [...new Set(list.filter(isWidget))] : []
    const v = clean(visible)
    const h = clean(hidden).filter(w => !v.includes(w))
    const missing = WIDGETS.filter(w => !v.includes(w) && !h.includes(w))
    return { visible: v, hidden: [...h, ...missing] }
  } catch {
    return DEFAULT_LAYOUT
  }
}

export function saveLayout(layout: Layout) {
  try {
    localStorage.setItem(KEY, JSON.stringify(layout))
  } catch {
    // Sin storage el layout vive solo en la sesión. No es dato crítico.
  }
}
