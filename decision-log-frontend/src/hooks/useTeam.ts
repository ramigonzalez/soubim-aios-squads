/** React Query hooks for members and invitations of an organization (Story 12.5), project assignments (12.7). */
import { useMutation, useQuery, useQueryClient } from 'react-query'
import api from '../services/api'
import type {
  InvitationPreview,
  OrganizationInvitationInfo,
  OrganizationMemberInfo,
  OrganizationProjectAssignments,
  OrganizationRole,
} from '../types/organization'
import type { TokenResponse } from '../types/auth'

const membersKey = (orgId: string) => ['organizationMembers', orgId]
const invitationsKey = (orgId: string) => ['organizationInvitations', orgId]

export function useMembers(orgId: string | undefined) {
  return useQuery<OrganizationMemberInfo[], Error>(
    membersKey(orgId ?? ''),
    async () => (await api.get<{ members: OrganizationMemberInfo[] }>(`/organizations/${orgId}/members`)).data.members,
    { enabled: !!orgId, retry: false }
  )
}

export function useUpdateMemberRole(orgId: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, { userId: string; role: OrganizationRole }>(
    ({ userId, role }) => api.patch(`/organizations/${orgId}/members/${userId}`, { role }),
    { onSuccess: () => queryClient.invalidateQueries(membersKey(orgId)) }
  )
}

export function useRemoveMember(orgId: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, string>(userId => api.delete(`/organizations/${orgId}/members/${userId}`), {
    onSuccess: () => queryClient.invalidateQueries(membersKey(orgId)),
  })
}

// ─── Project assignments (Story 12.7) ────────────────────────────────────────

const assignmentsKey = (orgId: string) => ['projectAssignments', orgId]

/** Projects the organization owns or that are shared with it, and which of its members are assigned. */
export function useProjectAssignments(orgId: string | undefined) {
  return useQuery<OrganizationProjectAssignments, Error>(
    assignmentsKey(orgId ?? ''),
    async () => {
      const data = (await api.get<OrganizationProjectAssignments>(`/organizations/${orgId}/project-assignments`)).data
      return { projects: data?.projects ?? [], assignments: data?.assignments ?? [] }
    },
    { enabled: !!orgId, retry: false }
  )
}

export function useSetProjectAssignment(orgId: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, { userId: string; projectId: string; assigned: boolean }>(
    ({ userId, projectId, assigned }) => {
      const url = `/organizations/${orgId}/members/${userId}/projects/${projectId}`
      return assigned ? api.put(url) : api.delete(url)
    },
    { onSuccess: () => queryClient.invalidateQueries(assignmentsKey(orgId)) }
  )
}

export function useInvitations(orgId: string | undefined) {
  return useQuery<OrganizationInvitationInfo[], Error>(
    invitationsKey(orgId ?? ''),
    async () =>
      (await api.get<{ invitations: OrganizationInvitationInfo[] }>(`/organizations/${orgId}/invitations`)).data
        .invitations,
    { enabled: !!orgId, retry: false }
  )
}

export interface InviteInput {
  email: string
  role: OrganizationRole
  /** Platform admins only: invite the first owner of a company that has no organization yet. */
  organizationName?: string
}

export function useCreateInvitation(orgId: string) {
  const queryClient = useQueryClient()
  return useMutation<OrganizationInvitationInfo, Error, InviteInput>(
    async ({ email, role, organizationName }) =>
      (
        await api.post<OrganizationInvitationInfo>('/invitations', {
          email,
          role,
          ...(organizationName ? { organization_name: organizationName } : { organization_id: orgId }),
        })
      ).data,
    { onSuccess: () => queryClient.invalidateQueries(invitationsKey(orgId)) }
  )
}

export function useRevokeInvitation(orgId: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, string>(id => api.delete(`/invitations/${id}`), {
    onSuccess: () => queryClient.invalidateQueries(invitationsKey(orgId)),
  })
}

// Invitee side (public preview / new-user accept; the token identifies the invitation)
export const invitationService = {
  preview: async (token: string): Promise<InvitationPreview> =>
    (await api.post<InvitationPreview>('/invitations/public/preview', { token })).data,
  acceptNewUser: async (token: string, name: string, password: string): Promise<TokenResponse> =>
    (await api.post<TokenResponse>('/invitations/public/accept', { token, name, password })).data,
  acceptExisting: async (token: string): Promise<{ id: string; name: string; slug: string }> =>
    (await api.post('/invitations/accept', { token })).data,
}
