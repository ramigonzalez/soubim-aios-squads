import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Banner, Button, Dialog, EmptyState, ErrorState, Field, Icons, Input, SkeletonRows } from '../../design-system'
import { useCompanyInvitations, useCreateCompanyInvitation, useRevokeCompanyInvitation } from '../../hooks/usePlatform'
import { formatDate } from '../../lib/utils'
import type { OrganizationInvitationInfo } from '../../types/organization'

function apiError(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || fallback
}

const SECTION = 'flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 md:p-6'
const LIST = 'flex flex-col divide-y divide-line-soft rounded-lg border border-line bg-surface'

/**
 * Platform page (Story 12.13): invite the first owner of a new company (12.5 flow; the organization is
 * created when the invitation is accepted). Emails are not sent yet (12.14), so the link is shown once
 * with a copy button. Below, the pending new-company invitations with revoke (confirmed in a dialog).
 */
export function CompanyInvitations() {
  return (
    <>
      <CompanyInvitationForm />
      <PendingCompanyInvitations />
    </>
  )
}

function SectionTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-h3 text-ink">{title}</h2>
      {description && <p className="text-caption text-ink-2 [text-wrap:pretty]">{description}</p>}
    </div>
  )
}

function CompanyInvitationForm() {
  const { t } = useTranslation('platform')
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [created, setCreated] = useState<OrganizationInvitationInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const create = useCreateCompanyInvitation()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    create.mutate(
      { email, organizationName: companyName },
      {
        onSuccess: invitation => {
          setCreated(invitation)
          setCopied(false)
          setEmail('')
          setCompanyName('')
        },
      }
    )
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(created?.invite_url ?? '')
      setCopied(true)
    } catch {
      // clipboard blocked: the link is selectable in the field
    }
  }

  const Check = Icons.check
  const Copy = Icons.copy

  return (
    <section className={SECTION}>
      <SectionTitle title={t('invite.title')} description={t('invite.hint')} />
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Field label={t('invite.companyName')} className="min-w-0 sm:flex-1 sm:basis-56">
          <Input
            id="company-name"
            required
            maxLength={255}
            value={companyName}
            placeholder={t('invite.companyPlaceholder')}
            onChange={e => setCompanyName(e.target.value)}
          />
        </Field>
        <Field label={t('invite.email')} className="min-w-0 sm:flex-1 sm:basis-56">
          <Input
            id="company-email"
            type="email"
            required
            value={email}
            placeholder={t('invite.emailPlaceholder')}
            onChange={e => setEmail(e.target.value)}
          />
        </Field>
        <Button type="submit" variant="primary" loading={create.isLoading} className="max-md:h-11 sm:self-end">
          {create.isLoading ? t('invite.sending') : t('invite.submit')}
        </Button>
      </form>
      {create.isError && <Banner tone="danger">{apiError(create.error, t('invite.error'))}</Banner>}
      {created?.invite_url && (
        <div role="status" className="flex flex-col gap-2 rounded-md border border-line bg-surface-2 p-3">
          <p className="flex items-start gap-2 text-small text-ink">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={1.75} aria-hidden />
            <span className="min-w-0 [text-wrap:pretty]">{t('invite.created', { email: created.email })}</span>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              readOnly
              aria-label={t('invite.link')}
              value={created.invite_url}
              onFocus={e => e.currentTarget.select()}
              className="min-w-0 flex-1 font-mono text-mono"
            />
            <Button variant="primary" icon={copied ? <Check strokeWidth={1.75} /> : <Copy strokeWidth={1.75} />} onClick={() => void copy()}>
              {copied ? t('invite.copied') : t('invite.copy')}
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}

function PendingCompanyInvitations() {
  const { t } = useTranslation('platform')
  const { data: invitations = [], isLoading, isError, refetch } = useCompanyInvitations()
  const revoke = useRevokeCompanyInvitation()
  const [confirming, setConfirming] = useState<OrganizationInvitationInfo | null>(null)

  return (
    <section className={SECTION}>
      <SectionTitle title={t('pending.title')} />
      {revoke.isError && !confirming && <Banner tone="danger">{t('pending.revokeError')}</Banner>}
      {isLoading ? (
        <SkeletonRows rows={2} rowClassName="h-row-2" className={LIST} />
      ) : isError ? (
        <ErrorState title={t('pending.loadError')} onRetry={() => void refetch()} className="py-6" />
      ) : invitations.length === 0 ? (
        <EmptyState
          icon={<Icons.email strokeWidth={1.25} />}
          title={t('pending.empty')}
          text={t('pending.emptyText')}
          className="rounded-lg border border-dashed border-line py-8"
        />
      ) : (
        <ul className={LIST}>
          {invitations.map(i => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-3 py-2.5">
              <div className="flex min-w-0 flex-1 basis-56 flex-col">
                <span className="text-body font-medium text-ink">{i.organization_name}</span>
                <span className="text-caption text-ink-2">
                  <span className="break-all">{i.email}</span> · {t('pending.expiresLabel')}{' '}
                  <span className="font-mono text-mono-sm">{formatDate(i.expires_at)}</span>
                </span>
              </div>
              <Button variant="danger-ghost" size="sm" disabled={revoke.isLoading} onClick={() => setConfirming(i)}>
                {t('pending.revoke')}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={!!confirming}
        onOpenChange={open => {
          if (!open) setConfirming(null)
        }}
        title={t('pending.revokeTitle')}
        description={
          confirming ? t('pending.revokeText', { email: confirming.email, name: confirming.organization_name }) : undefined
        }
        footer={
          <>
            {revoke.isError && <p className="mr-auto text-caption text-danger-ink">{t('pending.revokeError')}</p>}
            <Button onClick={() => setConfirming(null)}>{t('cancel')}</Button>
            <Button
              variant="primary"
              loading={revoke.isLoading}
              onClick={() => confirming && revoke.mutate(confirming.id, { onSuccess: () => setConfirming(null) })}
            >
              {t('pending.revokeConfirm')}
            </Button>
          </>
        }
      />
    </section>
  )
}
