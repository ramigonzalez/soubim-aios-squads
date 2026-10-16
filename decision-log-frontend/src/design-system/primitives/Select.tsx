import { forwardRef, type ReactNode } from 'react'
import * as RadixSelect from '@radix-ui/react-select'
import { useTranslation } from 'react-i18next'
import { cn } from '../cn'
import { Icons } from '../icons'
import type { FieldTone } from './Input'

export interface SelectOption {
  value: string
  label: string
  /** Leading marker, e.g. a DisciplineMarker square */
  marker?: ReactNode
  disabled?: boolean
}

export interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  size?: 'form' | 'toolbar'
  tone?: FieldTone
  disabled?: boolean
  id?: string
  name?: string
  className?: string
  'aria-label'?: string
  'aria-describedby'?: string
}

const TONES: Record<FieldTone, string> = {
  default: 'border-line-strong',
  error: 'border-danger',
  warning: 'border-warning-line',
}

/** Radix Select styled as an input (COMPONENTS.md §2). */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  { value, defaultValue, onValueChange, options, placeholder, size = 'form', tone = 'default', disabled, id, name, className, ...aria },
  ref,
) {
  const { t } = useTranslation('ui')
  const Chevron = Icons.dropdown
  const Check = Icons.check
  return (
    <RadixSelect.Root value={value} defaultValue={defaultValue} onValueChange={onValueChange} disabled={disabled} name={name}>
      <RadixSelect.Trigger
        ref={ref}
        id={id}
        aria-invalid={tone === 'error' || undefined}
        {...aria}
        className={cn(
          'inline-flex w-full items-center justify-between gap-2 rounded-md border bg-surface px-3 text-left text-body text-ink',
          'focus:border-accent focus:shadow-focus focus:outline-none data-[placeholder]:text-ink-3',
          'disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-ink-3',
          size === 'form' ? 'h-[38px]' : 'h-9',
          TONES[tone],
          className,
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          <RadixSelect.Value placeholder={placeholder ?? t('selectPlaceholder')} />
        </span>
        <RadixSelect.Icon>
          <Chevron className="h-4 w-4 text-ink-2" strokeWidth={1.75} aria-hidden />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>
      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className="ds-pop-in z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md bg-surface p-1 shadow-1"
        >
          <RadixSelect.Viewport>
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={cn(
                  'relative flex h-8 cursor-pointer select-none items-center gap-2 rounded-sm py-1.5 pl-2.5 pr-8 text-small text-ink outline-none',
                  'data-[highlighted]:bg-surface-2 data-[disabled]:cursor-not-allowed data-[disabled]:text-ink-4',
                )}
              >
                {option.marker}
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                <RadixSelect.ItemIndicator className="absolute right-2.5">
                  <Check className="h-4 w-4 text-ink" strokeWidth={1.75} aria-hidden />
                </RadixSelect.ItemIndicator>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
})
