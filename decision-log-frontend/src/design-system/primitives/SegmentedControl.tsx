import * as RadioGroup from '@radix-ui/react-radio-group'
import type { ReactNode } from 'react'
import { cn } from '../cn'

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  disabled?: boolean
}

export interface SegmentedControlProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  options: SegmentOption<T>[]
  /** Accessible name of the group, e.g. "Agrupar por" */
  label: string
  className?: string
}

/**
 * Choose one of 2–4 views. A radio group with arrow-key support
 * (COMPONENTS.md §2): "Data | Disciplina", "Ativos | Arquivados"…
 */
export function SegmentedControl<T extends string>({ value, onValueChange, options, label, className }: SegmentedControlProps<T>) {
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(v) => onValueChange(v as T)}
      aria-label={label}
      orientation="horizontal"
      loop
      className={cn('inline-flex rounded-md bg-surface-3 p-0.5', className)}
    >
      {options.map((option) => (
        <RadioGroup.Item
          key={option.value}
          value={option.value}
          disabled={option.disabled}
          className={cn(
            'whitespace-nowrap rounded-sm px-2.5 py-1 text-caption font-medium text-ink-2 transition-colors duration-fast ease-promem',
            'hover:text-ink disabled:cursor-not-allowed disabled:opacity-45',
            'data-[state=checked]:bg-surface data-[state=checked]:font-semibold data-[state=checked]:text-ink data-[state=checked]:shadow-xs',
          )}
        >
          {option.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  )
}
