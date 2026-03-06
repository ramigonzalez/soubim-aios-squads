import { useMutation, useQueryClient } from 'react-query'
import { ingestionService } from '../services/ingestionService'
import type { BatchActionPayload } from '../types/ingestion'

export function useBatchAction() {
  const queryClient = useQueryClient()
  return useMutation(
    (payload: BatchActionPayload) => ingestionService.batchAction(payload),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('ingestion')
        queryClient.invalidateQueries('ingestion-history')
        queryClient.invalidateQueries('ingestion-pending-count')
      },
    }
  )
}

export function useApproveSource() {
  const queryClient = useQueryClient()
  return useMutation(
    (sourceId: string) => ingestionService.approveSource(sourceId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('ingestion')
        queryClient.invalidateQueries('ingestion-history')
        queryClient.invalidateQueries('ingestion-pending-count')
      },
    }
  )
}

export function useRejectSource() {
  const queryClient = useQueryClient()
  return useMutation(
    (sourceId: string) => ingestionService.rejectSource(sourceId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('ingestion')
        queryClient.invalidateQueries('ingestion-history')
        queryClient.invalidateQueries('ingestion-pending-count')
      },
    }
  )
}

export function useRetrySource() {
  const queryClient = useQueryClient()
  return useMutation(
    (sourceId: string) => ingestionService.retrySource(sourceId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('ingestion')
        queryClient.invalidateQueries('ingestion-history')
        queryClient.invalidateQueries('ingestion-pending-count')
      },
    }
  )
}

export function useDeleteSource() {
  const queryClient = useQueryClient()
  return useMutation(
    (sourceId: string) => ingestionService.deleteSource(sourceId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('ingestion')
        queryClient.invalidateQueries('ingestion-history')
        queryClient.invalidateQueries('ingestion-pending-count')
      },
    }
  )
}
