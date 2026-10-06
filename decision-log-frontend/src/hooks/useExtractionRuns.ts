/**
 * Extraction versions of a meeting: list, switch the active one, re-extract.
 * Story 13.7: Extraction versions & rollback
 */
import { useMutation, useQuery, useQueryClient } from 'react-query'
import api from '../services/api'

export interface ExtractionRun {
  id: string
  version: number
  model: string | null
  prompt_version: string | null
  status: string
  is_active: boolean
  created_at: string | null
  created_by_name: string | null
  input_tokens: number | null
  output_tokens: number | null
  item_count: number
  counts_by_type: Record<string, number>
}

export interface ExtractionRunsResponse {
  source_id: string
  /** The user is an organization admin of the project: may activate a version or re-extract */
  can_manage: boolean
  runs: ExtractionRun[]
  latest_job: { type: string; status: string; last_error: string | null } | null
}

const key = (sourceId: string) => ['extraction-runs', sourceId]

export function useExtractionRuns(sourceId: string) {
  return useQuery<ExtractionRunsResponse, Error>(
    key(sourceId),
    async () => (await api.get<ExtractionRunsResponse>(`/sources/${sourceId}/extraction-runs`)).data,
    {
      enabled: !!sourceId,
      retry: false,
      // follow a queued/running re-extraction until it finishes
      refetchInterval: data => {
        const status = data?.latest_job?.status
        return status === 'queued' || status === 'running' ? 4000 : false
      },
    },
  )
}

/** Switching the active version changes the items shown everywhere: refresh all cached data. */
export function useActivateExtractionRun(sourceId: string) {
  const queryClient = useQueryClient()
  return useMutation<ExtractionRunsResponse, Error, string>(
    async runId =>
      (await api.post<ExtractionRunsResponse>(`/sources/${sourceId}/extraction-runs/${runId}/activate`)).data,
    { onSuccess: () => queryClient.invalidateQueries() },
  )
}

export function useReExtract(sourceId: string) {
  const queryClient = useQueryClient()
  return useMutation<void, Error, void>(
    async () => {
      await api.post(`/sources/${sourceId}/re-extract`)
    },
    { onSuccess: () => queryClient.invalidateQueries(key(sourceId)) },
  )
}
