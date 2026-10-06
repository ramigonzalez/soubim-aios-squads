import api from './api'
import type { TokenResponse } from '../types/auth'

/**
 * Sign in with Google (Story 12.8).
 *
 * start → Google consent → backend callback → /auth/google/callback#code=<one-time code>
 * → exchange (code + the browser key from start) → our normal JWT.
 * The browser key stays in sessionStorage (this tab only): a code obtained in another
 * browser cannot be redeemed here (login CSRF protection).
 */

export interface AuthProviders {
  password: boolean
  google: boolean
}

export interface GoogleLoginResponse extends TokenResponse {
  organization_id: string | null
}

/** What the callback page needs after the round trip through Google. */
export interface PendingGoogleLogin {
  browserKey: string
  redirect?: string // post-login destination (validated again with safeRedirect)
  invitationToken?: string // started from /invite/:token
}

export const PENDING_GOOGLE_LOGIN_KEY = 'google_login_pending'

export function savePendingGoogleLogin(pending: PendingGoogleLogin): void {
  sessionStorage.setItem(PENDING_GOOGLE_LOGIN_KEY, JSON.stringify(pending))
}

export function readPendingGoogleLogin(): PendingGoogleLogin | null {
  try {
    const raw = sessionStorage.getItem(PENDING_GOOGLE_LOGIN_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed.browserKey === 'string' ? parsed : null
  } catch {
    return null
  }
}

export function clearPendingGoogleLogin(): void {
  sessionStorage.removeItem(PENDING_GOOGLE_LOGIN_KEY)
}

export const googleAuthService = {
  getProviders: async (): Promise<AuthProviders> => (await api.get<AuthProviders>('/auth/providers')).data,

  start: async (invitationToken?: string): Promise<{ url: string; browser_key: string }> =>
    (await api.post('/auth/google/start', invitationToken ? { invitation_token: invitationToken } : {})).data,

  exchange: async (code: string, browserKey: string): Promise<GoogleLoginResponse> =>
    (await api.post<GoogleLoginResponse>('/auth/google/exchange', { code, browser_key: browserKey })).data,
}
