import { useMemo, useEffect, useState, useCallback, forwardRef } from 'react'
import { useMilestones } from '../../hooks/useMilestones'
import { useStages } from '../../hooks/useStages'
import { useMilestoneFilters } from '../../hooks/useMilestoneFilters'
import { StageNode } from '../molecules/StageNode'
import { MilestoneNode } from '../molecules/MilestoneNode'
import { MilestoneFilterBar } from '../molecules/MilestoneFilterBar'
import { ProjectItem, ProjectStage } from '../../types/projectItem'
import { filterMilestones } from '../../lib/utils'
import { AlertCircle, Star } from 'lucide-react'

interface MilestoneTimelineProps {
  projectId?: string
  milestones?: ProjectItem[]
  preloadedStages?: ProjectStage[]
  onSelectItem?: (id: string) => void
  onToggleMilestone?: (id: string) => void
  isAdmin?: boolean
  readOnly?: boolean
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

// --- TodayMarker internal component (pixel-positioned) ---
function TodayMarker({ topPx }: { topPx: number }) {
  return (
    <div
      className="absolute right-0 left-[calc(10rem_+_10px)] lg:left-[calc(12rem_+_10px)] flex items-center z-20 pointer-events-none"
      style={{ top: `${topPx}px` }}
      data-testid="today-marker"
      data-export-exclude
      aria-label="Today"
    >
      <div className="w-full border-t-2 border-dashed border-blue-400" />
      <span className="absolute -right-2 lg:right-0 -translate-y-full text-xs text-blue-600 font-medium bg-white px-1">
        Today
      </span>
    </div>
  )
}

/**
 * Hook to compute the Today marker's pixel position based on actual DOM layout.
 * Measures stage section positions and interpolates today's position within
 * the correct stage's DOM range.
 */
function useTodayPixelPosition(
  containerEl: HTMLDivElement | null,
  stages: ProjectStage[]
): number | null {
  const [topPx, setTopPx] = useState<number | null>(null)

  const compute = useCallback(() => {
    if (!containerEl || stages.length === 0) {
      setTopPx(null)
      return
    }

    const today = new Date()
    today.setHours(12, 0, 0, 0)

    const containerRect = containerEl.getBoundingClientRect()

    // Collect DOM position for each stage section
    const sectionEls = stages.map(s =>
      containerEl.querySelector(`[data-stage-id="${s.id}"]`) as HTMLElement | null
    )

    for (let i = 0; i < stages.length; i++) {
      const from = new Date(stages[i].stage_from)
      const to = new Date(stages[i].stage_to)
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)

      if (today >= from && today <= to) {
        // Today is within stage i — interpolate between this stage top and next stage top
        const sectionEl = sectionEls[i]
        if (!sectionEl) break

        const sectionTop = sectionEl.getBoundingClientRect().top - containerRect.top
        const nextSectionEl = sectionEls[i + 1]
        const sectionBottom = nextSectionEl
          ? nextSectionEl.getBoundingClientRect().top - containerRect.top
          : containerEl.scrollHeight

        const proportion = (today.getTime() - from.getTime()) / (to.getTime() - from.getTime())
        setTopPx(sectionTop + proportion * (sectionBottom - sectionTop))
        return
      }

      // Check if today falls in the gap between stages
      if (i < stages.length - 1) {
        const nextFrom = new Date(stages[i + 1].stage_from)
        nextFrom.setHours(0, 0, 0, 0)
        if (today > to && today < nextFrom) {
          const sectionEl = sectionEls[i]
          const nextSectionEl = sectionEls[i + 1]
          if (sectionEl && nextSectionEl) {
            const bottom = sectionEl.getBoundingClientRect().bottom - containerRect.top
            const nextTop = nextSectionEl.getBoundingClientRect().top - containerRect.top
            setTopPx((bottom + nextTop) / 2)
          }
          return
        }
      }
    }

    // Today is outside the timeline range
    setTopPx(null)
  }, [containerEl, stages])

  useEffect(() => {
    compute()
    window.addEventListener('resize', compute)

    // Recompute when container content changes (e.g. milestones load async)
    let ro: ResizeObserver | undefined
    if (containerEl) {
      ro = new ResizeObserver(compute)
      ro.observe(containerEl)
    }

    return () => {
      window.removeEventListener('resize', compute)
      ro?.disconnect()
    }
  }, [compute])

