/** Story 12.13: change your own password (POST /auth/change-password). */
import { useMutation } from 'react-query'
import api from '../services/api'

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
}

/** Stable codes the API answers with (400), each with a translated message in `auth:changePassword.errors`. */
export const CHANGE_PASSWORD_ERRORS = [
  'invalid_current_password',
  'password_too_short',
  'password_too_long',
  'password_unchanged',
  'no_password_set',
] as const

export function changePasswordErrorKey(error: unknown): string {
  const response = (error as { response?: { status?: number; data?: { detail?: string } } })?.response
  if (response?.status === 429) return 'changePassword.errors.rateLimited'
  const detail = response?.data?.detail
  return CHANGE_PASSWORD_ERRORS.includes(detail as (typeof CHANGE_PASSWORD_ERRORS)[number])
    ? `changePassword.errors.${detail}`
    : 'changePassword.errors.generic'
}

export function useChangePassword() {
  return useMutation<unknown, unknown, ChangePasswordInput>(({ currentPassword, newPassword }) =>
    api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword })
  )
}
