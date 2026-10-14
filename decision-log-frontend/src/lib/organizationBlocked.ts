/** Story 12.13: every organization of the user is blocked (login refused, existing sessions end). */
export const ORGANIZATION_BLOCKED = 'organization_blocked'

/** True for the API's `403 {detail: "organization_blocked"}` answer. */
export function isOrganizationBlocked(error: unknown): boolean {
  const response = (error as { response?: { status?: number; data?: { detail?: unknown } } })?.response
  return response?.status === 403 && response.data?.detail === ORGANIZATION_BLOCKED
}
