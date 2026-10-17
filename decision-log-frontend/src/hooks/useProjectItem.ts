/** One item (deep link to an item that isn't in the page's list). */
import { useQuery } from 'react-query'
import api from '../services/api'
import type { ProjectItem } from '../types/projectItem'

export function useProjectItem(projectId: string, itemId: string | null, enabled = true) {
  return useQuery<ProjectItem, Error>(
    // not under ['projectItems', …]: the list mutations' optimistic updates expect a list there
    ['projectItem', projectId, itemId],
    async () => (await api.get<ProjectItem>(`/projects/${projectId}/items/${itemId}`)).data,
    { enabled: enabled && !!projectId && !!itemId, staleTime: 60 * 1000, retry: false },
  )
}
