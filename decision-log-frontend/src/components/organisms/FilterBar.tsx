import { useState, useMemo } from 'react'
import { Search, X, Building2, Calendar, Users, Tag } from 'lucide-react'
import { useFilterStore } from '../../store/filterStore'
import { useDebounce } from '../../hooks/useDebounce'
import { FilterPopover } from '../molecules/FilterPopover'
import { getDisciplinePillColors, getMeetingTypeColors, formatDate } from '../../lib/utils'
import { Decision } from '../../types/decision'

const DISCIPLINES = ['architecture', 'mep', 'structural', 'electrical', 'plumbing', 'landscape']

interface FilterBarProps {
  decisions: Decision[]
  groupBy: 'date' | 'discipline'
  onGroupByChange: (value: 'date' | 'discipline') => void
}

export function FilterBar({ decisions, groupBy, onGroupByChange }: FilterBarProps) {
  const {
    disciplines,
    decisionMakers,
    meetingTypes,
    dateFrom,
    dateTo,
    searchQuery,
    toggleDiscipline,
    toggleDecisionMaker,
    toggleMeetingType,
    setDateRange,
    setSearchQuery,
    reset,
  } = useFilterStore()

  const [localSearch, setLocalSearch] = useState(searchQuery)
  const [whoSearch, setWhoSearch] = useState('')
  const debouncedSearch = useDebounce(localSearch, 300)

  // Sync debounced search to store
  if (debouncedSearch !== searchQuery) {
    setSearchQuery(debouncedSearch)
  }

  // Extract unique decision makers from decisions
  const availableMakers = useMemo(() => {
    const names = decisions.map((d) => d.who).filter(Boolean)
    return [...new Set(names)].sort()
  }, [decisions])

  const filteredMakers = useMemo(() => {
    if (!whoSearch) return availableMakers
    return availableMakers.filter((name) =>
      name.toLowerCase().includes(whoSearch.toLowerCase())
    )
  }, [availableMakers, whoSearch])

  // Extract unique meeting types from decisions
  const availableMeetingTypes = useMemo(() => {
    const types = decisions.map((d) => d.meeting_type).filter(Boolean) as string[]
    return [...new Set(types.map(t => t.toLowerCase()))].sort()
  }, [decisions])

  const activeFilterCount =
    disciplines.length +
    decisionMakers.length +
    meetingTypes.length +
    (dateFrom || dateTo ? 1 : 0) +
    (searchQuery ? 1 : 0)

  const handleDatePreset = (preset: string) => {
    const now = new Date()
    let from: string | null = null
    const to: string | null = now.toISOString().split('T')[0]

    switch (preset) {
      case '7days': {
        const d = new Date(now)
        d.setDate(d.getDate() - 7)
        from = d.toISOString().split('T')[0]
        break
      }
      case '30days': {
        const d = new Date(now)
        d.setDate(d.getDate() - 30)
        from = d.toISOString().split('T')[0]
        break
      }
      case 'month': {
        from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
        break
      }
      case 'all':
        setDateRange(null, null)
        return
    }
    setDateRange(from, to)
  }

  // Capitalize meeting type for display
  const formatMeetingType = (type: string) =>
    type.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

  return (
    <nav
      className="bg-white border border-gray-200 rounded-lg shadow-sm mb-4"
      aria-label="Filter decisions"
    >
      {/* Row 1: Search input — full width */}
      <div className="px-3 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search decisions..."
            className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-200 focus:border-blue-300 focus:outline-none bg-gray-50/50"
          />
          {localSearch && (
            <button
              onClick={() => { setLocalSearch(''); setSearchQuery('') }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Row 2: Filter pills + Group-by toggle */}
      <div className="px-3 pb-3 flex items-center gap-2 flex-wrap">
        {/* Discipline Filter */}
        <FilterPopover
          label="Discipline"
          icon={<Building2 className="w-3.5 h-3.5" />}
          activeCount={disciplines.length}
        >
          <div className="space-y-1">
            {DISCIPLINES.map((d) => (
              <label
                key={d}
                className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={disciplines.includes(d)}
                  onChange={() => toggleDiscipline(d)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-sm text-gray-700 capitalize">{d}</span>
              </label>
            ))}
          </div>
        </FilterPopover>

        {/* Date Range Filter */}
        <FilterPopover
          label="Date range"
          icon={<Calendar className="w-3.5 h-3.5" />}
          activeCount={dateFrom || dateTo ? 1 : 0}
          width="w-64"
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
              <input
                type="date"
                value={dateFrom || ''}
                onChange={(e) => setDateRange(e.target.value || null, dateTo)}
                className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-200 focus:border-blue-300 focus:outline-none text-gray-700"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
              <input
                type="date"
                value={dateTo || ''}
                onChange={(e) => setDateRange(dateFrom, e.target.value || null)}
                className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-200 focus:border-blue-300 focus:outline-none text-gray-700"
              />
            </div>
            <div className="border-t border-gray-100 pt-2">
              <p className="text-xs font-medium text-gray-400 mb-1.5">Quick</p>
              <div className="space-y-0.5">
                {[
                  { label: 'Last 7 days', value: '7days' },
                  { label: 'Last 30 days', value: '30days' },
                  { label: 'This month', value: 'month' },
                  { label: 'All time', value: 'all' },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handleDatePreset(preset.value)}
                    className="block w-full text-left text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-md transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </FilterPopover>

        {/* Who (Decision Maker) Filter */}
        <FilterPopover
          label="Who"
          icon={<Users className="w-3.5 h-3.5" />}
          activeCount={decisionMakers.length}
        >
          <div>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
              <input
                type="text"
                value={whoSearch}
                onChange={(e) => setWhoSearch(e.target.value)}
                placeholder="Filter names..."
                className="w-full pl-7 pr-2 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-200 focus:border-blue-300 focus:outline-none"
              />
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {filteredMakers.length === 0 ? (
                <p className="text-xs text-gray-400 py-1 px-2">No names found</p>
              ) : (
                filteredMakers.map((name) => (
                  <label
                    key={name}
                    className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={decisionMakers.includes(name)}
                      onChange={() => toggleDecisionMaker(name)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">{name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </FilterPopover>

        {/* Meeting Type Filter (Story 3.15) */}
        <FilterPopover
          label="Type"
          icon={<Tag className="w-3.5 h-3.5" />}
          activeCount={meetingTypes.length}
        >
          <div className="space-y-1">
            {availableMeetingTypes.length === 0 ? (
              <p className="text-xs text-gray-400 py-1 px-2">No meeting types found</p>
            ) : (
              availableMeetingTypes.map((type) => {
                const colors = getMeetingTypeColors(type)
                return (
                  <label
                    key={type}
                    className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${colors.dot} flex-shrink-0`} />
                    <input
                      type="checkbox"
                      checked={meetingTypes.includes(type)}
                      onChange={() => toggleMeetingType(type)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-sm text-gray-700">{formatMeetingType(type)}</span>
                  </label>
                )
              })
            )}
          </div>
        </FilterPopover>

        {/* Clear All Button */}
        {activeFilterCount > 0 && (
          <button
            onClick={() => { reset(); setLocalSearch('') }}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Clear all filters"
          >
            <X className="w-3 h-3" />
            Clear ({activeFilterCount})
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Group-by Toggle — inline segmented control */}
        <div
          className="inline-flex rounded-full border border-gray-200 p-0.5 bg-gray-100"
          role="radiogroup"
          aria-label="Group decisions by"
        >
          <button
            role="radio"
            aria-checked={groupBy === 'date'}
            onClick={() => onGroupByChange('date')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
              groupBy === 'date'
                ? 'text-gray-900 bg-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Date
          </button>
          <button
            role="radio"
            aria-checked={groupBy === 'discipline'}
            onClick={() => onGroupByChange('discipline')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
              groupBy === 'discipline'
                ? 'text-gray-900 bg-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Discipline
          </button>
        </div>
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pb-3">
          {disciplines.map((d) => {
            const colors = getDisciplinePillColors(d)
            return (
              <span
                key={`disc-${d}`}
                className={`inline-flex items-center gap-1 ${colors.bg} ${colors.text} text-xs px-2 py-1 rounded-full`}
              >
                {d.charAt(0).toUpperCase() + d.slice(1)}
                <button
                  onClick={() => toggleDiscipline(d)}
                  aria-label={`Remove ${d} filter`}
                  className="hover:opacity-70"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )
          })}

          {meetingTypes.map((type) => {
            const colors = getMeetingTypeColors(type)
            return (
              <span
                key={`type-${type}`}
                className={`inline-flex items-center gap-1 ${colors.bg} ${colors.text} text-xs px-2 py-1 rounded-full`}
              >
                {formatMeetingType(type)}
                <button
                  onClick={() => toggleMeetingType(type)}
                  aria-label={`Remove ${type} filter`}
                  className="hover:opacity-70"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )
          })}

          {decisionMakers.map((name) => (
            <span
              key={`who-${name}`}
              className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
            >
              {name}
              <button
                onClick={() => toggleDecisionMaker(name)}
                aria-label={`Remove ${name} filter`}
                className="hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}

          {(dateFrom || dateTo) && (
            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
              {dateFrom ? formatDate(dateFrom) : '...'} – {dateTo ? formatDate(dateTo) : '...'}
              <button
                onClick={() => setDateRange(null, null)}
                aria-label="Remove date filter"
                className="hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}

          {searchQuery && (
            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
              &quot;{searchQuery}&quot;
              <button
                onClick={() => { setSearchQuery(''); setLocalSearch('') }}
                aria-label="Remove search filter"
                className="hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </nav>
  )
}
