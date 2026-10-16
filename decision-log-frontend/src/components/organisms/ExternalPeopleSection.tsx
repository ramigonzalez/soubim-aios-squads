/**
 * ExternalPeopleSection — "Pessoas externas" of a project (Story 12.15), on the Promem design system.
 *
 * Owners/admins of the organization that owns the project invite anyone by e-mail to this project only.
 * Until e-mails are sent (12.14) the invite link is shown once, to copy. Lists external people (access
 * Viewer / Contributor, change, remove after a Dialog) and pending / rejected invitations (revoke).
 * Shown on the Project Edit page as a section card that saves on its own; renders nothing when the user
 * cannot manage it (API 403).
 */
import { useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Avatar, Badge, Banner, Button, Dialog, ErrorState, IconButton, Icons, Input, Select, SkeletonRows } from '../../design-system'
import {
  ExternalAccess,
  useInviteExternal,
  useProjectExternals,
  useRemoveExternal,
  useRevokeExternalInvitation,
  useUpdateExternalAccess,
} from '../../hooks/useProjectExternals'
import { FormSection } from '../templates/FormShell'

const ACCESS: ExternalAccess[] = ['viewer', 'contributor']
const KNOWN_ERRORS = ['already_member', 'already_invited']

function errorKey(error: unknown): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  return typeof detail === 'string' && KNOWN_ERRORS.includes(detail) ? `externals.errors.${detail}` : 'externals.errors.generic'
}

const isForbidden = (error: unknown) => (error as { response?: { status?: number } } | undefined)?.response?.status === 403

export default function ExternalPeopleSection({ projectId }: { projectId: string }) {
  const { t } = useTranslation('projects')
  const { data, isLoading, isError, error: loadError, refetch } = useProjectExternals(projectId)
  const invite = useInviteExternal(projectId)
  const update = useUpdateExternalAccess(projectId)
  const remove = useRemoveExternal(projectId)
  const revoke = useRevokeExternalInvitation(projectId)
  const [email, setEmail] = useState('')
  const [link, setLink] = useState<{ email: string; url: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<{ userId: string; name: string } | null>(null)

  if (isError && isForbidden(loadError)) return null

  const section = (children: ReactNode) => (
    <FormSection
      title={t('externals.title')}
      description={
        <>
          {t('externals.description')}
          <span className="block text-ink-3">{t('settings.autoSaved')}</span>
        </>
      }
    >
      {children}
    </FormSection>
  )

  if (isLoading) return section(<SkeletonRows rows={2} rowClassName="h-row-2" className="rounded-lg border border-line" />)
  if (isError || !data) {
    return section(<ErrorState className="py-6" title={t('externals.loadError')} onRetry={() => void refetch()} />)
  }

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
  const accessOptions = ACCESS.map((value) => ({ value, label: t(`externals.access.${value}`) }))

  return section(
    <>
      {error && <Banner tone="danger">{error}</Banner>}

      <form onSubmit={handleInvite} className="flex flex-col gap-2 md:flex-row">
        <Input
          type="email"
          size="toolbar"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('externals.emailPlaceholder')}
          aria-label={t('externals.emailLabel')}
          className="min-w-0 flex-1"
        />
        <Button type="submit" icon={<Icons.email />} disabled={!email.trim() || invite.isLoading}>
          {t('externals.invite')}
        </Button>
      </form>

      {link && (
        <div role="status" className="flex flex-col gap-2 rounded-md bg-surface-2 p-3">
          <p className="flex items-start gap-2 text-small text-ink">
            <Icons.check className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={1.75} aria-hidden />
            <span>{t('externals.created', { email: link.email })}</span>
          </p>
          <div className="flex flex-col gap-2 md:flex-row">
            <Input
              readOnly
              size="toolbar"
              value={link.url}
              aria-label={t('externals.linkLabel')}
              leadingIcon={<Icons.link />}
              className="min-w-0 flex-1 font-mono"
            />
            <Button icon={<Icons.copy />} onClick={() => void copyLink()}>
              {copied ? t('externals.copied') : t('externals.copy')}
            </Button>
          </div>
        </div>
      )}

      {empty ? (
        <p className="rounded-md border border-dashed border-line-strong px-4 py-5 text-center text-small text-ink-2">{t('externals.empty')}</p>
      ) : (
        <ul className="rounded-lg border border-line" aria-label={t('externals.title')}>
          {data.externals.map((person) => (
            <li
              key={person.user_id}
              className="flex min-h-row-2 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line-soft px-4 py-2.5 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar name={person.name} size={32} />
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-small font-medium text-ink">
                    <span className="min-w-0 truncate">{person.name}</span>
                    <Badge title={t('common:external.hint')} data-testid="external-badge">
                      {t('common:external.badge')}
                    </Badge>
                  </p>
                  <p className="break-all text-caption text-ink-2">{person.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Select
                  size="toolbar"
                  className="w-36"
                  aria-label={t('externals.accessFor', { name: person.name })}
                  value={person.access}
                  onValueChange={(value) => void run(() => update.mutateAsync({ userId: person.user_id, access: value as ExternalAccess }))}
                  options={accessOptions}
                />
                <IconButton
                  label={t('externals.remove', { name: person.name })}
                  icon={<Icons.remove />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setRemoving({ userId: person.user_id, name: person.name })}
                />
              </div>
            </li>
          ))}
          {data.invitations.map((invitation) => (
            <li
              key={invitation.id}
              className="flex min-h-row-2 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line-soft px-4 py-2.5 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar name={invitation.email} size={32} />
                <div className="flex min-w-0 flex-col items-start gap-1">
                  <p className="break-all text-small text-ink">{invitation.email}</p>
                  <Badge tone={invitation.status === 'rejected' ? 'danger' : 'neutral'}>{t(`externals.status.${invitation.status}`)}</Badge>
                </div>
              </div>
              <Button size="sm" variant="danger-ghost" onClick={() => void run(() => revoke.mutateAsync(invitation.id))}>
                {invitation.status === 'rejected' ? t('externals.dismiss') : t('externals.revoke')}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t('externals.removeTitle')}
        description={removing ? t('externals.removeConfirm', { name: removing.name }) : undefined}
        footer={
          <>
            <Button onClick={() => setRemoving(null)}>{t('common:cancel')}</Button>
            <Button
              variant="primary"
              loading={remove.isLoading}
              onClick={() => {
                if (!removing) return
                const { userId } = removing
                setRemoving(null)
                void run(() => remove.mutateAsync(userId))
              }}
            >
              {t('externals.removeAction')}
            </Button>
          </>
        }
      />
    </>,
  )
}
