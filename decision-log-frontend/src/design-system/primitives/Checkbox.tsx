import { forwardRef, useId, type ReactNode } from 'react'
import * as RadixCheckbox from '@radix-ui/react-checkbox'
import { cn } from '../cn'
import { Icons } from '../icons'

export interface CheckboxProps {
  checked?: boolean | 'indeterminate'
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  /** Visible label. Without one, pass aria-label. */
  label?: ReactNode
  /** 44 px hit area for mobile */
  touch?: boolean
  id?: string
  name?: string
  className?: string
  'aria-label'?: string
}

/**
 * 16 px box, radius sm. Checked: ink fill with a white check. Indeterminate:
 * ink fill with a white minus. The hit area is 24 px (44 px with `touch`).
 */
export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(function Checkbox(
  { checked, defaultChecked, onCheckedChange, disabled, label, touch = false, id, name, className, ...aria },
  ref,
) {
  const autoId = useId()
  const inputId = id ?? autoId
  const Check = Icons.check
  const Minus = Icons.abstain
  const box = (
    <RadixCheckbox.Root
      ref={ref}
      id={inputId}
      name={name}
      checked={checked}
      defaultChecked={defaultChecked}
      onCheckedChange={(value) => onCheckedChange?.(value === true)}
      disabled={disabled}
      {...aria}
      className={cn(
        'group inline-flex shrink-0 items-center justify-center rounded-sm disabled:cursor-not-allowed disabled:opacity-45',
        touch ? 'h-11 w-11' : 'h-6 w-6',
        !label && className,
      )}
    >
      <span
        className={cn(
          'flex h-4 w-4 items-center justify-center rounded-sm border-[1.5px] border-line-strong bg-surface text-on-dark',
          'group-data-[state=checked]:border-ink group-data-[state=checked]:bg-ink',
          'group-data-[state=indeterminate]:border-ink group-data-[state=indeterminate]:bg-ink',
          'group-focus-visible:border-accent group-focus-visible:shadow-focus',
        )}
      >
        <RadixCheckbox.Indicator>
          {checked === 'indeterminate' ? (
            <Minus className="h-[11px] w-[11px]" strokeWidth={3} aria-hidden />
          ) : (
            <Check className="h-[11px] w-[11px]" strokeWidth={3} aria-hidden />
          )}
        </RadixCheckbox.Indicator>
      </span>
    </RadixCheckbox.Root>
  )
  if (!label) return box
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      {box}
      <label htmlFor={inputId} className="cursor-pointer select-none text-small text-ink">
        {label}
      </label>
    </span>
  )
})
