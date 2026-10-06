export type OrganizationRole = 'owner' | 'admin' | 'member'

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
