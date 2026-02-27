import { ProjectItem } from '../../types/projectItem'
import { cn } from '../../lib/utils'
import { DisciplinePill } from '../atoms/DisciplinePill'

interface DecisionRowProps {
  decision: ProjectItem
  onClick: (id: string) => void
  showDiscipline?: boolean // true when grouped by date (default)
  showAffectedDisciplines?: boolean // true when inside MeetingGroup
  inMeetingGroup?: boolean // true when rendered inside a MeetingGroup (uses different styling)
}

function getAdditionalDisciplines(item: ProjectItem): string[] {
  const primary = item.affected_disciplines[0]
  return item.affected_disciplines.slice(1).filter((d) => d !== primary)
}

export function DecisionRow({
  decision,
  onClick,
  showDiscipline = true,
  showAffectedDisciplines = false,
  inMeetingGroup = false,
}: DecisionRowProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick(decision.id)
    }
  }

  const primaryDiscipline = decision.affected_disciplines[0] ?? 'general'
  const additionalDisciplines = showAffectedDisciplines ? getAdditionalDisciplines(decision) : []

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onClick(decision.id)}
      onKeyDown={handleKeyDown}
      className={cn(
        'rounded-md py-3 px-4 cursor-pointer transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
        inMeetingGroup
          ? 'bg-transparent hover:bg-white active:bg-white ml-1'
          : 'bg-white border-b border-gray-100 hover:bg-blue-50/50 active:bg-blue-50'
      )}
      aria-label={`Decision: ${decision.statement}`}
    >
      {/* Row 1: Statement only (full width, truncated) */}
      <div className="flex items-center">
        <span className="text-sm font-medium text-gray-900 truncate">
          {decision.statement}
        </span>
      </div>

      {/* Row 2: Discipline pills (all colored) + Who (right-aligned) */}
      <div className="flex items-center mt-1 gap-1.5">
        {showDiscipline && (
          <DisciplinePill discipline={primaryDiscipline} className="flex-shrink-0" />
        )}
        {additionalDisciplines.map((disc) => (
          <DisciplinePill key={disc} discipline={disc} className="flex-shrink-0" />
        ))}

        <span className="ml-auto text-xs text-gray-500 truncate flex-shrink-0">
          {decision.who}
        </span>
      </div>
    </article>
  )
}
