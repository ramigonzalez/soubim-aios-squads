import { Decision } from '../../types/decision'
import { formatDate } from '../../lib/utils'
import { DisciplineBadge } from './DisciplineBadge'
import { Users, Calendar } from 'lucide-react'

interface DecisionCardProps {
  decision: Decision
  onClick?: (id: string) => void
}

export function DecisionCard({ decision, onClick }: DecisionCardProps) {
  return (
    <div
      onClick={() => onClick?.(decision.id)}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <h3 className="font-semibold text-gray-900 flex-1 line-clamp-2">
          {decision.decision_statement}
        </h3>
        <DisciplineBadge discipline={decision.discipline} />
      </div>

      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
        {decision.why || 'No rationale provided'}
      </p>

      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>{decision.who}</span>
        </div>
        {decision.meeting_date && (
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(decision.meeting_date)}</span>
          </div>
        )}
      </div>
    </div>
  )
}
