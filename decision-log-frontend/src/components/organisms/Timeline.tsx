import { useMemo } from 'react'
import { Decision } from '../../types/decision'
import { DecisionRow } from '../molecules/DecisionRow'
import { formatFullDate, getDisciplineNodeColor } from '../../lib/utils'
import { Calendar, AlertCircle } from 'lucide-react'

interface TimelineProps {
  decisions: Decision[]
  onSelectDecision: (id: string) => void
  groupBy: 'date' | 'discipline'
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
}

function groupByDate(decisions: Decision[]): Record<string, Decision[]> {
  const grouped = decisions.reduce((acc, d) => {
    const key = d.meeting_date || d.created_at
    const dateKey = new Date(key).toISOString().split('T')[0]
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(d)
    return acc
  }, {} as Record<string, Decision[]>)

  return Object.fromEntries(
    Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a))
  )
}

function groupByDiscipline(decisions: Decision[]): Record<string, Decision[]> {
  const grouped = decisions.reduce((acc, d) => {
    const key = d.discipline || 'general'
    if (!acc[key]) acc[key] = []
    acc[key].push(d)
    return acc
  }, {} as Record<string, Decision[]>)

  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => {
      const dateA = a.meeting_date || a.created_at
      const dateB = b.meeting_date || b.created_at
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })
  }

  return grouped
}

function TimelineSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2, 3].map((group) => (
        <div key={group}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-3 h-3 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="ml-[5px] border-l-2 border-gray-200 pl-6 space-y-2">
            {[1, 2, 3].map((row) => (
              <div key={row} className="bg-white rounded-md py-3 px-4 animate-pulse">
                <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-1/3 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyTimeline() {
  return (
    <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-300 rounded-lg">
      <Calendar className="w-12 h-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-1">No decisions yet</h3>
      <p className="text-sm text-gray-500">
        Decisions will appear here once meetings are processed
      </p>
    </div>
  )
}

function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="text-sm font-semibold text-red-900 mb-1">Failed to load decisions</h3>
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

export function Timeline({
  decisions,
  onSelectDecision,
  groupBy,
  isLoading,
  error,
  onRetry,
}: TimelineProps) {
  const grouped = useMemo(() => {
    if (groupBy === 'discipline') return groupByDiscipline(decisions)
    return groupByDate(decisions)
  }, [decisions, groupBy])

  const groupKeys = Object.keys(grouped)

  if (isLoading) return <TimelineSkeleton />
  if (error) return <ErrorState error={error} onRetry={onRetry} />
  if (decisions.length === 0) return <EmptyTimeline />

  return (
    <div className="space-y-6">
      {groupKeys.map((key, groupIndex) => {
        const items = grouped[key]
        const isDateMode = groupBy === 'date'
        const isLast = groupIndex === groupKeys.length - 1

        const nodeColor = isDateMode
          ? 'bg-blue-600'
          : getDisciplineNodeColor(key)

        const headerLabel = isDateMode
          ? formatFullDate(key)
          : key.charAt(0).toUpperCase() + key.slice(1)

        return (
          <div key={key} className="relative">
            {/* Group Header with Node */}
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`w-3 h-3 ${nodeColor} rounded-full ring-2 ring-white flex-shrink-0 z-10`}
              />
              <h2
                className="text-sm font-semibold text-gray-700 flex-1"
                aria-label={`${headerLabel}, ${items.length} decision${items.length !== 1 ? 's' : ''}`}
              >
                {headerLabel}
              </h2>
              <span className="text-xs text-gray-400">
                {items.length} decision{items.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Decision Rows with vertical line */}
            <div
              className={`ml-[5px] ${isLast ? '' : 'border-l-2 border-gray-200'} pl-6 space-y-2 pb-2`}
            >
              {items.map((decision) => (
                <DecisionRow
                  key={decision.id}
                  decision={decision}
                  onClick={onSelectDecision}
                  showDate={!isDateMode}
                  showDiscipline={isDateMode}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
