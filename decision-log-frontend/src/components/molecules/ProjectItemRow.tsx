import { cn } from '../../lib/utils'
import { ItemTypeBadge } from '../atoms/ItemTypeBadge'
import { DisciplineCircles } from '../atoms/DisciplineCircles'
import { Star } from 'lucide-react'
import type { ProjectItem } from '../../types/projectItem'

interface ProjectItemRowProps {
  item: ProjectItem
  onClick: (id: string) => void
  onToggleMilestone?: (id: string) => void
  isAdmin?: boolean
}

/**
 * Dense single-line item row for V2 Project History.
 * Story 9.2 — Layer 3: compact 32-40px rows within SourceGroupAccordion or standalone.
 */
export function ProjectItemRow({ item, onClick, onToggleMilestone, isAdmin }: ProjectItemRowProps) {
  const displayDate = item.meeting_date || item.created_at
  const shortDate = formatShortDate(displayDate)

  return (
    <div
      className={cn(
        'flex items-center gap-2 py-2 px-4 pl-6',
        'hover:bg-blue-50/50 transition-colors duration-150 cursor-pointer group',
        'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 outline-none',
      )}
      onClick={() => onClick(item.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick(item.id)
      }}
      aria-label={`${item.item_type}: ${item.statement}`}
    >
      <ItemTypeBadge type={item.item_type} />
      <span className="text-sm font-medium text-gray-900 truncate flex-1 min-w-0">
        {item.statement}
      </span>
      <DisciplineCircles disciplines={item.affected_disciplines} max={3} />
      <span className="text-xs text-gray-500 truncate max-w-[80px] hidden sm:block">
        {item.who}
      </span>
      <span className="text-xs text-gray-400 whitespace-nowrap">
        {shortDate}
      </span>
      {isAdmin && (
        <button
          className={cn(
            'opacity-0 group-hover:opacity-100 transition-opacity',
            item.is_milestone ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400',
          )}
          onClick={(e) => {
            e.stopPropagation()
            onToggleMilestone?.(item.id)
          }}
          aria-label={item.is_milestone ? 'Remove milestone' : 'Mark as milestone'}
        >
          <Star className="w-4 h-4" fill={item.is_milestone ? 'currentColor' : 'none'} />
        </button>
      )}
    </div>
  )
}

/**
 * Format date as short display: "Feb 8"
 */
function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
