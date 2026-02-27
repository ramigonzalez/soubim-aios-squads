/**
 * Custom hook to fetch milestone items for a project.
 * Story 5.3: Frontend Types & Hooks Migration
 */
import { useQuery } from 'react-query'
import api from '../services/api'
import { ProjectItemsResponse } from '../types/projectItem'

interface UseMilestonesOptions {
  projectId: string
  limit?: number
  offset?: number
  enabled?: boolean
}

export function useMilestones({
  projectId,
  limit = 50,
  offset = 0,
  enabled = true,
}: UseMilestonesOptions) {
  return useQuery<ProjectItemsResponse, Error>(
    ['milestones', projectId, { limit, offset }],
    async () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      })

      const response = await api.get<ProjectItemsResponse>(
        `/projects/${projectId}/milestones?${params}`
      )
      return response.data
    },
    {
      enabled: !!projectId && enabled,
      staleTime: 30000,
      retry: 1,
    }
  )
}
