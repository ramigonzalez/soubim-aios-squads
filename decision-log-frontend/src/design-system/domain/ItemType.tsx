import { useTranslation } from 'react-i18next'
import type { ItemType } from '../../types/projectItem'
import { cn } from '../cn'
import { Icons } from '../icons'
import { ITEM_TYPE_ICONS, itemTypeLabelKey } from '../itemTypes'

export interface ItemTypeIconProps {
  type: ItemType
  /** Actions only: done state (SquareCheck, ink-3) */
  done?: boolean
  /** 12 · 14 · 16 px */
  size?: 12 | 14 | 16
  /** Actions only: makes the icon a button that toggles done */
  onToggleDone?: () => void
  className?: string
}

const SIZE = { 12: 'h-3 w-3', 14: 'h-3.5 w-3.5', 16: 'h-4 w-4' } as const

/** Monochrome type icon. Type is never conveyed by colour (COMPONENTS.md §3). */
export function ItemTypeIcon({ type, done = false, size = 16, onToggleDone, className }: ItemTypeIconProps) {
  const { t } = useTranslation(['ui', 'labels'])
  const isAction = type === 'action_item'
  const Icon = isAction && done ? Icons.actionDone : ITEM_TYPE_ICONS[type]
  const icon = <Icon className={cn(SIZE[size], 'shrink-0', done ? 'text-ink-3' : 'text-ink', !onToggleDone && className)} strokeWidth={1.75} aria-hidden />
  if (isAction && onToggleDone) {
    return (
      <button
        type="button"
        aria-pressed={done}
        aria-label={done ? t('ui:action.reopen') : t('ui:action.markDone')}
        onClick={(event) => {
          event.stopPropagation()
          onToggleDone()
        }}
        className={cn('ds-touch -m-1 inline-flex items-center justify-center rounded-sm p-1 hover:bg-surface-3', className)}
      >
        {icon}
      </button>
    )
  }
  return <span title={t(itemTypeLabelKey(type))} className="inline-flex">{icon}</span>
}

export interface ItemTypeBadgeProps {
  type: ItemType
  className?: string
}

/** 12 px icon + label, caption 600 ink ("Decisão"). */
export function ItemTypeBadge({ type, className }: ItemTypeBadgeProps) {
  const { t } = useTranslation('labels')
  const Icon = ITEM_TYPE_ICONS[type]
  return (
    <span className={cn('inline-flex items-center gap-1 text-caption font-semibold text-ink', className)}>
      <Icon className="h-3 w-3" strokeWidth={1.75} aria-hidden />
      {t(`itemType.${type}`)}
    </span>
  )
}
