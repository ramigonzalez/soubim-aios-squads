import { useMemo } from 'react'
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react'
import { useIngestion, useFilteredSources } from '../../hooks/useIngestion'
import { useToggleInclude, useBatchAction } from '../../hooks/useIngestionMutation'
import { useIngestionStore } from '../../store/ingestionStore'
import IngestionFiltersBar from '../molecules/IngestionFiltersBar'
import MeetingSourceRow from '../molecules/MeetingSourceRow'
import EmailSourceRow from '../molecules/EmailSourceRow'
import DocumentSourceRow from '../molecules/DocumentSourceRow'
import BulkActionBar from './BulkActionBar'
import type { Source } from '../../types/ingestion'

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <tr key={i}>
          <td colSpan={11} className="px-4 py-3">
            <div className="animate-pulse flex items-center space-x-4">
              <div className="h-4 w-4 bg-gray-200 rounded" />
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-4 w-32 bg-gray-200 rounded" />
              <div className="h-4 w-28 bg-gray-200 rounded" />
              <div className="h-4 w-20 bg-gray-200 rounded" />
              <div className="h-5 w-16 bg-gray-200 rounded-full" />
              <div className="h-5 w-9 bg-gray-200 rounded-full" />
            </div>
          </td>
        </tr>
      ))}
    </>
  )
}

export default function IngestionApproval() {
  const { data, isLoading, error, refetch } = useIngestion()
  const toggleInclude = useToggleInclude()
  const batchAction = useBatchAction()
  const { selectedIds, filters, toggleSelected, selectAll, clearSelection, setFilter, clearFilters } =
    useIngestionStore()

  const filteredSources = useFilteredSources(data?.sources, filters)

  // Sort: meetings first, then emails, then documents
  const sortedSources = useMemo(() => {
    const order: Record<string, number> = { meeting: 0, email: 1, document: 2 }
    return [...filteredSources].sort((a, b) => order[a.source_type] - order[b.source_type])
  }, [filteredSources])

  // Derive unique projects for filter dropdown
  const projects = useMemo(() => {
    if (!data?.sources) return []
    const map = new Map<string, string>()
    data.sources.forEach((s) => map.set(s.project_id, s.project_name))
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [data?.sources])

  const allVisibleIds = sortedSources.map((s) => s.id)
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id))

  function handleSelectAll() {
    if (allSelected) {
      clearSelection()
    } else {
      selectAll(allVisibleIds)
    }
  }

  function handleToggleInclude(id: string, included: boolean) {
    toggleInclude.mutate({ id, included })
  }

  function handleBulkApprove() {
    const ids = Array.from(selectedIds)
    batchAction.mutate(
      { source_ids: ids, action: 'approve' },
      { onSuccess: () => clearSelection() }
    )
  }

  function handleBulkReject() {
    const ids = Array.from(selectedIds)
    batchAction.mutate(
      { source_ids: ids, action: 'reject' },
      { onSuccess: () => clearSelection() }
    )
  }

  function renderRow(source: Source) {
    const isSelected = selectedIds.has(source.id)
    switch (source.source_type) {
      case 'meeting':
        return (
          <MeetingSourceRow
            key={source.id}
            source={source}
            selected={isSelected}
            onToggleSelect={toggleSelected}
            onToggleInclude={handleToggleInclude}
          />
        )
      case 'email':
        return (
          <EmailSourceRow
            key={source.id}
            source={source}
            selected={isSelected}
            onToggleSelect={toggleSelected}
            onToggleInclude={handleToggleInclude}
          />
        )
      case 'document':
        return (
          <DocumentSourceRow
            key={source.id}
            source={source}
            selected={isSelected}
            onToggleSelect={toggleSelected}
            onToggleInclude={handleToggleInclude}
          />
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ingestion Approval</h1>
        {data && (
          <p className="mt-1 text-sm text-gray-500">
            {data.pending_count} pending {data.pending_count === 1 ? 'item' : 'items'} &middot;{' '}
            {data.total} total
          </p>
        )}
      </div>

      {/* Filters */}
      <IngestionFiltersBar
        filters={filters}
        projects={projects}
        onSetFilter={setFilter}
        onClearFilters={clearFilters}
      />

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-400 mb-2" />
          <h3 className="text-sm font-medium text-red-800">Failed to load sources</h3>
          <p className="mt-1 text-sm text-red-600">
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => refetch()}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-red-700 hover:text-red-900"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      )}

      {/* Table */}
      {!error && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    aria-label="Select all"
                  />
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Detail
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type/From
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Info
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Include
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AI Summary
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Link
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && <SkeletonRows />}
              {!isLoading && sortedSources.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center">
                    <Inbox className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                    <h3 className="text-sm font-medium text-gray-900">No pending items</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      All ingestion sources have been reviewed or no sources match your filters.
                    </p>
                  </td>
                </tr>
              )}
              {!isLoading && sortedSources.map(renderRow)}
            </tbody>
          </table>
        </div>
      )}

      {/* Bulk action bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onApprove={handleBulkApprove}
        onReject={handleBulkReject}
        isLoading={batchAction.isLoading}
      />
    </div>
  )
}
