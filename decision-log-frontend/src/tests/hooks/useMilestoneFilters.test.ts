import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMilestoneFilters } from '../../hooks/useMilestoneFilters'

describe('useMilestoneFilters', () => {
  let replaceStateSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    replaceStateSpy = vi.spyOn(window.history, 'replaceState').mockImplementation(() => {})
  })

  afterEach(() => {
    replaceStateSpy.mockRestore()
    // Reset location to clean state using a real replaceState
    window.history.replaceState(null, '', '/')
  })

  function setLocationSearch(search: string) {
    // Use Object.defineProperty to simulate URL params for hook initialization
    Object.defineProperty(window, 'location', {
      value: { ...window.location, search, pathname: '/', hash: '' },
      writable: true,
    })
  }

  it('initializes with empty filters when no URL params', () => {
    setLocationSearch('')
    const { result } = renderHook(() => useMilestoneFilters())

    expect(result.current.sourceFilters).toEqual([])
    expect(result.current.itemTypeFilters).toEqual([])
    expect(result.current.activeCount).toBe(0)
  })

  it('reads initial source filters from URL params', () => {
    setLocationSearch('?source=meeting,email')

    const { result } = renderHook(() => useMilestoneFilters())

    expect(result.current.sourceFilters).toEqual(['meeting', 'email'])
  })

  it('reads initial item type filters from URL params', () => {
    setLocationSearch('?type=decision,action_item')

    const { result } = renderHook(() => useMilestoneFilters())

    expect(result.current.itemTypeFilters).toEqual(['decision', 'action_item'])
  })

  it('reads both source and type from URL params', () => {
    setLocationSearch('?source=meeting&type=decision')

    const { result } = renderHook(() => useMilestoneFilters())

    expect(result.current.sourceFilters).toEqual(['meeting'])
    expect(result.current.itemTypeFilters).toEqual(['decision'])
    expect(result.current.activeCount).toBe(2)
  })

  it('toggleSource adds a source to filter array', () => {
    setLocationSearch('')
    const { result } = renderHook(() => useMilestoneFilters())

    act(() => {
      result.current.toggleSource('meeting')
    })

    expect(result.current.sourceFilters).toEqual(['meeting'])
    expect(result.current.activeCount).toBe(1)
  })

  it('toggleSource removes a source from filter array when already present', () => {
    setLocationSearch('?source=meeting,email')

    const { result } = renderHook(() => useMilestoneFilters())

    act(() => {
      result.current.toggleSource('meeting')
    })

    expect(result.current.sourceFilters).toEqual(['email'])
  })

  it('toggleItemType adds an item type to filter array', () => {
    setLocationSearch('')
    const { result } = renderHook(() => useMilestoneFilters())

    act(() => {
      result.current.toggleItemType('decision')
    })

    expect(result.current.itemTypeFilters).toEqual(['decision'])
    expect(result.current.activeCount).toBe(1)
  })

  it('toggleItemType removes an item type when already present', () => {
    setLocationSearch('?type=decision,topic')

    const { result } = renderHook(() => useMilestoneFilters())

    act(() => {
      result.current.toggleItemType('decision')
    })

    expect(result.current.itemTypeFilters).toEqual(['topic'])
  })

  it('clearAll empties both filter arrays', () => {
    setLocationSearch('?source=meeting&type=decision')

    const { result } = renderHook(() => useMilestoneFilters())

    expect(result.current.activeCount).toBe(2)

    act(() => {
      result.current.clearAll()
    })

    expect(result.current.sourceFilters).toEqual([])
    expect(result.current.itemTypeFilters).toEqual([])
    expect(result.current.activeCount).toBe(0)
  })

  it('updates URL params when source filter changes', () => {
    setLocationSearch('')
    const { result } = renderHook(() => useMilestoneFilters())

    act(() => {
      result.current.toggleSource('email')
    })

    // replaceState should have been called with URL containing source param
    const lastCall = replaceStateSpy.mock.calls[replaceStateSpy.mock.calls.length - 1]
    expect(lastCall[2]).toContain('source=email')
  })

  it('updates URL params when item type filter changes', () => {
    setLocationSearch('')
    const { result } = renderHook(() => useMilestoneFilters())

    act(() => {
      result.current.toggleItemType('idea')
    })

    const lastCall = replaceStateSpy.mock.calls[replaceStateSpy.mock.calls.length - 1]
    expect(lastCall[2]).toContain('type=idea')
  })

  it('clears URL params when all filters removed', () => {
    setLocationSearch('?source=meeting&type=decision')

    const { result } = renderHook(() => useMilestoneFilters())

    act(() => {
      result.current.clearAll()
    })

    const lastCall = replaceStateSpy.mock.calls[replaceStateSpy.mock.calls.length - 1]
    // URL should not contain source or type params
    expect(lastCall[2]).not.toContain('source=')
    expect(lastCall[2]).not.toContain('type=')
  })

  it('activeCount reflects total number of active filters', () => {
    setLocationSearch('')
    const { result } = renderHook(() => useMilestoneFilters())

    act(() => {
      result.current.toggleSource('meeting')
    })
    act(() => {
      result.current.toggleSource('email')
    })
    act(() => {
      result.current.toggleItemType('decision')
    })

    expect(result.current.activeCount).toBe(3)
  })
})
