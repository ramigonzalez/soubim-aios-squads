import React from 'react'
import { cn, formatDate, getDisciplinePillColors, abbreviateDiscipline } from '../../lib/utils'
import { ProjectItem, ItemType, SourceType } from '../../types/projectItem'
import { Video, Mail, FileText, PenLine } from 'lucide-react'

// --- Inline atom: ItemTypeBadge ---
const itemTypeConfig: Record<ItemType, { label: string; bg: string; text: string }> = {
  decision:    { label: 'Decision',    bg: 'bg-blue-100',   text: 'text-blue-700' },
  action_item: { label: 'Action',      bg: 'bg-amber-100',  text: 'text-amber-700' },
  topic:       { label: 'Topic',       bg: 'bg-purple-100', text: 'text-purple-700' },
  idea:        { label: 'Idea',        bg: 'bg-green-100',  text: 'text-green-700' },
  information: { label: 'Info',        bg: 'bg-gray-100',   text: 'text-gray-700' },
}

function ItemTypeBadgeInline({ type }: { type: ItemType }) {
  const config = itemTypeConfig[type] || itemTypeConfig.information
  return (
    <span
      className={cn(
        'inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0',
        config.bg,
        config.text
      )}
    >
      {config.label}
    </span>
  )
}

// --- Inline atom: SourceIcon ---
const sourceIconMap: Record<SourceType, React.ComponentType<{ className?: string }>> = {
  meeting:      Video,
  email:        Mail,
  document:     FileText,
  manual_input: PenLine,
}

function SourceIconInline({ type }: { type: SourceType }) {
  const Icon = sourceIconMap[type] || FileText
  return <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-label={`Source: ${type}`} />
}

// --- Inline atom: DisciplineCircles ---
function DisciplineCircles({ disciplines, max = 3 }: { disciplines: string[]; max?: number }) {
  if (!disciplines || disciplines.length === 0) return null
  const shown = disciplines.slice(0, max)
  const overflow = disciplines.length - max

  return (
    <div className="flex items-center gap-1 shrink-0">
      {shown.map((d) => {
        const colors = getDisciplinePillColors(d)
        return (
          <span
            key={d}
            className={cn(
              'inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap',
              colors.bg,
              colors.text
            )}
            title={d}
          >
            {abbreviateDiscipline(d)}
          </span>
        )
      })}
      {overflow > 0 && (
        <span className="text-[10px] text-gray-500 whitespace-nowrap">
          +{overflow}
        </span>
      )}
    </div>
  )
}

// --- MilestoneNode molecule ---

interface MilestoneNodeProps {
  item: ProjectItem
  onClick?: (id: string) => void
}

/**
 * MilestoneNode — small dot on the right side of the Milestone Timeline.
 * Shows connector line, item type badge, statement, source icon, date, and discipline circles.
 * Clickable for drilldown.
 *
 * Story 8.1: Milestone Timeline Component
 */
export const MilestoneNode = React.memo(function MilestoneNode({
  item,
  onClick,
}: MilestoneNodeProps) {
  const displayDate = item.meeting_date || item.created_at

  const handleClick = () => {
    onClick?.(item.id)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onClick?.(item.id)
    }
  }

  return (
    <div
      className={cn(
        'relative flex items-center gap-2 group rounded-md px-2 py-1.5 transition-colors',
        onClick && 'cursor-pointer hover:bg-blue-50/50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2'
      )}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${itemTypeConfig[item.item_type]?.label || item.item_type}: ${item.statement || item.decision_statement}. ${formatDate(displayDate)}. Disciplines: ${item.affected_disciplines.join(', ') || 'none'}`}
    >
      {/* Small dot + connector line */}
      <div className="absolute -left-[2.75rem] flex items-center">
        <div className="w-4 border-t border-gray-300" />
        <div className="w-3 h-3 rounded-full bg-gray-500 border-2 border-white shrink-0" />
      </div>

      {/* Content row */}
      <ItemTypeBadgeInline type={item.item_type} />

      <span className="text-sm font-medium text-gray-900 truncate max-w-xs lg:max-w-md">
        {item.statement || item.decision_statement}
      </span>

      <SourceIconInline type={item.source_type} />

      <span className="text-xs text-gray-500 whitespace-nowrap shrink-0">
        {formatDate(displayDate)}
      </span>

      <DisciplineCircles disciplines={item.affected_disciplines} max={3} />
    </div>
  )
})
