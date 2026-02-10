import { Decision } from '../../types/decision'
import { abbreviateDiscipline, getDisciplinePillColors, cn } from '../../lib/utils'

interface DecisionRowProps {
  decision: Decision
  onClick: (id: string) => void
  showDiscipline?: boolean // true when grouped by date (default)
  showAffectedDisciplines?: boolean // true when inside MeetingGroup
  inMeetingGroup?: boolean // true when rendered inside a MeetingGroup (uses different styling)
}

// Known disciplines for filtering consensus keys
const KNOWN_DISCIPLINES = new Set([
  'engineer', 'architect', 'client', 'contractor',
  'structural', 'mep', 'electrical', 'plumbing',
  'landscape', 'acoustical', 'fire_protection', 'tenant',
  'sustainability', 'civil',
])

function getAffectedDisciplines(decision: Decision): string[] {
  if (!decision.consensus) return []
  return Object.keys(decision.consensus)
    .filter((key) => KNOWN_DISCIPLINES.has(key) && key !== decision.discipline)
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

  const primaryColors = getDisciplinePillColors(decision.discipline)
  const primaryAbbrev = abbreviateDiscipline(decision.discipline)
  const affectedDisciplines = showAffectedDisciplines ? getAffectedDisciplines(decision) : []

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
      aria-label={`Decision: ${decision.decision_statement}`}
    >
      {/* Row 1: Statement only (full width, truncated) */}
      <div className="flex items-center">
        <span className="text-sm font-medium text-gray-900 truncate">
          {decision.decision_statement}
        </span>
      </div>

      {/* Row 2: Discipline pills (all colored) + Who (right-aligned) */}
      <div className="flex items-center mt-1 gap-1.5">
        {showDiscipline && (
          <span
            className={`${primaryColors.bg} ${primaryColors.text} text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0`}
          >
            {primaryAbbrev}
          </span>
        )}
        {affectedDisciplines.map((disc) => {
          const colors = getDisciplinePillColors(disc)
          return (
            <span
              key={disc}
              className={`${colors.bg} ${colors.text} text-xs px-1.5 py-0.5 rounded whitespace-nowrap flex-shrink-0`}
            >
              {abbreviateDiscipline(disc)}
            </span>
          )
        })}

        <span className="ml-auto text-xs text-gray-500 truncate flex-shrink-0">
          {decision.who}
        </span>
      </div>
    </article>
  )
}
