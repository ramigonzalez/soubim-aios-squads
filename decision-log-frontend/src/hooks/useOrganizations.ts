/**
 * Organizations of the current user and the active one (Story 12.5).
 *
 * The active organization is stored client-side (zustand + localStorage) and sent by the API
 * client as `X-Organization-Id`; the backend rejects an organization the user is not a member of.
 */
import { useCallback, useEffect } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import api from '../services/api'
import { useAuthStore } from '../store/authStore'
import { useOrganizationStore } from '../store/organizationStore'
import type { MyOrganization, OrganizationRole } from '../types/organization'

export const ORGANIZATIONS_KEY = 'organizations'

export function useMyOrganizations() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  return useQuery<MyOrganization[], Error>(
    ORGANIZATIONS_KEY,
    async () => (await api.get<MyOrganization[]>('/organizations/me')).data,
    { enabled: isAuthenticated, staleTime: 5 * 60 * 1000 }
  )
}

export function useActiveOrganization() {
  const queryClient = useQueryClient()
  const { data: organizations = [], isLoading } = useMyOrganizations()
  const storedId = useOrganizationStore(s => s.activeOrganizationId)
  const setStoredId = useOrganizationStore(s => s.setActiveOrganizationId)

  const active = organizations.find(o => o.id === storedId) ?? organizations[0] ?? null

  // a stored id the user no longer belongs to (removed, other account) falls back to the first organization
  useEffect(() => {
    if (!isLoading && organizations.length > 0 && storedId !== active?.id) setStoredId(active?.id ?? null)
  }, [isLoading, organizations.length, storedId, active?.id, setStoredId])

  const setActive = useCallback(
    (id: string) => {
      setStoredId(id)
      // everything on screen is scoped to the active organization: refetch it all
      queryClient.invalidateQueries()
    },
    [setStoredId, queryClient]
  )

  return {
    organizations,
    active,
    setActive,
    isLoading,
    /** owner/admin of the active organization */
    isAdmin: active?.role === 'owner' || active?.role === 'admin',
    /**
     * Story 12.7: owner/admin/reviewer in some organization — may review meetings of (some) projects, so the
     * ingestion queue is shown. Which sources they can act on comes per source from the API (`can_review`).
     */
    canReviewSomewhere: organizations.some(o => REVIEW_ROLES.includes(o.role)),
  }
}

/** Story 12.7: organization roles that can review (on projects their organization owns; reviewers when assigned). */
export const REVIEW_ROLES: OrganizationRole[] = ['owner', 'admin', 'reviewer']
