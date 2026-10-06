import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronDown, FileText, PlayCircle } from 'lucide-react'
import { cn } from '../../lib/utils'
import { meetingLink } from '../../lib/transcript'
import { SourceIcon } from '../atoms/SourceIcon'
import { ProjectItemRow } from './ProjectItemRow'
import { MeetingSummary } from './MeetingSummary'
import { VisibilityBadge } from '../atoms/VisibilityBadge'
import type { MeetingVisibility, ProjectItem, SourceType } from '../../types/projectItem'

interface SourceGroupSource {
  id: string
  title: string
  type: SourceType
  meetingType?: string
  participants?: Array<{ name: string; role?: string }>
  ai_summary?: string
  meetingId?: string  // Story 7.13: V2 source id for the meeting viewer link
  visibility?: MeetingVisibility | null  // Story 12.4: internal / shared badge
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
  const { t } = useTranslation('history')

  const borderColor = getSourceBorderColor(source.type)
  const itemCount = items.length
  const itemLabel = t('common:items', { count: itemCount })

  const accordionId = `source-${source.id}-items`

  return (
    <div
      className={cn('border-l-2 pl-2', borderColor)}
      role="region"
      aria-label={t('sourceGroup.regionLabel', { title: source.title, items: itemLabel })}
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
        aria-label={t('sourceGroup.headerLabel', {
          title: source.title,
          items: itemLabel,
          state: isExpanded ? t('sourceGroup.expanded') : t('sourceGroup.collapsed'),
        })}
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
        <VisibilityBadge visibility={source.visibility} />
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
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors',
              showSummary
                ? 'border-blue-200 bg-blue-50 text-blue-700'
                : 'border-gray-200 text-gray-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700',
            )}
            aria-label={showSummary ? t('sourceGroup.hideSummary') : t('sourceGroup.showSummary')}
            aria-expanded={showSummary}
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            {t('sourceGroup.summary')}
            <ChevronDown
              className={cn('w-3 h-3 transition-transform duration-200', showSummary && 'rotate-180')}
              aria-hidden="true"
            />
          </button>
        )}
        {source.meetingId && (
          <Link
            to={meetingLink(source.meetingId)}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            aria-label={t('sourceGroup.openMeeting', { title: source.title })}
          >
            <PlayCircle className="w-3.5 h-3.5" aria-hidden="true" />
            {t('sourceGroup.meeting')}
          </Link>
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
