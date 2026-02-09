import { useMemo } from 'react'
import { Decision } from '../../types/decision'
import { MeetingGroup, MeetingGroupData } from '../molecules/MeetingGroup'
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

interface DateGroupData {
  date: string
  meetings: MeetingGroupData[]
  totalDecisions: number
}

interface DisciplineGroupData {
  discipline: string
  meetings: MeetingGroupData[]
  totalDecisions: number
}

function buildMeetingGroups(decisions: Decision[]): MeetingGroupData[] {
  const meetingMap = new Map<string, MeetingGroupData>()
  const orphanDecisions: Decision[] = []

  for (const d of decisions) {
    if (!d.transcript_id) {
      orphanDecisions.push(d)
      continue
    }

    let meeting = meetingMap.get(d.transcript_id)
    if (!meeting) {
      meeting = {
        meetingTitle: d.meeting_title || 'Untitled Meeting',
        meetingType: d.meeting_type,
        meetingDate: d.meeting_date,
        transcriptId: d.transcript_id,
        participants: d.meeting_participants || [],
        decisions: [],
      }
      meetingMap.set(d.transcript_id, meeting)
    }
    meeting.decisions.push(d)
  }

  const meetings = Array.from(meetingMap.values())

  // Sort meetings by date (newest first within the day)
  meetings.sort((a, b) => {
    const dateA = a.meetingDate || a.decisions[0]?.created_at || ''
    const dateB = b.meetingDate || b.decisions[0]?.created_at || ''
    return new Date(dateB).getTime() - new Date(dateA).getTime()
  })

  // Add orphan decisions as "Other Decisions" group if any
  if (orphanDecisions.length > 0) {
    meetings.push({
      meetingTitle: 'Other Decisions',
      participants: [],
      decisions: orphanDecisions,
    })
  }

  return meetings
}

function groupByDateWithMeetings(decisions: Decision[]): DateGroupData[] {
  // First group by date
  const dateMap = new Map<string, Decision[]>()
  for (const d of decisions) {
    const key = d.meeting_date || d.created_at
    const dateKey = new Date(key).toISOString().split('T')[0]
    if (!dateMap.has(dateKey)) dateMap.set(dateKey, [])
    dateMap.get(dateKey)!.push(d)
  }

  // Sort dates descending
  const sortedDates = Array.from(dateMap.entries()).sort(([a], [b]) => b.localeCompare(a))

  return sortedDates.map(([date, dateDecs]) => ({
    date,
    meetings: buildMeetingGroups(dateDecs),
    totalDecisions: dateDecs.length,
  }))
}

function groupByDisciplineWithMeetings(decisions: Decision[]): DisciplineGroupData[] {
  // First group by discipline
  const discMap = new Map<string, Decision[]>()
  for (const d of decisions) {
    const key = d.discipline || 'general'
    if (!discMap.has(key)) discMap.set(key, [])
    discMap.get(key)!.push(d)
  }

  // Sort disciplines alphabetically
  const sortedDiscs = Array.from(discMap.entries()).sort(([a], [b]) => a.localeCompare(b))

  return sortedDiscs.map(([discipline, discDecs]) => ({
    discipline,
    meetings: buildMeetingGroups(discDecs),
    totalDecisions: discDecs.length,
  }))
}

function TimelineSkeleton() {
  return (
    <div className="space-y-6">
      {[1, 2].map((group) => (
        <div key={group}>
          {/* Date header skeleton */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-3 h-3 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="ml-[5px] border-l-2 border-gray-200 pl-6 space-y-3">
            {/* Meeting card skeletons */}
            {[1, 2].map((meeting) => (
              <div key={meeting} className="bg-white border border-gray-200 rounded-lg p-4 animate-pulse">
                {/* Meeting header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-40 bg-gray-200 rounded" />
                  <div className="h-5 w-20 bg-gray-200 rounded-full" />
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-5 w-12 bg-gray-200 rounded" />
                  <div className="h-5 w-12 bg-gray-200 rounded" />
                  <div className="ml-auto h-4 w-16 bg-gray-200 rounded" />
                </div>
                {/* Decision row skeletons */}
                {[1, 2].map((row) => (
                  <div key={row} className="py-2 border-t border-gray-100">
                    <div className="h-4 w-3/4 bg-gray-200 rounded mb-1" />
                    <div className="h-3 w-1/3 bg-gray-200 rounded" />
                  </div>
                ))}
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
  const dateGroups = useMemo(
    () => (groupBy === 'date' ? groupByDateWithMeetings(decisions) : []),
    [decisions, groupBy],
  )

  const disciplineGroups = useMemo(
    () => (groupBy === 'discipline' ? groupByDisciplineWithMeetings(decisions) : []),
    [decisions, groupBy],
  )

  if (isLoading) return <TimelineSkeleton />
  if (error) return <ErrorState error={error} onRetry={onRetry} />
  if (decisions.length === 0) return <EmptyTimeline />

  const isDateMode = groupBy === 'date'
  const groups = isDateMode
    ? dateGroups.map((g) => ({ key: g.date, label: formatFullDate(g.date), meetings: g.meetings, total: g.totalDecisions }))
    : disciplineGroups.map((g) => ({
        key: g.discipline,
        label: g.discipline.charAt(0).toUpperCase() + g.discipline.slice(1),
        meetings: g.meetings,
        total: g.totalDecisions,
      }))

  return (
    <div className="space-y-6">
      {groups.map((group, groupIndex) => {
        const isLast = groupIndex === groups.length - 1

        const nodeColor = isDateMode
          ? 'bg-blue-600'
          : getDisciplineNodeColor(group.key)

        return (
          <div key={group.key} className="relative">
            {/* Group Header with Node */}
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`w-3 h-3 ${nodeColor} rounded-full ring-2 ring-white flex-shrink-0 z-10`}
              />
              <h2
                className="text-sm font-semibold text-gray-700 flex-1"
                aria-label={`${group.label}, ${group.total} decision${group.total !== 1 ? 's' : ''}`}
              >
                {group.label}
              </h2>
              <span className="text-xs text-gray-400">
                {group.total} decision{group.total !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Meeting Groups with vertical line */}
            <div
              className={`ml-[5px] ${isLast ? '' : 'border-l-2 border-gray-200'} pl-6 space-y-3 pb-2`}
            >
              {group.meetings.map((meeting) => (
                <MeetingGroup
                  key={meeting.transcriptId || 'orphan'}
                  meeting={meeting}
                  onSelectDecision={onSelectDecision}
                  showDate={!isDateMode}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
