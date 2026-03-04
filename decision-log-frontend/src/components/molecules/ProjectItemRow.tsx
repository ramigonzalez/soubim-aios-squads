import { cn } from '../../lib/utils'
import { ItemTypeBadge } from '../atoms/ItemTypeBadge'
import { DisciplineCircles } from '../atoms/DisciplineCircles'
import { MilestoneStarToggle } from './MilestoneStarToggle'
import { useToggleDone } from '../../hooks/useProjectItemMutation'
import { CheckSquare, Square, User, AlertTriangle } from 'lucide-react'
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
 * Story 9.6 — Action item enhancements: checkbox, owner, due date, strikethrough.
 */
export function ProjectItemRow({ item, onClick, onToggleMilestone, isAdmin }: ProjectItemRowProps) {
  const displayDate = item.meeting_date || item.created_at
  const shortDate = formatShortDate(displayDate)
  const isActionItem = item.item_type === 'action_item'
  const toggleDone = useToggleDone(item.project_id)

  const isOverdue = isActionItem && item.due_date && !item.is_done && new Date(item.due_date) < new Date()

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    toggleDone.mutate({ itemId: item.id, isDone: !item.is_done })
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 py-2 px-4 pl-6',
        'hover:bg-blue-50/50 transition-colors duration-150 cursor-pointer group',
        'focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 outline-none',
        item.is_done && isActionItem && 'opacity-60',
      )}
      onClick={() => onClick(item.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick(item.id)
      }}
      aria-label={`${item.item_type}: ${item.statement}`}
    >
      {/* Action item checkbox */}
      {isActionItem && (
        <button
          onClick={handleCheckboxClick}
          className="flex-shrink-0 text-gray-400 hover:text-blue-600 transition-colors"
          aria-label={item.is_done ? 'Mark as not done' : 'Mark as done'}
        >
          {item.is_done
            ? <CheckSquare className="w-4 h-4 text-green-600" />
            : <Square className="w-4 h-4" />
          }
        </button>
      )}
      <ItemTypeBadge type={item.item_type} />
      <span className={cn(
        'text-sm font-medium text-gray-900 truncate flex-1 min-w-0',
        item.is_done && isActionItem && 'line-through text-gray-500',
      )}>
        {item.statement}
      </span>
      {/* Owner badge for action items */}
      {isActionItem && item.owner && (
        <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 flex-shrink-0">
          <User className="w-3 h-3" />
          {item.owner}
        </span>
      )}
      {/* Due date for action items */}
      {isActionItem && item.due_date && (
        <span className={cn(
          'text-xs whitespace-nowrap flex-shrink-0 flex items-center gap-0.5',
          isOverdue ? 'text-red-600 font-medium' : 'text-gray-400',
        )}>
          {isOverdue && <AlertTriangle className="w-3 h-3" />}
          {formatShortDate(item.due_date)}
        </span>
      )}
      <DisciplineCircles disciplines={item.affected_disciplines} max={3} />
      <span className="text-xs text-gray-500 truncate max-w-[80px] hidden sm:block">
        {item.who}
      </span>
      <span className="text-xs text-gray-400 whitespace-nowrap">
        {shortDate}
      </span>
      {isAdmin && (
        <MilestoneStarToggle
          isMilestone={item.is_milestone}
          onToggle={() => onToggleMilestone?.(item.id)}
          size="sm"
          showOnHoverOnly={!item.is_milestone}
        />
      )}
    </div>
  )
}

/**
 * Format date as short display: "Feb 8"
 */
function formatShortDate(dateStr: string | undefined | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
