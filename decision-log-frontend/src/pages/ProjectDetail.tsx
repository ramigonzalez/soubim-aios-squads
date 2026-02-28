import { useState, useRef, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectItems } from '../hooks/useProjectItems'
import { useToggleMilestone } from '../hooks/useProjectItemMutation'
import { Timeline } from '../components/organisms/Timeline'
import { MilestoneTimeline } from '../components/organisms/MilestoneTimeline'
import { ExecutiveDigest } from '../components/organisms/ExecutiveDigest'
import { FilterBar } from '../components/organisms/FilterBar'
import { DrilldownModal } from '../components/organisms/DrilldownModal'
import { DocumentUploadButton } from '../components/molecules/DocumentUploadButton'
import { ShareDialog } from '../components/molecules/ShareDialog'
import { useFilterStore } from '../store/filterStore'
import { useFilterUrlSync } from '../hooks/useFilterUrlSync'
import { useAuthStore } from '../store/authStore'
import { AlertCircle, Star, Clock, FileText, Share2, Download, Image, ChevronDown } from 'lucide-react'
import { cn } from '../lib/utils'
import { ProjectItem } from '../types/projectItem'
import { exportAsPDF, exportAsJPEG } from '../lib/exportTimeline'

type View = 'milestones' | 'history' | 'digest'

/**
 * Determines the initial view from the URL hash.
 * Falls back to 'milestones' if no valid hash is present.
 * Story 9.5: URL hash persistence
 */
function getInitialView(): View {
  const hash = window.location.hash.slice(1)
  if (hash === 'milestones' || hash === 'history' || hash === 'digest') return hash as View
  return 'milestones'
}

/**
 * Project detail page displaying Milestone Timeline, Project History, and Executive Digest.
 *
 * Epic 3 - Stories 3.5, 3.6, 3.7, 3.8, 3.13, 3.14, 3.15
 * Story 8.1 - Added milestone timeline view with 3-tab toggle
 * Story 8.2 - Added milestone flag toggle (star)
 * Story 8.4 - Added sharing & export functionality
 * Story 9.5 - Rename & Navigation Update (tab toggle, breadcrumb, hash persistence)
 * Story 10.2 - Added document upload button
 */
