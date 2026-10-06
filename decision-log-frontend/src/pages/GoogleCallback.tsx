import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import {
  clearPendingGoogleLogin,
  googleAuthService,
  readPendingGoogleLogin,
  type PendingGoogleLogin,
} from '../services/googleAuthService'
import { ORGANIZATIONS_KEY } from '../hooks/useOrganizations'
import { safeRedirect } from '../lib/safeRedirect'
import { useAuthStore } from '../store/authStore'
import { useOrganizationStore } from '../store/organizationStore'

/** Reasons with a specific message (backend callback fragment `error=` or exchange `detail`). */
export const GOOGLE_ERROR_REASONS = [
  'denied',
  'invalid_state',
  'invalid_token',
  'email_unverified',
  'exchange_failed',
  'unknown_email',
  'account_disabled',
  'email_mismatch',
  'invitation_gone',
  'expired',
  'browser_mismatch',
  'google_account_mismatch',
  'google_account_in_use',
] as const

function reasonKey(reason: string | undefined): string {
  return GOOGLE_ERROR_REASONS.includes(reason as (typeof GOOGLE_ERROR_REASONS)[number])
    ? `google.errors.${reason}`
    : 'google.errors.generic'
}

/**
 * Landing page of "Sign in with Google" (Story 12.8): the backend redirects here with
 * `#code=<one-time code>` or `#error=<reason>` in the fragment (never sent to a server).
 * The code is redeemed once with the browser key kept since start, then the fragment is
 * removed from the address bar.
 */
export default function GoogleCallback() {
  const { t } = useTranslation('auth')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const setAuth = useAuthStore(s => s.setAuth)
  const setActiveOrganizationId = useOrganizationStore(s => s.setActiveOrganizationId)
  const [error, setError] = useState<string | null>(null)
  const [pending] = useState<PendingGoogleLogin | null>(() => readPendingGoogleLogin())
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return // StrictMode runs effects twice: redeem once
    started.current = true
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    window.history.replaceState(null, '', window.location.pathname) // the code leaves the address bar
    clearPendingGoogleLogin()

    const code = params.get('code')
    if (params.get('error') || !code) {
      setError(reasonKey(params.get('error') ?? undefined))
      return
    }
    if (!pending) {
      setError(reasonKey('browser_mismatch')) // not started in this tab
      return
    }
    googleAuthService
      .exchange(code, pending.browserKey)
      .then(data => {
        setAuth(data.user, data.access_token)
        if (data.organization_id) {
          setActiveOrganizationId(data.organization_id)
          queryClient.invalidateQueries(ORGANIZATIONS_KEY)
        }
        navigate(pending.invitationToken ? '/projects' : safeRedirect(pending.redirect), { replace: true })
      })
      .catch((err: unknown) => {
        const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
        setError(reasonKey(detail))
      })
  }, [navigate, pending, queryClient, setActiveOrganizationId, setAuth])

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-4">
        {error ? (
          <>
            <p role="alert" className="text-sm text-red-700">
              {t(error)}
            </p>
            <Link
              to={pending?.invitationToken ? `/invite/${encodeURIComponent(pending.invitationToken)}` : '/login'}
              className="block w-full text-center bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700"
            >
              {pending?.invitationToken ? t('google.backToInvitation') : t('google.backToLogin')}
            </Link>
          </>
        ) : (
          <p className="text-sm text-gray-600">{t('google.completing')}</p>
        )}
      </div>
    </main>
  )
}
