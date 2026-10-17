import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'
import { cn } from '../cn'

export type FieldTone = 'default' | 'error' | 'warning'

const TONES: Record<FieldTone, string> = {
  default: 'border-line-strong',
  error: 'border-danger',
  warning: 'border-warning-line',
}

const FIELD_BASE =
  'w-full rounded-md border bg-surface text-body text-ink placeholder:text-ink-3 ' +
  'focus:border-accent focus:shadow-focus focus:outline-none focus:ring-0 ' +
  'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-3'

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** form 38 px (default) · toolbar 36 px */
  size?: 'form' | 'toolbar'
  tone?: FieldTone
  /** 16 px icon inside the field, on the left (e.g. Search) */
  leadingIcon?: ReactNode
  /** Element at the right edge (e.g. the "/" Kbd hint) */
  trailing?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = 'form', tone = 'default', leadingIcon, trailing, className, ...rest },
  ref,
) {
  const input = (
    <input
      ref={ref}
      aria-invalid={tone === 'error' || undefined}
      className={cn(
        FIELD_BASE,
        TONES[tone],
        size === 'form' ? 'h-[38px]' : 'h-9',
        'max-md:h-11',
        'px-3',
        leadingIcon && 'pl-9',
        trailing && 'pr-9',
        !leadingIcon && !trailing && className,
      )}
      {...rest}
    />
  )
  if (!leadingIcon && !trailing) return input
  return (
    <div className={cn('relative flex items-center', className)}>
      {leadingIcon && (
        <span className="pointer-events-none absolute left-3 text-ink-2 [&_svg]:h-4 [&_svg]:w-4" aria-hidden>
          {leadingIcon}
        </span>
      )}
      {input}
      {trailing && <span className="absolute right-2.5 flex items-center">{trailing}</span>}
    </div>
  )
})

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  tone?: FieldTone
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { tone = 'default', className, rows = 3, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={tone === 'error' || undefined}
      className={cn(FIELD_BASE, TONES[tone], 'px-3 py-2 leading-normal', className)}
      {...rest}
    />
  )
})
