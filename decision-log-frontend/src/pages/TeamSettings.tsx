import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useActiveOrganization } from '../hooks/useOrganizations'
import {
  useCreateInvitation,
  useInvitations,
  useMembers,
  useRemoveMember,
  useRevokeInvitation,
  useUpdateMemberRole,
} from '../hooks/useTeam'
import { formatDate } from '../lib/utils'
import { useAuthStore } from '../store/authStore'
import type { OrganizationInvitationInfo, OrganizationRole } from '../types/organization'

// the platform operator organization (seeded with this slug) may invite new companies
const PLATFORM_SLUG = 'soubim'

function apiError(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || fallback
}

/**
 * Settings → Team (Story 12.5): members, roles and invitations of the active organization.
 * Owners and admins only (the API enforces it; non-admins just see a notice).
 */
export default function TeamSettings() {
  const { t } = useTranslation('team')
  const { active, isAdmin } = useActiveOrganization()

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          {active && <p className="mt-1 text-sm text-gray-600">{t('subtitle', { organization: active.name })}</p>}
        </header>
        {active && isAdmin ? (
          <>
            <InviteForm orgId={active.id} canCreateCompany={active.slug === PLATFORM_SLUG} isOwner={active.role === 'owner'} />
            <PendingInvitations orgId={active.id} />
            <Members orgId={active.id} isOwner={active.role === 'owner'} />
          </>
        ) : (
          <p className="text-sm text-gray-600">{t('noAccess')}</p>
        )}
      </div>
    </main>
  )
}

function RoleSelect({
  value,
  onChange,
  isOwner,
  label,
  id,
}: {
  value: OrganizationRole
  onChange: (role: OrganizationRole) => void
  isOwner: boolean
  label: string
  id?: string
}) {
  const { t } = useTranslation('team')
  // only owners grant or change the owner role
  const roles: OrganizationRole[] = isOwner ? ['owner', 'admin', 'member'] : ['admin', 'member']
  const options = roles.includes(value) ? roles : [value, ...roles]
  return (
    <select
      id={id}
      aria-label={label}
      value={value}
      disabled={!roles.includes(value)}
      onChange={e => onChange(e.target.value as OrganizationRole)}
      className="border border-gray-300 rounded-lg px-2 py-1 bg-white text-sm"
    >
      {options.map(r => (
        <option key={r} value={r}>
          {t(`roles.${r}`)}
        </option>
      ))}
    </select>
  )
}

function InviteForm({ orgId, canCreateCompany, isOwner }: { orgId: string; canCreateCompany: boolean; isOwner: boolean }) {
  const { t } = useTranslation('team')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrganizationRole>('member')
  const [company, setCompany] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [created, setCreated] = useState<OrganizationInvitationInfo | null>(null)
  const [copied, setCopied] = useState(false)
  const create = useCreateInvitation(orgId)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    create.mutate(
      { email, role, organizationName: company ? companyName : undefined },
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
      <form onSubmit={submit} className="space-y-3">
        {canCreateCompany && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={company} onChange={e => setCompany(e.target.checked)} />
            {t('invite.companyToggle')}
          </label>
        )}
        {company && (
          <div>
            <label htmlFor="invite-company" className="block text-sm font-medium text-gray-700">
              {t('invite.companyName')}
            </label>
            <input
              id="invite-company"
              required
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">{t('invite.companyHint')}</p>
          </div>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[12rem]">
            <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700">
              {t('invite.email')}
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          {!company && (
            <div>
              <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700">
                {t('invite.role')}
              </label>
              <RoleSelect id="invite-role" value={role} onChange={setRole} isOwner={isOwner} label={t('invite.role')} />
            </div>
          )}
          <button
            type="submit"
            disabled={create.isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {create.isLoading ? t('invite.sending') : t('invite.submit')}
          </button>
        </div>
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
              aria-label="invite link"
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

function PendingInvitations({ orgId }: { orgId: string }) {
  const { t } = useTranslation('team')
  const { data: invitations = [] } = useInvitations(orgId)
  const revoke = useRevokeInvitation(orgId)

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">{t('pending.title')}</h2>
      {invitations.length === 0 ? (
        <p className="text-sm text-gray-500">{t('pending.empty')}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {invitations.map(i => (
            <li key={i.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                <span className="font-medium text-gray-900">{i.email}</span>{' '}
                <span className="text-gray-500">
                  {t(`roles.${i.role}`)} · {t('pending.expires', { date: formatDate(i.expires_at) })}
                </span>
              </span>
              <button onClick={() => revoke.mutate(i.id)} className="text-red-600 hover:underline">
                {t('pending.revoke')}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Members({ orgId, isOwner }: { orgId: string; isOwner: boolean }) {
  const { t } = useTranslation('team')
  const currentUserId = useAuthStore(s => s.user?.id)
  const { data: members = [], isLoading } = useMembers(orgId)
  const update = useUpdateMemberRole(orgId)
  const remove = useRemoveMember(orgId)
  const error = update.error ?? remove.error

  return (
    <section className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <h2 className="text-lg font-semibold text-gray-900">{t('members.title')}</h2>
      {isLoading && <p className="text-sm text-gray-500">{t('members.loading')}</p>}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {apiError(error, t('members.error'))}
        </p>
      )}
      <ul className="divide-y divide-gray-100">
        {members.map(m => (
          <li key={m.user_id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span className="min-w-0">
              <span className="font-medium text-gray-900">{m.name}</span>{' '}
              <span className="text-gray-500 break-all">{m.email}</span>
            </span>
            <span className="flex items-center gap-3">
              <RoleSelect
                value={m.role}
                isOwner={isOwner}
                label={`${t('members.role')} ${m.name}`}
                onChange={role => update.mutate({ userId: m.user_id, role })}
              />
              <button
                disabled={m.user_id === currentUserId || (m.role === 'owner' && !isOwner)}
                onClick={() => {
                  if (window.confirm(t('members.confirmRemove', { name: m.name }))) remove.mutate(m.user_id)
                }}
                className="text-red-600 hover:underline disabled:opacity-40 disabled:no-underline"
              >
                {t('members.remove')}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
