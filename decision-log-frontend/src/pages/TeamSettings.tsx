import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Avatar,
  Badge,
  Banner,
  Button,
  Checkbox,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Icons,
  Input,
  Select,
  SkeletonRows,
  useToast,
} from '../design-system'
import { FormSection } from '../components/templates/FormShell'
import { FormContainer } from '../components/templates/PageContainer'
import { useActiveOrganization } from '../hooks/useOrganizations'
import {
  useCreateInvitation,
  useInvitations,
  useMembers,
  useProjectAssignments,
  useRemoveMember,
  useRevokeInvitation,
  useSetProjectAssignment,
  useUpdateMemberRole,
} from '../hooks/useTeam'
import { formatDate } from '../lib/utils'
import { useAuthStore } from '../store/authStore'
import { ExternalBadge } from '../components/atoms/ExternalBadge'
import { EXTERNAL_ROLE } from '../types/organization'
import type {
  OrganizationInvitationInfo,
  OrganizationMemberInfo,
  OrganizationProjectAssignments,
  OrganizationRole,
} from '../types/organization'

function apiError(error: unknown, fallback: string): string {
  return (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail || fallback
}

/** Bordered container of dense rows (guidelines §4–§5). */
const LIST = 'flex flex-col divide-y divide-line-soft rounded-lg border border-line bg-surface'

/**
 * Settings → Team (Story 12.5): members, roles and invitations of the active organization.
 * Story 12.7: `reviewer` role, and which projects each member / reviewer is assigned to.
 * Owners and admins only (the API enforces it; non-admins just see a notice).
 * Promem revamp Phase 4c: settings shell (single column, section cards), rows, dialogs for
 * removing a person or revoking an invitation, toast with "Desfazer" for role changes.
 */
export default function TeamSettings() {
  const { t } = useTranslation('team')
  const { active, isAdmin, isLoading } = useActiveOrganization()

  return (
    <FormContainer>
      <header className="flex flex-col gap-1">
        <p className="text-label uppercase text-ink-2">{t('eyebrow')}</p>
        <h1 className="text-h1 text-ink [text-wrap:balance]">{t('title')}</h1>
        {active && <p className="text-small text-ink-2 [text-wrap:pretty]">{t('subtitle', { organization: active.name })}</p>}
      </header>
      {isLoading && !active ? (
        <SkeletonRows rows={4} rowClassName="h-12" />
      ) : active && isAdmin ? (
        <>
          <InviteForm orgId={active.id} isOwner={active.role === 'owner'} />
          <PendingInvitations orgId={active.id} />
          <Members orgId={active.id} orgName={active.name} isOwner={active.role === 'owner'} />
        </>
      ) : (
        <Banner>{t('noAccess')}</Banner>
      )}
    </FormContainer>
  )
}

function RoleSelect({
  value,
  onChange,
  isOwner,
  label,
  id,
  className,
}: {
  value: OrganizationRole
  onChange: (role: OrganizationRole) => void
  isOwner: boolean
  label: string
  id?: string
  className?: string
}) {
  const { t } = useTranslation('team')
  // only owners grant or change the owner role
  const roles: OrganizationRole[] = isOwner ? ['owner', 'admin', 'reviewer', 'member'] : ['admin', 'reviewer', 'member']
  const options = roles.includes(value) ? roles : [value, ...roles]
  return (
    <Select
      id={id}
      aria-label={label}
      value={value}
      disabled={!roles.includes(value)}
      onValueChange={v => onChange(v as OrganizationRole)}
      options={options.map(r => ({ value: r, label: t(`roles.${r}`) }))}
      className={className}
    />
  )
}

/** The invite link is shown once (emails are not sent yet): a read-only field with a copy button. */
function InviteLink({ email, url }: { email: string; url: string }) {
  const { t } = useTranslation('team')
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // clipboard blocked: the link is selectable in the field
    }
  }
  const Check = Icons.check
  const Copy = Icons.copy
  return (
    <div role="status" className="flex flex-col gap-2 rounded-md border border-line bg-surface-2 p-3">
      <p className="flex items-start gap-2 text-small text-ink">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={1.75} aria-hidden />
        <span className="min-w-0 [text-wrap:pretty]">{t('invite.created', { email })}</span>
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          readOnly
          aria-label={t('invite.link')}
          value={url}
          onFocus={e => e.currentTarget.select()}
          className="min-w-0 flex-1 font-mono text-mono"
        />
        <Button variant="primary" icon={copied ? <Check strokeWidth={1.75} /> : <Copy strokeWidth={1.75} />} onClick={() => void copy()}>
          {copied ? t('invite.copied') : t('invite.copy')}
        </Button>
      </div>
    </div>
  )
}

