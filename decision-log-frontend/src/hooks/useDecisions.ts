import { useQuery } from 'react-query'
import api from '../services/api'
import { DecisionsResponse } from '../types/decision'
import { useFilterStore } from '../store/filterStore'

interface UseDecisionsOptions {
  projectId: string
  limit?: number
  offset?: number
}

/**
 * Custom hook to fetch decisions for a project with filtering and pagination.
 *
 * Uses global filter store for discipline, decision maker, and date filters.
 * Epic 3 - Story 3.5 (Timeline), Story 3.6 (Filters)
 */
export function useDecisions({
  projectId,
  limit = 50,
  offset = 0
}: UseDecisionsOptions) {
  const { disciplines, decisionMakers, dateFrom, dateTo, searchQuery } = useFilterStore()

  return useQuery<DecisionsResponse, Error>(
    ['decisions', projectId, { disciplines, decisionMakers, dateFrom, dateTo, searchQuery, limit, offset }],
    async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })

      if (disciplines.length > 0) {
        params.append('disciplines', disciplines.join(','))
      }

      if (decisionMakers.length > 0) {
        params.append('who', decisionMakers.join(','))
      }

      if (dateFrom) {
        params.append('date_from', dateFrom)
      }

      if (dateTo) {
        params.append('date_to', dateTo)
      }

      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const response = await api.get<DecisionsResponse>(`/projects/${projectId}/decisions?${params}`)
      return response.data
    },
    {
      enabled: !!projectId,
      staleTime: 0, // Always refetch to get fresh data
      retry: 1,
    }
  )
}
