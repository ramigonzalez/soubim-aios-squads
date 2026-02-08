import { useState, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { useFilterStore } from '../../store/filterStore'
import { useDebounce } from '../../hooks/useDebounce'
import { FilterPopover } from '../molecules/FilterPopover'
import { getDisciplinePillColors, formatDate } from '../../lib/utils'
import { Decision } from '../../types/decision'

const DISCIPLINES = ['architecture', 'mep', 'structural', 'electrical', 'plumbing', 'landscape']

interface FilterBarProps {
  decisions: Decision[]
}

export function FilterBar({ decisions }: FilterBarProps) {
  const {
    disciplines,
    decisionMakers,
    dateFrom,
    dateTo,
    searchQuery,
    toggleDiscipline,
    toggleDecisionMaker,
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

  const activeFilterCount =
    disciplines.length +
    decisionMakers.length +
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

  return (
    <nav
      className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm mb-4"
      aria-label="Filter decisions"
    >
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search decisions..."
            className="w-full pl-9 pr-8 py-1.5 text-sm border-0 focus:ring-0 focus:outline-none bg-transparent"
          />
          {localSearch && (
            <button
              onClick={() => { setLocalSearch(''); setSearchQuery('') }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Discipline Filter */}
        <FilterPopover label="Discipline" activeCount={disciplines.length}>
          <div className="space-y-2">
            {DISCIPLINES.map((d) => (
              <label key={d} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={disciplines.includes(d)}
                  onChange={() => toggleDiscipline(d)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 capitalize">{d}</span>
              </label>
            ))}
          </div>
        </FilterPopover>

        {/* Date Range Filter */}
        <FilterPopover label="Date" activeCount={dateFrom || dateTo ? 1 : 0} width="w-64">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input
                type="date"
                value={dateFrom || ''}
                onChange={(e) => setDateRange(e.target.value || null, dateTo)}
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input
                type="date"
                value={dateTo || ''}
                onChange={(e) => setDateRange(dateFrom, e.target.value || null)}
                className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="border-t border-gray-100 pt-2">
              <p className="text-xs font-medium text-gray-500 mb-1.5">Quick</p>
              <div className="space-y-1">
                {[
                  { label: 'Last 7 days', value: '7days' },
                  { label: 'Last 30 days', value: '30days' },
                  { label: 'This month', value: 'month' },
                  { label: 'All time', value: 'all' },
                ].map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handleDatePreset(preset.value)}
                    className="block w-full text-left text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </FilterPopover>

        {/* Who (Decision Maker) Filter */}
        <FilterPopover label="Who" activeCount={decisionMakers.length}>
          <div>
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" aria-hidden="true" />
              <input
                type="text"
                value={whoSearch}
                onChange={(e) => setWhoSearch(e.target.value)}
                placeholder="Filter names..."
                className="w-full pl-7 pr-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {filteredMakers.length === 0 ? (
                <p className="text-xs text-gray-400 py-1">No names found</p>
              ) : (
                filteredMakers.map((name) => (
                  <label key={name} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={decisionMakers.includes(name)}
                      onChange={() => toggleDecisionMaker(name)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{name}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        </FilterPopover>

        {/* Clear All Button */}
        {activeFilterCount > 0 && (
          <button
            onClick={() => { reset(); setLocalSearch('') }}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            aria-label="Clear all filters"
          >
            <X className="w-3 h-3" />
            Clear ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
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
