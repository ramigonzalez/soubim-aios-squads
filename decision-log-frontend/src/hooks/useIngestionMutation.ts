import { useMutation, useQueryClient } from 'react-query'
import { ingestionService } from '../services/ingestionService'
import type { BatchActionPayload } from '../types/ingestion'

export function useToggleInclude() {
  const queryClient = useQueryClient()
  return useMutation(
    ({ id, included }: { id: string; included: boolean }) =>
      ingestionService.updateSource(id, included),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('ingestion')
        queryClient.invalidateQueries('ingestion-pending-count')
      },
    }
  )
}

export function useBatchAction() {
  const queryClient = useQueryClient()
  return useMutation(
    (payload: BatchActionPayload) => ingestionService.batchAction(payload),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('ingestion')
        queryClient.invalidateQueries('ingestion-pending-count')
      },
    }
  )
}
