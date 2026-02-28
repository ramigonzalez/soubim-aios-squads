import { useEffect, useRef } from 'react'
import { useFilterStore } from '../store/filterStore'
import type { SourceType, ItemType } from '../types/projectItem'

/**
 * Syncs filter state between Zustand store and URL query params.
 * Story 9.4 — enables shareable filter links.
 *
 * On mount: reads URL params and hydrates the filter store (once).
 * On filter change: writes current filters to URL via replaceState.
 */
export function useFilterUrlSync() {
  const {
    sourceTypes,
    itemTypes,
    disciplines,
    searchQuery,
    setSourceTypes,
    setItemTypes,
    setDisciplines,
  } = useFilterStore()
  const initialized = useRef(false)

  // Hydrate from URL on mount (once)
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const params = new URLSearchParams(window.location.search)
    const source = params.get('source')
    const type = params.get('type')
    const discipline = params.get('discipline')

    if (source) setSourceTypes(source.split(',') as SourceType[])
    if (type) setItemTypes(type.split(',') as ItemType[])
    if (discipline) setDisciplines(discipline.split(','))
  }, [setSourceTypes, setItemTypes, setDisciplines])

  // Sync to URL on filter change
  useEffect(() => {
    if (!initialized.current) return

    const params = new URLSearchParams()
    if (sourceTypes.length) params.set('source', sourceTypes.join(','))
    if (itemTypes.length) params.set('type', itemTypes.join(','))
    if (disciplines.length) params.set('discipline', disciplines.join(','))
    if (searchQuery) params.set('q', searchQuery)

    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}${window.location.hash}`
    window.history.replaceState(null, '', newUrl)
  }, [sourceTypes, itemTypes, disciplines, searchQuery])
}
