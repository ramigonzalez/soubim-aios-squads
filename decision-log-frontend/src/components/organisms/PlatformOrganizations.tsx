import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { usePlatformOrganization, usePlatformOrganizations, useSetOrganizationStatus } from '../../hooks/usePlatform'
import { formatDate } from '../../lib/utils'
import type { OrganizationStatus, PlatformOrganization } from '../../types/organization'

const STATUSES: OrganizationStatus[] = ['active', 'payment_pending', 'blocked']

const STATUS_STYLE: Record<OrganizationStatus, string> = {
  active: 'border-gray-300',
  payment_pending: 'border-amber-400 bg-amber-50',
  blocked: 'border-red-400 bg-red-50',
}

/**
 * Platform page (Story 12.13): client organizations with counts only (never their content), a status
 * selector (active / payment pending / blocked) and the member list on demand.
 */
export function PlatformOrganizations() {
  const { t } = useTranslation('platform')
  const { data: organizations = [], isLoading, isError } = usePlatformOrganizations()
  const setStatus = useSetOrganizationStatus()
  const [openId, setOpenId] = useState<string | null>(null)

  const changeStatus = (org: PlatformOrganization, status: OrganizationStatus) => {
    if (status === 'blocked' && !window.confirm(t('organizations.confirmBlock', { name: org.name }))) return
    setStatus.mutate({ id: org.id, status })
  }

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">{t('organizations.title')}</h2>
      {isLoading && <p className="text-sm text-gray-500">{t('organizations.loading')}</p>}
      {isError && (
        <p role="alert" className="text-sm text-red-700">
          {t('organizations.error')}
        </p>
      )}
      {setStatus.isError && (
        <p role="alert" className="text-sm text-red-700">
          {t('organizations.statusError')}
        </p>
      )}
      {!isLoading && !isError && organizations.length === 0 && (
        <p className="text-sm text-gray-500">{t('organizations.empty')}</p>
      )}
      <ul className="divide-y divide-gray-100">
        {organizations.map(org => (
          <li key={org.id} className="py-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-gray-900">
                  {org.name} <span className="text-xs font-normal text-gray-500">{org.slug}</span>
                </p>
                <p className="text-xs text-gray-500">
                  {t('organizations.created')} {formatDate(org.created_at)} · {t('organizations.members')}{' '}
                  {org.member_count} · {t('organizations.projects')} {org.project_count}
                  {org.last_activity_at && (
                    <>
                      {' '}
                      · {t('organizations.lastActivity')} {formatDate(org.last_activity_at)}
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  aria-label={t('organizations.statusLabel', { name: org.name })}
                  value={org.status}
                  disabled={setStatus.isLoading}
                  onChange={e => changeStatus(org, e.target.value as OrganizationStatus)}
                  className={`border rounded-lg px-2 py-1 text-sm ${STATUS_STYLE[org.status]}`}
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>
                      {t(`status.${s}`)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  aria-expanded={openId === org.id}
                  onClick={() => setOpenId(id => (id === org.id ? null : org.id))}
                  className="text-xs font-medium text-blue-600 hover:underline"
                >
                  {openId === org.id ? t('organizations.hideDetails') : t('organizations.details')}
                </button>
              </div>
            </div>
            {openId === org.id && <OrganizationMembers id={org.id} name={org.name} />}
          </li>
        ))}
      </ul>
    </section>
  )
}

function OrganizationMembers({ id, name }: { id: string; name: string }) {
  const { t } = useTranslation('platform')
  const { data, isLoading, isError } = usePlatformOrganization(id)

  return (
    <div className="mt-2 rounded-lg bg-gray-50 p-3" aria-label={t('detail.membersOf', { name })} role="region">
      {isLoading && <p className="text-xs text-gray-500">{t('detail.loading')}</p>}
      {isError && <p className="text-xs text-red-700">{t('detail.error')}</p>}
      {data && data.members.length === 0 && <p className="text-xs text-gray-500">{t('detail.empty')}</p>}
      {data && data.members.length > 0 && (
        <ul className="space-y-1">
          {data.members.map(m => (
            <li key={m.email} className="flex flex-wrap gap-2 text-sm">
              <span className="font-medium text-gray-900">{m.name}</span>
              <span className="text-gray-500 break-all">{m.email}</span>
              <span className="text-gray-500">· {t(`roles.${m.role}`)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
