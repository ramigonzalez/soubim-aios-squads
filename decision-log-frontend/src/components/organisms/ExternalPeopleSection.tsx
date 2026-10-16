/**
 * ExternalPeopleSection — "Pessoas externas" of a project (Story 12.15).
 *
 * Owners/admins of the organization that owns the project invite anyone by e-mail to this project only.
 * Until e-mails are sent (12.14) the invite link is shown once, to copy. Lists external people (access
 * Viewer / Contributor, change, remove) and pending / rejected invitations (revoke). Shown on the Project
 * Edit page; renders nothing when the user cannot manage it (API 403).
 */
import { FormEvent, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ExternalBadge } from '../atoms/ExternalBadge'
import { SettingsCard } from '../molecules/SettingsCard'
import {
  ExternalAccess,
  useInviteExternal,
  useProjectExternals,
  useRemoveExternal,
  useRevokeExternalInvitation,
  useUpdateExternalAccess,
} from '../../hooks/useProjectExternals'

const ACCESS: ExternalAccess[] = ['viewer', 'contributor']
const KNOWN_ERRORS = ['already_member', 'already_invited']

const inputClass = 'block rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500'

function errorKey(error: unknown): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  return typeof detail === 'string' && KNOWN_ERRORS.includes(detail) ? `externals.errors.${detail}` : 'externals.errors.generic'
}

export default function ExternalPeopleSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation('projects')
  const { data, isLoading, isError } = useProjectExternals(projectId)
  const invite = useInviteExternal(projectId)
  const update = useUpdateExternalAccess(projectId)
  const remove = useRemoveExternal(projectId)
  const revoke = useRevokeExternalInvitation(projectId)
  const [email, setEmail] = useState('')
  const [link, setLink] = useState<{ email: string; url: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (isLoading || isError || !data) return null

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setError(null)
    setLink(null)
    try {
      const created = await invite.mutateAsync(email.trim())
      if (created.invite_url) setLink({ email: created.email, url: created.invite_url })
      setEmail('')
    } catch (err) {
      setError(t(errorKey(err)))
    }
  }

  const run = async (action: () => Promise<unknown>) => {
    setError(null)
    try {
      await action()
    } catch {
      setError(t('externals.errors.generic'))
    }
  }

  const copyLink = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const empty = data.externals.length === 0 && data.invitations.length === 0

  return (
    <SettingsCard titleId="external-people-title" title={t('externals.title')} description={t('externals.description')} autoSaved>
      {error && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={t('externals.emailPlaceholder')}
          aria-label={t('externals.emailLabel')}
          className={`${inputClass} flex-1`}
        />
        <button
          type="submit"
          disabled={!email.trim() || invite.isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 max-md:min-h-11"
        >
          {t('externals.invite')}
        </button>
      </form>

      {link && (
        <div role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-800 space-y-2">
          <p>{t('externals.created', { email: link.email })}</p>
          <div className="flex flex-col md:flex-row gap-2">
            <input readOnly value={link.url} aria-label={t('externals.linkLabel')} className={`${inputClass} flex-1 bg-white`} />
            <button
              type="button"
              onClick={copyLink}
              className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              {copied ? t('externals.copied') : t('externals.copy')}
            </button>
          </div>
        </div>
      )}

      {empty ? (
        <p className="text-sm text-gray-500">{t('externals.empty')}</p>
      ) : (
        <ul className="divide-y divide-gray-100" aria-label={t('externals.title')}>
          {data.externals.map(person => (
            <li key={person.user_id} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  {person.name} <ExternalBadge />
                </p>
                <p className="text-xs text-gray-500 break-all">{person.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  aria-label={t('externals.accessFor', { name: person.name })}
                  value={person.access}
                  onChange={e =>
                    run(() => update.mutateAsync({ userId: person.user_id, access: e.target.value as ExternalAccess }))
                  }
                  className={inputClass}
                >
                  {ACCESS.map(value => (
                    <option key={value} value={value}>
                      {t(`externals.access.${value}`)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={t('externals.remove', { name: person.name })}
                  onClick={() => {
                    if (window.confirm(t('externals.removeConfirm', { name: person.name }))) {
                      void run(() => remove.mutateAsync(person.user_id))
                    }
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
          {data.invitations.map(invitation => (
            <li key={invitation.id} className="flex flex-wrap items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className="text-sm text-gray-900 break-all">{invitation.email}</p>
                <p className={invitation.status === 'rejected' ? 'text-xs text-red-600' : 'text-xs text-gray-500'}>
                  {t(`externals.status.${invitation.status}`)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => run(() => revoke.mutateAsync(invitation.id))}
                className="text-sm text-red-600 hover:underline"
              >
                {invitation.status === 'rejected' ? t('externals.dismiss') : t('externals.revoke')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </SettingsCard>
  )
}
