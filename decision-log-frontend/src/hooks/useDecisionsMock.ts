import { useQuery, UseQueryResult } from 'react-query'
import { DecisionsResponse } from '../types/decision'
import { mockApi } from '../lib/mockData'

interface UseDecisionsOptions {
  projectId: string
  limit?: number
  offset?: number
}

/**
 * Mock hook for decisions - returns mock data instead of real API calls
 * Use this for testing Epic 3 components without backend
 */
export function useDecisionsMock({
  projectId,
  limit = 50,
  offset = 0
}: UseDecisionsOptions): UseQueryResult<DecisionsResponse, Error> {
  return useQuery<DecisionsResponse, Error>({
    queryKey: ['decisions', projectId, { limit, offset }],
    queryFn: async () => {
      const decisions = await mockApi.getDecisions(projectId)
      return {
        decisions,
        total: decisions.length,
        limit,
        offset,
        facets: {
          disciplines: {
            structural: 1,
            mep: 1,
            landscape: 1,
          },
          meeting_types: {
            'Design Review': 1,
            'MEP Coordination': 1,
            'Site Planning': 1,
          },
        },
      }
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })
}
