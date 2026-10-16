import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '../cn'

export type IconButtonSize = 'sm' | 'md' | 'touch'

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Required: icon-only buttons need a pt-BR label (guidelines §10) */
  label: string
  icon: ReactNode
  /** sm 32 (inside panels) · md 36 (headers) · touch 44 (mobile) */
  size?: IconButtonSize
  variant?: 'secondary' | 'ghost'
}

const SIZES: Record<IconButtonSize, string> = {
  sm: 'ds-touch h-8 w-8',
  md: 'ds-touch h-9 w-9',
  touch: 'h-11 w-11',
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, icon, size = 'md', variant = 'secondary', className, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md text-ink-2 transition-colors duration-fast ease-promem',
        '[&_svg]:h-4 [&_svg]:w-4 hover:text-ink disabled:cursor-not-allowed disabled:opacity-45',
        variant === 'secondary' ? 'border border-line-strong bg-surface hover:bg-surface-2' : 'border border-transparent hover:bg-surface-2',
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {icon}
    </button>
  )
})
