/**
 * React Query hooks for shared link management (Story 8.4).
 *
 * Provides hooks for creating, listing, and revoking shared links
 * for the milestone timeline.
 */

import { useQuery, useMutation, useQueryClient } from 'react-query'
import api from '../services/api'

export interface ShareLink {
  share_token: string
  created_at: string | null
  expires_at: string
  view_count: number
  resource_type: string
}

interface CreateShareLinkResponse {
  share_token: string
  share_url: string
  expires_at: string
}

interface ShareLinksListResponse {
  links: ShareLink[]
}

interface SharedTimelineProject {
  id: string
  name: string
  description: string | null
}

interface SharedTimelineMilestone {
  id: string
  statement: string
  discipline: string
  who: string
  timestamp: string
  created_at: string
  is_done: boolean
  affected_disciplines: string[]
}

export interface SharedTimelineData {
  project: SharedTimelineProject
  milestones: SharedTimelineMilestone[]
}

/**
 * Fetch active share links for a project (admin-only).
 */
export function useShareLinks(projectId: string) {
  return useQuery<ShareLinksListResponse, Error>(
    ['shareLinks', projectId],
    async () => {
      const response = await api.get<ShareLinksListResponse>(
        `/projects/${projectId}/milestones/share`
      )
      return response.data
    },
    {
      enabled: !!projectId,
      staleTime: 30_000,
      retry: 1,
    }
  )
}

/**
 * Create a new share link for a project's milestone timeline (admin-only).
 */
export function useCreateShareLink(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<CreateShareLinkResponse, Error, number | undefined>(
    async (expiresInDays?: number) => {
      const response = await api.post<CreateShareLinkResponse>(
        `/projects/${projectId}/milestones/share`,
        { expires_in_days: expiresInDays ?? 30 }
      )
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['shareLinks', projectId])
      },
    }
  )
}

/**
 * Revoke a share link (admin-only).
 */
export function useRevokeShareLink(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<{ message: string }, Error, string>(
    async (token: string) => {
      const response = await api.delete(
        `/projects/${projectId}/milestones/share/${token}`
      )
      return response.data
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['shareLinks', projectId])
      },
    }
  )
}

/**
 * Fetch shared timeline data from the public endpoint (no auth required).
 */
export function useSharedTimeline(token: string) {
  return useQuery<SharedTimelineData, Error>(
    ['sharedTimeline', token],
    async () => {
      const response = await api.get<SharedTimelineData>(
        `/shared/milestones/${token}`
      )
      return response.data
    },
    {
      enabled: !!token,
      retry: false,
      staleTime: 60_000,
    }
  )
}
