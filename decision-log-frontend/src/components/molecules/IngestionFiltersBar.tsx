import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getSourceTypeLabel } from '../../lib/utils'
import type { SourceType, IngestionFilters } from '../../types/ingestion'

const SOURCE_TYPES: (SourceType | null)[] = [null, 'meeting', 'email', 'document']

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
  const { t } = useTranslation('ingestion')
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
          aria-label={t('filters.byProject')}
        >
          <option value="">{t('filters.allProjects')}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Source type chips */}
        <div className="flex items-center gap-1">
          {SOURCE_TYPES.map((value) => (
            <button
              key={value ?? 'all'}
              onClick={() => onSetFilter('source_type', value)}
              className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                filters.source_type === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {value ? getSourceTypeLabel(value) : t('filters.all')}
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
            aria-label={t('filters.fromDate')}
          />
          <span className="text-gray-400 text-sm">{t('filters.to')}</span>
          <input
            type="date"
            value={filters.date_to || ''}
            onChange={(e) => onSetFilter('date_to', e.target.value || null)}
            className="text-sm border border-gray-300 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:ring-blue-500 focus:border-blue-500"
            aria-label={t('filters.toDate')}
          />
        </div>

        {/* Clear All */}
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-red-600 hover:text-red-800 font-medium"
          >
            {t('filters.clearAll')}
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.project_id && (
            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">
              {t('filters.chipProject', { value: projects.find((p) => p.id === filters.project_id)?.name || filters.project_id })}
              <button
                onClick={() => onSetFilter('project_id', null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label={t('filters.removeProject')}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.source_type && (
            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">
              {t('filters.chipType', { value: getSourceTypeLabel(filters.source_type) })}
              <button
                onClick={() => onSetFilter('source_type', null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label={t('filters.removeType')}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.date_from && (
            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">
              {t('filters.chipFrom', { value: filters.date_from })}
              <button
                onClick={() => onSetFilter('date_from', null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label={t('filters.removeFrom')}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filters.date_to && (
            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-full">
              {t('filters.chipTo', { value: filters.date_to })}
              <button
                onClick={() => onSetFilter('date_to', null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
                aria-label={t('filters.removeTo')}
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
