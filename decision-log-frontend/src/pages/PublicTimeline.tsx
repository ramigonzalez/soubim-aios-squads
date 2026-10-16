/**
 * Public client view (README §5.11, COMPONENTS.md → PublicTimelinePage), logged out.
 * The firm's brand leads; Promem appears only as "Feito com" in the footer. A summary card,
 * the stage strip and the client variant of the StageTimeline with the "por quê" under each
 * milestone. No internal navigation, never the full history. Expired links say whom to ask.
 */
import { useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Button,
  DisciplineList,
  EmptyState,
  ErrorState,
  Icons,
  ItemTypeIcon,
  SkeletonRows,
  StageStrip,
  StageTimeline,
  Wordmark,
  type TimelineStage,
} from '../design-system'
import { PublicLinkError, usePublicTimeline, type PublicTimeline as Data } from '../hooks/useShare'
import { exportAsPDF } from '../lib/exportTimeline'
import { formatDay, formatDaysLeft, formatFullDate, formatRange, toDate } from '../lib/format'
import { layoutStages, stageForDate } from '../lib/stages'

export default function PublicTimeline() {
  const { t } = useTranslation('project')
  const { token = '' } = useParams<{ token: string }>()
  const query = usePublicTimeline(token)

  if (query.isLoading) {
    return (
      <PublicFrame>
        <div className="mx-auto w-full max-w-public px-6 py-10">
          <SkeletonRows rows={8} rowClassName="h-12" />
        </div>
      </PublicFrame>
    )
  }
  if (query.error instanceof PublicLinkError && query.error.kind !== 'failed') {
    const expired = query.error.expired
    const org = expired?.organization
    return (
      <PublicFrame>
        <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
          <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-surface px-8 py-10 text-center">
            {org?.logo && <img src={org.logo} alt={org.name} className="h-10 w-10 object-contain" />}
            <h1 className="text-h2 text-ink">{expired ? t('public.expiredTitle') : t('public.notFoundTitle')}</h1>
            <p className="text-small text-ink-2 [text-wrap:pretty]">
              {expired
                ? org
                  ? t('public.expiredText', { project: expired.project, date: formatFullDate(expired.expired_at), org: org.name })
                  : t('public.expiredTextNoOrg')
                : t('public.notFoundText')}
            </p>
            {org?.contact_email && (
              <a href={`mailto:${org.contact_email}`} className="text-small font-semibold text-accent hover:text-accent-strong">
                {org.contact_email}
              </a>
            )}
          </div>
        </div>
        <PublicFooter />
      </PublicFrame>
    )
  }
  if (!query.data) {
    return (
      <PublicFrame>
        <ErrorState title={t('public.error')} onRetry={() => void query.refetch()} />
      </PublicFrame>
    )
  }
  return <Timeline data={query.data} />
}

function PublicFrame({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col bg-bg">{children}</div>
}

function PublicFooter({ data }: { data?: Data }) {
  const { t } = useTranslation('project')
  const org = data?.organization
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex w-full max-w-public flex-wrap items-center gap-x-6 gap-y-2 px-6 py-5 text-caption text-ink-2">
        {org && <span>{data?.shared_by ? t('public.sharedBy', { name: data.shared_by, org: org.name }) : t('public.sharedByOrg', { org: org.name })}</span>}
        {data && <span>{data.link.expires_at ? t('public.validUntil', { date: formatFullDate(data.link.expires_at) }) : t('public.noExpiry')}</span>}
        <span className="ml-auto inline-flex items-center gap-1.5">
          {t('public.madeWith')} <Wordmark size={13} />
        </span>
      </div>
    </footer>
  )
}

