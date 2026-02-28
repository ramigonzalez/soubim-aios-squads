import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectItems } from '../hooks/useProjectItems'
import { useToggleMilestone } from '../hooks/useProjectItemMutation'
import { Timeline } from '../components/organisms/Timeline'
import { MilestoneTimeline } from '../components/organisms/MilestoneTimeline'
import { ExecutiveDigest } from '../components/organisms/ExecutiveDigest'
import { FilterBar } from '../components/organisms/FilterBar'
import { DrilldownModal } from '../components/organisms/DrilldownModal'
import { DocumentUploadButton } from '../components/molecules/DocumentUploadButton'
import { useFilterStore } from '../store/filterStore'
import { useAuthStore } from '../store/authStore'
import { AlertCircle } from 'lucide-react'
import { ProjectItem } from '../types/projectItem'

type View = 'milestones' | 'history' | 'digest'

/**
 * Project detail page displaying milestone timeline, decisions history, and executive digest.
 *
 * Epic 3 - Stories 3.5, 3.6, 3.7, 3.8, 3.13, 3.14, 3.15
 * Story 8.1 - Added milestone timeline view with 3-tab toggle
 * Story 8.2 - Added milestone flag toggle (star)
 * Story 10.2 - Added document upload button
 * v5: 3-tab view toggle — Milestones | History | Digest + Document Upload
 */
export function ProjectDetail() {
  const { id: projectId } = useParams<{ id: string }>()
  const [view, setView] = useState<View>('milestones')
  const [selectedDecision, setSelectedDecision] = useState<ProjectItem | null>(null)
  const [groupBy, setGroupBy] = useState<'date' | 'discipline'>('date')

  // Auth & milestone toggle (Story 8.2)
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'director'
  const toggleMilestoneMutation = useToggleMilestone(projectId || '')

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
  const decisions = data?.items || []

  // Milestone toggle handler (Story 8.2)
  const handleToggleMilestone = (itemId: string) => {
    const item = decisions.find(d => d.id === itemId)
    const currentState = item?.is_milestone ?? false
    toggleMilestoneMutation.mutate(
      { itemId, isMilestone: !currentState },
      {
        onError: (err) => {
          console.error('Failed to update milestone. Changes reverted.', err)
        },
      },
    )
  }

  // Apply all filters client-side
  const filteredDecisions = useMemo(() => {
    let filtered = decisions

    // Discipline filter — V2 multi-discipline OR logic (Story 9.3)
    if (disciplines.length > 0) {
      filtered = filtered.filter(d => {
        // V2: match if ANY affected_discipline matches ANY selected filter
        if (d.affected_disciplines?.length > 0) {
          return d.affected_disciplines.some(disc =>
            disciplines.includes(disc.toLowerCase())
          )
        }
        // V1 fallback: single discipline field
        return d.discipline ? disciplines.includes(d.discipline.toLowerCase()) : false
      })
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
        (d.statement || d.decision_statement)?.toLowerCase().includes(q) ||
        d.who?.toLowerCase().includes(q) ||
        d.meeting_title?.toLowerCase().includes(q)
      )
    }

    return filtered
  }, [decisions, disciplines, decisionMakers, meetingTypes, dateFrom, dateTo, searchQuery])

  // Create mock digest data from items for Executive Digest view
  const mockDigest = {
    total_decisions: filteredDecisions.length,
    meetings_count: [...new Set(filteredDecisions.map(d => d.source?.id).filter(Boolean))].length,
    consensus_percentage: 85,
    high_impact_count: filteredDecisions.filter(d => {
      return d.impacts && Object.keys(d.impacts).length > 1
    }).length,
    highlights: filteredDecisions.slice(0, 5).map(d => {
      let impact_level: 'high' | 'medium' | 'low' = 'medium'
      if (d.confidence !== undefined && d.confidence !== null) {
        if (d.confidence >= 0.9) impact_level = 'high'
        else if (d.confidence < 0.7) impact_level = 'low'
      }
      const displayStatement = d.statement || d.decision_statement || ''
      return {
        category: d.affected_disciplines?.[0] || d.discipline || 'general',
        title: displayStatement.substring(0, 60) + '...',
        description: d.why || 'No description available',
        impact_level,
        date: d.meeting_date || d.timestamp || d.created_at,
      }
    }),
  }

  const handleSelectDecision = (id: string) => {
    const decision = filteredDecisions.find(d => d.id === id)
    setSelectedDecision(decision || null)
  }

  /**
   * For the milestone view, the onSelectItem callback opens the DrilldownModal
   * by finding the matching decision from the decisions list (milestones are also decisions).
   * If not found (item is a non-decision milestone), the callback is still called for future support.
   */
  const handleSelectMilestone = (id: string) => {
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
              {filteredDecisions.length} decision{filteredDecisions.length !== 1 ? 's' : ''} found
            </p>
          </div>

          {/* Document Upload & View Toggle (Stories 8.1, 10.2) */}
          <div className="flex items-center gap-3">
            <DocumentUploadButton projectId={projectId} onUploadComplete={() => refetch()} />
            <div className="flex bg-white rounded-lg border border-gray-300 p-1">
              <button
                onClick={() => setView('milestones')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  view === 'milestones'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Milestones
              </button>
              <button
                onClick={() => setView('history')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                  view === 'history'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                History
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
        </div>

        {/* Filter Bar with inline Group-by Toggle (Stories 3.14, 3.15) — shown for history view */}
        {view === 'history' && (
          <FilterBar
            decisions={decisions}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
          />
        )}

        {/* Main Content — full-width, no sidebar */}
        <main>
          {view === 'milestones' ? (
            <MilestoneTimeline
              projectId={projectId}
              onSelectItem={handleSelectMilestone}
              onToggleMilestone={handleToggleMilestone}
              isAdmin={isAdmin}
            />
          ) : view === 'history' ? (
            <Timeline
              decisions={filteredDecisions}
              onSelectDecision={handleSelectDecision}
              groupBy={groupBy}
              isLoading={isLoading}
              error={error || undefined}
              onRetry={() => refetch()}
              onToggleMilestone={handleToggleMilestone}
              isAdmin={isAdmin}
            />
          ) : (
            <ExecutiveDigest digest={mockDigest} />
          )}
        </main>

        {/* Drilldown Modal (Stories 3.7, 8.2) */}
        <DrilldownModal
          decision={selectedDecision}
          onClose={() => setSelectedDecision(null)}
          onToggleMilestone={handleToggleMilestone}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  )
}
