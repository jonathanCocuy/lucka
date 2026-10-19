import type { CSSProperties } from 'react'

// Position in the entrance cascade. reveal.module.css reads it as --i.
export function stagger(index: number): CSSProperties {
  return { '--i': index } as CSSProperties
}
