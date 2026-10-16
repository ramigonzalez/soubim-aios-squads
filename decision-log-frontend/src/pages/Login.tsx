/**
 * Entrar (UX-UI-GUIDELINES §5 → Login): the endorsed lockup, "Entrar", Google as the primary path
 * when the server has it (the product lives on Gmail and Drive) and e-mail + senha as the
 * secondary one. No demo hints.
 */
import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import api from '../services/api'
import { isOrganizationBlocked } from '../lib/organizationBlocked'
import { useAuthStore } from '../store/authStore'
import { safeRedirect } from '../lib/safeRedirect'
import { Banner, Button, Field, Input } from '../design-system'
import { GoogleSignInButton, useGoogleSignInEnabled } from '../components/organisms/GoogleSignInButton'
import { AuthShell } from '../components/templates/AuthShell'
import { homePath } from '../components/common/PlatformRoute'

export function Login() {
  const { t } = useTranslation('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [searchParams] = useSearchParams()
  // Story 12.13: sent here after the session ended because every organization of the user is blocked
  const [error, setError] = useState(() => (searchParams.get('blocked') ? t('login.blocked') : ''))
  const [isLoading, setIsLoading] = useState(false)
  const google = useGoogleSignInEnabled()

  const navigate = useNavigate()
  // Story 12.5: come back to the invitation page after logging in (same-site paths only)
  const redirectParam = searchParams.get('redirect')
  const destination = safeRedirect(redirectParam)
  const setAuth = useAuthStore((state) => state.setAuth)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await api.post('/auth/login', { email, password })
      const { access_token, user } = response.data

      setAuth(user, access_token)
      // Story 12.13: without an explicit redirect the platform operator lands on /platform
      navigate(redirectParam ? destination : homePath(user))
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { detail?: string } } }
      if (isOrganizationBlocked(err)) setError(t('login.blocked'))
      // Story 13.11: 429 = rate limited (the backend detail is English-only)
      else if (e?.response?.status === 429) setError(t('login.rateLimited'))
      // the backend detail is English-only: a wrong e-mail or password gets its own message
      else setError(e?.response?.status === 401 ? t('login.invalid') : t('login.error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthShell title={t('login.title')} description={google ? t('login.tagline') : t('login.emailOnly')}>
      {google && (
        <>
          <GoogleSignInButton variant="primary" enabled redirect={redirectParam ? destination : undefined} />
          <div className="flex items-center gap-3 text-caption text-ink-2" aria-hidden>
            <span className="h-px flex-1 bg-line" />
            {t('login.withEmail')}
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label={t('login.email.label')}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('login.email.placeholder')}
            required
          />
        </Field>
        <Field label={t('login.password.label')}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('login.password.placeholder')}
            required
          />
        </Field>

        {error && (
          <div aria-live="assertive" aria-atomic="true">
            <Banner tone="danger">{error}</Banner>
          </div>
        )}

        <Button type="submit" variant={google ? 'secondary' : 'primary'} size="lg" className="w-full" loading={isLoading}>
          {isLoading ? t('login.submitting') : t('login.submit')}
        </Button>
      </form>
    </AuthShell>
  )
}
