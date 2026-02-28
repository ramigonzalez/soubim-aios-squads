import { Star } from 'lucide-react'
import { cn } from '../../lib/utils'

interface MilestoneStarToggleProps {
  isMilestone: boolean
  onToggle: () => void
  size?: 'sm' | 'md'
  showOnHoverOnly?: boolean
}

/**
 * MilestoneStarToggle — reusable star button for flagging/unflagging milestones.
 * Story 8.2: Frontend Milestone Flag Toggle
 *
 * Sizes: 'sm' (w-4 h-4) for rows, 'md' (w-5 h-5) for modal header.
 * showOnHoverOnly: when true, the star is invisible until the parent `group` is hovered.
 */
export function MilestoneStarToggle({
  isMilestone,
  onToggle,
  size = 'sm',
  showOnHoverOnly = false,
}: MilestoneStarToggleProps) {
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle()
        }
      }}
      className={cn(
        'p-0.5 rounded transition-all duration-150 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
        isMilestone
          ? 'text-yellow-500 hover:text-yellow-600'
          : cn(
              'text-gray-300 hover:text-yellow-400',
              showOnHoverOnly && 'opacity-0 group-hover:opacity-100'
            ),
      )}
      aria-label={isMilestone ? 'Remove milestone' : 'Mark as milestone'}
      tabIndex={0}
    >
      <Star className={cn(iconSize, isMilestone && 'fill-current')} />
    </button>
  )
}
