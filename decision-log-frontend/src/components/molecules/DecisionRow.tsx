import { Decision } from '../../types/decision'
import { abbreviateDiscipline, formatTimestamp, formatDate, getDisciplinePillColors } from '../../lib/utils'
import { User, Clock, Calendar } from 'lucide-react'

interface DecisionRowProps {
  decision: Decision
  onClick: (id: string) => void
  showDate?: boolean       // true when grouped by discipline
  showDiscipline?: boolean // true when grouped by date (default)
}

export function DecisionRow({
  decision,
  onClick,
  showDate = false,
  showDiscipline = true,
}: DecisionRowProps) {
  const pillColors = getDisciplinePillColors(decision.discipline)
  const abbrev = abbreviateDiscipline(decision.discipline)
  const timestamp = formatTimestamp(decision.timestamp)

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
      {/* Row 1: Statement + Discipline Pill */}
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
      </div>

      {/* Row 2: Who + (optional Date) + Timestamp */}
      <div className="flex items-center mt-1 text-xs text-gray-500">
        <div className="flex items-center gap-1 min-w-0">
          <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" aria-hidden="true" />
          <span className="truncate">{decision.who}</span>
        </div>

        <div className="ml-auto flex items-center gap-3 flex-shrink-0">
          {showDate && decision.meeting_date && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
              <span>{formatDate(decision.meeting_date)}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
            <span className="font-mono tabular-nums">{timestamp}</span>
          </div>
        </div>
      </div>
    </article>
  )
}
