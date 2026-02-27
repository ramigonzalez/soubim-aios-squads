import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectItems } from '../hooks/useProjectItems'
import { Timeline } from '../components/organisms/Timeline'
import { ExecutiveDigest } from '../components/organisms/ExecutiveDigest'
import { FilterBar } from '../components/organisms/FilterBar'
import { DrilldownModal } from '../components/organisms/DrilldownModal'
import { useFilterStore } from '../store/filterStore'
import { AlertCircle } from 'lucide-react'
import { ProjectItem } from '../types/projectItem'

type View = 'timeline' | 'digest'

/**
 * Project detail page displaying project items timeline and executive digest.
 *
 * Epic 3 - Stories 3.5, 3.6, 3.7, 3.8, 3.13, 3.14, 3.15
 * Story 5.3 — Migrated from useDecisions to useProjectItems
 */
export function ProjectDetail() {
  const { id: projectId } = useParams<{ id: string }>()
  const [view, setView] = useState<View>('timeline')
  const [selectedItem, setSelectedItem] = useState<ProjectItem | null>(null)
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

  const { data, isLoading, error, refetch } = useProjectItems({ projectId })
  const items = data?.items || []

  // Apply all filters client-side
  const filteredItems = useMemo(() => {
    let filtered = items

    // Discipline filter
    if (disciplines.length > 0) {
      filtered = filtered.filter(d =>
        d.affected_disciplines.some(disc => disciplines.includes(disc.toLowerCase()))
      )
    }

    // Decision maker filter
    if (decisionMakers.length > 0) {
      filtered = filtered.filter(d =>
        decisionMakers.includes(d.who)
      )
    }

    // Meeting type filter (V1 backward compat field)
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
        d.statement?.toLowerCase().includes(q) ||
        d.who?.toLowerCase().includes(q) ||
        d.meeting_title?.toLowerCase().includes(q)
      )
    }

    return filtered
  }, [items, disciplines, decisionMakers, meetingTypes, dateFrom, dateTo, searchQuery])

  // Create mock digest data from items for Executive Digest view
  const mockDigest = {
    total_decisions: filteredItems.length,
    meetings_count: [...new Set(filteredItems.map(d => d.transcript_id).filter(Boolean))].length,
    consensus_percentage: 85,
    high_impact_count: filteredItems.filter(d => {
      return d.impacts && Object.keys(d.impacts).length > 1
    }).length,
    highlights: filteredItems.slice(0, 5).map(d => {
      let impact_level: 'high' | 'medium' | 'low' = 'medium'
      if (d.confidence !== undefined && d.confidence !== null) {
        if (d.confidence >= 0.9) impact_level = 'high'
        else if (d.confidence < 0.7) impact_level = 'low'
      }
      return {
        category: d.affected_disciplines[0] ?? 'general',
        title: d.statement.substring(0, 60) + '...',
        description: d.why || 'No description available',
        impact_level,
        date: d.meeting_date || d.timestamp || d.created_at,
      }
    }),
  }

  const handleSelectItem = (id: string) => {
    const item = filteredItems.find(d => d.id === id)
    setSelectedItem(item || null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with View Switcher */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Project Decisions</h1>
            <p className="text-sm text-gray-600">
              {filteredItems.length} decision{filteredItems.length !== 1 ? 's' : ''} found
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
            decisions={items}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
          />
        )}

        {/* Main Content — full-width, no sidebar */}
        <main>
          {view === 'timeline' ? (
            <Timeline
              decisions={filteredItems}
              onSelectDecision={handleSelectItem}
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
          decision={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      </div>
    </div>
  )
}
