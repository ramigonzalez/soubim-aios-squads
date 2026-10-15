/** Story 12.7: reviewer = member + review (items, ingestion approve / reject / retry) on assigned projects */
export type OrganizationRole = 'owner' | 'admin' | 'reviewer' | 'member' | 'external'
/** Story 12.15: a person invited to some projects only (never given by the team page) */
export const EXTERNAL_ROLE: OrganizationRole = 'external'

/** Story 12.7: projects the organization owns or that are shared with it, and its members assigned to them. */
export interface OrganizationProjectAssignments {
  projects: Array<{ id: string; name: string; owned: boolean }>
  assignments: Array<{ user_id: string; project_id: string }>
}

/** Story 12.7: what the current user can do on a project (from the API, never guessed in the client). */
export type ProjectAccessLevel = 'none' | 'read' | 'write' | 'review' | 'admin'

export interface ProjectCapabilities {
  access_level?: ProjectAccessLevel
  /** approve / reject / edit items, approve / reject / retry meetings */
  can_review?: boolean
  /** project settings, sharing, milestones, share links, meeting deletion */
  can_manage?: boolean
  /** Story 12.15: the user reaches the project only as an external person (viewer / contributor) */
  is_external?: boolean
}

/** Story 12.13: set by the platform operator. `payment_pending` shows a banner; `blocked` grants no access. */
export type OrganizationStatus = 'active' | 'payment_pending' | 'blocked'

/** An organization the current user belongs to (GET /organizations/me). */
export interface MyOrganization {
  id: string
  name: string
  slug: string
  role: OrganizationRole
  /** Story 12.13 */
  status?: OrganizationStatus
}

/** Story 12.13: an organization as the platform operator sees it (counts only, never content). */
export interface PlatformOrganization {
  id: string
  name: string
  slug: string
  status: OrganizationStatus
  created_at: string
  member_count: number
  project_count: number
  last_activity_at: string | null
}

export interface PlatformOrganizationDetail extends PlatformOrganization {
  members: Array<{ name: string; email: string; role: OrganizationRole }>
}

export interface OrganizationMemberInfo {
  user_id: string
  name: string
  email: string
  role: OrganizationRole
  joined_at: string
}

export interface OrganizationInvitationInfo {
  id: string
  organization_id: string | null
  organization_name: string
  email: string
  role: OrganizationRole
  status: 'pending' | 'accepted' | 'revoked' | 'expired' | 'rejected'
  expires_at: string
  created_at: string
  /** Only in the create response: the link to send to the invitee (shown once). */
  invite_url?: string
}

export interface InvitationPreview {
  organization_name: string
  email: string
  role: OrganizationRole
  account_exists: boolean
  /** Story 12.15: set for an invitation to one project (role `external`) */
  project_id?: string
  project_name?: string
}
