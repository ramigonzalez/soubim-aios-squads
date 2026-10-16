/**
 * Histórico (README §5.4): the dense work view. Filters in the URL, groups by
 * date (with collapsible source bands) or by discipline, ItemRows that open the
 * SidePanel, and the list keyboard map (↑/↓, Enter, M, X, /).
 */
import { useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  DateGroupHeader,
  DISCIPLINE_ORDER,
  DisciplineGroupHeader,
  DisciplineList,
  DisciplineMarker,
  disciplineMeta,
  DueBadge,
  EmptyState,
  ErrorState,
  Icons,
  ItemRow,
  ItemTypeIcon,
  MilestoneStar,
  SegmentedControl,
  SkeletonRows,
  SourceBand,
  SourceIcon,
  SourceTile,
  useToast,
} from '../design-system'
import { HistoryFilterBar } from '../components/organisms/HistoryFilterBar'
import { ProjectHeader } from '../components/organisms/ProjectHeader'
import { ProjectItemPanel } from '../components/organisms/ProjectItemPanel'
import { PageContainer } from '../components/templates/PageContainer'
import { useAllProjectItems } from '../hooks/useAllProjectItems'
import { filterItems, useHistoryFilters } from '../hooks/useHistoryFilters'
import { useBulkReview } from '../hooks/useItemReview'
import { useItemActions } from '../hooks/useItemActions'
import { useItemPanel } from '../hooks/useItemPanel'
import { useListKeyboard } from '../hooks/useListKeyboard'
import { useProject } from '../hooks/useProject'
import { formatDay, formatDuration, formatGroupHeader } from '../lib/format'
import { byDateDesc, itemDate, itemTitle } from '../lib/items'
import type { ProjectItem, SourceInfo } from '../types/projectItem'

const WRITE_LEVELS = ['write', 'review', 'admin']

interface SourceGroup {
  key: string
  source: SourceInfo | null
  items: ProjectItem[]
}

interface DayGroup {
  day: string
  sources: SourceGroup[]
  count: number
}

function groupByDay(items: ProjectItem[]): DayGroup[] {
  const days = new Map<string, Map<string, SourceGroup>>()
  for (const item of items) {
    const day = itemDate(item).slice(0, 10)
    const key = item.source?.id ?? 'manual'
    const byKey = days.get(day) ?? new Map<string, SourceGroup>()
    const group = byKey.get(key) ?? { key: `${day}:${key}`, source: item.source ?? null, items: [] }
    group.items.push(item)
    byKey.set(key, group)
    days.set(day, byKey)
  }
  return Array.from(days.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([day, byKey]) => {
      const sources = Array.from(byKey.values())
      return { day, sources, count: sources.reduce((n, s) => n + s.items.length, 0) }
    })
}

