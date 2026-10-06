import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { googleAuthService, savePendingGoogleLogin } from '../../services/googleAuthService'

interface GoogleSignInButtonProps {
  /** i18n key in the `auth` namespace: `google.signIn` ("Entrar com Google") or `google.continue`. */
  labelKey?: 'google.signIn' | 'google.continue'
  /** Post-login destination (already validated by safeRedirect; validated again on return). */
  redirect?: string
  /** Accept this invitation with Google (the Google email must equal the invited email). */
  invitationToken?: string
}

/**
 * "Entrar com Google" (Story 12.8). Rendered only when the server has Google sign-in configured
 * (GET /auth/providers); otherwise renders nothing.
 */
export function GoogleSignInButton({ labelKey = 'google.signIn', redirect, invitationToken }: GoogleSignInButtonProps) {
  const { t } = useTranslation('auth')
  const [enabled, setEnabled] = useState(false)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    googleAuthService
      .getProviders()
      .then(providers => active && setEnabled(Boolean(providers?.google)))
      .catch(() => active && setEnabled(false))
    return () => {
      active = false
    }
  }, [])

  if (!enabled) return null

  const handleClick = async () => {
    setError(false)
    setStarting(true)
    try {
      const { url, browser_key } = await googleAuthService.start(invitationToken)
      savePendingGoogleLogin({ browserKey: browser_key, redirect, invitationToken })
      window.location.assign(url)
    } catch {
      setError(true)
      setStarting(false)
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={starting}
        className="w-full flex items-center justify-center gap-2 border-2 border-slate-200 bg-white text-slate-800 font-semibold py-2.5 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.7 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
          <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.1z" />
          <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.2-13.5-10l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
        </svg>
        {starting ? t('google.redirecting') : t(labelKey)}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {t('google.startError')}
        </p>
      )}
    </div>
  )
}
