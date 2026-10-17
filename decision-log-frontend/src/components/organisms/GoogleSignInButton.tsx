import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, GoogleMark } from '../../design-system'
import { googleAuthService, savePendingGoogleLogin } from '../../services/googleAuthService'

/** Whether the server has Google sign-in configured (GET /auth/providers). False while asking or on failure. */
export function useGoogleSignInEnabled() {
  const [enabled, setEnabled] = useState(false)
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
  return enabled
}

interface GoogleSignInButtonProps {
  /** i18n key in the `auth` namespace: `google.signIn` ("Entrar com Google") or `google.continue`. */
  labelKey?: 'google.signIn' | 'google.continue'
  /** Post-login destination (already validated by safeRedirect; validated again on return). */
  redirect?: string
  /** Accept this invitation with Google (the Google email must equal the invited email). */
  invitationToken?: string
  /** Login: the primary path (the product lives on Gmail and Drive). Elsewhere: secondary. */
  variant?: 'primary' | 'secondary'
  /** Already known by the caller (skips the providers call) */
  enabled?: boolean
}

/**
 * "Entrar com Google" (Story 12.8). Rendered only when the server has Google sign-in configured
 * (GET /auth/providers); otherwise renders nothing.
 */
export function GoogleSignInButton({ labelKey = 'google.signIn', redirect, invitationToken, variant = 'secondary', enabled }: GoogleSignInButtonProps) {
  if (enabled === false) return null
  return enabled ? (
    <GoogleButton labelKey={labelKey} redirect={redirect} invitationToken={invitationToken} variant={variant} />
  ) : (
    <GoogleSignInWhenEnabled labelKey={labelKey} redirect={redirect} invitationToken={invitationToken} variant={variant} />
  )
}

function GoogleSignInWhenEnabled(props: Omit<GoogleSignInButtonProps, 'enabled'>) {
  const enabled = useGoogleSignInEnabled()
  return enabled ? <GoogleButton {...props} /> : null
}

function GoogleButton({ labelKey = 'google.signIn', redirect, invitationToken, variant = 'secondary' }: Omit<GoogleSignInButtonProps, 'enabled'>) {
  const { t } = useTranslation('auth')
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState(false)

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
    <div className="flex flex-col gap-2">
      <Button
        variant={variant}
        size="lg"
        className="w-full"
        loading={starting}
        icon={
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface">
            <GoogleMark size={14} />
          </span>
        }
        onClick={() => void handleClick()}
      >
        {starting ? t('google.redirecting') : t(labelKey)}
      </Button>
      {error && (
        <p role="alert" className="text-caption text-danger-ink">
          {t('google.startError')}
        </p>
      )}
    </div>
  )
}
