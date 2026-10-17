/**
 * Promem revamp (REVAMP-MAPPING G1): record that the user opened a project.
 * The answer's `last_visit_at` defines what is "new" on the project's Visão geral.
 */
import { useEffect } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import api from '../services/api'

export interface ProjectVisit {
  last_visit_at: string | null
  visited_at: string
}

export const projectVisitKey = (projectId: string) => ['project-visit', projectId]

export function useProjectVisit(projectId: string | undefined) {
  const queryClient = useQueryClient()
  const query = useQuery<ProjectVisit>(
    projectVisitKey(projectId ?? ''),
    async () => (await api.post<ProjectVisit>(`/projects/${projectId}/visit`)).data,
    {
      enabled: !!projectId,
      // one visit per project per page load; navigating between sections does not record again
      staleTime: Infinity,
      cacheTime: Infinity,
      retry: false,
      refetchOnWindowFocus: false,
    },
  )
  // the projects list shows "novos desde sua última visita": refresh it after recording a visit
  useEffect(() => {
    if (query.isSuccess) void queryClient.invalidateQueries('projects')
  }, [query.isSuccess, queryClient])
  return query
}
