import { useMemo } from 'react'
import { useMilestones } from '../../hooks/useMilestones'
import { useStages } from '../../hooks/useStages'
import { StageNode } from '../molecules/StageNode'
import { MilestoneNode } from '../molecules/MilestoneNode'
import { ProjectItem, ProjectStage } from '../../types/projectItem'
import { cn, formatDate } from '../../lib/utils'
import { AlertCircle, Star, Loader } from 'lucide-react'

interface MilestoneTimelineProps {
  projectId: string
  onSelectItem: (id: string) => void
}

/**
 * Groups milestones into their parent stage by date range.
 * Milestones outside any stage date range are grouped under 'other'.
 */
function groupMilestonesByStage(
  milestones: ProjectItem[],
  stages: ProjectStage[]
): Map<string, ProjectItem[]> {
  const groups = new Map<string, ProjectItem[]>()
  stages.forEach((s) => groups.set(s.id, []))
  groups.set('other', [])

  milestones.forEach((m) => {
    const itemDate = new Date(m.meeting_date || m.created_at)
    const parentStage = stages.find((s) => {
      const from = new Date(s.stage_from)
      const to = new Date(s.stage_to)
      return itemDate >= from && itemDate <= to
    })
    const key = parentStage?.id ?? 'other'
    const group = groups.get(key)
    if (group) {
      group.push(m)
    }
  })

  return groups
}

/**
 * Determines the current stage based on today's date.
 * Returns the stage whose date range contains today, or null.
 */
function getCurrentStage(stages: ProjectStage[]): ProjectStage | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return (
    stages.find((s) => {
      const from = new Date(s.stage_from)
      const to = new Date(s.stage_to)
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
      return today >= from && today <= to
    }) || null
  )
}

/**
 * Calculates the proportional position (0-100%) of today within the full timeline.
 */
function calculateTodayPosition(stages: ProjectStage[]): number | null {
  if (stages.length === 0) return null
  const today = new Date()
  const firstStart = new Date(stages[0].stage_from)
  const lastEnd = new Date(stages[stages.length - 1].stage_to)
  const totalRange = lastEnd.getTime() - firstStart.getTime()
  if (totalRange <= 0) return null
  const todayOffset = today.getTime() - firstStart.getTime()
  const pct = (todayOffset / totalRange) * 100
  return Math.max(0, Math.min(100, pct))
}

// --- TodayMarker internal component ---
function TodayMarker({ position }: { position: number }) {
  return (
    <div
      className="absolute left-0 right-0 flex items-center z-20 pointer-events-none"
      style={{ top: `${position}%` }}
      data-testid="today-marker"
      aria-label="Today"
    >
      <div className="w-full border-t-2 border-dashed border-blue-400" />
      <span className="absolute -right-2 lg:right-0 -translate-y-full text-xs text-blue-600 font-medium bg-white px-1">
        Today
      </span>
    </div>
  )
}

