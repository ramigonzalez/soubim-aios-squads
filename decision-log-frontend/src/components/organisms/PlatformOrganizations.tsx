import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Avatar,
  Badge,
  Banner,
  Button,
  Dialog,
  EmptyState,
  ErrorState,
  Icons,
  Select,
  SkeletonRows,
  useToast,
  type BadgeTone,
} from '../../design-system'
import { usePlatformOrganization, usePlatformOrganizations, useSetOrganizationStatus } from '../../hooks/usePlatform'
import { formatDate } from '../../lib/utils'
import type { OrganizationStatus, PlatformOrganization } from '../../types/organization'

const STATUSES: OrganizationStatus[] = ['active', 'payment_pending', 'blocked']

/** Non-active statuses carry a badge next to the name (text + tone, never colour alone). */
const STATUS_TONE: Partial<Record<OrganizationStatus, BadgeTone>> = {
  payment_pending: 'warning',
  blocked: 'danger',
}

const LIST = 'flex flex-col divide-y divide-line-soft rounded-lg border border-line bg-surface'

/**
 * Platform page (Story 12.13): client organizations with counts only (never their content), a status
 * selector (active / payment pending / blocked) and the member list on demand.
 * Promem revamp Phase 4c: blocking is confirmed in a dialog; other status changes apply at once with
 * a "Desfazer" toast.
 */
export function PlatformOrganizations() {
  const { t } = useTranslation('platform')
  const toast = useToast()
  const { data: organizations = [], isLoading, isError, refetch } = usePlatformOrganizations()
  const setStatus = useSetOrganizationStatus()
  const [openId, setOpenId] = useState<string | null>(null)
  const [blocking, setBlocking] = useState<PlatformOrganization | null>(null)

  const apply = (org: PlatformOrganization, status: OrganizationStatus, onDone?: () => void) => {
    const previous = org.status
    setStatus.mutate(
      { id: org.id, status },
      {
        onSuccess: () => {
          onDone?.()
          toast.show({
            message: t('organizations.statusChanged', { name: org.name, status: t(`status.${status}`) }),
            tone: 'success',
            onUndo: () => setStatus.mutate({ id: org.id, status: previous }),
          })
        },
      }
    )
  }

  const changeStatus = (org: PlatformOrganization, status: OrganizationStatus) => {
    if (status === org.status) return
    if (status === 'blocked') return setBlocking(org)
    apply(org, status)
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-h3 text-ink">{t('organizations.title')}</h2>
        {!isLoading && !isError && organizations.length > 0 && (
          <p className="text-caption text-ink-2">{t('organizations.count', { count: organizations.length })}</p>
        )}
      </div>
      {setStatus.isError && !blocking && <Banner tone="danger">{t('organizations.statusError')}</Banner>}
      {isLoading ? (
        <SkeletonRows rows={3} rowClassName="h-row-2" className={LIST} />
      ) : isError ? (
        <ErrorState title={t('organizations.error')} onRetry={() => void refetch()} className="py-6" />
      ) : organizations.length === 0 ? (
        <EmptyState
          icon={<Icons.projects strokeWidth={1.25} />}
          title={t('organizations.empty')}
          text={t('organizations.emptyText')}
          className="rounded-lg border border-dashed border-line py-8"
        />
      ) : (
        <ul className={LIST}>
          {organizations.map(org => {
            const open = openId === org.id
            const tone = STATUS_TONE[org.status]
            const Chevron = open ? Icons.previous : Icons.next
            return (
              <li key={org.id} className="flex flex-col gap-2 px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <div className="flex min-w-0 flex-1 basis-64 flex-col gap-0.5">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-body font-medium text-ink">{org.name}</span>
                      <span className="font-mono text-mono-sm text-ink-3">{org.slug}</span>
                      {tone && <Badge tone={tone}>{t(`status.${org.status}`)}</Badge>}
                    </p>
                    <p className="text-caption text-ink-2">
                      {t('organizations.created')} <span className="font-mono text-mono-sm">{formatDate(org.created_at)}</span> ·{' '}
                      {t('organizations.members')} {org.member_count} · {t('organizations.projects')} {org.project_count}
                      {org.last_activity_at && (
                        <>
                          {' '}
                          · {t('organizations.lastActivity')}{' '}
                          <span className="font-mono text-mono-sm">{formatDate(org.last_activity_at)}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <Select
                      aria-label={t('organizations.statusLabel', { name: org.name })}
                      value={org.status}
                      disabled={setStatus.isLoading}
                      onValueChange={v => changeStatus(org, v as OrganizationStatus)}
                      options={STATUSES.map(s => ({ value: s, label: t(`status.${s}`) }))}
                      className="min-w-0 flex-1 sm:w-48 sm:flex-none"
                    />
                    <Button variant="ghost" size="sm" aria-expanded={open} onClick={() => setOpenId(id => (id === org.id ? null : org.id))}>
                      {open ? t('organizations.hideDetails') : t('organizations.details')}
                      <Chevron className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
                    </Button>
                  </div>
                </div>
                {open && <OrganizationMembers id={org.id} name={org.name} />}
              </li>
            )
          })}
        </ul>
      )}
      <Dialog
        open={!!blocking}
        onOpenChange={o => {
          if (!o) setBlocking(null)
        }}
        title={blocking ? t('organizations.blockTitle', { name: blocking.name }) : ''}
        description={blocking ? t('organizations.confirmBlock', { name: blocking.name }) : undefined}
        footer={
          <>
            {setStatus.isError && <p className="mr-auto text-caption text-danger-ink">{t('organizations.statusError')}</p>}
            <Button onClick={() => setBlocking(null)}>{t('cancel')}</Button>
            <Button
              variant="primary"
              loading={setStatus.isLoading}
              onClick={() => blocking && apply(blocking, 'blocked', () => setBlocking(null))}
            >
              {t('organizations.blockConfirm')}
            </Button>
          </>
        }
      />
    </section>
  )
}

function OrganizationMembers({ id, name }: { id: string; name: string }) {
  const { t } = useTranslation('platform')
  const { data, isLoading, isError, refetch } = usePlatformOrganization(id)

  return (
    <div className="flex flex-col gap-2 rounded-md bg-surface-2 p-3" aria-label={t('detail.membersOf', { name })} role="region">
      {isLoading && <SkeletonRows rows={2} rowClassName="h-row" />}
      {isError && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-caption text-danger-ink">{t('detail.error')}</p>
          <Button size="sm" onClick={() => void refetch()}>
            {t('detail.retry')}
          </Button>
        </div>
      )}
      {data && data.members.length === 0 && <p className="text-caption text-ink-2">{t('detail.empty')}</p>}
      {data && data.members.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {data.members.map(m => (
            <li key={m.email} className="flex min-w-0 items-start gap-2">
              <Avatar name={m.name} size={20} className="mt-0.5" />
              <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                <span className="text-small font-medium text-ink">{m.name}</span>
                <span className="break-all text-caption text-ink-2">{m.email}</span>
                <span className="text-caption text-ink-2">· {t(`roles.${m.role}`)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
