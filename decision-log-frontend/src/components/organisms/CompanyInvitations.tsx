import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCompanyInvitations, useCreateCompanyInvitation, useRevokeCompanyInvitation } from '../../hooks/usePlatform'
import { formatDate } from '../../lib/utils'
import type { OrganizationInvitationInfo } from '../../types/organization'

function apiError(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || fallback
}

/**
 * Platform page (Story 12.13): invite the first owner of a new company (12.5 flow; the organization is
 * created when the invitation is accepted). Emails are not sent yet (12.14), so the link is shown once
 * with a copy button. Below, the pending new-company invitations with revoke.
 */
export function CompanyInvitations() {
  return (
    <>
      <CompanyInvitationForm />
      <PendingCompanyInvitations />
    </>
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
      // clipboard blocked: the link is selectable in the box
    }
  }

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">{t('invite.title')}</h2>
      <p className="text-xs text-gray-500">{t('invite.hint')}</p>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[12rem]">
          <label htmlFor="company-name" className="block text-sm font-medium text-gray-700">
            {t('invite.companyName')}
          </label>
          <input
            id="company-name"
            required
            maxLength={255}
            value={companyName}
            onChange={e => setCompanyName(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1 min-w-[12rem]">
          <label htmlFor="company-email" className="block text-sm font-medium text-gray-700">
            {t('invite.email')}
          </label>
          <input
            id="company-email"
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={create.isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {create.isLoading ? t('invite.sending') : t('invite.submit')}
        </button>
      </form>
      {create.isError && (
        <p role="alert" className="text-sm text-red-700">
          {apiError(create.error, t('invite.error'))}
        </p>
      )}
      {created?.invite_url && (
        <div role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-800 space-y-2">
          <p>{t('invite.created', { email: created.email })}</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              aria-label={t('invite.link')}
              value={created.invite_url}
              onFocus={e => e.currentTarget.select()}
              className="flex-1 border border-green-200 rounded px-2 py-1 bg-white text-xs"
            />
            <button type="button" onClick={copy} className="px-3 py-1 bg-green-600 text-white rounded text-xs">
              {copied ? t('invite.copied') : t('invite.copy')}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

function PendingCompanyInvitations() {
  const { t } = useTranslation('platform')
  const { data: invitations = [] } = useCompanyInvitations()
  const revoke = useRevokeCompanyInvitation()

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">{t('pending.title')}</h2>
      {revoke.isError && (
        <p role="alert" className="text-sm text-red-700">
          {t('pending.revokeError')}
        </p>
      )}
      {invitations.length === 0 ? (
        <p className="text-sm text-gray-500">{t('pending.empty')}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {invitations.map(i => (
            <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <span className="min-w-0">
                <span className="font-medium text-gray-900">{i.organization_name}</span>{' '}
                <span className="text-gray-500 break-all">{i.email}</span>{' '}
                <span className="text-gray-500">· {t('pending.expires', { date: formatDate(i.expires_at) })}</span>
              </span>
              <button
                onClick={() => revoke.mutate(i.id)}
                disabled={revoke.isLoading}
                className="text-red-600 hover:underline disabled:opacity-40"
              >
                {t('pending.revoke')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
