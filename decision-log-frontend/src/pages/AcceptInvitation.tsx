import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { invitationService } from '../hooks/useTeam'
import { ORGANIZATIONS_KEY } from '../hooks/useOrganizations'
import { useAuthStore } from '../store/authStore'
import { useOrganizationStore } from '../store/organizationStore'
import { GoogleSignInButton } from '../components/organisms/GoogleSignInButton'

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

  const shell = (children: React.ReactNode) => (
    <main className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md mx-4 bg-white rounded-2xl shadow-xl border border-slate-100 p-8 space-y-4">
        {children}
      </div>
    </main>
  )

  if (rejected) return shell(<p role="status" className="text-sm text-gray-700">{t('accept.rejected')}</p>)
  if (preview.isLoading) return shell(<p className="text-sm text-gray-600">{t('accept.loading')}</p>)
  if (preview.isError || !preview.data) {
    const gone = statusOf(preview.error) === 410
    return shell(
      <p role="alert" className="text-sm text-red-700">
        {statusOf(preview.error) === 429 ? t('accept.rateLimited') : gone ? t('accept.gone') : t('accept.notFound')}
      </p>
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
      <h1 className="text-xl font-bold text-gray-900">
        {isProject
          ? t('accept.projectTitle', { organization: inv.organization_name, project: inv.project_name })
          : t('accept.title', { organization: inv.organization_name })}
      </h1>
      <p className="text-sm text-gray-600">
        {isProject
          ? t('accept.projectInvitedAs', { email: inv.email })
          : t('accept.invitedAs', { email: inv.email, role: t(`roles.${inv.role}`) })}
      </p>

      {!inv.account_exists && (
        <form
          onSubmit={e => {
            e.preventDefault()
            createAccount.mutate()
          }}
          className="space-y-3"
        >
          <input
            aria-label={t('accept.name')}
            placeholder={t('accept.name')}
            required
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <input
            aria-label={t('accept.password')}
            placeholder={t('accept.password')}
            type="password"
            required
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={createAccount.isLoading}
            className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {createAccount.isLoading ? t('accept.creating') : t('accept.createAccount')}
          </button>
        </form>
      )}

      {inv.account_exists && isAuthenticated && sameEmail && (
        <button
          onClick={() => acceptExisting.mutate()}
          disabled={acceptExisting.isLoading}
          className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {acceptExisting.isLoading ? t('accept.accepting') : t('accept.accept')}
        </button>
      )}

      {inv.account_exists && isAuthenticated && !sameEmail && (
        <div className="space-y-3">
          <p role="alert" className="text-sm text-amber-800">
            {t('accept.wrongAccount', { current: user?.email, email: inv.email })}
          </p>
          <button
            onClick={() => clearAuth()}
            className="w-full border border-gray-300 rounded-lg py-2 text-sm font-medium hover:bg-gray-50"
          >
            {t('accept.logout')}
          </button>
        </div>
      )}

      {inv.account_exists && !isAuthenticated && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{t('accept.haveAccount')}</p>
          <Link
            to={`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`}
            className="block w-full text-center bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700"
          >
            {t('accept.login')}
          </Link>
        </div>
      )}

      {/* Story 12.8: accept with the Google account of the invited email (new or existing user) */}
      {!(inv.account_exists && isAuthenticated) && (
        <GoogleSignInButton labelKey="google.continue" invitationToken={token} />
      )}

      {/* Story 12.15: the invitee may say no (the organization sees it as "recusado") */}
      {isProject && (
        <button
          onClick={() => reject.mutate()}
          disabled={reject.isLoading}
          className="w-full border border-gray-300 rounded-lg py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {t('accept.reject')}
        </button>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {statusOf(error) === 429 ? t('accept.rateLimited') : errorMessage || t('accept.error')}
        </p>
      )}
    </>
  )
}
