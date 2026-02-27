import { cn, getItemTypeColors, getItemTypeIcon, getItemTypeLabel } from '../../lib/utils'
import type { ItemType } from '../../types/projectItem'

interface ItemTypeBadgeProps {
  type: ItemType
  showLabel?: boolean
  className?: string
}

export function ItemTypeBadge({ type, showLabel = false, className }: ItemTypeBadgeProps) {
  const { bg, text } = getItemTypeColors(type)
  const Icon = getItemTypeIcon(type)
  const label = getItemTypeLabel(type)

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        bg,
        text,
        className
      )}
      title={label}
    >
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {showLabel && <span>{label}</span>}
    </span>
  )
}
