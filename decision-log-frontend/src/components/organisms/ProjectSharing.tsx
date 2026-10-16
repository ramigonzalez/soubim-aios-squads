/**
 * ProjectSharing — organizations with access to a project (Story 12.3), on the Promem design system.
 *
 * List, invite (by exact organization slug), change access and remove (confirmed in a Dialog that names
 * the action). Shown on the Project Edit page as a section card that saves on its own; renders nothing
 * when the user cannot manage shares (API 403).
 */
import { useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { AxiosError } from 'axios'
import { Badge, Banner, Button, Dialog, ErrorState, IconButton, Icons, Input, Select, SkeletonRows } from '../../design-system'
import {
  ShareAccess,
  useProjectOrganizations,
  useRemoveProjectShare,
  useShareProject,
  useUpdateProjectShare,
  type ProjectOrganization,
} from '../../hooks/useProjectOrganizations'
import { FormSection } from '../templates/FormShell'

const SHARE_ACCESS: ShareAccess[] = ['viewer', 'contributor']

function inviteErrorKey(error: unknown): string {
  const status = (error as AxiosError | undefined)?.response?.status
  if (status === 404) return 'sharing.errors.notFound'
  if (status === 409) return 'sharing.errors.alreadyShared'
  if (status === 400) return 'sharing.errors.owner'
  return 'sharing.errors.generic'
}

const isForbidden = (error: unknown) => (error as AxiosError | undefined)?.response?.status === 403

export default function ProjectSharing({ projectId }: { projectId: string }) {
  const { t } = useTranslation('projects')
  const { data: organizations, isLoading, isError, error: loadError, refetch } = useProjectOrganizations(projectId)
  const share = useShareProject(projectId)
  const update = useUpdateProjectShare(projectId)
  const remove = useRemoveProjectShare(projectId)
  const [slug, setSlug] = useState('')
  const [access, setAccess] = useState<ShareAccess>('viewer')
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<ProjectOrganization | null>(null)

  if (isError && isForbidden(loadError)) return null

  const section = (children: ReactNode) => (
    <FormSection
      title={t('sharing.title')}
      description={
        <>
          {t('sharing.description')}
          <span className="block text-ink-3">{t('settings.autoSaved')}</span>
        </>
      }
    >
      {children}
    </FormSection>
  )

  if (isLoading) return section(<SkeletonRows rows={2} rowClassName="h-row-2" className="rounded-lg border border-line" />)
  if (isError || !organizations) {
    return section(<ErrorState className="py-6" title={t('sharing.loadError')} onRetry={() => void refetch()} />)
  }

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault()
    if (!slug.trim()) return
    setError(null)
    try {
      await share.mutateAsync({ slug: slug.trim(), access })
      setSlug('')
    } catch (err) {
      setError(t(inviteErrorKey(err)))
    }
  }

  const run = async (action: () => Promise<unknown>) => {
    setError(null)
    try {
      await action()
    } catch {
      setError(t('sharing.errors.generic'))
    }
  }

  const accessOptions = SHARE_ACCESS.map((value) => ({ value, label: t(`sharing.access.${value}`) }))

  return section(
    <>
      {error && <Banner tone="danger">{error}</Banner>}

      <ul className="rounded-lg border border-line">
        {organizations.map((org) => (
          <li
            key={org.organization_id}
            className="flex min-h-row-2 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line-soft px-4 py-2.5 last:border-b-0"
          >
            <div className="min-w-0">
              <p className="truncate text-small font-medium text-ink">{org.name}</p>
              <p className="truncate font-mono text-mono-sm text-ink-2">{org.slug}</p>
            </div>
            {org.access === 'owner' ? (
              <Badge>{t('sharing.access.owner')}</Badge>
            ) : (
              <div className="flex items-center gap-1">
                <Select
                  size="toolbar"
                  className="w-36"
                  aria-label={t('sharing.accessFor', { name: org.name })}
                  value={org.access}
                  onValueChange={(value) =>
                    void run(() => update.mutateAsync({ organizationId: org.organization_id, access: value as ShareAccess }))
                  }
                  options={accessOptions}
                />
                <IconButton
                  label={t('sharing.remove', { name: org.name })}
                  icon={<Icons.remove />}
                  size="sm"
                  variant="ghost"
                  onClick={() => setRemoving(org)}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={handleInvite} className="flex flex-col gap-2 md:flex-row">
        <Input
          type="text"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder={t('sharing.slugPlaceholder')}
          size="toolbar"
          aria-label={t('sharing.slugLabel')}
          className="min-w-0 flex-1"
        />
        <Select
          size="toolbar"
          className="md:w-40"
          aria-label={t('sharing.accessLabel')}
          value={access}
          onValueChange={(value) => setAccess(value as ShareAccess)}
          options={accessOptions}
        />
        <Button type="submit" icon={<Icons.add />} disabled={!slug.trim() || share.isLoading}>
          {t('sharing.invite')}
        </Button>
      </form>

      <Dialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t('sharing.removeTitle')}
        description={removing ? t('sharing.removeConfirm', { name: removing.name }) : undefined}
        footer={
          <>
            <Button onClick={() => setRemoving(null)}>{t('common:cancel')}</Button>
            <Button
              variant="primary"
              loading={remove.isLoading}
              onClick={() => {
                if (!removing) return
                const id = removing.organization_id
                setRemoving(null)
                void run(() => remove.mutateAsync(id))
              }}
            >
              {t('sharing.removeAction')}
            </Button>
          </>
        }
      />
    </>,
  )
}
