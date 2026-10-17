/**
 * "Compartilhar marcos" (README §5.10, COMPONENTS.md → ShareDialog): a preview of what the
 * client sees, the copyable public link, "Expira em" (30 dias · 90 dias · Nunca), the view
 * count and "Revogar link" (confirmed: it can't be undone).
 */
import { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Button, Dialog, Icons, Input, MiniStageBar, Select, useToast } from '../../design-system'
import { useAllProjectItems } from '../../hooks/useAllProjectItems'
import { useProject } from '../../hooks/useProject'
import { usePublicLinkActions, usePublicLinks, type ExpiryChoice, type PublicLink } from '../../hooks/useShare'
import { formatFullDate, formatList } from '../../lib/format'
import { layoutStages } from '../../lib/stages'

export function linkUrl(token: string) {
  return `${window.location.origin}/m/${token}`
}

/** The current choice for a link: "never" when it has no expiry, else the closer of 30 / 90 days. */
function choiceOf(link: PublicLink): ExpiryChoice {
  if (!link.expires_at) return 'never'
  const left = (new Date(link.expires_at).getTime() - Date.now()) / 86_400_000
  return left > 60 ? '90' : '30'
}

export function ShareMilestonesDialog({ projectId, open, onOpenChange }: { projectId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation('project')
  const toast = useToast()
  const { data: project } = useProject(projectId)
  const links = usePublicLinks(projectId, open)
  const items = useAllProjectItems(open ? projectId : undefined)
  const { create, setExpiry, revoke } = usePublicLinkActions(projectId)
  const [copied, setCopied] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)
  const link = links.data?.[0]
  const milestones = (items.data?.items ?? []).filter((i) => i.is_milestone).length
  const stages = project?.stages ?? []
  const layout = layoutStages(stages)
  const failed = create.isError || setExpiry.isError || revoke.isError

  const copy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(linkUrl(link.share_token))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.show({ message: t('share.error'), tone: 'error' })
    }
  }

  const org = project?.organization
  const LinkIcon = Icons.link

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange} title={t('share.title')} description={t('share.description')}>
        <a
          href={link ? linkUrl(link.share_token) : undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!link}
          className="my-2 flex flex-col gap-3 rounded-md bg-bg p-3.5 no-underline"
        >
          <span className="flex items-center justify-between gap-2 text-small">
            <b className="font-semibold text-ink">{t('share.preview')}</b>
            {link && <span className="font-semibold text-accent">{t('share.open')}</span>}
          </span>
          <span className="flex flex-col gap-2 rounded-md border border-line bg-surface p-3">
            <span className="flex items-center gap-2">
              {org?.logo ? (
                <img src={org.logo} alt="" className="h-6 w-6 rounded-sm object-contain" />
              ) : (
                <span aria-label={t('share.logoSlot')} className="h-6 w-6 rounded-sm border border-dashed border-line-strong" />
              )}
              <span className="truncate text-caption font-semibold text-ink">{org?.name}</span>
            </span>
            <span className="truncate text-h3 text-ink">{project?.name}</span>
            {stages.length > 0 && <MiniStageBar stages={stages} />}
            <span className="text-caption text-ink-2">
              {t('share.previewMeta', {
                milestones: t('timeline.milestones', { count: milestones }),
                stages:
                  formatList(layout.segments.filter((s) => s.status !== 'future').map((s) => s.name)) ||
                  t('timeline.stages', { count: layout.segments.length }),
              })}
            </span>
          </span>
        </a>

        {links.isLoading ? null : !link ? (
          <div className="flex flex-wrap items-center justify-between gap-3 py-3">
            <p className="text-small text-ink-2">{t('share.noLink')}</p>
            <Button variant="primary" icon={<LinkIcon />} loading={create.isLoading} onClick={() => create.mutate('30')}>
              {create.isLoading ? t('share.creating') : t('share.create')}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 py-3">
              <Input readOnly aria-label={t('share.linkLabel')} value={linkUrl(link.share_token).replace(/^https?:\/\//, '')} leadingIcon={<LinkIcon />} className="min-w-0 flex-1 font-mono" />
              <Button variant="primary" onClick={() => void copy()}>
                {copied ? t('share.copied') : t('share.copy')}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-3">
              <span className="flex items-center gap-2 text-small text-ink-2">
                {t('share.expires')}
                <Select
                  size="toolbar"
                  className="w-32"
                  aria-label={t('share.expires')}
                  value={choiceOf(link)}
                  onValueChange={(v) => setExpiry.mutate({ token: link.share_token, choice: v as ExpiryChoice })}
                  options={(['30', '90', 'never'] as const).map((c) => ({ value: c, label: t(`share.expiry.${c}`) }))}
                />
              </span>
              <span className="text-caption text-ink-2">
                {link.expires_at ? t('share.until', { date: formatFullDate(link.expires_at) }) : t('share.forever')}
              </span>
              <span className="text-small text-ink-2">
                <Trans t={t} i18nKey="share.views" count={link.view_count} components={{ b: <b className="font-semibold text-ink" /> }} />
              </span>
              <Button variant="danger-ghost" size="sm" className="ml-auto" onClick={() => setConfirmRevoke(true)}>
                {t('share.revoke')}
              </Button>
            </div>
          </>
        )}
        {failed && <p className="pt-2 text-caption text-danger-ink">{t('share.error')}</p>}
      </Dialog>

      <Dialog
        open={confirmRevoke}
        onOpenChange={setConfirmRevoke}
        title={t('share.revokeTitle')}
        description={t('share.revokeText')}
        footer={
          <>
            <Button onClick={() => setConfirmRevoke(false)}>{t('share.cancel')}</Button>
            <Button
              variant="primary"
              loading={revoke.isLoading}
              onClick={() =>
                link &&
                revoke.mutate(link.share_token, {
                  onSuccess: () => {
                    setConfirmRevoke(false)
                    toast.show({ message: t('share.revoked'), tone: 'neutral' })
                  },
                })
              }
            >
              {t('share.revokeConfirm')}
            </Button>
          </>
        }
      />
    </>
  )
}
