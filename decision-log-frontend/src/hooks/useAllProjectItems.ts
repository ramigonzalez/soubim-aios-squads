/**
 * Every item of a project the user can see (pages of 200), independent of the
 * legacy filter store. The key starts with ['projectItems', projectId] so the
 * existing optimistic milestone / done mutations update it too.
 */
import { useQuery } from 'react-query'
import api from '../services/api'
import type { ProjectItemsResponse } from '../types/projectItem'

const PAGE = 200

export function allProjectItemsKey(projectId: string, includeRejected = false) {
  return ['projectItems', projectId, 'all', { includeRejected }]
}

export function useAllProjectItems(projectId: string | undefined, { includeRejected = false } = {}) {
  return useQuery<ProjectItemsResponse, Error>(
    allProjectItemsKey(projectId ?? '', includeRejected),
    async () => {
      let offset = 0
      let first: ProjectItemsResponse | null = null
      const items: ProjectItemsResponse['items'] = []
      for (;;) {
        const params = new URLSearchParams({ limit: String(PAGE), offset: String(offset) })
        if (includeRejected) params.append('include_rejected', 'true')
        const { data } = await api.get<ProjectItemsResponse>(`/projects/${projectId}/items?${params}`)
        first = first ?? data
        items.push(...data.items)
        offset += PAGE
        if (offset >= data.total || data.items.length === 0) break
      }
      return { ...(first as ProjectItemsResponse), items, total: items.length }
    },
    { enabled: !!projectId, staleTime: 60 * 1000 },
  )
}
