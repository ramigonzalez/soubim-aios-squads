/**
 * Promem revamp: the public milestone link (create, change expiry incl. "Nunca", revoke) and
 * the public page data, including the expired state (410) with whose link it was (G7, G7b, G8).
 */
import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import api from '../services/api'
import type { Branding } from '../types/project'

export interface PublicLink {
  share_token: string
  created_at: string | null
  /** null = never expires */
  expires_at: string | null
  view_count: number
  resource_type: string
}

export type ExpiryChoice = '30' | '90' | 'never'
const days = (choice: ExpiryChoice) => (choice === 'never' ? null : Number(choice))

export function usePublicLinks(projectId: string, enabled = true) {
  return useQuery<PublicLink[], Error>(
    ['shareLinks', projectId],
    async () => (await api.get<{ links: PublicLink[] }>(`/projects/${projectId}/milestones/share`)).data.links,
    { enabled: enabled && !!projectId, staleTime: 30_000 },
  )
}

export function usePublicLinkActions(projectId: string) {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries(['shareLinks', projectId])
  return {
    create: useMutation((choice: ExpiryChoice) => api.post(`/projects/${projectId}/milestones/share`, { expires_in_days: days(choice) }), { onSuccess: refresh }),
    setExpiry: useMutation(
      ({ token, choice }: { token: string; choice: ExpiryChoice }) => api.patch(`/projects/${projectId}/milestones/share/${token}`, { expires_in_days: days(choice) }),
      { onSuccess: refresh },
    ),
    revoke: useMutation((token: string) => api.delete(`/projects/${projectId}/milestones/share/${token}`), { onSuccess: refresh }),
  }
}

export interface PublicMilestone {
  id: string
  statement: string
  title: string | null
  item_type: 'decision' | 'action_item' | 'topic' | 'idea' | 'information'
  why: string | null
  who: string
  date: string | null
  is_done: boolean
  affected_disciplines: string[]
}

export interface PublicTimeline {
  project: { id: string; name: string; description: string | null }
  organization: Branding | null
  shared_by: string | null
  link: { created_at: string | null; expires_at: string | null }
  updated_at: string | null
  stages: { id: string; stage_name: string; stage_from: string; stage_to: string; sort_order: number }[]
  milestones: PublicMilestone[]
}

export interface ExpiredLink {
  code: 'expired'
  expired_at: string
  project: string
  organization: Branding | null
}

export class PublicLinkError extends Error {
  constructor(
    public kind: 'expired' | 'unavailable' | 'failed',
    public expired?: ExpiredLink,
  ) {
    super(kind)
  }
}

export function usePublicTimeline(token: string) {
  return useQuery<PublicTimeline, PublicLinkError>(
    ['publicTimeline', token],
    async () => {
      try {
        return (await api.get<PublicTimeline>(`/shared/milestones/${token}`)).data
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 410) throw new PublicLinkError('expired', error.response.data.detail)
        if (axios.isAxiosError(error) && error.response?.status === 404) throw new PublicLinkError('unavailable')
        throw new PublicLinkError('failed')
      }
    },
    { enabled: !!token, retry: false, staleTime: 60_000 },
  )
}