function Timeline({ data }: { data: Data }) {
  const { t } = useTranslation(['project', 'labels'])
  const exportRef = useRef<HTMLDivElement>(null)
  const [exporting, setExporting] = useState(false)
  const org = data.organization
  const stages = useMemo(() => data.stages.map((s) => ({ id: s.id, name: s.stage_name, start: s.stage_from, end: s.stage_to })), [data.stages])
  const layout = layoutStages(stages)
  const current = layout.currentIndex >= 0 ? layout.segments[layout.currentIndex] : null
  const next = layout.segments.find((s) => s.status === 'future')
  const milestones = [...data.milestones].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))

  const entry = (m: Data['milestones'][number]) => ({
    id: m.id,
    icon: <ItemTypeIcon type={m.item_type} done={m.is_done} />,
    title: m.title || m.statement,
    disciplines: <DisciplineList disciplines={m.affected_disciplines} />,
    meta: [t(`labels:itemType.${m.item_type}`), m.who].filter(Boolean).join(' · '),
    date: formatDay(m.date),
    at: toDate(m.date),
    why: m.why ?? undefined,
  })
  const timeline: TimelineStage[] = layout.segments.map((segment) => ({
    id: segment.id,
    name: segment.name,
    dates: formatRange(segment.start, segment.end, true),
    status:
      segment.status === 'done'
        ? t('timeline.done')
        : segment.status === 'current'
          ? t('timeline.current', { left: formatDaysLeft(segment.daysLeft ?? 0) })
          : t('timeline.future'),
    state: segment.status,
    milestones: milestones.filter((m) => stageForDate(stages, m.date)?.id === segment.id).map(entry),
    emptyLabel: t('timeline.emptyStage'),
  }))
  const outside = milestones.filter((m) => !stageForDate(stages, m.date))
  if (outside.length) timeline.push({ id: 'outside', name: t('public.outside'), state: 'none', milestones: outside.map(entry) })

  const download = async () => {
    if (!exportRef.current) return
    setExporting(true)
    try {
      await exportAsPDF(exportRef.current, data.project.name)
    } finally {
      setExporting(false)
    }
  }

  return (
    <PublicFrame>
      <header className="border-b border-line bg-surface" data-export-exclude>
        <div className="mx-auto flex w-full max-w-public flex-wrap items-center gap-4 px-6 py-4">
          {org?.logo ? (
            <img src={org.logo} alt="" className="h-10 w-10 rounded-sm object-contain" />
          ) : (
            <span aria-hidden className="h-10 w-10 rounded-sm border border-dashed border-line-strong" />
          )}
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-h3 text-ink">{org?.name}</span>
            {org?.tagline && <span className="truncate text-caption text-ink-2">{org.tagline}</span>}
          </span>
          <span className="ml-auto flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-surface-3 px-3 py-1 text-caption text-ink-soft">
              {data.updated_at ? t('public.readOnly', { date: formatFullDate(data.updated_at) }) : t('public.readOnlyNoDate')}
            </span>
            <Button icon={<Icons.download />} loading={exporting} onClick={() => void download()}>
              {exporting ? t('public.downloading') : t('public.download')}
            </Button>
          </span>
        </div>
      </header>

      <main ref={exportRef} className="mx-auto flex w-full max-w-public flex-1 flex-col gap-8 px-6 pb-14 pt-10">
        <div className="flex flex-col gap-2">
          <p className="text-label uppercase text-ink-2">{t('public.eyebrow')}</p>
          <h1 className="text-section text-ink [text-wrap:balance]">{data.project.name}</h1>
          {data.project.description && <p className="text-body text-ink-2">{data.project.description}</p>}
        </div>

        <section className="flex flex-col gap-5 rounded-lg border border-line bg-surface p-6">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-0.5">
              <dt className="text-caption text-ink-2">{t('public.currentStage')}</dt>
              <dd className="text-body text-ink">
                <b className="font-semibold">{current?.name ?? '—'}</b>
                {current && ` · ${t('public.position', { index: layout.currentIndex + 1, total: layout.segments.length })}`}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-caption text-ink-2">{t('public.next')}</dt>
              <dd className="text-body text-ink">
                {next ? (
                  <>
                    <b className="font-semibold">{next.name}</b> {t('public.on', { date: formatFullDate(next.start) })}
                  </>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-caption text-ink-2">{t('public.count')}</dt>
              <dd className="text-kpi text-ink">{milestones.length}</dd>
            </div>
          </dl>
          {stages.length > 0 && <StageStrip stages={stages} barSize="lg" />}
        </section>

        <section className="rounded-lg border border-line bg-surface px-4 pt-6 md:px-8 md:pt-8">
          {milestones.length === 0 ? (
            <EmptyState icon={<Icons.milestones />} title={t('public.empty')} />
          ) : (
            <StageTimeline stages={timeline} variant="client" todayLabel={t('timeline.today', { date: formatDay(new Date()) })} />
          )}
        </section>
      </main>
      <PublicFooter data={data} />
    </PublicFrame>
  )
}
