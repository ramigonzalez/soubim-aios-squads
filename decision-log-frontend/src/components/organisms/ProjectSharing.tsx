/**
 * ProjectSharing — organizations with access to a project (Story 12.3).
 *
 * List, invite (by exact organization slug), change access and remove. Shown on the
 * Project Edit page; renders nothing when the user cannot manage shares (API 403).
 */
import { FormEvent, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { AxiosError } from 'axios'
import {
  ShareAccess,
  useProjectOrganizations,
  useRemoveProjectShare,
  useShareProject,
  useUpdateProjectShare,
} from '../../hooks/useProjectOrganizations'

const SHARE_ACCESS: ShareAccess[] = ['viewer', 'contributor']

const inputClass =
  'block rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500'

function inviteErrorKey(error: unknown): string {
  const status = (error as AxiosError | undefined)?.response?.status
  if (status === 404) return 'sharing.errors.notFound'
  if (status === 409) return 'sharing.errors.alreadyShared'
  if (status === 400) return 'sharing.errors.owner'
  return 'sharing.errors.generic'
}

export default function ProjectSharing({ projectId }: { projectId: string }) {
  const { t } = useTranslation('projects')
  const { data: organizations, isLoading, isError } = useProjectOrganizations(projectId)
  const share = useShareProject(projectId)
  const update = useUpdateProjectShare(projectId)
  const remove = useRemoveProjectShare(projectId)
  const [slug, setSlug] = useState('')
  const [access, setAccess] = useState<ShareAccess>('viewer')
  const [error, setError] = useState<string | null>(null)

  if (isLoading || isError || !organizations) return null

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

  return (
    <section className="mt-10 pt-6 border-t border-gray-200 space-y-4" aria-labelledby="project-sharing-title">
      <div>
        <h2 id="project-sharing-title" className="text-lg font-medium text-gray-900">
          {t('sharing.title')}
        </h2>
        <p className="text-sm text-gray-500">{t('sharing.description')}</p>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <ul className="divide-y divide-gray-100">
        {organizations.map(org => (
          <li key={org.organization_id} className="flex items-center justify-between gap-3 py-2">
            <div>
              <p className="text-sm font-medium text-gray-900">{org.name}</p>
              <p className="text-xs text-gray-500">{org.slug}</p>
            </div>
            {org.access === 'owner' ? (
              <span className="text-xs font-medium text-gray-600">{t('sharing.access.owner')}</span>
            ) : (
              <div className="flex items-center gap-2">
                <select
                  aria-label={t('sharing.accessFor', { name: org.name })}
                  value={org.access}
                  onChange={e =>
                    run(() =>
                      update.mutateAsync({ organizationId: org.organization_id, access: e.target.value as ShareAccess })
                    )
                  }
                  className={inputClass}
                >
                  {SHARE_ACCESS.map(value => (
                    <option key={value} value={value}>
                      {t(`sharing.access.${value}`)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-label={t('sharing.remove', { name: org.name })}
                  onClick={() => {
                    if (window.confirm(t('sharing.removeConfirm', { name: org.name }))) {
                      void run(() => remove.mutateAsync(org.organization_id))
                    }
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={slug}
          onChange={e => setSlug(e.target.value)}
          placeholder={t('sharing.slugPlaceholder')}
          aria-label={t('sharing.slugLabel')}
          className={`${inputClass} flex-1`}
        />
        <select
          aria-label={t('sharing.accessLabel')}
          value={access}
          onChange={e => setAccess(e.target.value as ShareAccess)}
          className={inputClass}
        >
          {SHARE_ACCESS.map(value => (
            <option key={value} value={value}>
              {t(`sharing.access.${value}`)}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!slug.trim() || share.isLoading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {t('sharing.invite')}
        </button>
      </form>
    </section>
  )
}
