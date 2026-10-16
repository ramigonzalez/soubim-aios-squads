import { useId, type ReactNode } from 'react'
import { cn } from '../cn'

export interface SwitchProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: ReactNode
  disabled?: boolean
  className?: string
}

/**
 * On/off toggle with its label ("Mostrar etapas sem marcos"). role="switch".
 * Track 28×16: ink when on, line-strong when off. New primitive, flagged.
 */
export function Switch({ checked, onCheckedChange, label, disabled, className }: SwitchProps) {
  const id = useId()
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'ds-touch relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors duration-fast disabled:opacity-45',
          checked ? 'bg-ink' : 'bg-line-strong',
        )}
      >
        <span
          aria-hidden
          className={cn('absolute left-0.5 h-3 w-3 rounded-full bg-surface transition-transform duration-fast', checked && 'translate-x-3')}
        />
      </button>
      <label htmlFor={id} className="cursor-pointer select-none whitespace-nowrap text-small text-ink-soft">
        {label}
      </label>
    </span>
  )
}
