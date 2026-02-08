import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useDecisions } from '../hooks/useDecisions'
import { Timeline } from '../components/organisms/Timeline'
import { ExecutiveDigest } from '../components/organisms/ExecutiveDigest'
import { FiltersSidebar } from '../components/organisms/FiltersSidebar'
import { DrilldownModal } from '../components/organisms/DrilldownModal'
import { Loader, AlertCircle } from 'lucide-react'
import { Decision } from '../types/decision'

type View = 'timeline' | 'digest'

/**
 * Project detail page displaying decisions timeline and executive digest.
 *
 * Epic 3 - Stories 3.5, 3.6, 3.7, 3.8
 */
export function ProjectDetail() {
  const { id: projectId } = useParams<{ id: string }>()
  const [view, setView] = useState<View>('timeline')
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null)

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

  const { data, isLoading, error } = useDecisions({ projectId })
  const decisions = data?.decisions || []

  // Create mock digest data from decisions for Executive Digest view
  const mockDigest = {
    total_decisions: decisions.length,
    meetings_count: [...new Set(decisions.map(d => d.meeting?.id).filter(Boolean))].length,
    consensus_percentage: 85, // TODO: Calculate from actual consensus data
    high_impact_count: decisions.filter(d => {
      // impacts is a JSON object, check if it has multiple keys or significant values
      return d.impacts && Object.keys(d.impacts).length > 1
    }).length,
    highlights: decisions.slice(0, 5).map(d => {
      // Determine impact level based on confidence or number of impacts
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with View Switcher */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Project Decisions</h1>
            <p className="text-gray-600">
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

        <div className="flex gap-6">
          {/* Filters Sidebar (Story 3.6) */}
          <aside className="w-80 flex-shrink-0">
            <FiltersSidebar />
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-600">Loading decisions...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-8 flex items-start space-x-4">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-red-900 mb-1">
                    Failed to Load Decisions
                  </h3>
                  <p className="text-red-700 text-sm">
                    {error instanceof Error
                      ? error.message
                      : 'An error occurred while fetching decisions.'}
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : view === 'timeline' ? (
              /* Timeline View (Story 3.5) */
              <Timeline
                decisions={decisions}
                onSelectDecision={(id) => {
                  const decision = decisions.find(d => d.id === id)
                  setSelectedDecision(decision || null)
                }}
              />
            ) : (
              /* Executive Digest View (Story 3.8) */
              <ExecutiveDigest digest={mockDigest} />
            )}
          </main>
        </div>

        {/* Drilldown Modal (Story 3.7) */}
        <DrilldownModal
          decision={selectedDecision}
          onClose={() => setSelectedDecision(null)}
        />
      </div>
    </div>
  )
}
