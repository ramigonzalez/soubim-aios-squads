/**
 * React Query hooks for the platform operator page (Story 12.13): organizations (counts only),
 * their status, and new-company invitations. Every call is checked on the backend (403 for anyone
 * but the platform operator).
 */
import { useMutation, useQuery, useQueryClient } from 'react-query'
import api from '../services/api'
import type {
  OrganizationInvitationInfo,
  OrganizationStatus,
  PlatformOrganization,
  PlatformOrganizationDetail,
} from '../types/organization'

const ORGANIZATIONS_KEY = 'platformOrganizations'
const organizationKey = (id: string) => ['platformOrganization', id]
const INVITATIONS_KEY = 'platformInvitations'

export function usePlatformOrganizations() {
  return useQuery<PlatformOrganization[], Error>(
    ORGANIZATIONS_KEY,
    async () =>
      (await api.get<{ organizations: PlatformOrganization[] }>('/platform/organizations')).data.organizations,
    { retry: false }
  )
}

export function usePlatformOrganization(id: string | null) {
  return useQuery<PlatformOrganizationDetail, Error>(
    organizationKey(id ?? ''),
    async () => (await api.get<PlatformOrganizationDetail>(`/platform/organizations/${id}`)).data,
    { enabled: !!id, retry: false }
  )
}

export function useSetOrganizationStatus() {
  const queryClient = useQueryClient()
  return useMutation<PlatformOrganization, Error, { id: string; status: OrganizationStatus }>(
    async ({ id, status }) => (await api.patch<PlatformOrganization>(`/platform/organizations/${id}`, { status })).data,
    {
      onSuccess: (_data, { id }) => {
        queryClient.invalidateQueries(ORGANIZATIONS_KEY)
        queryClient.invalidateQueries(organizationKey(id))
      },
    }
  )
}

export function useCompanyInvitations() {
  return useQuery<OrganizationInvitationInfo[], Error>(
    INVITATIONS_KEY,
    async () =>
      (await api.get<{ invitations: OrganizationInvitationInfo[] }>('/platform/invitations')).data.invitations,
    { retry: false }
  )
}

/** First owner of a company that has no organization yet; the response carries the invite link once. */
export function useCreateCompanyInvitation() {
  const queryClient = useQueryClient()
  return useMutation<OrganizationInvitationInfo, Error, { email: string; organizationName: string }>(
    async ({ email, organizationName }) =>
      (
        await api.post<OrganizationInvitationInfo>('/platform/invitations', {
          email,
          organization_name: organizationName,
        })
      ).data,
    { onSuccess: () => queryClient.invalidateQueries(INVITATIONS_KEY) }
  )
}

export function useRevokeCompanyInvitation() {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, string>(id => api.delete(`/platform/invitations/${id}`), {
    onSuccess: () => queryClient.invalidateQueries(INVITATIONS_KEY),
  })
}
