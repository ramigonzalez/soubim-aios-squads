/**
 * Hook to fetch project participants for datalist suggestions.
 * Story 7.3: Manual Input — Create Project Item Form
 */
import { useQuery } from 'react-query'
import api from '../services/api'

export interface Participant {
  id: string
  name: string
  email?: string
  discipline?: string
  role?: string
}

export function useParticipants(projectId: string) {
  return useQuery<Participant[]>(
    ['participants', projectId],
    async () => {
      const response = await api.get<Participant[]>(
        `/projects/${projectId}/participants`
      )
      return response.data
    },
    {
      staleTime: 10 * 60 * 1000, // 10 min — roster changes rarely
      enabled: !!projectId,
    }
  )
}
