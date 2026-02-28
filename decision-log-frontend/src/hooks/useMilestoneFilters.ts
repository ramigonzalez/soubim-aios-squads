import { useState, useEffect } from 'react'
import type { SourceType, ItemType } from '../types/projectItem'

/**
 * Hook for managing milestone filter state with URL persistence.
 * Reads initial state from URL search params and syncs changes back.
 * Story 8.3: Frontend — Milestone Timeline Filters
 */
export function useMilestoneFilters() {
  const [sourceFilters, setSourceFilters] = useState<SourceType[]>(() => {
    const params = new URLSearchParams(window.location.search)
    const source = params.get('source')
    return source ? source.split(',') as SourceType[] : []
  })

  const [itemTypeFilters, setItemTypeFilters] = useState<ItemType[]>(() => {
    const params = new URLSearchParams(window.location.search)
    const type = params.get('type')
    return type ? type.split(',') as ItemType[] : []
  })

  // Sync to URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (sourceFilters.length > 0) params.set('source', sourceFilters.join(','))
    else params.delete('source')
    if (itemTypeFilters.length > 0) params.set('type', itemTypeFilters.join(','))
    else params.delete('type')

    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}${window.location.hash}`
    window.history.replaceState(null, '', newUrl)
  }, [sourceFilters, itemTypeFilters])

  const toggleSource = (source: SourceType) => {
    setSourceFilters(prev =>
      prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]
    )
  }

  const toggleItemType = (type: ItemType) => {
    setItemTypeFilters(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    )
  }

  const clearAll = () => {
    setSourceFilters([])
    setItemTypeFilters([])
  }

  const activeCount = sourceFilters.length + itemTypeFilters.length

  return { sourceFilters, itemTypeFilters, toggleSource, toggleItemType, clearAll, activeCount }
}
