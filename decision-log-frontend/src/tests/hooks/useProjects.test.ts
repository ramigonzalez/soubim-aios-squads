import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from 'react-query'
import React from 'react'
import { useProjects } from '../../hooks/useProjects'
import * as apiModule from '../../services/api'

// Mock API
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
  },
}))

const mockApi = apiModule.default as any

// Create query client for tests
const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = createQueryClient()
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useProjects Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches projects successfully', async () => {
    const mockData = {
      projects: [
        {
          id: 'proj-1',
          name: 'Project A',
          description: 'Test project',
          created_at: '2026-02-07T00:00:00Z',
          member_count: 5,
          decision_count: 10,
        },
      ],
      total: 1,
      limit: 50,
      offset: 0,
    }

    mockApi.get.mockResolvedValue({ data: mockData })

    const { result } = renderHook(() => useProjects(), { wrapper })

    // Initially loading
    expect(result.current.isLoading).toBe(true)

    // Wait for success
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual(mockData)
    expect(mockApi.get).toHaveBeenCalledWith('/projects', {
      params: { limit: 50, offset: 0 },
    })
  })

  it('handles pagination parameters', async () => {
    mockApi.get.mockResolvedValue({
      data: {
        projects: [],
        total: 0,
        limit: 10,
        offset: 20,
      },
    })

    const { result } = renderHook(
      () => useProjects({ limit: 10, offset: 20 }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(mockApi.get).toHaveBeenCalledWith('/projects', {
      params: { limit: 10, offset: 20 },
    })
  })

  it('caches results with proper stale time', async () => {
    const mockData = {
      projects: [{ id: 'proj-1', name: 'Project A' }],
      total: 1,
      limit: 50,
      offset: 0,
    }

    mockApi.get.mockResolvedValue({ data: mockData })

    const { result, rerender } = renderHook(() => useProjects(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    // Call again immediately - should use cache
    rerender()

    // API should only be called once due to caching
    expect(mockApi.get).toHaveBeenCalledTimes(1)
  })

  it('handles errors gracefully', async () => {
    const mockError = new Error('API Error')
    mockApi.get.mockRejectedValue(mockError)

    const { result } = renderHook(() => useProjects(), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(result.current.error).toEqual(mockError)
  })

  it('respects enabled option', async () => {
    mockApi.get.mockResolvedValue({
      data: { projects: [], total: 0, limit: 50, offset: 0 },
    })

    const { result } = renderHook(
      () => useProjects({ enabled: false }),
      { wrapper }
    )

    // Should not fetch when disabled
    expect(result.current.isLoading).toBe(false)
    expect(mockApi.get).not.toHaveBeenCalled()
  })

  it('uses correct cache key for different pagination', async () => {
    mockApi.get.mockResolvedValue({
      data: { projects: [], total: 0, limit: 50, offset: 0 },
    })

    const { result: result1 } = renderHook(
      () => useProjects({ limit: 50, offset: 0 }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result1.current.isSuccess).toBe(true)
    })

    // Different pagination should create new cache entry
    mockApi.get.mockResolvedValue({
      data: { projects: [], total: 0, limit: 50, offset: 50 },
    })

    const { result: result2 } = renderHook(
      () => useProjects({ limit: 50, offset: 50 }),
      { wrapper }
    )

    await waitFor(() => {
      expect(result2.current.isSuccess).toBe(true)
    })

    // Should have called API twice for different offsets
    expect(mockApi.get).toHaveBeenCalledTimes(2)
  })

  it('returns correct response structure', async () => {
    const mockData = {
      projects: [
        {
          id: 'proj-1',
          name: 'Test',
          description: 'Description',
          created_at: '2026-02-07T00:00:00Z',
          member_count: 5,
          decision_count: 10,
          latest_decision: '2026-02-07T12:00:00Z',
        },
      ],
      total: 100,
      limit: 50,
      offset: 0,
    }

    mockApi.get.mockResolvedValue({ data: mockData })

    const { result } = renderHook(() => useProjects(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const data = result.current.data!
    expect(data.total).toBe(100)
    expect(data.limit).toBe(50)
    expect(data.offset).toBe(0)
    expect(data.projects).toHaveLength(1)
    expect(data.projects[0].id).toBe('proj-1')
  })
})