function InviteForm({ orgId, isOwner }: { orgId: string; isOwner: boolean }) {
  const { t } = useTranslation('team')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrganizationRole>('member')
  const [created, setCreated] = useState<OrganizationInvitationInfo | null>(null)
  const create = useCreateInvitation(orgId)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    create.mutate(
      { email, role },
      {
        onSuccess: invitation => {
          setCreated(invitation)
          setEmail('')
        },
      }
    )
  }

  return (
    <FormSection title={t('invite.title')} description={t('invite.description')}>
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <Field label={t('invite.email')} className="min-w-0 sm:flex-1 sm:basis-56">
          <Input
            id="invite-email"
            type="email"
            required
            value={email}
            placeholder={t('invite.emailPlaceholder')}
            onChange={e => setEmail(e.target.value)}
          />
        </Field>
        <Field label={t('invite.role')} className="sm:w-48">
          <RoleSelect id="invite-role" value={role} onChange={setRole} isOwner={isOwner} label={t('invite.role')} />
        </Field>
        <Button type="submit" variant="primary" loading={create.isLoading} className="max-md:h-11 sm:self-end">
          {create.isLoading ? t('invite.sending') : t('invite.submit')}
        </Button>
      </form>
      {create.isError && <Banner tone="danger">{apiError(create.error, t('invite.error'))}</Banner>}
      {created?.invite_url && <InviteLink key={created.invite_url} email={created.email} url={created.invite_url} />}
    </FormSection>
  )
}

