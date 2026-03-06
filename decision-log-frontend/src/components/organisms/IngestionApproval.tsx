import { useMemo } from 'react'
import { AlertCircle, Inbox, RefreshCw, Trash2 } from 'lucide-react'
import { useIngestion, useIngestionHistory, useFilteredSources } from '../../hooks/useIngestion'
import { useBatchAction, useApproveSource, useRejectSource, useRetrySource, useDeleteSource } from '../../hooks/useIngestionMutation'
import { useIngestionStore } from '../../store/ingestionStore'
import IngestionFiltersBar from '../molecules/IngestionFiltersBar'
import IngestionStatusBadge from '../molecules/IngestionStatusBadge'
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
          <td colSpan={12} className="px-4 py-3">
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

function getSourceLabel(source: Source): string {
  switch (source.source_type) {
    case 'meeting': return source.title || source.call_id
    case 'email': return source.subject || source.email_id
    case 'document': return source.file_name || source.document_id
  }
}

export default function IngestionApproval() {
  const { data, isLoading, error, refetch } = useIngestion()
  const { data: historyData, isLoading: historyLoading, error: historyError, refetch: historyRefetch } = useIngestionHistory()
  const batchAction = useBatchAction()
  const approveSource = useApproveSource()
  const rejectSource = useRejectSource()
  const retrySource = useRetrySource()
  const deleteSource = useDeleteSource()
  const {
    activeTab, selectedIds, filters, deleteConfirmId,
    setActiveTab, toggleSelected, selectAll, clearSelection, setFilter, clearFilters, setDeleteConfirmId,
  } = useIngestionStore()

  const filteredSources = useFilteredSources(data?.sources, filters)
  const filteredHistory = useFilteredSources(historyData?.sources, filters)

  // Sort: meetings first, then emails, then documents
  const sortedSources = useMemo(() => {
    const order: Record<string, number> = { meeting: 0, email: 1, document: 2 }
    return [...filteredSources].sort((a, b) => order[a.source_type] - order[b.source_type])
  }, [filteredSources])

  const sortedHistory = useMemo(() => {
    const order: Record<string, number> = { meeting: 0, email: 1, document: 2 }
    return [...filteredHistory].sort((a, b) => order[a.source_type] - order[b.source_type])
  }, [filteredHistory])

  // Derive unique projects for filter dropdown
  const projects = useMemo(() => {
    const allSources = [...(data?.sources || []), ...(historyData?.sources || [])]
    if (allSources.length === 0) return []
    const map = new Map<string, string>()
    allSources.forEach((s) => map.set(s.project_id, s.project_name))
    return Array.from(map, ([id, name]) => ({ id, name }))
  }, [data?.sources, historyData?.sources])

  const allVisibleIds = sortedSources.map((s) => s.id)
  const allSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.has(id))

  function handleSelectAll() {
    if (allSelected) {
      clearSelection()
    } else {
      selectAll(allVisibleIds)
    }
  }

  function handleApproveSource(id: string) {
    approveSource.mutate(id)
  }

  function handleRejectSource(id: string) {
    rejectSource.mutate(id)
  }

  function handleRetrySource(id: string) {
    retrySource.mutate(id)
  }

  function handleDeleteSource(id: string) {
    deleteSource.mutate(id, {
      onSuccess: () => setDeleteConfirmId(null),
    })
  }

  const isSourceActionLoading = approveSource.isLoading || rejectSource.isLoading || retrySource.isLoading

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
    const rowProps = {
      source,
      selected: isSelected,
      onToggleSelect: toggleSelected,
      onApprove: handleApproveSource,
      onReject: handleRejectSource,
      onRetry: handleRetrySource,
      isActionLoading: isSourceActionLoading,
    }
    switch (source.source_type) {
      case 'meeting':
        return <MeetingSourceRow key={source.id} {...rowProps} source={source} />
      case 'email':
        return <EmailSourceRow key={source.id} {...rowProps} source={source} />
      case 'document':
        return <DocumentSourceRow key={source.id} {...rowProps} source={source} />
    }
  }

  const currentError = activeTab === 'pending' ? error : historyError
  const currentRefetch = activeTab === 'pending' ? refetch : historyRefetch
  const currentLoading = activeTab === 'pending' ? isLoading : historyLoading
  const currentSources = activeTab === 'pending' ? sortedSources : sortedHistory

  const deleteConfirmSource = deleteConfirmId
    ? currentSources.find((s) => s.id === deleteConfirmId) || historyData?.sources.find((s) => s.id === deleteConfirmId)
    : null

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

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'pending'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending
            {data && data.pending_count > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-white bg-blue-600 rounded-full">
                {data.pending_count}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            History
            {historyData && historyData.total > 0 && (
              <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold leading-none text-gray-600 bg-gray-100 rounded-full">
                {historyData.total}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Filters */}
      <IngestionFiltersBar
        filters={filters}
        projects={projects}
        onSetFilter={setFilter}
        onClearFilters={clearFilters}
      />

      {/* Error state */}
      {!!currentError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-400 mb-2" />
          <h3 className="text-sm font-medium text-red-800">Failed to load sources</h3>
          <p className="mt-1 text-sm text-red-600">
            {currentError instanceof Error ? currentError.message : 'An unexpected error occurred'}
          </p>
          <button
            onClick={() => currentRefetch()}
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-red-700 hover:text-red-900"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </button>
        </div>
      )}

      {/* Pending Tab — Source Table */}
      {activeTab === 'pending' && !currentError && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full divide-y divide-gray-200 bg-white table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="w-10 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={handleSelectAll}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    aria-label="Select all"
                  />
                </th>
                <th scope="col" style={{ width: 120 }} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider overflow-hidden resize-x">
                  ID
                </th>
                <th scope="col" style={{ width: 160 }} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider overflow-hidden resize-x">
                  Project
                </th>
                <th scope="col" style={{ width: 160 }} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider overflow-hidden resize-x">
                  Date
                </th>
                <th scope="col" style={{ width: 200 }} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider overflow-hidden resize-x">
                  Detail
                </th>
                <th scope="col" style={{ width: 140 }} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider overflow-hidden resize-x">
                  Type/From
                </th>
                <th scope="col" style={{ width: 100 }} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider overflow-hidden resize-x">
                  Info
                </th>
                <th scope="col" style={{ width: 80 }} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" style={{ width: 60 }} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Incl.
                </th>
                <th scope="col" style={{ width: 220 }} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider overflow-hidden resize-x">
                  AI Summary
                </th>
                <th scope="col" style={{ width: 70 }} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Link
                </th>
                <th scope="col" style={{ width: 80 }} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {currentLoading && <SkeletonRows />}
              {!currentLoading && currentSources.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center">
                    <Inbox className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                    <h3 className="text-sm font-medium text-gray-900">No pending items</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      All ingestion sources have been reviewed or no sources match your filters.
                    </p>
                  </td>
                </tr>
              )}
              {!currentLoading && currentSources.map(renderRow)}
            </tbody>
          </table>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && !currentError && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full divide-y divide-gray-200 bg-white">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reviewed By
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reviewed At
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {historyLoading && <SkeletonRows />}
              {!historyLoading && sortedHistory.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <Inbox className="mx-auto h-10 w-10 text-gray-300 mb-3" />
                    <h3 className="text-sm font-medium text-gray-900">No history yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Sources will appear here after being approved, rejected, or failed.
                    </p>
                  </td>
                </tr>
              )}
              {!historyLoading && sortedHistory.map((source) => (
                <tr key={source.id} className="hover:bg-gray-50 transition-colors duration-100">
                  <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate" title={getSourceLabel(source)}>
                    {getSourceLabel(source)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 truncate" title={source.project_name}>
                    {source.project_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 capitalize">
                    {source.source_type}
                  </td>
                  <td className="px-4 py-3">
                    <IngestionStatusBadge status={source.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {source.approved_by_name || source.rejected_by_name || '--'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {source.approved_at
                      ? new Date(source.approved_at).toLocaleDateString()
                      : source.rejected_at
                        ? new Date(source.rejected_at).toLocaleDateString()
                        : '--'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {source.extracted_item_count > 0 ? (
                      <span className="inline-flex items-center bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                        {source.extracted_item_count} items
                      </span>
                    ) : (
                      <span className="text-gray-400">--</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {source.status === 'failed' && (
                        <button
                          onClick={() => handleRetrySource(source.id)}
                          disabled={retrySource.isLoading}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-orange-50 text-orange-600 hover:bg-orange-100 hover:text-orange-700 transition-colors disabled:opacity-50"
                          title="Retry"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      )}
                      {source.status !== 'pending' && (
                        <button
                          onClick={() => setDeleteConfirmId(source.id)}
                          disabled={deleteSource.isLoading}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors disabled:opacity-50"
                          title="Delete source and extracted items"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && deleteConfirmSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900">Delete Source</h3>
            <p className="mt-2 text-sm text-gray-600">
              This will permanently delete <strong>{getSourceLabel(deleteConfirmSource)}</strong>
              {deleteConfirmSource.extracted_item_count > 0 && (
                <> and its <strong>{deleteConfirmSource.extracted_item_count} extracted items</strong> (including embeddings)</>
              )}.
            </p>
            <p className="mt-1 text-sm text-red-600 font-medium">This action cannot be undone.</p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteSource(deleteConfirmId)}
                disabled={deleteSource.isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleteSource.isLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk action bar (pending tab only) */}
      {activeTab === 'pending' && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          onApprove={handleBulkApprove}
          onReject={handleBulkReject}
          isLoading={batchAction.isLoading}
        />
      )}
    </div>
  )
}
