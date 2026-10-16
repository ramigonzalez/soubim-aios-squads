/**
 * Create / edit pattern (guidelines §5): full-page single column (max 760),
 * back link, h1, subtitle, numbered section cards, footer with Cancelar + primary.
 */
import type { FormEvent, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '../../design-system'
import { FormContainer } from './PageContainer'

export function FormShell({
  back,
  eyebrow,
  title,
  subtitle,
  notice,
  footer,
  onSubmit,
  children,
  after,
  formId,
}: {
  back?: { to: string; label: string }
  eyebrow?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  /** e.g. a Banner above the sections */
  notice?: ReactNode
  footer: ReactNode
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
  /** Sections with their own forms (rendered after the form, before the footer) */
  after?: ReactNode
  /** Lets footer buttons outside the form submit it (`form` attribute) */
  formId?: string
}) {
  return (
    <FormContainer>
      <header className="flex flex-col gap-1">
        {back && (
          <Link to={back.to} className="ds-touch mb-2 self-start text-small font-medium text-accent hover:text-accent-strong">
            {back.label}
          </Link>
        )}
        {eyebrow && <p className="text-label uppercase text-ink-2">{eyebrow}</p>}
        <h1 className="text-h1 text-ink">{title}</h1>
        {subtitle && <p className="text-small text-ink-2 [text-wrap:pretty]">{subtitle}</p>}
      </header>
      {notice}
      <form id={formId} noValidate onSubmit={onSubmit} className="flex flex-col gap-6">
        {children}
        {!after && footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-5">{footer}</div>}
      </form>
      {after}
      {after && footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line pt-5">{footer}</div>}
    </FormContainer>
  )
}

export function FormSection({ title, description, children, className }: { title: ReactNode; description?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('flex flex-col gap-4 rounded-lg border border-line bg-surface p-6', className)}>
      <div className="flex flex-col gap-1">
        <h2 className="text-h3 text-ink">{title}</h2>
        {description && <p className="text-caption text-ink-2">{description}</p>}
      </div>
      {children}
    </section>
  )
}
