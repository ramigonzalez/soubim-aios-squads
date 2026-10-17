import type { ReactNode } from 'react'
import { cn } from '../../design-system'

/**
 * Main column of a Promem page (guidelines §4): padding 32/40/80 on desktop,
 * content max 1200 centred, groups 24–32 apart.
 */
export function PageContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto flex w-full max-w-content flex-col gap-6 px-4 pb-20 pt-6 md:gap-8 md:px-10 md:pt-8', className)}>
      {children}
    </div>
  )
}

/** Page anatomy (guidelines §4): eyebrow, h1, one description line, actions on the right. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow && <p className="text-label uppercase text-ink-2">{eyebrow}</p>}
        <h1 className="text-h1 text-ink [text-wrap:balance]">{title}</h1>
        {description && <p className="text-small text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

/**
 * Single-column pages (forms and settings, max 760). The side gutter sits outside the column, so the
 * column never touches the screen edges between 768 and 1023 px (drawer layout, no sidebar).
 */
export function FormContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="px-4 md:px-8">
      <div className={cn('mx-auto flex w-full max-w-form flex-col gap-6 pb-20 pt-6 md:pt-8', className)}>{children}</div>
    </div>
  )
}
