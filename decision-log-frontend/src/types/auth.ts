import type { OrganizationRole, OrganizationStatus } from './organization'

export interface User {
  id: string
  email: string
  name: string
  role: 'director' | 'architect' | 'client'
  projects?: string[]
  /** Story 12.13: the platform operator (no organization; lands on /platform). Set only by a server script. */
  is_platform_operator?: boolean
  /** Story 12.13: organizations whose memberships grant access, with their status (blocked ones are left out). */
  organizations?: Array<{ id: string; name: string; slug: string; role: OrganizationRole; status: OrganizationStatus }>
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}
