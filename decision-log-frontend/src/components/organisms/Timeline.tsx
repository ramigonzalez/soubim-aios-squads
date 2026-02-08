import { Decision } from '../../types/decision'
import { DecisionCard } from '../molecules/DecisionCard'
import { formatDate } from '../../lib/utils'

interface TimelineProps {
  decisions: Decision[]
  onSelectDecision?: (id: string) => void
}

export function Timeline({ decisions, onSelectDecision }: TimelineProps) {
  // Group decisions by date
  const groupedDecisions = decisions.reduce((acc, decision) => {
    const date = decision.created_at ? formatDate(decision.created_at) : 'No Date'
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(decision)
    return acc
  }, {} as Record<string, Decision[]>)

  const sortedDates = Object.keys(groupedDecisions).sort().reverse()

  return (
    <div className="space-y-8">
      {sortedDates.map((date) => (
        <div key={date}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
            {date}
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groupedDecisions[date].map((decision) => (
              <DecisionCard
                key={decision.id}
                decision={decision}
                onClick={onSelectDecision}
              />
            ))}
          </div>
        </div>
      ))}

      {decisions.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No decisions yet</p>
        </div>
      )}
    </div>
  )
}
