import { X } from 'lucide-react'
import type { SourceType, IngestionFilters } from '../../types/ingestion'

const SOURCE_TYPES: { label: string; value: SourceType | null }[] = [
  { label: 'All', value: null },
  { label: 'Meeting', value: 'meeting' },
  { label: 'Email', value: 'email' },
  { label: 'Document', value: 'document' },
]

interface IngestionFiltersBarProps {
  filters: IngestionFilters
  projects: { id: string; name: string }[]
  onSetFilter: (key: keyof IngestionFilters, value: string | null) => void
  onClearFilters: () => void
}

export default function IngestionFiltersBar({
  filters,
  projects,
  onSetFilter,
  onClearFilters,
}: IngestionFiltersBarProps) {
  const hasActiveFilters =
    filters.project_id !== null ||
    filters.source_type !== null ||
    filters.date_from !== null ||
    filters.date_to !== null

  return (
    <div className="space-y-3">
      {/* Filter controls row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Project select */}
        <select
          value={filters.project_id || ''}
          onChange={(e) => onSetFilter('project_id', e.target.value || null)}
          className="text-sm border border-gray-300 rounded-md px-3 py-1.5 bg-white text-gray-700 focus:ring-blue-500 focus:border-blue-500"
          aria-label="Filter by project"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Source type chips */}
        <div className="flex items-center gap-1">
          {SOURCE_TYPES.map((st) => (
            <button
              key={st.label}
              onClick={() => onSetFilter('source_type', st.value)}
              className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                filters.source_type === st.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.date_from || ''}
            onChange={(e) => onSetFilter('date_from', e.target.value || null)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:ring-blue-500 focus:border-blue-500"
            aria-label="Filter from date"
          />
          <span className="text-gray-400 text-sm">to</span>
          <input
            type="date"
            value={filters.date_to || ''}
            onChange={(e) => onSetFilter('date_to', e.target.value || null)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:ring-blue-500 focus:border-blue-500"
            aria-label="Filter to date"
          />
        </div>

        {/* Clear All */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.project_id && (
            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">
              Project: {projects.find((p) => p.id === filters.project_id)?.name || filters.project_id}
              <button
                onClick={() => onSetFilter('project_id', null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label="Remove project filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.source_type && (
            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">
              Type: {filters.source_type}
              <button
                onClick={() => onSetFilter('source_type', null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label="Remove type filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.date_from && (
            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">
              From: {filters.date_from}
              <button
                onClick={() => onSetFilter('date_from', null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label="Remove from date filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.date_to && (
            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">
              To: {filters.date_to}
              <button
                onClick={() => onSetFilter('date_to', null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label="Remove to date filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
