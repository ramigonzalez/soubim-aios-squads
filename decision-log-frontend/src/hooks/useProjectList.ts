/**
 * Active projects with the Promem aggregates (stages, news since the last
 * visit, last activity), for the project switcher.
 */
import { useQuery } from 'react-query'
import api from '../services/api'
import type { ProjectsResponse } from '../types/project'

export function useProjectList(enabled = true) {
  return useQuery<ProjectsResponse>(
    ['projects', { limit: 100, offset: 0 }],
    async () => (await api.get<ProjectsResponse>('/projects', { params: { limit: 100, offset: 0 } })).data,
    { enabled, staleTime: 60 * 1000 },
  )
}
