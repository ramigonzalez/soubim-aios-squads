/** Story 12.7: reviewer = member + review (items, ingestion approve / reject / retry) on assigned projects */
export type OrganizationRole = 'owner' | 'admin' | 'reviewer' | 'member'

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
}

/** An organization the current user belongs to (GET /organizations/me). */
export interface MyOrganization {
  id: string
  name: string
  slug: string
  role: OrganizationRole
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
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
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
}
