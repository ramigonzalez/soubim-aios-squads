import { useQuery, UseQueryResult } from 'react-query'
import api from '../services/api'
import { ProjectsResponse } from '../types/project'

interface UseProjectsOptions {
  limit?: number
  offset?: number
  enabled?: boolean
}

/**
 * Hook for fetching projects with React Query caching.
 *
 * @param options - Query options (limit, offset, enabled)
 * @returns Query result with projects, loading state, and error
 */
export function useProjects(
  options: UseProjectsOptions = {}
): UseQueryResult<ProjectsResponse> {
  const { limit = 50, offset = 0, enabled = true } = options

  return useQuery<ProjectsResponse>(
    ['projects', { limit, offset }],
    async () => {
      const response = await api.get('/projects', {
        params: { limit, offset },
      })
      return response.data
    },
    {
      enabled,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: true,
    }
  )
}
