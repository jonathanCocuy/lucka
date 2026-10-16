export const WIDGETS = ['available', 'budgets', 'fixed', 'recent'] as const
export type WidgetId = (typeof WIDGETS)[number]

// Ancho en columnas de una grilla de 6. Por pasos para que nunca queden huecos raros.
export const SIZES = ['third', 'half', 'two-thirds', 'full'] as const
export type WidgetSize = (typeof SIZES)[number]

export const SPANS: Record<WidgetSize, number> = {
  third: 2,
  half: 3,
  'two-thirds': 4,
  full: 6,
}

export const DEFAULT_SIZE: WidgetSize = 'half'

export interface Layout {
  visible: WidgetId[]
  hidden: WidgetId[]
  // Sin valor = DEFAULT_SIZE.
  sizes: Partial<Record<WidgetId, WidgetSize>>
}

export const DEFAULT_LAYOUT: Layout = {
  visible: [...WIDGETS],
  hidden: [],
  sizes: {},
}

const KEY = 'lucka.dashboard-layout'

const isWidget = (id: unknown): id is WidgetId =>
  WIDGETS.includes(id as WidgetId)

const isSize = (size: unknown): size is WidgetSize =>
  SIZES.includes(size as WidgetSize)

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
    ...layout,
    visible: layout.visible.filter(w => w !== id),
    hidden: [...layout.hidden.filter(w => w !== id), id],
  }
}

export function show(layout: Layout, id: WidgetId): Layout {
  return {
    ...layout,
    visible: [...layout.visible.filter(w => w !== id), id],
    hidden: layout.hidden.filter(w => w !== id),
  }
}

export function resize(layout: Layout, id: WidgetId, size: WidgetSize): Layout {
  return { ...layout, sizes: { ...layout.sizes, [id]: size } }
}

export function sizeOf(layout: Layout, id: WidgetId): WidgetSize {
  return layout.sizes[id] ?? DEFAULT_SIZE
}

export function nextSize(size: WidgetSize): WidgetSize {
  return SIZES[(SIZES.indexOf(size) + 1) % SIZES.length]
}

// Columnas arrastradas (con decimales) → paso más cercano.
export function snapSize(span: number): WidgetSize {
  return SIZES.reduce((best, size) =>
    Math.abs(SPANS[size] - span) < Math.abs(SPANS[best] - span) ? size : best,
  )
}

// Lo guardado puede venir roto o de otra versión: se limpia y nunca rompe el panel.
export function loadLayout(): Layout {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (!raw || typeof raw !== 'object') return DEFAULT_LAYOUT
    const { visible, hidden, sizes } = raw as Record<string, unknown>
    const clean = (list: unknown) =>
      Array.isArray(list) ? [...new Set(list.filter(isWidget))] : []
    const v = clean(visible)
    const h = clean(hidden).filter(w => !v.includes(w))
    const missing = WIDGETS.filter(w => !v.includes(w) && !h.includes(w))
    const s: Layout['sizes'] = {}
    if (sizes && typeof sizes === 'object') {
      for (const [id, size] of Object.entries(sizes)) {
        if (isWidget(id) && isSize(size)) s[id] = size
      }
    }
    return { visible: v, hidden: [...h, ...missing], sizes: s }
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
