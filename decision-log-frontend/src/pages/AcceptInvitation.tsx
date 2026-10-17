import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { invitationService } from '../hooks/useTeam'
import { ORGANIZATIONS_KEY } from '../hooks/useOrganizations'
import { useAuthStore } from '../store/authStore'
import { useOrganizationStore } from '../store/organizationStore'
import { GoogleSignInButton } from '../components/organisms/GoogleSignInButton'
import { AuthShell } from '../components/templates/AuthShell'
import { Banner, Button, Field, Input, Spinner } from '../design-system'

function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status
}

/**
 * Invitation link (Story 12.5): new users set name + password (account created, logged in);
 * existing users log in and accept. The invited email must match the logged-in account.
 * Story 12.15: an invitation to one project ("Organization A invites you to project X") can also be
 * rejected, without an account; accepting opens the project. Signing up creates no organization.
 */
export default function AcceptInvitation() {
  const { t } = useTranslation('team')
  const { token = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore()
  const setActiveOrganizationId = useOrganizationStore(s => s.setActiveOrganizationId)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [rejected, setRejected] = useState(false)

  const preview = useQuery(['invitation', token], () => invitationService.preview(token), { retry: false })

  const joined = (organizationId?: string, projectId?: string | null) => {
    if (organizationId) setActiveOrganizationId(organizationId)
    queryClient.invalidateQueries(ORGANIZATIONS_KEY)
    navigate(projectId ? `/projects/${projectId}` : '/projects')
  }

  const createAccount = useMutation(() => invitationService.acceptNewUser(token, name, password), {
    onSuccess: async data => {
      setAuth(data.user, data.access_token)
      joined(undefined, preview.data?.project_id)
    },
  })
  const acceptExisting = useMutation(() => invitationService.acceptExisting(token), {
    onSuccess: org => joined(org.id, org.project_id),
  })
  const reject = useMutation(() => invitationService.reject(token), { onSuccess: () => setRejected(true) })

  const shell = (children: React.ReactNode, title?: React.ReactNode, description?: React.ReactNode) => (
    <AuthShell title={title} description={description}>
      {children}
    </AuthShell>
  )

  if (rejected) return shell(<p role="status" className="text-small text-ink">{t('accept.rejected')}</p>)
  if (preview.isLoading)
    return shell(
      <p role="status" className="flex items-center gap-2 text-small text-ink-2">
        <Spinner />
        {t('accept.loading')}
      </p>,
    )
  if (preview.isError || !preview.data) {
    const gone = statusOf(preview.error) === 410
    return shell(
      <Banner tone="danger">{statusOf(preview.error) === 429 ? t('accept.rateLimited') : gone ? t('accept.gone') : t('accept.notFound')}</Banner>,
    )
  }

  const inv = preview.data
  const sameEmail = user?.email.toLowerCase() === inv.email.toLowerCase()
  const isProject = !!inv.project_id
  const error = createAccount.error ?? acceptExisting.error ?? reject.error
  const errorDetail = (error as { response?: { data?: { detail?: string } } } | null)?.response?.data?.detail
  // Story 12.13: refusals with a stable code get a translated message
  const errorMessage =
    errorDetail === 'organization_blocked'
      ? t('accept.organizationBlocked')
      : errorDetail === 'operator_cannot_join'
        ? t('accept.operatorCannotJoin')
        : errorDetail === 'already_member'
          ? t('accept.alreadyMember')
          : errorDetail

  return shell(
    <>
      {!inv.account_exists && (
        <form
          onSubmit={e => {
            e.preventDefault()
            createAccount.mutate()
          }}
          className="flex flex-col gap-4"
        >
          <Field label={t('accept.nameLabel')}>
            <Input placeholder={t('accept.name')} autoComplete="name" required value={name} onChange={e => setName(e.target.value)} />
          </Field>
          <Field label={t('accept.passwordLabel')} help={t('accept.passwordHelp')}>
            <Input
              placeholder={t('accept.password')}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </Field>
          <Button type="submit" variant="primary" size="lg" className="w-full" loading={createAccount.isLoading}>
            {createAccount.isLoading ? t('accept.creating') : t('accept.createAccount')}
          </Button>
        </form>
      )}

      {inv.account_exists && isAuthenticated && sameEmail && (
        <Button variant="primary" size="lg" className="w-full" loading={acceptExisting.isLoading} onClick={() => acceptExisting.mutate()}>
          {acceptExisting.isLoading ? t('accept.accepting') : t('accept.accept')}
        </Button>
      )}

      {inv.account_exists && isAuthenticated && !sameEmail && (
        <div className="flex flex-col gap-3">
          <div role="alert">
            <Banner tone="warning">{t('accept.wrongAccount', { current: user?.email, email: inv.email })}</Banner>
          </div>
          <Button size="lg" className="w-full" onClick={() => clearAuth()}>
            {t('accept.logout')}
          </Button>
        </div>
      )}

      {inv.account_exists && !isAuthenticated && (
        <div className="flex flex-col gap-3">
          <p className="text-small text-ink-2">{t('accept.haveAccount')}</p>
          <Button asChild variant="primary" size="lg" className="w-full">
            <Link to={`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`}>{t('accept.login')}</Link>
          </Button>
        </div>
      )}

      {/* Story 12.8: accept with the Google account of the invited email (new or existing user) */}
      {!(inv.account_exists && isAuthenticated) && <GoogleSignInButton labelKey="google.continue" invitationToken={token} />}

      {/* Story 12.15: the invitee may say no (the organization sees it as "recusado") */}
      {isProject && (
        <Button variant="ghost" size="lg" className="w-full" loading={reject.isLoading} onClick={() => reject.mutate()}>
          {t('accept.reject')}
        </Button>
      )}

      {error && (
        <Banner tone="danger">{statusOf(error) === 429 ? t('accept.rateLimited') : errorMessage || t('accept.error')}</Banner>
      )}
    </>,
    isProject
      ? t('accept.projectTitle', { organization: inv.organization_name, project: inv.project_name })
      : t('accept.title', { organization: inv.organization_name }),
    isProject ? t('accept.projectInvitedAs', { email: inv.email }) : t('accept.invitedAs', { email: inv.email, role: t(`roles.${inv.role}`) }),
  )
}