  return topPx
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
          <div className="ml-[12rem] lg:ml-[14rem] space-y-3">
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
export const MilestoneTimeline = forwardRef<HTMLDivElement, MilestoneTimelineProps>(
function MilestoneTimelineInner({ projectId, milestones: propMilestones, preloadedStages, onSelectItem, onToggleMilestone, isAdmin, readOnly = false }, ref) {
  const isPreloaded = !!preloadedStages
  // Callback ref pattern: setting state on mount triggers re-render so the
  // useTodayPixelPosition hook receives the real DOM element.
  const [timelineContainer, setTimelineContainer] = useState<HTMLDivElement | null>(null)
  const timelineContainerRef = useCallback((node: HTMLDivElement | null) => {
    setTimelineContainer(node)
  }, [])

  const {
    data: stagesData,
    isLoading: stagesLoading,
    error: stagesError,
    refetch: refetchStages,
  } = useStages({ projectId: isPreloaded ? undefined : projectId })

  const {
    data: milestonesData,
    isLoading: milestonesLoading,
    error: milestonesError,
    refetch: refetchMilestones,
  } = useMilestones({ projectId: isPreloaded ? undefined : projectId })

  const stages = useMemo(
    () => preloadedStages || stagesData?.stages || [],
    [preloadedStages, stagesData?.stages]
  )
  const milestones = useMemo(
    () => propMilestones || milestonesData?.items || [],
    [propMilestones, milestonesData?.items]
  )

  const { sourceFilters, itemTypeFilters, toggleSource, toggleItemType, clearAll } =
    useMilestoneFilters()

  const filteredMilestones = useMemo(
    () => filterMilestones(milestones, sourceFilters, itemTypeFilters),
    [milestones, sourceFilters, itemTypeFilters]
  )

  const isLoading = stagesLoading || milestonesLoading
  const error = stagesError || milestonesError

  const currentStage = useMemo(() => getCurrentStage(stages), [stages])
  const groupedMilestones = useMemo(
    () => groupMilestonesByStage(filteredMilestones, stages),
    [filteredMilestones, stages]
  )

  // DOM-measured Today marker position (pixel-based, not percentage)
  const todayTopPx = useTodayPixelPosition(timelineContainer, stages)

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

  // Empty milestones state (no milestones at all)
  if (milestones.length === 0) {
    return (
      <nav aria-label="Milestone Timeline">
        <EmptyState />
      </nav>
    )
  }

  const otherMilestones = groupedMilestones.get('other') || []

  return (
    <nav ref={ref} aria-label="Milestone Timeline">
      {/* Filter bar — hidden in readOnly mode, excluded from export */}
      {!readOnly && <div data-export-exclude>
        <MilestoneFilterBar
          sourceFilters={sourceFilters}
          itemTypeFilters={itemTypeFilters}
          onToggleSource={toggleSource}
          onToggleItemType={toggleItemType}
          onClearAll={clearAll}
        />
      </div>}

      {/* Empty filter result state */}
      {filteredMilestones.length === 0 && milestones.length > 0 ? (
        <div className="flex flex-col items-center justify-center py-16" data-testid="filter-empty-state">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center max-w-md">
            <Star className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 text-sm">
              No milestones match your filters.
            </p>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-blue-600 hover:underline mt-2"
              data-testid="filter-empty-clear"
            >
              Clear filters
            </button>
          </div>
        </div>
      ) : (

      <div className="relative" ref={timelineContainerRef}>
        {/* Vertical line — centered on stage dots (label + gap + half-dot) */}
        <div
          className="absolute bg-gray-300 left-[calc(10rem_+_10px)] lg:left-[calc(12rem_+_10px)]"
          style={{ width: '2px', top: 0, bottom: 0 }}
          data-testid="vertical-line"
          aria-hidden="true"
        />

        {/* Today marker — DOM-measured pixel position, excluded from export */}
        {todayTopPx !== null && <TodayMarker topPx={todayTopPx} />}

        {/* Stages and milestones */}
        {stages.map((stage) => {
          const stageMilestones = groupedMilestones.get(stage.id) || []
          const isCurrent = currentStage?.id === stage.id

          return (
            <section
              key={stage.id}
              data-stage-id={stage.id}
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
                  className="ml-[12rem] lg:ml-[14rem] mt-3 space-y-1"
                  role="list"
                  aria-label={`Milestones in ${stage.stage_name}`}
                >
                  {stageMilestones.map((milestone) => (
                    <div key={milestone.id} role="listitem">
                      <MilestoneNode
                        item={milestone}
                        onClick={onSelectItem}
                        onToggleMilestone={onToggleMilestone}
                        isAdmin={isAdmin}
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
              className="ml-[12rem] lg:ml-[14rem] mt-3 space-y-1"
              role="list"
              aria-label="Milestones outside stage ranges"
            >
              {otherMilestones.map((milestone) => (
                <div key={milestone.id} role="listitem">
                  <MilestoneNode
                    item={milestone}
                    onClick={onSelectItem}
                    onToggleMilestone={onToggleMilestone}
                    isAdmin={isAdmin}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      )}
    </nav>
  )
}
)
