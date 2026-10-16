/** Promem revamp G11: items like this one, each with a reason (item panel "Similares"). */
import { useQuery } from 'react-query'
import api from '../services/api'
import type { ProjectItem } from '../types/projectItem'

export type SimilarReason = 'same_source' | 'same_discipline' | 'similar_topic'
export type SimilarItem = ProjectItem & { reason: SimilarReason }

export function useSimilarItems(projectId: string, itemId: string | null) {
  return useQuery<SimilarItem[], Error>(
    ['similarItems', projectId, itemId],
    async () => (await api.get<{ items: SimilarItem[] }>(`/projects/${projectId}/items/${itemId}/similar`)).data.items,
    { enabled: !!projectId && !!itemId, staleTime: 5 * 60 * 1000 },
  )
}
