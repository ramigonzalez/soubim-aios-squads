/** Sources of one project waiting in the Ingestão (Visão geral "aguardando aprovação"). Reviewers only. */
import { useQuery } from 'react-query'
import api from '../services/api'
import type { IngestionResponse } from '../types/ingestion'

export function useProjectPendingSources(projectId: string | undefined, enabled: boolean) {
  return useQuery<IngestionResponse, Error>(
    ['ingestion', 'pending', projectId],
    async () =>
      (await api.get<IngestionResponse>('/ingestion', { params: { project_id: projectId, ingestion_status: 'pending', limit: 100 } })).data,
    { enabled: enabled && !!projectId, staleTime: 30 * 1000 },
  )
}