export default function ProjectHistory() {
  const { t } = useTranslation(['project', 'labels'])
  const navigate = useNavigate()
  const toast = useToast()
  const { id: projectId = '' } = useParams<{ id: string }>()
  const { data: project } = useProject(projectId)
  const { filters, update, clear, active } = useHistoryFilters()
  const canReview = !!project?.can_review
  const canManage = !!project?.can_manage
  const canWrite = WRITE_LEVELS.includes(project?.access_level ?? '')
  const itemsQuery = useAllProjectItems(projectId, { includeRejected: canReview && filters.rejected })
  const actions = useItemActions(projectId)
  const bulk = useBulkReview(projectId)
  const listRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const all = useMemo(() => [...(itemsQuery.data?.items ?? [])].sort(byDateDesc), [itemsQuery.data])
  const visible = useMemo(() => filterItems(all, filters), [all, filters])
  const days = useMemo(() => (filters.group === 'date' ? groupByDay(visible) : []), [visible, filters.group])
  const disciplines = useMemo(() => {
    if (filters.group !== 'discipline') return []
    // each item sits under its main (first) discipline, so ↑/↓ never visits a row twice
    return DISCIPLINE_ORDER.map((d) => ({ discipline: d, items: visible.filter((i) => disciplineMeta(i.affected_disciplines[0] ?? 'general').key === d) })).filter(
      (g) => g.items.length > 0,
    )
  }, [visible, filters.group])

  const order = useMemo(
    () =>
      filters.group === 'date'
        ? days.flatMap((d) => d.sources.filter((s) => !collapsed.has(s.key)).flatMap((s) => s.items.map((i) => i.id)))
        : disciplines.flatMap((g) => g.items.map((i) => i.id)),
    [days, disciplines, collapsed, filters.group],
  )
  const panel = useItemPanel(order)
  const byId = useMemo(() => new Map(all.map((i) => [i.id, i])), [all])

  useListKeyboard({
    container: listRef,
    search: searchRef,
    onMilestone: canManage
      ? (id) => {
          const item = byId.get(id)
          if (item) actions.toggleMilestone(item)
        }
      : undefined,
    onDone: canWrite
      ? (id) => {
          const item = byId.get(id)
          if (item?.item_type === 'action_item') actions.toggleDone(item)
        }
      : undefined,
    enabled: !panel.itemId,
  })

  const allSourceKeys = days.flatMap((d) => d.sources.map((s) => s.key))
  const anyExpanded = allSourceKeys.some((k) => !collapsed.has(k))
  const toggle = (key: string) =>
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const row = (item: ProjectItem, showSource = true) => (
    <ItemRow
      key={item.id}
      itemId={item.id}
      selected={panel.itemId === item.id}
      onOpen={() => panel.open(item.id)}
      icon={
        <ItemTypeIcon
          type={item.item_type}
          done={item.is_done}
          onToggleDone={item.item_type === 'action_item' && canWrite ? () => actions.toggleDone(item) : undefined}
        />
      }
      title={itemTitle(item)}
      done={item.item_type === 'action_item' && item.is_done}
      badges={<RowBadges item={item} />}
      disciplines={<DisciplineList disciplines={item.affected_disciplines} />}
      owner={
        <>
          <Avatar name={item.owner || item.who} />
          <span className="truncate">{(item.owner || item.who).split(' ')[0]}</span>
        </>
      }
      source={showSource ? <SourceIcon type={item.source?.type ?? item.source_type} /> : null}
      date={formatDay(itemDate(item))}
      star={
        <MilestoneStar
          pressed={item.is_milestone}
          onToggle={canManage ? () => actions.toggleMilestone(item) : undefined}
        />
      }
    />
  )

  const approvePending = (source: SourceInfo, count: number) =>
    bulk.mutate(
      { sourceId: source.id, status: 'approved' },
      {
        onSuccess: () => toast.show({ message: t('history.band.approved', { count }), tone: 'success' }),
        onError: () => toast.show({ message: t('history.band.approveError'), tone: 'error', onRetry: () => approvePending(source, count) }),
      },
    )

  const band = (group: SourceGroup) => {
    const source = group.source
    const expanded = !collapsed.has(group.key)
    const title = source ? source.title || t('history.band.untitled') : t('history.band.manual')
    const kind = source ? t(`labels:sourceType.${source.type}`) : t('labels:sourceType.manual_input')
    const pending = group.items.filter((i) => i.review_status === 'pending').length
    const names = source?.participants ?? []
    const meta: ReactNode = source
      ? [
          source.duration_minutes ? formatDuration(source.duration_minutes) : null,
          source.label,
          names.length ? (names.length > 3 ? `${names.slice(0, 3).join(', ')} ${t('history.band.more', { count: names.length - 3 })}` : names.join(', ')) : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : t('history.band.manualMeta')
    return (
      <SourceBand
        key={group.key}
        tile={<SourceTile type={source?.type ?? 'manual_input'} />}
        kind={kind}
        title={title}
        meta={meta || undefined}
        summary={source?.summary ?? undefined}
        expanded={expanded}
        onToggle={() => toggle(group.key)}
        toggleLabel={t(expanded ? 'history.band.collapse' : 'history.band.expand', { title })}
        actions={
          <>
            {source?.visibility && (
              <Badge tone="neutral" icon={source.visibility === 'shared' ? <Icons.link /> : undefined}>
                {t(source.visibility === 'shared' ? 'history.band.shared' : 'history.band.internal')}
              </Badge>
            )}
            {canReview && pending > 0 && source && (
              <Button size="sm" icon={<Icons.check />} loading={bulk.isLoading} onClick={() => approvePending(source, pending)}>
                {t('history.band.approvePending', { count: pending })}
              </Button>
            )}
            {source?.type === 'meeting' && (
              <Button size="sm" variant="ghost" icon={<Icons.play />} onClick={() => navigate(`/projects/${projectId}/meetings/${source.id}`)}>
                {t('history.band.openTranscript')}
              </Button>
            )}
          </>
        }
      >
        {group.items.map((item) => row(item, false))}
      </SourceBand>
    )
  }

  const body = (() => {
    if (itemsQuery.isLoading) return <SkeletonRows rows={8} className="rounded-lg border border-line bg-surface" />
    if (itemsQuery.isError) return <ErrorState title={t('history.error')} text={t('history.errorText')} onRetry={() => void itemsQuery.refetch()} />
    if (all.length === 0)
      return (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState icon={<Icons.history />} title={t('history.emptyTitle')} text={t('history.emptyText')} />
        </div>
      )
    if (visible.length === 0)
      return (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState
            icon={<Icons.search />}
            title={t('history.noResultsTitle')}
            text={t('history.noResultsText')}
            action={<Button onClick={clear}>{t('history.filters.clear')}</Button>}
          />
        </div>
      )
    if (filters.group === 'discipline')
      return disciplines.map((group) => (
        <section key={group.discipline} className="flex flex-col">
          <DisciplineGroupHeader
            marker={<DisciplineMarker discipline={group.discipline} size="md" label="none" />}
            title={t(`labels:discipline.${group.discipline}`)}
            count={t('history.count', { count: group.items.length })}
          />
          <div className="overflow-hidden rounded-lg border border-line bg-surface">{group.items.map((item) => row(item))}</div>
        </section>
      ))
    return days.map((day) => {
      const header = formatGroupHeader(day.day)
      return (
        <section key={day.day} className="flex flex-col gap-2">
          <DateGroupHeader title={header.title} weekday={header.weekday} count={t('history.count', { count: day.count })} />
          {day.sources.map(band)}
        </section>
      )
    })
  })()

  return (
    <PageContainer>
      <ProjectHeader projectId={projectId} section="history" />

      <HistoryFilterBar ref={searchRef} items={all} filters={filters} onChange={update} onClear={clear} active={active} loading={itemsQuery.isLoading} resultCount={visible.length} />

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {itemsQuery.data && <span className="font-mono text-mono text-ink-2">{t('history.count', { count: visible.length })}</span>}
          {canReview && (
            <Checkbox checked={filters.rejected} onCheckedChange={(rejected) => update({ rejected })} label={t('history.showRejected')} />
          )}
          <span className="ml-auto flex flex-wrap items-center gap-2">
            {filters.group === 'date' && allSourceKeys.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCollapsed(anyExpanded ? new Set(allSourceKeys) : new Set())}
              >
                {anyExpanded ? t('history.collapseAll') : t('history.expandAll')}
              </Button>
            )}
            <span className="text-caption text-ink-2">{t('history.groupBy')}</span>
            <SegmentedControl
              label={t('history.groupBy')}
              value={filters.group}
              onValueChange={(group) => update({ group })}
              options={[
                { value: 'date', label: t('history.byDate') },
                { value: 'discipline', label: t('history.byDiscipline') },
              ]}
            />
          </span>
        </div>
        <div ref={listRef} className="flex flex-col gap-6">
          {body}
        </div>
        <p className="hidden text-caption text-ink-3 lg:block">{t('history.keyboardHint')}</p>
      </div>

      <ProjectItemPanel
        projectId={projectId}
        items={all}
        panel={panel}
        stages={project?.stages ?? []}
        canManage={canManage}
        canReview={canReview}
        listReady={!!itemsQuery.data}
      />
    </PageContainer>
  )
}

function RowBadges({ item }: { item: ProjectItem }) {
  const { t } = useTranslation('project')
  return (
    <>
      {item.item_type === 'action_item' && item.due_date && <DueBadge due={item.due_date} done={item.is_done} />}
      {item.review_status === 'pending' && <Badge tone="warning">{t('history.badges.pending')}</Badge>}
      {item.review_status === 'rejected' && <Badge tone="muted">{t('history.badges.rejected')}</Badge>}
      {item.is_edited && <Badge tone="accent">{t('history.badges.edited')}</Badge>}
    </>
  )
}
