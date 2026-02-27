import { cn, getSourceTypeIcon, getSourceTypeLabel } from '../../lib/utils'
import type { SourceType } from '../../types/projectItem'

interface SourceIconProps {
  type: SourceType
  showLabel?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const SIZE_MAP = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4' }
const COLOR_MAP: Record<SourceType, string> = {
  meeting: 'text-indigo-600',
  email: 'text-sky-600',
  document: 'text-orange-600',
  manual_input: 'text-gray-500',
}

export function SourceIcon({ type, showLabel = false, size = 'sm', className }: SourceIconProps) {
  const Icon = getSourceTypeIcon(type)
  const label = getSourceTypeLabel(type)
  const color = COLOR_MAP[type] ?? 'text-gray-400'

  return (
    <span className={cn('inline-flex items-center gap-1', className)} title={label}>
      <Icon className={cn(SIZE_MAP[size], color)} aria-hidden="true" />
      {showLabel && <span className="text-xs text-gray-600">{label}</span>}
    </span>
  )
}
