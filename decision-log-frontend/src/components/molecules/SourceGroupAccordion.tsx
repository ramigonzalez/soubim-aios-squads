import { useState } from 'react'
import { ChevronDown, FileText } from 'lucide-react'
import { cn } from '../../lib/utils'
import { SourceIcon } from '../atoms/SourceIcon'
import { ProjectItemRow } from './ProjectItemRow'
import { MeetingSummary } from './MeetingSummary'
import type { ProjectItem, SourceType } from '../../types/projectItem'

interface SourceGroupSource {
  id: string
  title: string
  type: SourceType
  meetingType?: string
  participants?: Array<{ name: string; role?: string }>
  ai_summary?: string
}

export interface SourceGroupAccordionProps {
  source: SourceGroupSource
  items: ProjectItem[]
  onItemClick: (id: string) => void
  onToggleMilestone?: (id: string) => void
  isAdmin?: boolean
}

/**
 * Get left border color class based on source type.
 * Meetings use a discipline-derived color, emails use sky, documents use orange.
 */
function getSourceBorderColor(type: SourceType): string {
  switch (type) {
    case 'meeting':
      return 'border-l-indigo-400'
    case 'email':
      return 'border-l-sky-400'
    case 'document':
      return 'border-l-orange-400'
    default:
      return 'border-l-gray-300'
  }
}

/**
 * Collapsible source group accordion for V2 Dense Rows layout.
 * Story 9.2 — Layer 2: groups items by source (meeting, email, document).
 * Collapsed by default if >5 items, expanded otherwise.
 */
export function SourceGroupAccordion({
  source,
  items,
  onItemClick,
  onToggleMilestone,
  isAdmin,
}: SourceGroupAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(items.length <= 5)
  const [showSummary, setShowSummary] = useState(false)

  const borderColor = getSourceBorderColor(source.type)
  const itemCount = items.length
  const itemLabel = itemCount === 1 ? '1 item' : `${itemCount} items`

  const accordionId = `source-${source.id}-items`

  return (
    <div
      className={cn('border-l-2 pl-2', borderColor)}
      role="region"
      aria-label={`${source.title}, ${itemLabel}`}
    >
      {/* Source Group Header */}
      <div
        className={cn(
          'group flex items-center gap-2 py-3 px-4 cursor-pointer select-none',
          'hover:bg-gray-50 transition-colors duration-150',
        )}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        aria-controls={accordionId}
        aria-label={`Source: ${source.title}, ${itemLabel}, ${isExpanded ? 'expanded' : 'collapsed'}`}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setIsExpanded(!isExpanded)
          }
        }}
      >
        <SourceIcon type={source.type} size="md" />
        <span className="text-sm font-semibold text-gray-900 flex-1 min-w-0 truncate">
          {source.title}
        </span>
        <span className="text-xs text-gray-400 whitespace-nowrap">
          {itemLabel}
        </span>
        {source.ai_summary && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setShowSummary(!showSummary)
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-blue-50"
            aria-label={showSummary ? 'Hide meeting summary' : 'Show meeting summary'}
          >
            <FileText className="w-4 h-4 text-blue-500 hover:text-blue-700" />
          </button>
        )}
        <ChevronDown
          className={cn(
            'w-4 h-4 text-gray-400 transition-transform duration-200',
            isExpanded && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </div>

      {/* Meeting Summary (Story 9.4) */}
      {source.ai_summary && (
        <MeetingSummary summary={source.ai_summary} isExpanded={showSummary} />
      )}

      {/* Items Area (collapsible) */}
      {isExpanded && (
        <div id={accordionId}>
          {items.map((item) => (
            <ProjectItemRow
              key={item.id}
              item={item}
              onClick={onItemClick}
              onToggleMilestone={onToggleMilestone}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  )
}
