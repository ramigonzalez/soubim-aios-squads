/** Promem revamp Phase 4e: Notificações (computed on the server from the last 14 days). */
import { useMutation, useQuery, useQueryClient } from 'react-query'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import type { ItemType, SourceType } from '../types/projectItem'

export interface AppNotification {
  key: string
  kind: 'pending_source' | 'extracted' | 'milestone'
  at: string
  read: boolean
  project: { id: string; name: string }
  source?: { id: string; type: SourceType; title: string | null }
  item?: { id: string; type: ItemType; title: string }
  count?: number
  by?: string | null
}

export interface NotificationsResponse {
  notifications: AppNotification[]
  unread: number
}

const KEY = 'notifications'

export function useNotifications() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return useQuery<NotificationsResponse, Error>(KEY, async () => (await api.get<NotificationsResponse>('/notifications')).data, {
    enabled: isAuthenticated,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation(
    async (body: { keys?: string[]; all?: boolean }) => (await api.post<NotificationsResponse>('/notifications/read', body)).data,
    {
      onMutate: async (body) => {
        // read at once; the server answer confirms
        await queryClient.cancelQueries(KEY)
        queryClient.setQueryData<NotificationsResponse | undefined>(KEY, (old) => {
          if (!old) return old
          const notifications = old.notifications.map((n) => (body.all || body.keys?.includes(n.key) ? { ...n, read: true } : n))
          return { notifications, unread: notifications.filter((n) => !n.read).length }
        })
      },
      onSuccess: (data) => {
        queryClient.setQueryData(KEY, data)
      },
      onError: () => void queryClient.invalidateQueries(KEY),
    },
  )
}

/** Where a notification leads. */
export function notificationHref(n: AppNotification): string {
  if (n.kind === 'pending_source' && n.source) return `/ingestion?project=${n.project.id}&focus=${n.source.id}`
  if (n.kind === 'extracted' && n.source?.type === 'meeting') return `/projects/${n.project.id}/meetings/${n.source.id}`
  if (n.kind === 'extracted') return `/projects/${n.project.id}/history`
  if (n.kind === 'milestone' && n.item) return `/projects/${n.project.id}/milestones?item=${n.item.id}`
  return `/projects/${n.project.id}/overview`
}
