import type { ButtonHTMLAttributes } from 'react'
import styles from './button.module.css'

type Variant = 'primary' | 'soft' | 'ghost'

export function Button({
  className,
  variant = 'primary',
  block,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  block?: boolean
}) {
  const classes = [
    styles.button,
    styles[variant],
    block && styles.block,
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return <button className={classes} {...props} />
}