// --- Loading skeleton ---
function TimelineSkeleton() {
  return (
    <div className="animate-pulse" data-testid="timeline-skeleton" role="status" aria-label="Loading milestone timeline">
      {[1, 2, 3].map((i) => (
        <div key={i} className="mb-10">
          {/* Stage skeleton */}
          <div className="flex items-start gap-4 mb-4">
            <div className="w-36 lg:w-44 flex flex-col items-end gap-1">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-3 w-32 bg-gray-100 rounded" />
            </div>
            <div className="w-5 h-5 rounded-full bg-gray-200" />
            <div className="flex-1" />
          </div>
          {/* Milestone skeletons */}
          <div className="ml-[calc(9rem+2.5rem)] lg:ml-[calc(11rem+2.5rem)] space-y-3">
            {[1, 2].map((j) => (
              <div key={j} className="flex items-center gap-2">
                <div className="h-4 w-14 bg-gray-200 rounded-full" />
                <div className="h-4 w-48 bg-gray-200 rounded" />
                <div className="h-3 w-3 bg-gray-200 rounded" />
                <div className="h-3 w-20 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// --- Empty state ---
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16" data-testid="empty-state">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center max-w-md">
        <Star className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 text-sm">
          No milestones yet. Mark important items as milestones from the Project History.
        </p>
      </div>
    </div>
  )
}

// --- No stages state ---
function NoStagesState() {
  return (
    <div className="flex flex-col items-center justify-center py-16" data-testid="no-stages-state">
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center max-w-md">
        <Star className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 text-sm">
          Set up project stages in Project Settings to enable the timeline view.
        </p>
      </div>
    </div>
  )
}

// --- Error state ---
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16" data-testid="error-state">
      <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
      <p className="text-gray-600 text-sm mb-4">Failed to load milestone timeline.</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition"
      >
        Retry
      </button>
    </div>
  )
}

/**
 * MilestoneTimeline — the main "Dot Timeline" organism.
 * Vertical line with stage dots on the left and milestone dots on the right.
 * Includes Today marker and current stage highlighting.
 *
 * Story 8.1: Milestone Timeline Component
 */
export function MilestoneTimeline({ projectId, onSelectItem }: MilestoneTimelineProps) {
  const {
    data: stagesData,
    isLoading: stagesLoading,
    error: stagesError,
    refetch: refetchStages,
  } = useStages({ projectId })

  const {
    data: milestonesData,
    isLoading: milestonesLoading,
    error: milestonesError,
    refetch: refetchMilestones,
  } = useMilestones({ projectId })

  const stages = stagesData?.stages || []
  const milestones = milestonesData?.items || []

  const isLoading = stagesLoading || milestonesLoading
  const error = stagesError || milestonesError

  const currentStage = useMemo(() => getCurrentStage(stages), [stages])
  const groupedMilestones = useMemo(
    () => groupMilestonesByStage(milestones, stages),
    [milestones, stages]
  )
  const todayPosition = useMemo(() => calculateTodayPosition(stages), [stages])

  const handleRetry = () => {
    refetchStages()
    refetchMilestones()
  }

  // Loading state
  if (isLoading) {
    return (
      <nav aria-label="Milestone Timeline">
        <TimelineSkeleton />
      </nav>
    )
  }

  // Error state
  if (error) {
    return (
      <nav aria-label="Milestone Timeline">
        <ErrorState onRetry={handleRetry} />
      </nav>
    )
  }

  // No stages state
  if (stages.length === 0) {
    return (
      <nav aria-label="Milestone Timeline">
        <NoStagesState />
      </nav>
    )
  }

  // Empty milestones state
  if (milestones.length === 0) {
    return (
      <nav aria-label="Milestone Timeline">
        <EmptyState />
      </nav>
    )
  }

  const otherMilestones = groupedMilestones.get('other') || []

  return (
    <nav aria-label="Milestone Timeline">
      <div className="relative">
        {/* Vertical line */}
        <div
          className="absolute bg-gray-300"
          style={{
            left: 'calc(9rem + 10px)',
            width: '2px',
            top: 0,
            bottom: 0,
          }}
          data-testid="vertical-line"
          aria-hidden="true"
        />

        {/* Today marker */}
        {todayPosition !== null && <TodayMarker position={todayPosition} />}

        {/* Stages and milestones */}
        {stages.map((stage) => {
          const stageMilestones = groupedMilestones.get(stage.id) || []
          const isCurrent = currentStage?.id === stage.id

          return (
            <section
              key={stage.id}
              className="relative mb-8"
              aria-label={`Stage: ${stage.stage_name}`}
            >
              {/* Stage node */}
              <StageNode
                stage={stage}
                isCurrent={isCurrent}
                milestoneCount={stageMilestones.length}
              />

              {/* Milestones within this stage */}
              {stageMilestones.length > 0 && (
                <div
                  className="ml-[calc(9rem+2.75rem)] lg:ml-[calc(11rem+2.75rem)] mt-3 space-y-1"
                  role="list"
                  aria-label={`Milestones in ${stage.stage_name}`}
                >
                  {stageMilestones.map((milestone) => (
                    <div key={milestone.id} role="listitem">
                      <MilestoneNode
                        item={milestone}
                        onClick={onSelectItem}
                      />
                    </div>
                  ))}
                </div>
              )}
            </section>
          )
        })}

        {/* "Other" milestones not in any stage */}
        {otherMilestones.length > 0 && (
          <section className="relative mb-8" aria-label="Other milestones">
            <div className="flex items-start gap-4">
              <div className="w-36 lg:w-44 text-right shrink-0 pt-0.5">
                <h3 className="text-sm font-semibold text-gray-500 italic">Other</h3>
              </div>
              <div className="relative flex items-center justify-center shrink-0" style={{ width: '20px' }}>
                <div className="w-5 h-5 rounded-full bg-gray-300 border-2 border-white shadow-sm z-10" />
              </div>
              <div className="flex-1" />
            </div>

            <div
              className="ml-[calc(9rem+2.75rem)] lg:ml-[calc(11rem+2.75rem)] mt-3 space-y-1"
              role="list"
              aria-label="Milestones outside stage ranges"
            >
              {otherMilestones.map((milestone) => (
                <div key={milestone.id} role="listitem">
                  <MilestoneNode
                    item={milestone}
                    onClick={onSelectItem}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </nav>
  )
}
