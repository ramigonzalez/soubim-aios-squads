import { useQuery, UseQueryResult } from 'react-query'
import { Project } from '../types/project'
import { mockApi } from '../lib/mockData'

export function useProjectsMock(): UseQueryResult<Project[], Error> {
  return useQuery<Project[], Error>({
    queryKey: ['projects'],
    queryFn: () => mockApi.getProjects(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  })
}

export function useProjectMock(id: string | undefined): UseQueryResult<Project | null, Error> {
  return useQuery<Project | null, Error>({
    queryKey: ['project', id],
    queryFn: () => id ? mockApi.getProject(id) : Promise.resolve(null),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
    retry: 1,
  })
}
