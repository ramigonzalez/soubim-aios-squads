import React from 'react'
import { useTranslation } from 'react-i18next'
import { cn, formatDate, getDisciplineLabel, getSourceTypeLabel } from '../../lib/utils'
import { ProjectItem, ItemType, SourceType } from '../../types/projectItem'
import { Video, Mail, FileText, PenLine } from 'lucide-react'
import { MilestoneStarToggle } from './MilestoneStarToggle'
import { DisciplineCircles } from '../atoms/DisciplineCircles'

// --- Inline atom: ItemTypeBadge ---
const itemTypeConfig: Record<ItemType, { bg: string; text: string }> = {
  decision:    { bg: 'bg-blue-100',   text: 'text-blue-700' },
  action_item: { bg: 'bg-amber-100',  text: 'text-amber-700' },
  topic:       { bg: 'bg-purple-100', text: 'text-purple-700' },
  idea:        { bg: 'bg-green-100',  text: 'text-green-700' },
  information: { bg: 'bg-gray-100',   text: 'text-gray-700' },
}

function ItemTypeBadgeInline({ type }: { type: ItemType }) {
  const { t } = useTranslation('milestones')
  const key: ItemType = itemTypeConfig[type] ? type : 'information'
  const config = itemTypeConfig[key]
  return (
    <span
      className={cn(
        'inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0',
        config.bg,
        config.text
      )}
    >
      {t(`node.itemType.${key}`)}
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
  const { t } = useTranslation('milestones')
  const Icon = sourceIconMap[type] || FileText
  return <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" aria-label={t('node.sourceLabel', { source: getSourceTypeLabel(type) })} />
}

// --- MilestoneNode molecule ---

interface MilestoneNodeProps {
  item: ProjectItem
  onClick?: (id: string) => void
  onToggleMilestone?: (id: string) => void
  isAdmin?: boolean
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
  onToggleMilestone,
  isAdmin,
}: MilestoneNodeProps) {
  const { t } = useTranslation('milestones')
  const displayDate = item.meeting_date || item.created_at
  const typeLabel = itemTypeConfig[item.item_type] ? t(`node.itemType.${item.item_type}`) : item.item_type
  const disciplinesLabel = item.affected_disciplines.map(getDisciplineLabel).join(', ') || t('node.noDisciplines')

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
      aria-label={t('node.ariaLabel', {
        type: typeLabel,
        statement: item.statement || item.decision_statement,
        date: formatDate(displayDate),
        disciplines: disciplinesLabel,
      })}
    >
      {/* Small dot on vertical line + connector to content */}
      <div className="absolute -left-[1.75rem] flex items-center">
        <div className="w-3 h-3 rounded-full bg-gray-500 border-2 border-white shrink-0" />
        <div className="w-4 border-t border-gray-300" />
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

      <DisciplineCircles disciplines={item.affected_disciplines} max={3} size="sm" />

      {isAdmin && onToggleMilestone && (
        <span data-export-exclude>
          <MilestoneStarToggle
            isMilestone={item.is_milestone}
            onToggle={() => onToggleMilestone(item.id)}
            size="sm"
          />
        </span>
      )}
    </div>
  )
})
