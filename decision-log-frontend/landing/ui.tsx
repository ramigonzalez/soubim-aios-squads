/** Small landing-only building blocks, made of design-system classes and components. */
import type { ReactNode } from 'react'
import { Button, cn, type ButtonProps } from '../src/design-system'
import type { LeadMode } from './form'

/** Content column: max 1200, 24 px gutters (README §10). */
export const CONTAINER = 'mx-auto w-full max-w-landing px-6'

/** Section rhythm: 80 px on phones, 96 px from lg; offset for the sticky header. */
export const SECTION_Y = 'scroll-mt-16 py-20 lg:py-24'

export function Eyebrow({ children, tone = 'light', className }: { children: ReactNode; tone?: 'light' | 'dark'; className?: string }) {
  return (
    <p className={cn('font-mono text-mono uppercase tracking-widest', tone === 'light' ? 'text-accent' : 'text-accent-on-dark', className)}>
      {children}
    </p>
  )
}

export function SectionHeading({ eyebrow, title, intro, id }: { eyebrow?: ReactNode; title: ReactNode; intro?: ReactNode; id?: string }) {
  return (
    <div className="flex max-w-3xl flex-col gap-3.5">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 id={id} className="text-balance text-section text-ink">
        {title}
      </h2>
      {intro && <p className="text-pretty font-serif text-reading-lg text-ink-soft">{intro}</p>}
    </div>
  )
}

/**
 * Copy still to be filled or validated (LANDING_COPY: text in [brackets]).
 * Dashed outline + the bracketed text, so nobody publishes it by accident.
 */
export function Placeholder({ children, tone = 'light', className }: { children: ReactNode; tone?: 'light' | 'dark'; className?: string }) {
  return (
    <span
      data-placeholder=""
      className={cn(
        'inline-block max-w-full rounded-sm border border-dashed px-2 py-0.5 text-caption',
        tone === 'light' ? 'border-ink-4 text-ink-2' : 'border-on-dark-line text-on-dark-3',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** A CTA: a plain anchor to #contato; client.ts reads `data-mode` to preselect the form. */
export function CtaLink({ mode, children, ...button }: { mode: LeadMode; children: ReactNode } & Pick<ButtonProps, 'variant' | 'size' | 'className'>) {
  return (
    <Button asChild {...button}>
      <a href="#contato" data-mode={mode}>
        {children}
      </a>
    </Button>
  )
}

/** React 18 has no typing for `inert`; the attribute makes the illustration non-interactive. */
const INERT = { inert: '' } as Record<string, string>

/**
 * A product illustration built from the real app components with static data.
 * The components inside are not interactive here, so the picture is `inert`
 * (no focus, no clicks) and described for screen readers by a caption.
 */
export function ProductVisual({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <figure className={cn('m-0 min-w-0', className)}>
      <figcaption className="sr-only">{label}</figcaption>
      <div {...INERT}>
        {children}
      </div>
    </figure>
  )
}
