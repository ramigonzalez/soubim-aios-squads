import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useDecisions } from '../hooks/useDecisions'
import { Timeline } from '../components/organisms/Timeline'
import { ExecutiveDigest } from '../components/organisms/ExecutiveDigest'
import { FilterBar } from '../components/organisms/FilterBar'
import { GroupingToggle } from '../components/molecules/GroupingToggle'
import { DrilldownModal } from '../components/organisms/DrilldownModal'
import { AlertCircle } from 'lucide-react'
import { Decision } from '../types/decision'

type View = 'timeline' | 'digest'

/**
 * Project detail page displaying decisions timeline and executive digest.
 *
 * Epic 3 - Stories 3.5, 3.6, 3.7, 3.8
 * v2 Redesign: Full-width layout, FilterBar replaces sidebar, GroupingToggle added
 */
export function ProjectDetail() {
  const { id: projectId } = useParams<{ id: string }>()
  const [view, setView] = useState<View>('timeline')
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null)
  const [groupBy, setGroupBy] = useState<'date' | 'discipline'>('date')

  if (!projectId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-900 text-lg">Invalid project ID</p>
        </div>
      </div>
    )
  }

  const { data, isLoading, error, refetch } = useDecisions({ projectId })
  const decisions = data?.decisions || []

  // Create mock digest data from decisions for Executive Digest view
  const mockDigest = {
    total_decisions: decisions.length,
    meetings_count: [...new Set(decisions.map(d => d.meeting?.id).filter(Boolean))].length,
    consensus_percentage: 85,
    high_impact_count: decisions.filter(d => {
      return d.impacts && Object.keys(d.impacts).length > 1
    }).length,
    highlights: decisions.slice(0, 5).map(d => {
      let impact_level: 'high' | 'medium' | 'low' = 'medium'
      if (d.confidence !== undefined) {
        if (d.confidence >= 0.9) impact_level = 'high'
        else if (d.confidence < 0.7) impact_level = 'low'
      }
      return {
        category: d.discipline,
        title: d.decision_statement.substring(0, 60) + '...',
        description: d.why || 'No description available',
        impact_level,
        date: d.meeting_date || d.timestamp,
      }
    }),
  }

  const handleSelectDecision = (id: string) => {
    const decision = decisions.find(d => d.id === id)
    setSelectedDecision(decision || null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with View Switcher */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Project Decisions</h1>
            <p className="text-sm text-gray-600">
              {decisions.length} decision{decisions.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex bg-white rounded-lg border border-gray-300 p-1">
            <button
              onClick={() => setView('timeline')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                view === 'timeline'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Timeline
            </button>
            <button
              onClick={() => setView('digest')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                view === 'digest'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              Executive Digest
            </button>
          </div>
        </div>

        {/* Filter Bar (Story 3.6 v2) */}
        {view === 'timeline' && <FilterBar decisions={decisions} />}

        {/* Grouping Toggle (Story 3.5 v2) */}
        {view === 'timeline' && (
          <GroupingToggle value={groupBy} onChange={setGroupBy} />
        )}

        {/* Main Content — full-width, no sidebar */}
        <main>
          {view === 'timeline' ? (
            <Timeline
              decisions={decisions}
              onSelectDecision={handleSelectDecision}
              groupBy={groupBy}
              isLoading={isLoading}
              error={error || undefined}
              onRetry={() => refetch()}
            />
          ) : (
            <ExecutiveDigest digest={mockDigest} />
          )}
        </main>

        {/* Drilldown Modal (Story 3.7) */}
        <DrilldownModal
          decision={selectedDecision}
          onClose={() => setSelectedDecision(null)}
        />
      </div>
    </div>
  )
}
