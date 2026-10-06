/**
 * Mutation hooks for item review (Story 12.6): approve / reject, edit, restore the AI's original,
 * and bulk-approve the pending items of a meeting. Only the owning organization's admins can call them.
 */
import { useMutation, useQueryClient } from 'react-query'
import api from '../services/api'
import type { ProjectItem, ReviewStatus } from '../types/projectItem'

export interface ItemEdits {
  title?: string | null
  statement?: string
  why?: string | null
  owner?: string | null
  due_date?: string | null
}

function useRefreshItems(projectId: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries(['projectItems', projectId])
    queryClient.invalidateQueries(['milestones', projectId])
  }
}

export function useReviewItem(projectId: string) {
  const refresh = useRefreshItems(projectId)
  return useMutation<ProjectItem, Error, { itemId: string; status: ReviewStatus }>(
    async ({ itemId, status }) =>
      (await api.post<ProjectItem>(`/projects/${projectId}/items/${itemId}/review`, { status })).data,
    { onSuccess: refresh },
  )
}

export function useEditReviewedItem(projectId: string) {
  const refresh = useRefreshItems(projectId)
  return useMutation<ProjectItem, Error, { itemId: string; edits: ItemEdits }>(
    async ({ itemId, edits }) =>
      (await api.patch<ProjectItem>(`/projects/${projectId}/items/${itemId}/review`, edits)).data,
    { onSuccess: refresh },
  )
}

export function useRestoreOriginal(projectId: string) {
  const refresh = useRefreshItems(projectId)
  return useMutation<ProjectItem, Error, { itemId: string }>(
    async ({ itemId }) =>
      (await api.post<ProjectItem>(`/projects/${projectId}/items/${itemId}/restore-original`)).data,
    { onSuccess: refresh },
  )
}

export function useBulkReview(projectId: string) {
  const refresh = useRefreshItems(projectId)
  return useMutation<{ updated: number }, Error, { sourceId?: string; itemIds?: string[]; status: 'approved' | 'rejected' }>(
    async ({ sourceId, itemIds, status }) =>
      (await api.post<{ updated: number }>(`/projects/${projectId}/items/review`, {
        status,
        source_id: sourceId,
        item_ids: itemIds,
      })).data,
    { onSuccess: refresh },
  )
}
