/**
 * @deprecated Replaced by FilterBar (Story 3.6 v2 redesign)
 * Kept for reference only — not imported anywhere.
 */

import { useFilterStore } from '../../store/filterStore'
import { Search, X } from 'lucide-react'

const DISCIPLINES = ['architecture', 'mep', 'landscape', 'structural', 'electrical', 'plumbing']

export function FiltersSidebar() {
  const {
    disciplines,
    searchQuery,
    toggleDiscipline,
    setSearchQuery,
    reset,
  } = useFilterStore()

  return (
    <div className="bg-white border-r border-gray-200 p-6 w-64 overflow-y-auto max-h-[calc(100vh-64px)]">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        <button
          onClick={reset}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Clear
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search decisions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Disciplines */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Disciplines</h3>
        <div className="space-y-2">
          {DISCIPLINES.map((discipline) => (
            <label key={discipline} className="flex items-center">
              <input
                type="checkbox"
                checked={disciplines.includes(discipline)}
                onChange={() => toggleDiscipline(discipline)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 capitalize">{discipline}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Active Filters Summary */}
      {(disciplines.length > 0 || searchQuery) && (
        <div className="pt-6 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-600 mb-2">Active Filters:</p>
          <div className="flex flex-wrap gap-2">
            {disciplines.map((d) => (
              <span key={d} className="inline-flex items-center gap-1 bg-blue-100 text-blue-900 px-2 py-1 rounded-full text-xs">
                {d}
                <button onClick={() => toggleDiscipline(d)} className="hover:text-blue-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-900 px-2 py-1 rounded-full text-xs">
                {searchQuery}
                <button onClick={() => setSearchQuery('')} className="hover:text-gray-700">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
