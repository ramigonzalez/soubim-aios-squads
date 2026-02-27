import { cn, formatDate } from '../../lib/utils'
import { ProjectStage } from '../../types/projectItem'

interface StageNodeProps {
  stage: ProjectStage
  isCurrent: boolean
  milestoneCount: number
}

/**
 * StageNode — large dot on the left side of the Milestone Timeline.
 * Displays stage name, date range, and "Current" badge if active.
 *
 * Story 8.1: Milestone Timeline Component
 */
export function StageNode({ stage, isCurrent, milestoneCount }: StageNodeProps) {
  return (
    <div className="flex items-start gap-4">
      {/* Stage label — positioned to the left */}
      <div className="w-36 lg:w-44 text-right shrink-0 pt-0.5">
        <h3 className="text-sm font-semibold text-gray-900 leading-tight">
          {stage.stage_name}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {formatDate(stage.stage_from)} &rarr; {formatDate(stage.stage_to)}
        </p>
        {isCurrent && (
          <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
            Current
          </span>
        )}
      </div>

      {/* Large stage dot */}
      <div className="relative flex items-center justify-center shrink-0" style={{ width: '20px' }}>
        <div
          data-testid={`stage-dot-${stage.id}`}
          className={cn(
            'w-5 h-5 rounded-full border-2 border-white shadow-sm z-10',
            isCurrent
              ? 'bg-blue-600 ring-2 ring-blue-200'
              : 'bg-gray-400'
          )}
          aria-label={`Stage: ${stage.stage_name}${isCurrent ? ' (Current)' : ''}, ${milestoneCount} milestone${milestoneCount !== 1 ? 's' : ''}`}
        />
      </div>

      {/* Spacer for milestones column alignment */}
      <div className="flex-1" />
    </div>
  )
}
