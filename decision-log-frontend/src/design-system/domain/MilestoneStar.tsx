import { useTranslation } from 'react-i18next'
import { cn } from '../cn'
import { Icons } from '../icons'

export interface MilestoneStarProps {
  /** On: this item is a marco */
  pressed: boolean
  /** Omit to render a read-only star (users who can't change milestones) */
  onToggle?: () => void
  /** 32 px button inside the panel header */
  size?: 'row' | 'panel'
  className?: string
}

/**
 * Toggle with aria-pressed. On: filled accent. Off: outline line-strong, ink-2
 * when the parent row (`group`) is hovered (COMPONENTS.md §3).
 */
export function MilestoneStar({ pressed, onToggle, size = 'row', className }: MilestoneStarProps) {
  const { t } = useTranslation('ui')
  const Star = Icons.milestone
  const star = (
    <Star
      aria-hidden
      strokeWidth={1.75}
      className={cn('h-4 w-4', pressed ? 'fill-current text-accent' : 'text-line-strong group-hover:text-ink-2')}
    />
  )
  if (!onToggle) {
    if (!pressed) return <span className={cn('inline-flex h-[18px] w-[18px]', className)} aria-hidden />
    return (
      <span role="img" aria-label={t('milestone.unmark')} className={cn('inline-flex items-center justify-center', className)}>
        {star}
      </span>
    )
  }
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={pressed ? t('milestone.unmark') : t('milestone.mark')}
      onClick={(event) => {
        event.stopPropagation()
        onToggle()
      }}
      className={cn(
        'ds-touch inline-flex items-center justify-center rounded-sm hover:bg-surface-3',
        size === 'row' ? '-m-1 p-1' : 'h-8 w-8 rounded-md',
        className,
      )}
    >
      {star}
    </button>
  )
}