export function ProjectDetail() {
  const { id: projectId } = useParams<{ id: string }>()
  const [view, setView] = useState<View>(getInitialView)
  const [selectedDecision, setSelectedDecision] = useState<ProjectItem | null>(null)
  const [groupBy, setGroupBy] = useState<'date' | 'discipline'>('date')

  // Story 8.4: Share & Export state
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const milestoneTimelineRef = useRef<HTMLDivElement>(null)

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
    sourceTypes,
    itemTypes,
  } = useFilterStore()

  // Sync filter state with URL params (Story 9.4)
  useFilterUrlSync()

  // Hooks must be called unconditionally (rules-of-hooks)
  const { data, isLoading, error, refetch } = useProjectItems({ projectId: projectId || '' })
  const decisions = data?.items || []

  // Apply all filters client-side (must be before early return — rules-of-hooks)
  const filteredDecisions = useMemo(() => {
    let filtered = decisions

    // Discipline filter — V2 multi-discipline OR logic (Story 9.3)
    if (disciplines.length > 0) {
      filtered = filtered.filter(d => {
        if (d.affected_disciplines?.length > 0) {
          return d.affected_disciplines.some(disc =>
            disciplines.includes(disc.toLowerCase())
          )
        }
        return d.discipline ? disciplines.includes(d.discipline.toLowerCase()) : false
      })
    }

    // Source type filter (Story 9.4)
    if (sourceTypes.length > 0) {
      filtered = filtered.filter(d => sourceTypes.includes(d.source_type))
    }

    // Item type filter (Story 9.4)
    if (itemTypes.length > 0) {
      filtered = filtered.filter(d => itemTypes.includes(d.item_type))
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
  }, [decisions, disciplines, decisionMakers, meetingTypes, dateFrom, dateTo, searchQuery, sourceTypes, itemTypes])

  /** Update view and persist to URL hash (Story 9.5) */
  const handleViewChange = (newView: View) => {
    setView(newView)
    window.history.replaceState(null, '', `#${newView}`)
  }

  /** Human-readable label for the active tab (Story 9.5) */
  const viewLabel = view === 'milestones'
    ? 'Milestone Timeline'
    : view === 'history'
      ? 'Project History'
      : 'Executive Digest'

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

  const handleSelectMilestone = (id: string) => {
    const decision = decisions.find(d => d.id === id)
    setSelectedDecision(decision || null)
  }

  // Story 8.4: Export handlers
  const handleExportPDF = async () => {
    if (!milestoneTimelineRef.current) return
    setIsExporting(true)
    setExportMenuOpen(false)
    try {
      await exportAsPDF(milestoneTimelineRef.current, 'Project Milestones')
    } catch (err) {
      console.error('Error exporting PDF:', err)
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportJPEG = async () => {
    if (!milestoneTimelineRef.current) return
    setIsExporting(true)
    setExportMenuOpen(false)
    try {
      await exportAsJPEG(milestoneTimelineRef.current, 'Project Milestones')
    } catch (err) {
      console.error('Error exporting JPEG:', err)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb (Story 9.5) */}
        <nav className="text-sm text-gray-500 mb-4" aria-label="Breadcrumb">
          <a href="/projects" className="hover:text-blue-600">Projects</a>
          <span className="mx-2" aria-hidden="true">&rsaquo;</span>
          <span>Project</span>
          <span className="mx-2" aria-hidden="true">&rsaquo;</span>
          <span className="text-gray-900 font-medium">{viewLabel}</span>
        </nav>

        {/* Header with Document Upload (Story 9.5 heading + Story 10.2 upload) */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{viewLabel}</h1>
            <p className="text-sm text-gray-600">
              {filteredDecisions.length} decision{filteredDecisions.length !== 1 ? 's' : ''} found
            </p>
          </div>

          <div className="flex items-center gap-3">
            <DocumentUploadButton projectId={projectId} onUploadComplete={() => refetch()} />
          </div>
        </div>

        {/* Tab Toggle — segmented control (Story 9.5) */}
        <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-100 mb-4" role="tablist">
          <button
            role="tab"
            aria-selected={view === 'milestones'}
            onClick={() => handleViewChange('milestones')}
            className={cn(
              'inline-flex items-center px-4 py-1.5 text-sm rounded-md transition-colors',
              view === 'milestones'
                ? 'bg-white shadow-sm text-gray-900 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Star className="w-4 h-4 mr-1.5" />
            Milestone Timeline
          </button>
          <button
            role="tab"
            aria-selected={view === 'history'}
            onClick={() => handleViewChange('history')}
            className={cn(
              'inline-flex items-center px-4 py-1.5 text-sm rounded-md transition-colors',
              view === 'history'
                ? 'bg-white shadow-sm text-gray-900 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Clock className="w-4 h-4 mr-1.5" />
            Project History
          </button>
          <button
            role="tab"
            aria-selected={view === 'digest'}
            onClick={() => handleViewChange('digest')}
            className={cn(
              'inline-flex items-center px-4 py-1.5 text-sm rounded-md transition-colors',
              view === 'digest'
                ? 'bg-white shadow-sm text-gray-900 font-medium'
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <FileText className="w-4 h-4 mr-1.5" />
            Executive Digest
          </button>
        </div>

        {/* Share & Export toolbar — milestones view, admin only (Story 8.4) */}
        {view === 'milestones' && isAdmin && (
          <div className="mb-4 flex items-center gap-2 justify-end">
            <button
              onClick={() => setShareDialogOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              aria-label="Share milestone timeline"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>

            <div className="relative">
              <button
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
                aria-label="Export milestone timeline"
              >
                <Download className="w-4 h-4" />
                {isExporting ? 'Exporting...' : 'Export'}
                <ChevronDown className="w-3 h-3" />
              </button>

              {exportMenuOpen && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-md border border-gray-200 py-1 z-10">
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <FileText className="w-4 h-4 text-red-500" />
                    Export as PDF
                  </button>
                  <button
                    onClick={handleExportJPEG}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
                  >
                    <Image className="w-4 h-4 text-green-500" />
                    Export as JPEG
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

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
              ref={milestoneTimelineRef}
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

        {/* Share Dialog (Story 8.4) */}
        <ShareDialog
          projectId={projectId}
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
        />
      </div>
    </div>
  )
}
