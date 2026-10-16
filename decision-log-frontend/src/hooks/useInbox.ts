/**
 * Ingestão inbox data (README §5.7): pending sources with the decision-panel
 * data, the history, and decisions that happen immediately with "Desfazer"
 * (README §8.2, backend undo window G5).
 */
import { useQuery, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { ingestionService } from '../services/ingestionService'
import { useToast } from '../design-system'
import type { IngestionHistoryResponse, IngestionResponse } from '../types/ingestion'

export const INBOX_PENDING_KEY = ['inbox', 'pending']
export const INBOX_HISTORY_KEY = ['inbox', 'history']

export function useInboxPending() {
  return useQuery<IngestionResponse, Error>(
    INBOX_PENDING_KEY,
    async () => (await api.get<IngestionResponse>('/ingestion', { params: { limit: 200 } })).data,
    {
      staleTime: 15_000,
      // the AI preview fills in a few seconds after a source arrives
      refetchInterval: (data) => (data?.sources.some((s) => !s.candidates_ready) ? 5_000 : 30_000),
    },
  )
}

export function useInboxHistory(enabled: boolean) {
  return useQuery<IngestionHistoryResponse, Error>(
    INBOX_HISTORY_KEY,
    async () => (await api.get<IngestionHistoryResponse>('/ingestion/history', { params: { limit: 200 } })).data,
    {
      enabled,
      staleTime: 15_000,
      refetchInterval: (data) => (data?.sources.some((s) => s.status === 'approved') ? 5_000 : false),
    },
  )
}

/** Approve / reject now, offer "Desfazer" (back to pending while the extraction hasn't started). */
export function useInboxDecision() {
  const { t } = useTranslation('inbox')
  const toast = useToast()
  const queryClient = useQueryClient()

  const refresh = () => {
    void queryClient.invalidateQueries('inbox')
    void queryClient.invalidateQueries('ingestion')
    void queryClient.invalidateQueries('ingestion-pending-count')
    void queryClient.invalidateQueries('projects')
    void queryClient.invalidateQueries('projectItems')
  }

  const removeFromPending = (ids: string[]) =>
    queryClient.setQueryData<IngestionResponse | undefined>(INBOX_PENDING_KEY, (old) =>
      old ? { ...old, sources: old.sources.filter((s) => !ids.includes(s.id)), pending_count: Math.max(0, old.pending_count - ids.length) } : old,
    )

  const decide = async (ids: string[], action: 'approve' | 'reject', projectId?: string) => {
    if (!ids.length) return
    await queryClient.cancelQueries(INBOX_PENDING_KEY)
    removeFromPending(ids)
    const many = ids.length > 1
    try {
      if (many) await ingestionService.batchAction({ source_ids: ids, action })
      else if (action === 'approve') await ingestionService.approveSource(ids[0], projectId)
      else await ingestionService.rejectSource(ids[0])
    } catch {
      toast.show({ message: t('toast.error'), tone: 'error' })
      refresh()
      return
    }
    // the toast waits for the decision to be saved, so "Desfazer" always has something to undo
    toast.show({
      message:
        action === 'approve'
          ? many
            ? t('toast.approvedMany', { count: ids.length })
            : t('toast.approved')
          : many
            ? t('toast.rejectedMany', { count: ids.length })
            : t('toast.rejected'),
      tone: action === 'approve' ? 'success' : 'neutral',
      onUndo: () => {
        void ingestionService
          .undo(ids)
          .then(() => toast.show({ message: t('toast.undone'), tone: 'neutral' }))
          .catch(() => toast.show({ message: t('toast.error'), tone: 'error' }))
          .finally(refresh)
      },
    })
    refresh()
  }

  return { decide, refresh }
}
