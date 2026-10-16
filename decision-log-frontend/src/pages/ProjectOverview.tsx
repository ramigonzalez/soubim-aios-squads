/**
 * Visão geral, the project home (README §5.2): "Where is this project now, and
 * what changed since my last visit?" Three tiles drive the list below them;
 * the side box lists the current stage's milestones.
 */
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from 'react-query'
import { useTranslation } from 'react-i18next'
import {
  DisciplineList,
  DueBadge,
  EmptyState,
  ErrorState,
  Icons,
  ItemTypeIcon,
  CompactRow,
  OverviewColumns,
  OverviewRow,
  OverviewTiles,
  RowList,
  Skeleton,
  SkeletonRows,
  SourceIcon,
  type OverviewTile,
} from '../design-system'
import { ProjectHeader } from '../components/organisms/ProjectHeader'
import { ProjectItemPanel } from '../components/organisms/ProjectItemPanel'
import { PageContainer } from '../components/templates/PageContainer'
import { useAllProjectItems } from '../hooks/useAllProjectItems'
import { useItemPanel } from '../hooks/useItemPanel'
import { useProject } from '../hooks/useProject'
import { useProjectPendingSources } from '../hooks/useProjectPendingSources'
import { useProjectVisit } from '../hooks/useProjectVisit'
import { ingestionService } from '../services/ingestionService'
import { formatDay, formatDayTime, toDate } from '../lib/format'
import { byDateDesc, isLate, isOpenAction, itemDate, itemStage, itemTitle } from '../lib/items'
import { layoutStages } from '../lib/stages'
import { sourceDate, sourceTitle } from '../lib/sources'
import type { ProjectItem } from '../types/projectItem'

