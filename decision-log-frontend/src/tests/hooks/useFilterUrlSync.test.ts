import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useFilterUrlSync } from '../../hooks/useFilterUrlSync'
import { useFilterStore } from '../../store/filterStore'

// Mock the filter store
vi.mock('../../store/filterStore', () => ({
  useFilterStore: vi.fn(),
}))

describe('useFilterUrlSync (Story 9.4)', () => {
  const mockSetSourceTypes = vi.fn()
  const mockSetItemTypes = vi.fn()
  const mockSetDisciplines = vi.fn()

  let originalLocation: Location
  let originalReplaceState: typeof window.history.replaceState

  beforeEach(() => {
    vi.clearAllMocks()

    // Save originals
    originalLocation = window.location
    originalReplaceState = window.history.replaceState

    // Mock replaceState
    window.history.replaceState = vi.fn()

    // Default mock store
    vi.mocked(useFilterStore).mockReturnValue({
      sourceTypes: [],
      itemTypes: [],
      disciplines: [],
      searchQuery: '',
      setSourceTypes: mockSetSourceTypes,
      setItemTypes: mockSetItemTypes,
      setDisciplines: mockSetDisciplines,
    } as unknown as ReturnType<typeof useFilterStore>)
  })

  afterEach(() => {
    window.history.replaceState = originalReplaceState
  })

  function setLocationSearch(search: string) {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        ...originalLocation,
        search,
        pathname: '/projects/123',
        hash: '',
      },
    })
  }

  it('hydrates source types from URL params on mount', () => {
    setLocationSearch('?source=meeting,email')
    renderHook(() => useFilterUrlSync())
    expect(mockSetSourceTypes).toHaveBeenCalledWith(['meeting', 'email'])
  })

  it('hydrates item types from URL params on mount', () => {
    setLocationSearch('?type=decision,topic')
    renderHook(() => useFilterUrlSync())
    expect(mockSetItemTypes).toHaveBeenCalledWith(['decision', 'topic'])
  })

  it('hydrates disciplines from URL params on mount', () => {
    setLocationSearch('?discipline=architecture,structural')
    renderHook(() => useFilterUrlSync())
    expect(mockSetDisciplines).toHaveBeenCalledWith(['architecture', 'structural'])
  })

  it('does not call setters when URL params are empty', () => {
    setLocationSearch('')
    renderHook(() => useFilterUrlSync())
    expect(mockSetSourceTypes).not.toHaveBeenCalled()
    expect(mockSetItemTypes).not.toHaveBeenCalled()
    expect(mockSetDisciplines).not.toHaveBeenCalled()
  })

  it('syncs filter state to URL via replaceState', () => {
    setLocationSearch('')
    vi.mocked(useFilterStore).mockReturnValue({
      sourceTypes: ['meeting'],
      itemTypes: ['decision'],
      disciplines: ['architecture'],
      searchQuery: 'foundation',
      setSourceTypes: mockSetSourceTypes,
      setItemTypes: mockSetItemTypes,
      setDisciplines: mockSetDisciplines,
    } as unknown as ReturnType<typeof useFilterStore>)

    renderHook(() => useFilterUrlSync())

    expect(window.history.replaceState).toHaveBeenCalledWith(
      null,
      '',
      '/projects/123?source=meeting&type=decision&discipline=architecture&q=foundation'
    )
  })

  it('produces clean URL when all filters are empty', () => {
    setLocationSearch('')
    renderHook(() => useFilterUrlSync())

    expect(window.history.replaceState).toHaveBeenCalledWith(
      null,
      '',
      '/projects/123'
    )
  })

  it('handles multiple URL params together', () => {
    setLocationSearch('?source=document&type=idea,information&discipline=mep')
    renderHook(() => useFilterUrlSync())
    expect(mockSetSourceTypes).toHaveBeenCalledWith(['document'])
    expect(mockSetItemTypes).toHaveBeenCalledWith(['idea', 'information'])
    expect(mockSetDisciplines).toHaveBeenCalledWith(['mep'])
  })
})
