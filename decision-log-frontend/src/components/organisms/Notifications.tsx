/**
 * Notificações (UX-UI-GUIDELINES §5): rows grouped by project, unread on `accent-weak`,
 * "Marcar todas como lidas". A popover from the sidebar footer on desktop; on phones the
 * same list is the /notifications page, reached from Mais. Opening one marks it read.
 */
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  IconButton,
  Icons,
  ItemTypeIcon,
  NotificationRow,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SkeletonRows,
  SourceIcon,
  cn,
} from '../../design-system'
import { notificationHref, useMarkNotificationsRead, useNotifications, type AppNotification } from '../../hooks/useNotifications'
import { formatRelativeDay } from '../../lib/format'

export function NotificationList({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const { t } = useTranslation(['nav', 'labels'])
  const navigate = useNavigate()
  const query = useNotifications()
  const markRead = useMarkNotificationsRead()
  const list = query.data?.notifications ?? []

  const open = (n: AppNotification) => {
    if (!n.read) markRead.mutate({ keys: [n.key] })
    onNavigate?.()
    navigate(notificationHref(n))
  }

  const groups: { project: AppNotification['project']; rows: AppNotification[] }[] = []
  for (const n of list) {
    const group = groups.find((g) => g.project.id === n.project.id)
    if (group) group.rows.push(n)
    else groups.push({ project: n.project, rows: [n] })
  }

  const row = (n: AppNotification) => {
    const type = n.source ? t(`labels:sourceType.${n.source.type}`) : ''
    const icon =
      n.kind === 'milestone' ? (
        <Icons.milestone className="h-4 w-4 fill-current text-accent" strokeWidth={1.75} aria-hidden />
      ) : n.kind === 'extracted' && n.item ? (
        <ItemTypeIcon type={n.item.type} />
      ) : (
        <SourceIcon type={n.source?.type ?? 'meeting'} size={16} className="text-ink" />
      )
    const title = n.kind === 'milestone' ? n.item?.title : n.source?.title || type
    const meta =
      n.kind === 'pending_source'
        ? t('notifications.pending', { type })
        : n.kind === 'extracted'
          ? t('notifications.extracted', { count: n.count ?? 0, type })
          : n.by
            ? t('notifications.milestone', { who: n.by })
            : t('notifications.milestoneSomeone')
    return (
      <NotificationRow
        key={n.key}
        icon={icon}
        title={title}
        meta={<span className="truncate">{meta}</span>}
        time={formatRelativeDay(n.at)}
        unread={!n.read}
        unreadLabel={t('notifications.unread')}
        onClick={() => open(n)}
      />
    )
  }

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3">
        <div className="flex flex-col">
          <h2 className="text-h3 text-ink">{t('notifications.title')}</h2>
          <span className="text-caption text-ink-2">{t('notifications.window')}</span>
        </div>
        {(query.data?.unread ?? 0) > 0 && (
          <Button variant="link" size="sm" onClick={() => markRead.mutate({ all: true })}>
            {t('notifications.markAll')}
          </Button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {query.isLoading && <SkeletonRows rows={4} rowClassName="h-row-2" className="px-4" />}
        {query.isError && <ErrorState title={t('notifications.error')} onRetry={() => void query.refetch()} className="py-6" />}
        {query.data && list.length === 0 && <EmptyState icon={<Icons.notifications />} title={t('notifications.empty')} text={t('notifications.emptyText')} />}
        {groups.map((group) => (
          <section key={group.project.id} aria-label={group.project.name}>
            <h3 className="bg-surface-2 px-4 py-1.5 text-label uppercase text-ink-2">{group.project.name}</h3>
            {group.rows.map(row)}
          </section>
        ))}
      </div>
    </div>
  )
}

/** Sidebar footer bell (desktop and the drawer) with the unread count. */
export function NotificationsButton({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation('nav')
  const { data } = useNotifications()
  const unread = data?.unread ?? 0
  return (
    <Popover>
      <span className="relative inline-flex">
        <PopoverTrigger asChild>
          <IconButton
            label={unread ? t('notifications.openCount', { count: unread }) : t('notifications.open')}
            icon={<Icons.notifications />}
            variant="ghost"
          />
        </PopoverTrigger>
        {unread > 0 && (
          <Badge aria-hidden tone="accent" mono className="pointer-events-none absolute -right-1 -top-1">
            {unread > 99 ? '99+' : unread}
          </Badge>
        )}
      </span>
      <PopoverContent side="top" align="start" className="flex max-h-[70vh] w-96 max-w-[calc(100vw-32px)] flex-col p-0">
        <NotificationList onNavigate={onNavigate} />
      </PopoverContent>
    </Popover>
  )
}