type TileKey = 'new' | 'open' | 'pending'
const LIST_LIMIT = 10
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export default function ProjectOverview() {
  const { t } = useTranslation(['project', 'labels'])
  const navigate = useNavigate()
  const { id: projectId = '' } = useParams<{ id: string }>()
  const [tile, setTile] = useState<TileKey>('new')
  const { data: project } = useProject(projectId)
  const visit = useProjectVisit(projectId)
  const itemsQuery = useAllProjectItems(projectId)
  const canReview = !!project?.can_review
  const pendingQuery = useProjectPendingSources(projectId, canReview)
  const firmPending = useQuery('ingestion-pending-count', ingestionService.getPendingCount, { staleTime: 30_000, enabled: canReview })
  const items = useMemo(() => itemsQuery.data?.items ?? [], [itemsQuery.data])
  const stages = useMemo(() => project?.stages ?? [], [project?.stages])

  const lastVisit = visit.data?.last_visit_at ?? null
  const since = useMemo(() => (lastVisit ? toDate(lastVisit) : null), [lastVisit])
  const newItems = useMemo(() => {
    const cutoff = since?.getTime() ?? Date.now() - WEEK_MS
    return items.filter((i) => (toDate(i.created_at)?.getTime() ?? 0) > cutoff).sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [items, since])
  const openActions = useMemo(
    () =>
      items.filter(isOpenAction).sort((a, b) => Number(isLate(b)) - Number(isLate(a)) || (a.due_date ?? '9').localeCompare(b.due_date ?? '9')),
    [items],
  )
  const lateCount = openActions.filter((i) => isLate(i)).length
  const pending = pendingQuery.data?.sources ?? []

  const layout = layoutStages(stages)
  const current = layout.currentIndex >= 0 ? layout.segments[layout.currentIndex] : null
  const previous = layout.currentIndex > 0 ? layout.segments[layout.currentIndex - 1] : null
  const milestones = items.filter((i) => i.is_milestone).sort(byDateDesc)
  const stageMilestones = current ? milestones.filter((i) => itemStage(i, stages)?.id === current.id) : milestones.slice(0, 5)
  const previousCount = previous ? milestones.filter((i) => itemStage(i, stages)?.id === previous.id).length : 0

  const loadingItems = itemsQuery.isLoading
  const count = (value: number) => (loadingItems ? <Skeleton width="1.5em" className="inline-block h-6 align-middle" /> : value)
  const tiles: OverviewTile<TileKey>[] = [
    {
      key: 'new',
      value: count(newItems.length),
      label: since ? t('overview.tiles.newSince', { date: formatDay(since) }) : t('overview.tiles.newWeek'),
      note: since ? t('overview.tiles.newNote') : t('overview.tiles.newNoteWeek'),
    },
    {
      key: 'open',
      value: count(openActions.length),
      label: t('overview.tiles.open'),
      note: lateCount
        ? `${t('overview.tiles.openNote', { count: openActions.length })} · ${t('overview.tiles.late', { count: lateCount })}`
        : t('overview.tiles.openNote', { count: openActions.length }),
      alert: lateCount > 0,
    },
    ...(canReview
      ? [{ key: 'pending' as const, value: pendingQuery.isLoading ? <Skeleton width="1.5em" className="inline-block h-6 align-middle" /> : pending.length, label: t('overview.tiles.pending'), note: t('overview.tiles.pendingNote') }]
      : []),
  ]

  const listItems = tile === 'new' ? newItems : tile === 'open' ? openActions : []
  const shown = listItems.slice(0, LIST_LIMIT)
  const panel = useItemPanel([...shown.map((i) => i.id), ...stageMilestones.map((i) => i.id)])

  const rowFor = (item: ProjectItem) => {
    const person = item.item_type === 'action_item' ? item.owner || item.who : item.item_type === 'topic' ? item.who : null
    return (
      <div key={item.id} data-item-id={item.id} tabIndex={-1} className="outline-none">
        <OverviewRow
          icon={<ItemTypeIcon type={item.item_type} done={item.is_done} />}
          title={itemTitle(item)}
          badge={item.item_type === 'action_item' && item.due_date ? <DueBadge due={item.due_date} done={item.is_done} /> : undefined}
          meta={
            <>
              <SourceIcon type={item.source?.type ?? item.source_type} />
              <span className="truncate">{[item.source?.title ?? t(`labels:sourceType.${item.source_type}`), person].filter(Boolean).join(' · ')}</span>
            </>
          }
          disciplines={<DisciplineList disciplines={item.affected_disciplines} />}
          date={formatDay(itemDate(item))}
          selected={panel.itemId === item.id}
          onClick={() => panel.open(item.id)}
        />
      </div>
    )
  }

  const list = (() => {
    if (tile === 'pending') {
      if (pendingQuery.isLoading) return <SkeletonRows rows={3} rowClassName="h-row-2" />
      if (pending.length === 0)
        return <EmptyState icon={<Icons.ingestion />} title={t('overview.empty.pendingTitle')} text={t('overview.empty.pendingText')} />
      return pending.slice(0, LIST_LIMIT).map((source) => (
        <OverviewRow
          key={source.id}
          icon={<SourceIcon type={source.source_type} size={16} className="text-ink" />}
          title={sourceTitle(source)}
          meta={<span className="truncate">{[t(`labels:sourceType.${source.source_type}`), formatDayTime(sourceDate(source))].join(' · ')}</span>}
          date={formatDay(sourceDate(source))}
          onClick={() => navigate(`/ingestion?project=${projectId}&focus=${source.id}`)}
        />
      ))
    }
    if (itemsQuery.isLoading) return <SkeletonRows rows={4} rowClassName="h-row-2" />
    if (shown.length === 0) {
      return tile === 'new' ? (
        <EmptyState icon={<Icons.history />} title={t('overview.empty.newTitle')} text={t('overview.empty.newText')} />
      ) : (
        <EmptyState icon={<Icons.actionOpen />} title={t('overview.empty.openTitle')} text={t('overview.empty.openText')} />
      )
    }
    return shown.map(rowFor)
  })()

  const header = {
    new: {
      title: since ? t('overview.lists.newTitle') : t('overview.lists.newTitleWeek'),
      sub: since ? t('overview.lists.newSub', { date: formatDay(since) }) : null,
      foot: t('overview.lists.newFoot'),
      link: t('overview.lists.newLink'),
      to: `/projects/${projectId}/history`,
    },
    open: {
      title: t('overview.lists.openTitle'),
      sub: t('overview.lists.openSub', { count: openActions.length }),
      foot: t('overview.lists.openFoot'),
      link: t('overview.lists.openLink'),
      to: `/projects/${projectId}/history?type=action_item`,
    },
    pending: {
      title: t('overview.lists.pendingTitle'),
      sub: t('overview.lists.pendingSub'),
      foot: t('overview.lists.pendingFoot', { count: Math.max(0, (firmPending.data?.pending ?? 0) - pending.length) }),
      link: t('overview.lists.pendingLink'),
      to: `/ingestion?project=${projectId}`,
    },
  }[tile]

  return (
    <PageContainer>
      <ProjectHeader projectId={projectId} section="overview" />

      {itemsQuery.isError ? (
        <ErrorState title={t('overview.error')} text={t('overview.errorText')} onRetry={() => void itemsQuery.refetch()} />
      ) : (
        <>
          <OverviewTiles tiles={tiles} value={tile} onValueChange={setTile} label={t('nav:sections.overview')} />

          <OverviewColumns
            main={
            <section className="flex flex-col gap-3" aria-labelledby="overview-list-title">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <h2 id="overview-list-title" className="text-h3 text-ink">
                  {header.title}
                </h2>
                {header.sub && <span className="text-caption text-ink-2">{header.sub}</span>}
              </div>
              <RowList
                footer={
                  <>
                    <span>{header.foot}</span>
                    <button type="button" onClick={() => navigate(header.to)} className="ml-auto whitespace-nowrap font-semibold text-accent hover:text-accent-strong">
                      {header.link}
                    </button>
                  </>
                }
              >
                {list}
              </RowList>
            </section>
            }
            side={
            <section className="flex flex-col gap-3" aria-labelledby="overview-stage-title">
              <div className="flex items-baseline justify-between gap-2">
                <h2 id="overview-stage-title" className="text-h3 text-ink">
                  {t('overview.stageBox.title')}
                </h2>
                <button
                  type="button"
                  onClick={() => navigate(`/projects/${projectId}/milestones`)}
                  className="whitespace-nowrap text-small font-semibold text-accent hover:text-accent-strong"
                >
                  {t('overview.stageBox.link')}
                </button>
              </div>
              <div className="flex flex-col gap-1 rounded-lg border border-line bg-surface px-4 py-3">
                <span className="text-label uppercase text-ink-2">{current?.name ?? t('overview.stageBox.noStage')}</span>
                {loadingItems && <SkeletonRows rows={3} rowClassName="h-8" />}
                {!loadingItems && stageMilestones.length === 0 && <p className="py-2 text-small text-ink-3">{t('overview.stageBox.none')}</p>}
                {stageMilestones.map((item) => (
                  <CompactRow
                    key={item.id}
                    itemId={item.id}
                    marker={<Icons.milestone className="h-4 w-4 fill-current text-accent" strokeWidth={1.75} aria-hidden />}
                    title={itemTitle(item)}
                    date={formatDay(itemDate(item))}
                    onClick={() => panel.open(item.id)}
                  />
                ))}
                {previous && (
                  <button
                    type="button"
                    onClick={() => navigate(`/projects/${projectId}/milestones`)}
                    className="mt-1 flex items-center gap-2 border-t border-line-soft pt-2.5 text-left text-caption text-ink-2 hover:text-ink"
                  >
                    <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-ink" />
                    {t('overview.stageBox.previous', { stage: previous.name, count: previousCount })}
                  </button>
                )}
              </div>
            </section>
            }
          />
        </>
      )}

      <ProjectItemPanel
        projectId={projectId}
        items={items}
        panel={panel}
        stages={stages}
        canManage={!!project?.can_manage}
        canReview={canReview}
        listReady={!!itemsQuery.data}
      />
    </PageContainer>
  )
}
