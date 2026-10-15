/**
 * React Query hooks for external people on a project (Story 12.15).
 *
 * Only owners/admins of the organization that owns the project can list, invite, change or remove
 * external people; everyone else gets a 403 from the API.
 */
import { useMutation, useQuery, useQueryClient } from 'react-query'
import api from '../services/api'

export type ExternalAccess = 'viewer' | 'contributor'

export interface ProjectExternal {
  user_id: string
  name: string
  email: string
  access: ExternalAccess
  joined_at: string | null
}

export interface ProjectExternalInvitation {
  id: string
  email: string
  /** `rejected` stays listed ("recusado") until revoked or replaced by a new invitation */
  status: 'pending' | 'rejected'
  expires_at: string
  created_at: string
  /** Only in the create response: the link to copy (shown once) */
  invite_url?: string
}

export interface ProjectExternals {
  externals: ProjectExternal[]
  invitations: ProjectExternalInvitation[]
}

const key = (projectId: string) => ['projectExternals', projectId]

export function useProjectExternals(projectId: string) {
  return useQuery<ProjectExternals, Error>(
    key(projectId),
    async () => (await api.get<ProjectExternals>(`/projects/${projectId}/externals`)).data,
    { enabled: !!projectId, retry: false }
  )
}

export function useInviteExternal(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation<ProjectExternalInvitation, Error, string>(
    async email => (await api.post<ProjectExternalInvitation>(`/projects/${projectId}/externals/invitations`, { email })).data,
    { onSuccess: () => queryClient.invalidateQueries(key(projectId)) }
  )
}

export function useUpdateExternalAccess(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, { userId: string; access: ExternalAccess }>(
    ({ userId, access }) => api.patch(`/projects/${projectId}/externals/${userId}`, { access }),
    { onSuccess: () => queryClient.invalidateQueries(key(projectId)) }
  )
}

export function useRemoveExternal(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, string>(userId => api.delete(`/projects/${projectId}/externals/${userId}`), {
    onSuccess: () => queryClient.invalidateQueries(key(projectId)),
  })
}

export function useRevokeExternalInvitation(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, string>(
    invitationId => api.delete(`/projects/${projectId}/externals/invitations/${invitationId}`),
    { onSuccess: () => queryClient.invalidateQueries(key(projectId)) }
  )
}