function PendingInvitations({ orgId }: { orgId: string }) {
  const { t } = useTranslation('team')
  const { data: invitations = [], isLoading, isError, refetch } = useInvitations(orgId)
  const revoke = useRevokeInvitation(orgId)
  const [confirming, setConfirming] = useState<OrganizationInvitationInfo | null>(null)

  return (
    <FormSection title={t('pending.title')}>
      {revoke.isError && !confirming && <Banner tone="danger">{apiError(revoke.error, t('pending.revokeError'))}</Banner>}
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
                <span className="break-all text-body font-medium text-ink">{i.email}</span>
                <span className="text-caption text-ink-2">
                  {t(`roles.${i.role}`)} · {t('pending.expiresLabel')}{' '}
                  <span className="font-mono text-mono-sm">{formatDate(i.expires_at)}</span>
                </span>
              </div>
              <Button variant="danger-ghost" size="sm" onClick={() => setConfirming(i)}>
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
        description={confirming ? t('pending.revokeText', { email: confirming.email }) : undefined}
        footer={
          <>
            {revoke.isError && <p className="mr-auto text-caption text-danger-ink">{apiError(revoke.error, t('pending.revokeError'))}</p>}
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
    </FormSection>
  )
}

function Members({ orgId, orgName, isOwner }: { orgId: string; orgName: string; isOwner: boolean }) {
  const { t } = useTranslation('team')
  const toast = useToast()
  const currentUserId = useAuthStore(s => s.user?.id)
  const { data: members = [], isLoading, isError, refetch } = useMembers(orgId)
  const { data: assignments } = useProjectAssignments(orgId)
  const update = useUpdateMemberRole(orgId)
  const remove = useRemoveMember(orgId)
  const [removing, setRemoving] = useState<OrganizationMemberInfo | null>(null)
  const error = update.error ?? (removing ? null : remove.error)

  const changeRole = (member: OrganizationMemberInfo, role: OrganizationRole) => {
    if (role === member.role) return
    const previous = member.role
    update.mutate(
      { userId: member.user_id, role },
      {
        onSuccess: () =>
          toast.show({
            message: t('members.roleChanged', { name: member.name, role: t(`roles.${role}`) }),
            tone: 'success',
            onUndo: () => update.mutate({ userId: member.user_id, role: previous }),
          }),
      }
    )
  }

  return (
    <FormSection title={t('members.title')} description={t('projects.hint')}>
      {error && <Banner tone="danger">{apiError(error, t('members.error'))}</Banner>}
      {isLoading ? (
        <SkeletonRows rows={3} rowClassName="h-row-2" className={LIST} />
      ) : isError ? (
        <ErrorState title={t('members.loadError')} onRetry={() => void refetch()} className="py-6" />
      ) : (
        <ul className={LIST}>
          {members.map(m => {
            const isSelf = m.user_id === currentUserId
            return (
              <li key={m.user_id} className="flex flex-col gap-1.5 px-3 py-3">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                  <div className="flex min-w-0 flex-1 basis-56 items-start gap-2.5">
                    <Avatar name={m.name} size={32} />
                    <div className="flex min-w-0 flex-col">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="text-body font-medium text-ink">{m.name}</span>
                        {isSelf && <Badge tone="neutral">{t('members.you')}</Badge>}
                        {m.role === EXTERNAL_ROLE && <ExternalBadge />}
                      </span>
                      <span className="break-all text-caption text-ink-2">{m.email}</span>
                    </div>
                  </div>
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    {/* Story 12.15: an external person's role is not changed here (managed per project) */}
                    {m.role !== EXTERNAL_ROLE && (
                      <RoleSelect
                        value={m.role}
                        isOwner={isOwner}
                        label={`${t('members.role')} ${m.name}`}
                        onChange={role => changeRole(m, role)}
                        className="min-w-0 flex-1 sm:w-44 sm:flex-none"
                      />
                    )}
                    <Button
                      variant="danger-ghost"
                      size="sm"
                      disabled={isSelf || (m.role === 'owner' && !isOwner)}
                      onClick={() => setRemoving(m)}
                    >
                      {t('members.remove')}
                    </Button>
                  </div>
                </div>
                <div className="sm:pl-10">
                  <MemberProjects orgId={orgId} member={m} assignments={assignments} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <Dialog
        open={!!removing}
        onOpenChange={open => {
          if (!open) setRemoving(null)
        }}
        title={removing ? t('members.removeTitle', { name: removing.name }) : ''}
        description={removing ? t('members.removeText', { name: removing.name, organization: orgName }) : undefined}
        footer={
          <>
            {remove.isError && <p className="mr-auto text-caption text-danger-ink">{apiError(remove.error, t('members.error'))}</p>}
            <Button onClick={() => setRemoving(null)}>{t('cancel')}</Button>
            <Button
              variant="primary"
              loading={remove.isLoading}
              onClick={() => removing && remove.mutate(removing.user_id, { onSuccess: () => setRemoving(null) })}
            >
              {t('members.removeConfirm')}
            </Button>
          </>
        }
      />
    </FormSection>
  )
}

/**
 * Story 12.7: projects of the organization (owned or shared with it) a member / reviewer is assigned to.
 * Owners and admins reach every project of their organization, so there is nothing to assign.
 */
function MemberProjects({
  orgId,
  member,
  assignments,
}: {
  orgId: string
  member: OrganizationMemberInfo
  assignments: OrganizationProjectAssignments | undefined
}) {
  const { t } = useTranslation('team')
  const [open, setOpen] = useState(false)
  const setAssignment = useSetProjectAssignment(orgId)

  if (member.role === 'owner' || member.role === 'admin') {
    return <p className="text-caption text-ink-2">{t('projects.all')}</p>
  }
  if (member.role === EXTERNAL_ROLE) {
    return <p className="text-caption text-ink-2 [text-wrap:pretty]">{t('projects.external')}</p>
  }
  const projects = assignments?.projects ?? []
  const assigned = new Set(
    (assignments?.assignments ?? []).filter(a => a.user_id === member.user_id).map(a => a.project_id)
  )
  const panelId = `member-projects-${member.user_id}`
  const Chevron = open ? Icons.previous : Icons.next

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="link"
        size="sm"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(o => !o)}
        className="self-start"
      >
        {t('projects.toggle', { n: assigned.size, name: member.name })}
        <Chevron className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      </Button>
      {open && (
        <div id={panelId} className="flex flex-col gap-2 rounded-md bg-surface-2 p-3">
          {setAssignment.isError && <Banner tone="danger">{apiError(setAssignment.error, t('projects.error'))}</Banner>}
          {projects.length === 0 ? (
            <p className="text-caption text-ink-2">{t('projects.empty')}</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {projects.map(p => (
                <li key={p.id}>
                  <Checkbox
                    checked={assigned.has(p.id)}
                    disabled={setAssignment.isLoading}
                    onCheckedChange={checked =>
                      setAssignment.mutate({ userId: member.user_id, projectId: p.id, assigned: checked })
                    }
                    label={
                      <span className="inline-flex flex-wrap items-center gap-1.5">
                        <span>{p.name}</span>
                        {!p.owned && <Badge tone="neutral">{t('projects.shared')}</Badge>}
                      </span>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
