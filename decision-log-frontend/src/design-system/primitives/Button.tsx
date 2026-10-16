import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '../cn'
import { Spinner } from './Spinner'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'link' | 'danger-ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** 16 px leading icon (a lucide element) */
  icon?: ReactNode
  /** Keyboard hint after the label, e.g. "A" in "Aprovar  A" */
  shortcut?: string
  /** Keeps the width and swaps the icon for a spinner */
  loading?: boolean
  /** Render the child element (e.g. a router Link) with button styles */
  asChild?: boolean
}

const VARIANTS: Record<ButtonVariant, string> = {
  // The primary button is ink, not accent (guidelines §2).
  primary: 'bg-ink text-on-dark hover:bg-ink-soft border border-transparent',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-2',
  ghost: 'bg-transparent text-ink-2 border border-transparent hover:text-ink',
  link: 'bg-transparent text-accent border border-transparent hover:text-accent-strong px-0',
  'danger-ghost': 'bg-transparent text-danger-ink border border-transparent hover:bg-danger-weak',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-small gap-1.5',
  md: 'h-9 px-3.5 text-small gap-[7px]',
  lg: 'h-11 px-5 text-body font-semibold gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, shortcut, loading = false, asChild = false, disabled, className, children, type, ...rest },
  ref,
) {
  const Comp = asChild ? Slot : 'button'
  const content = asChild ? children : (
    <>
      {loading ? <Spinner /> : icon}
      {children}
      {shortcut && (
        <kbd className={cn('font-mono text-mono-sm', variant === 'primary' ? 'text-on-dark opacity-[.55]' : 'text-ink-4')}>{shortcut}</kbd>
      )}
    </>
  )
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : type ?? 'button'}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md font-medium',
        'transition-colors duration-fast ease-promem [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0',
        'disabled:cursor-not-allowed disabled:opacity-45',
        SIZES[size],
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {content}
    </Comp>
  )
})
