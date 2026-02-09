import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useDecisions } from '../hooks/useDecisions'
import { Timeline } from '../components/organisms/Timeline'
import { ExecutiveDigest } from '../components/organisms/ExecutiveDigest'
import { FilterBar } from '../components/organisms/FilterBar'
import { DrilldownModal } from '../components/organisms/DrilldownModal'
import { useFilterStore } from '../store/filterStore'
import { AlertCircle } from 'lucide-react'
import { Decision } from '../types/decision'

type View = 'timeline' | 'digest'

/**
 * Project detail page displaying decisions timeline and executive digest.
 *
 * Epic 3 - Stories 3.5, 3.6, 3.7, 3.8, 3.13, 3.14, 3.15
 * v3: FilterBar includes group-by toggle inline, meeting type filter added
 */
export function ProjectDetail() {
  const { id: projectId } = useParams<{ id: string }>()
  const [view, setView] = useState<View>('timeline')
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null)
  const [groupBy, setGroupBy] = useState<'date' | 'discipline'>('date')

  const {
    disciplines,
    decisionMakers,
    meetingTypes,
    dateFrom,
    dateTo,
    searchQuery,
  } = useFilterStore()

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

  // Apply all filters client-side
  const filteredDecisions = useMemo(() => {
    let filtered = decisions

    // Discipline filter
    if (disciplines.length > 0) {
      filtered = filtered.filter(d =>
        disciplines.includes(d.discipline?.toLowerCase())
      )
    }

    // Decision maker filter
    if (decisionMakers.length > 0) {
      filtered = filtered.filter(d =>
        decisionMakers.includes(d.who)
      )
    }

    // Meeting type filter (Story 3.15)
    if (meetingTypes.length > 0) {
      filtered = filtered.filter(d =>
        d.meeting_type && meetingTypes.includes(d.meeting_type.toLowerCase())
      )
    }

    // Date range filter
    if (dateFrom) {
      filtered = filtered.filter(d => {
        const dDate = d.meeting_date || d.created_at
        return dDate >= dateFrom
      })
    }
    if (dateTo) {
      filtered = filtered.filter(d => {
        const dDate = d.meeting_date || d.created_at
        return dDate <= dateTo + 'T23:59:59'
      })
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(d =>
        d.decision_statement?.toLowerCase().includes(q) ||
        d.who?.toLowerCase().includes(q) ||
        d.meeting_title?.toLowerCase().includes(q)
      )
    }

    return filtered
  }, [decisions, disciplines, decisionMakers, meetingTypes, dateFrom, dateTo, searchQuery])

  // Create mock digest data from decisions for Executive Digest view
  const mockDigest = {
    total_decisions: filteredDecisions.length,
    meetings_count: [...new Set(filteredDecisions.map(d => d.meeting?.id).filter(Boolean))].length,
    consensus_percentage: 85,
    high_impact_count: filteredDecisions.filter(d => {
      return d.impacts && Object.keys(d.impacts).length > 1
    }).length,
    highlights: filteredDecisions.slice(0, 5).map(d => {
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
    const decision = filteredDecisions.find(d => d.id === id)
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
              {filteredDecisions.length} decision{filteredDecisions.length !== 1 ? 's' : ''} found
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

        {/* Filter Bar with inline Group-by Toggle (Stories 3.14, 3.15) */}
        {view === 'timeline' && (
          <FilterBar
            decisions={decisions}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
          />
        )}

        {/* Main Content — full-width, no sidebar */}
        <main>
          {view === 'timeline' ? (
            <Timeline
              decisions={filteredDecisions}
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
