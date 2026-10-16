import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../cn'

export type BadgeTone =
  | 'neutral' // bg surface-3, ink-2 (due date open, review "Pendente")
  | 'muted' // bg surface-3, ink-3 (done, "Recusado")
  | 'danger' // late, "Impacto alto"
  | 'success' // "Aprovado", "Confiança alta"
  | 'warning' // "Confiança média"
  | 'accent' // "Editado", selected/informational

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  /** Dates and counts are mono (mono-sm, 1px 6px padding) */
  mono?: boolean
  /** 12 px leading icon */
  icon?: ReactNode
}

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-3 text-ink-2',
  muted: 'bg-surface-3 text-ink-3',
  danger: 'bg-danger-weak text-danger-ink',
  success: 'bg-success-weak text-success',
  warning: 'bg-warning-weak text-warning-ink',
  accent: 'bg-accent-weak text-accent-strong',
}

/** Small status label (COMPONENTS.md §2). Status always carries text, never colour alone. */
export function Badge({ tone = 'neutral', mono = false, icon, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-sm [&_svg]:h-3 [&_svg]:w-3',
        mono ? 'px-1.5 py-px font-mono text-mono-sm' : 'px-[7px] py-0.5 text-caption font-semibold',
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </span>
  )
}

/** Nav count: mono-sm ink-2, no fill. */
export function Count({ className, ...rest }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('font-mono text-mono-sm text-ink-2', className)} {...rest} />
}
