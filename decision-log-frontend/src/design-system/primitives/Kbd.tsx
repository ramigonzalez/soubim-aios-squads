import type { HTMLAttributes } from 'react'
import { cn } from '../cn'

export interface KbdProps extends HTMLAttributes<HTMLElement> {
  /** "boxed" draws the 1 px box used by the search "/" hint */
  boxed?: boolean
}

/** Keyboard hint: mono-sm in ink-4 ("Recusar  R"). */
export function Kbd({ boxed = false, className, ...rest }: KbdProps) {
  return (
    <kbd
      className={cn(
        'font-mono text-mono-sm text-ink-4',
        boxed && 'inline-flex min-w-[18px] items-center justify-center rounded-sm border border-line px-1',
        className,
      )}
      {...rest}
    />
  )
}
