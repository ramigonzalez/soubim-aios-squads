import { useQuery } from 'react-query'
import api from '../services/api'
import { StagesResponse } from '../types/projectItem'

interface UseStagesOptions {
  projectId: string
  enabled?: boolean
}

/**
 * Hook for fetching project stages.
 * Calls GET /projects/{id}/stages which returns stage timeline data.
 *
 * Story 8.1: Milestone Timeline Component
 */
export function useStages({ projectId, enabled = true }: UseStagesOptions) {
  return useQuery<StagesResponse, Error>(
    ['stages', projectId],
    async () => {
      const response = await api.get<StagesResponse>(
        `/projects/${projectId}/stages`
      )
      return response.data
    },
    {
      enabled: !!projectId && enabled,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    }
  )
}
