import { Decision } from '../../types/decision'
import { abbreviateDiscipline, formatDate, getDisciplinePillColors } from '../../lib/utils'
import { User, Calendar, FileText } from 'lucide-react'

interface DecisionRowProps {
  decision: Decision
  onClick: (id: string) => void
  showDate?: boolean       // true when grouped by discipline
  showDiscipline?: boolean // true when grouped by date (default)
  showMeetingTitle?: boolean // false when inside MeetingGroup
  showAffectedDisciplines?: boolean // true when inside MeetingGroup
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
  showDate = false,
  showDiscipline = true,
  showMeetingTitle = true,
  showAffectedDisciplines = false,
}: DecisionRowProps) {
  const pillColors = getDisciplinePillColors(decision.discipline)
  const abbrev = abbreviateDiscipline(decision.discipline)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick(decision.id)
    }
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onClick(decision.id)}
      onKeyDown={handleKeyDown}
      className="bg-white border-b border-gray-100 rounded-md py-3 px-4 hover:bg-blue-50/50 active:bg-blue-50 cursor-pointer transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
      aria-label={`Decision: ${decision.decision_statement}`}
    >
      {/* Row 1: Statement + Discipline Pill + Affected Disciplines */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900 truncate flex-1">
          {decision.decision_statement}
        </span>
        {showDiscipline && (
          <span
            className={`${pillColors.bg} ${pillColors.text} text-xs px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0`}
          >
            {abbrev}
          </span>
        )}
        {showAffectedDisciplines && getAffectedDisciplines(decision).map((disc) => (
          <span
            key={disc}
            className="bg-gray-100 text-gray-500 text-xs px-1 py-0 rounded whitespace-nowrap flex-shrink-0"
          >
            {disc}
          </span>
        ))}
      </div>

      {/* Row 2: Who + (optional Date) + Timestamp */}
      <div className="flex items-center mt-1 text-xs text-gray-500">
        <div className="flex items-center gap-1 min-w-0">
          <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" aria-hidden="true" />
          <span className="truncate">{decision.who}</span>
        </div>

        <div className="ml-auto flex items-center gap-3 flex-shrink-0">
          {showMeetingTitle && decision.meeting_title && (
            <div className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
              <span className="text-gray-400 italic truncate max-w-[160px]">{decision.meeting_title}</span>
            </div>
          )}
          {showDate && decision.meeting_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
              <span>{formatDate(decision.meeting_date)}</span>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
