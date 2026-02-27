import { useMemo } from 'react'
import { ProjectItem, SourceType } from '../../types/projectItem'
import { SourceGroupAccordion } from '../molecules/SourceGroupAccordion'
import { ProjectItemRow } from '../molecules/ProjectItemRow'
import { formatDenseDate, getDisciplineNodeColor } from '../../lib/utils'
import { Calendar, AlertCircle } from 'lucide-react'

interface TimelineProps {
  decisions: ProjectItem[]
  onSelectDecision: (id: string) => void
  groupBy: 'date' | 'discipline'
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
}

/**
 * Dense Timeline Group: items grouped by date, then by source within date.
 */
interface DenseTimelineGroup {
  date: string           // "2026-02-08"
  dateLabel: string      // "FEB 8, 2026"
  totalItems: number
  sources: {
    source: {
      id: string
      title: string
      type: SourceType
      meetingType?: string
      participants?: Array<{ name: string; role?: string }>
    }
    items: ProjectItem[]
  }[]
  orphanItems: ProjectItem[]  // manual_input or items without source
}

/**
 * Build Dense Rows groups from items: group by date, then by source within each date.
 */
function buildDenseGroups(items: ProjectItem[]): DenseTimelineGroup[] {
  // Group by date
  const dateMap = new Map<string, ProjectItem[]>()
  for (const item of items) {
    const dateKey = getDateKey(item)
    if (!dateMap.has(dateKey)) dateMap.set(dateKey, [])
    dateMap.get(dateKey)!.push(item)
  }

  // Sort dates descending
  const sortedDates = Array.from(dateMap.entries()).sort(([a], [b]) => b.localeCompare(a))

  return sortedDates.map(([date, dateItems]) => {
    const sourceMap = new Map<string, { source: DenseTimelineGroup['sources'][0]['source']; items: ProjectItem[] }>()
    const orphanItems: ProjectItem[] = []

    for (const item of dateItems) {
      // Items without transcript_id or with manual_input source type are orphans
      if (!item.transcript_id || item.source_type === 'manual_input') {
        orphanItems.push(item)
        continue
      }

      const sourceId = item.transcript_id
      if (!sourceMap.has(sourceId)) {
        sourceMap.set(sourceId, {
          source: {
            id: sourceId,
            title: item.meeting_title || item.source?.title || 'Untitled Source',
            type: item.source_type || 'meeting',
            meetingType: item.meeting_type,
            participants: item.meeting_participants,
          },
          items: [],
        })
      }
      sourceMap.get(sourceId)!.items.push(item)
    }

    // Sort sources by date of first item (newest first)
    const sources = Array.from(sourceMap.values()).sort((a, b) => {
      const dateA = a.items[0]?.meeting_date || a.items[0]?.created_at || ''
      const dateB = b.items[0]?.meeting_date || b.items[0]?.created_at || ''
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })

    return {
      date,
      dateLabel: formatDenseDate(date),
      totalItems: dateItems.length,
      sources,
      orphanItems,
    }
  })
}

/**
 * Build Dense Rows groups by discipline.
 */
function buildDenseGroupsByDiscipline(items: ProjectItem[]): DenseTimelineGroup[] {
  const discMap = new Map<string, ProjectItem[]>()
  for (const item of items) {
    const key = item.affected_disciplines[0] ?? 'general'
    if (!discMap.has(key)) discMap.set(key, [])
    discMap.get(key)!.push(item)
  }

  const sortedDiscs = Array.from(discMap.entries()).sort(([a], [b]) => a.localeCompare(b))

  return sortedDiscs.map(([discipline, discItems]) => {
    const sourceMap = new Map<string, { source: DenseTimelineGroup['sources'][0]['source']; items: ProjectItem[] }>()
    const orphanItems: ProjectItem[] = []

    for (const item of discItems) {
      if (!item.transcript_id || item.source_type === 'manual_input') {
        orphanItems.push(item)
        continue
      }

      const sourceId = item.transcript_id
      if (!sourceMap.has(sourceId)) {
        sourceMap.set(sourceId, {
          source: {
            id: sourceId,
            title: item.meeting_title || item.source?.title || 'Untitled Source',
            type: item.source_type || 'meeting',
            meetingType: item.meeting_type,
            participants: item.meeting_participants,
          },
          items: [],
        })
      }
      sourceMap.get(sourceId)!.items.push(item)
    }

    const sources = Array.from(sourceMap.values())

    return {
      date: discipline,
      dateLabel: discipline.charAt(0).toUpperCase() + discipline.slice(1),
      totalItems: discItems.length,
      sources,
      orphanItems,
    }
  })
}

