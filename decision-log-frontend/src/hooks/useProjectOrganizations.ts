/**
 * React Query hooks for project sharing between organizations (Story 12.3).
 *
 * Only admins of the organization that owns the project can list or change shares;
 * everyone else gets a 403 from the API.
 */
import { useMutation, useQuery, useQueryClient } from 'react-query'
import api from '../services/api'

export type ProjectOrganizationAccess = 'owner' | 'contributor' | 'viewer'
export type ShareAccess = Exclude<ProjectOrganizationAccess, 'owner'>

export interface ProjectOrganization {
  organization_id: string
  name: string
  slug: string
  access: ProjectOrganizationAccess
  invited_by: string | null
  created_at: string | null
}

const key = (projectId: string) => ['projectOrganizations', projectId]

export function useProjectOrganizations(projectId: string) {
  return useQuery<ProjectOrganization[], Error>(
    key(projectId),
    async () => {
      const response = await api.get<{ organizations: ProjectOrganization[] }>(
        `/projects/${projectId}/organizations`
      )
      return response.data.organizations
    },
    { enabled: !!projectId, retry: false }
  )
}

export function useShareProject(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation<ProjectOrganization, Error, { slug: string; access: ShareAccess }>(
    async ({ slug, access }) => {
      const response = await api.post<ProjectOrganization>(`/projects/${projectId}/organizations`, {
        organization_slug: slug,
        access,
      })
      return response.data
    },
    { onSuccess: () => queryClient.invalidateQueries(key(projectId)) }
  )
}

export function useUpdateProjectShare(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation<ProjectOrganization, Error, { organizationId: string; access: ShareAccess }>(
    async ({ organizationId, access }) => {
      const response = await api.patch<ProjectOrganization>(
        `/projects/${projectId}/organizations/${organizationId}`,
        { access }
      )
      return response.data
    },
    { onSuccess: () => queryClient.invalidateQueries(key(projectId)) }
  )
}

export function useRemoveProjectShare(projectId: string) {
  const queryClient = useQueryClient()
  return useMutation<unknown, Error, string>(
    async (organizationId: string) => {
      await api.delete(`/projects/${projectId}/organizations/${organizationId}`)
    },
    { onSuccess: () => queryClient.invalidateQueries(key(projectId)) }
  )
}
