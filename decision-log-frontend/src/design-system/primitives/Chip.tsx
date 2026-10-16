import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '../cn'
import { Icons } from '../icons'

export interface ChipProps {
  label: string
  /** Leading marker: a discipline square or a 12 px type icon */
  marker?: ReactNode
  /** Shows the trailing X that removes the filter */
  onRemove?: () => void
  /** Mobile: 32 px high, fully rounded */
  touch?: boolean
  /** Toggle chips (template picker, mobile filter sheet) */
  selected?: boolean
  onClick?: () => void
  className?: string
}

/** Active-filter chip (COMPONENTS.md §2). Also used as a toggle chip when onClick is set. */
export function Chip({ label, marker, onRemove, touch = false, selected, onClick, className }: ChipProps) {
  const { t } = useTranslation('ui')
  const Close = Icons.close
  const base = cn(
    'inline-flex max-w-full items-center gap-1.5 whitespace-nowrap border text-caption font-medium',
    touch ? 'h-8 rounded-full px-3' : 'h-[26px] rounded-sm px-2',
    selected ? 'border-ink bg-ink text-on-dark' : 'border-line bg-surface text-ink-soft',
    className,
  )
  if (onClick) {
    return (
      <button type="button" aria-pressed={selected} onClick={onClick} className={cn(base, !selected && 'hover:bg-surface-2')}>
        {marker}
        <span className="truncate">{label}</span>
      </button>
    )
  }
  return (
    <span className={base}>
      {marker}
      <span className="truncate">{label}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={t('chip.remove', { label })}
          className="-mr-1 inline-flex h-5 w-5 items-center justify-center rounded-sm text-ink-2 hover:text-ink"
        >
          <Close className="h-3 w-3" strokeWidth={1.75} aria-hidden />
        </button>
      )}
    </span>
  )
}