/**
 * Extract date key (YYYY-MM-DD) from a ProjectItem.
 * Uses local date to avoid timezone shift issues.
 */
function getDateKey(item: ProjectItem): string {
  const raw = item.meeting_date || item.created_at
  const d = new Date(raw)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// --- Internal skeleton/empty/error components ---

function TimelineSkeleton() {
  return (
    <div className="space-y-4" data-testid="timeline-skeleton">
      {[1, 2].map((group) => (
        <div key={group}>
          {/* Date header skeleton */}
          <div className="flex items-center gap-2 py-2 px-4">
            <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-8 bg-gray-200 rounded animate-pulse" />
          </div>
          {/* Source group skeletons */}
          {[1, 2].map((src) => (
            <div key={src} className="border-l-2 border-gray-200 pl-2 ml-4">
              <div className="flex items-center gap-2 py-3 px-4 animate-pulse">
                <div className="h-4 w-4 bg-gray-200 rounded" />
                <div className="h-4 w-48 bg-gray-200 rounded" />
                <div className="ml-auto h-3 w-16 bg-gray-200 rounded" />
              </div>
              {[1, 2].map((row) => (
                <div key={row} className="flex items-center gap-2 py-2 px-4 pl-6 animate-pulse">
                  <div className="h-5 w-5 bg-gray-200 rounded-full" />
                  <div className="h-4 w-3/4 bg-gray-200 rounded" />
                  <div className="ml-auto h-3 w-12 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function EmptyTimeline() {
  return (
    <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-300 rounded-lg">
      <Calendar className="w-12 h-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-1">No project items yet</h3>
      <p className="text-sm text-gray-500">
        Items will appear here once sources are processed
      </p>
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="text-sm font-semibold text-red-900 mb-1">Failed to load items</h3>
        <p className="text-sm text-red-700">{error.message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-3 px-3 py-1.5 text-sm font-medium text-red-700 border border-red-300 rounded-md hover:bg-red-100 transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Dense Rows Timeline — V2 Project History layout.
 * Story 9.2: Three layers — UPPERCASE date headers, collapsible source groups, compact item rows.
 *
 * Props interface preserved for backward compatibility with ProjectDetail.
 */
export function Timeline({
  decisions,
  onSelectDecision,
  groupBy,
  isLoading,
  error,
  onRetry,
}: TimelineProps) {
  const denseGroups = useMemo(
    () => (groupBy === 'date' ? buildDenseGroups(decisions) : buildDenseGroupsByDiscipline(decisions)),
    [decisions, groupBy],
  )

  if (isLoading) return <TimelineSkeleton />
  if (error) return <ErrorState error={error} onRetry={onRetry} />
  if (decisions.length === 0) return <EmptyTimeline />

  const isDateMode = groupBy === 'date'

  return (
    <div className="space-y-1">
      {denseGroups.map((group) => {
        const nodeColor = isDateMode
          ? 'bg-blue-600'
          : getDisciplineNodeColor(group.date)

        return (
          <div key={group.date}>
            {/* Layer 1: Date Header (UPPERCASE, sticky) */}
            <div
              className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 flex items-center gap-2 py-2 px-4"
              role="heading"
              aria-level={2}
            >
              {!isDateMode && (
                <div className={`w-2.5 h-2.5 ${nodeColor} rounded-full flex-shrink-0`} />
              )}
              <span className="text-xs font-bold tracking-wide uppercase text-gray-500">
                {group.dateLabel}
              </span>
              <span className="text-xs text-gray-400 ml-2">
                {group.totalItems} item{group.totalItems !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Layer 2: Source Groups */}
            {group.sources.map(({ source, items }) => (
              <SourceGroupAccordion
                key={source.id}
                source={source}
                items={items}
                onItemClick={onSelectDecision}
              />
            ))}

            {/* Orphan Items (no source wrapper) */}
            {group.orphanItems.map((item) => (
              <ProjectItemRow
                key={item.id}
                item={item}
                onClick={onSelectDecision}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
