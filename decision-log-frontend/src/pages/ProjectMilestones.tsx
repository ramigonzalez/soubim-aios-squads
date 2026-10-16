/**
 * Marcos (README §5.3): the presentation-ready milestone timeline, shown to
 * clients and exported to PDF. Quiet filters (tipo, disciplina, fonte) live in
 * the URL; "Mostrar etapas sem marcos" collapses empty stages.
 */
import { useMemo, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  DISCIPLINE_ORDER,
  DisciplineList,
  DisciplineMarker,
  EmptyState,
  ErrorState,
  Icons,
  ITEM_TYPE_ORDER,
  ItemTypeIcon,
  SkeletonRows,
  SOURCE_ORDER,
  SourceIcon,
  StageTimeline,
  Switch,
  type TimelineStage,
} from '../design-system'
import { FilterMenu } from '../components/molecules/FilterMenu'
import { ProjectHeader } from '../components/organisms/ProjectHeader'
import { ProjectItemPanel } from '../components/organisms/ProjectItemPanel'
import { PageContainer } from '../components/templates/PageContainer'
import { useAllProjectItems } from '../hooks/useAllProjectItems'
import { useItemPanel } from '../hooks/useItemPanel'
import { useListParam } from '../hooks/useListParam'
import { useProject } from '../hooks/useProject'
import { formatDay, formatDaysLeft, formatFullDate, formatRange, toDate } from '../lib/format'
import { itemDate, itemStage, itemTitle } from '../lib/items'
import { layoutStages } from '../lib/stages'
import type { Discipline, ItemType, ProjectItem, SourceType } from '../types/projectItem'

export default function ProjectMilestones() {
  const { t } = useTranslation(['project', 'labels'])
  const { id: projectId = '' } = useParams<{ id: string }>()
  const [params, setParams] = useSearchParams()
  const exportRef = useRef<HTMLDivElement>(null)
  const { data: project } = useProject(projectId)
  const itemsQuery = useAllProjectItems(projectId)
  const [types, setTypes] = useListParam<ItemType>('type', ITEM_TYPE_ORDER)
  const [disciplines, setDisciplines] = useListParam<Discipline>('disc', DISCIPLINE_ORDER)
  const [sources, setSources] = useListParam<SourceType>('src', SOURCE_ORDER)
  const showEmpty = params.get('empty') !== '0'
  const stages = useMemo(() => project?.stages ?? [], [project?.stages])

  const allMilestones = useMemo(() => (itemsQuery.data?.items ?? []).filter((i) => i.is_milestone), [itemsQuery.data])
  const milestones = useMemo(
    () =>
      allMilestones
        .filter((i) => !types.length || types.includes(i.item_type))
        .filter((i) => !disciplines.length || i.affected_disciplines.some((d) => disciplines.includes(d)))
        .filter((i) => !sources.length || sources.includes(i.source?.type ?? i.source_type))
        .sort((a, b) => itemDate(a).localeCompare(itemDate(b))),
    [allMilestones, types, disciplines, sources],
  )
  const filtered = types.length + disciplines.length + sources.length > 0

  const layout = layoutStages(stages)
  const toEntry = (item: ProjectItem) => ({
    id: item.id,
    icon: <ItemTypeIcon type={item.item_type} done={item.is_done} />,
    title: itemTitle(item),
    disciplines: <DisciplineList disciplines={item.affected_disciplines} />,
    meta: [t(`labels:itemType.${item.item_type}`), item.who, item.source?.title].filter(Boolean).join(' · '),
    date: formatDay(itemDate(item)),
    at: toDate(itemDate(item)),
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
    milestones: milestones.filter((i) => itemStage(i, stages)?.id === segment.id).map(toEntry),
    emptyLabel: t('timeline.emptyStage'),
  }))
  const outside = milestones.filter((i) => !itemStage(i, stages))
  if (outside.length) {
    timeline.push({ id: 'outside', name: t('timeline.noStage'), status: t('timeline.noStageDates'), state: 'none', milestones: outside.map(toEntry) })
  }
  const visibleStages = showEmpty ? timeline : timeline.filter((s) => s.milestones.length > 0)
  const hidden = timeline.length - visibleStages.length
  const order = visibleStages.flatMap((s) => s.milestones.map((m) => m.id))
  const panel = useItemPanel(order)

  const updated = allMilestones.reduce<string | null>((max, i) => {
    const at = i.updated_at ?? i.created_at
    return !max || at > max ? at : max
  }, null)

  const setShowEmpty = (value: boolean) => {
    const next = new URLSearchParams(params)
    if (value) next.delete('empty')
    else next.set('empty', '0')
    setParams(next, { replace: true })
  }

  const facet = <T extends string>(values: T[], key: (i: ProjectItem) => T | T[]) =>
    Object.fromEntries(values.map((v) => [v, allMilestones.filter((i) => [key(i)].flat().includes(v)).length])) as Record<T, number>
  const typeCounts = facet(ITEM_TYPE_ORDER, (i) => i.item_type)
  const discCounts = facet(DISCIPLINE_ORDER, (i) => i.affected_disciplines)
  const sourceCounts = facet(SOURCE_ORDER, (i) => i.source?.type ?? i.source_type)

  return (
    <PageContainer>
      <ProjectHeader projectId={projectId} section="milestones" exportTarget={exportRef} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-ink-2">
          {[
            t('timeline.milestones', { count: milestones.length }),
            t('timeline.stages', { count: layout.segments.length }),
            updated ? t('timeline.updated', { date: formatFullDate(updated) }) : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <FilterMenu
            label={t('timeline.allTypes')}
            activeLabel={(count) => t('timeline.typesCount', { count })}
            selected={types}
            onChange={setTypes}
            clearLabel={t('timeline.clear')}
            options={ITEM_TYPE_ORDER.map((type) => ({
              value: type,
              label: t(`labels:itemType.${type}`),
              marker: <ItemTypeIcon type={type} size={14} />,
              count: typeCounts[type],
            }))}
          />
          <FilterMenu
            label={t('timeline.allDisciplines')}
            activeLabel={(count) => t('timeline.disciplinesCount', { count })}
            selected={disciplines}
            onChange={setDisciplines}
            clearLabel={t('timeline.clear')}
            options={DISCIPLINE_ORDER.filter((d) => discCounts[d] > 0 || disciplines.includes(d)).map((d) => ({
              value: d,
              label: t(`labels:discipline.${d}`),
              marker: <DisciplineMarker discipline={d} size="md" label="none" />,
              count: discCounts[d],
            }))}
          />
          <FilterMenu
            label={t('timeline.allSources')}
            activeLabel={(count) => t('timeline.sourcesCount', { count })}
            selected={sources}
            onChange={setSources}
            clearLabel={t('timeline.clear')}
            options={SOURCE_ORDER.map((s) => ({
              value: s,
              label: t(`labels:sourceType.${s}`),
              marker: <SourceIcon type={s} />,
              count: sourceCounts[s],
            }))}
          />
          <Switch checked={showEmpty} onCheckedChange={setShowEmpty} label={t('timeline.showEmpty')} className="ml-2" />
        </div>
      </div>

      <section ref={exportRef} className="rounded-lg border border-line bg-surface px-4 pt-6 md:px-8 md:pt-8">
        {itemsQuery.isLoading && <SkeletonRows rows={6} className="pb-6" />}
        {itemsQuery.isError && <ErrorState title={t('timeline.error')} onRetry={() => void itemsQuery.refetch()} />}
        {itemsQuery.data && milestones.length === 0 && (
          <EmptyState
            icon={<Icons.milestones />}
            title={filtered ? t('timeline.emptyFiltered') : t('timeline.emptyTitle')}
            text={filtered ? t('timeline.emptyFilteredText') : t('timeline.emptyText')}
          />
        )}
        {itemsQuery.data && milestones.length > 0 && (
          <>
            <StageTimeline
              stages={visibleStages}
              todayLabel={t('timeline.today', { date: formatDay(new Date()) })}
              selectedId={panel.itemId}
              onOpen={panel.open}
            />
            {hidden > 0 && <p className="pb-6 text-center text-caption text-ink-2">{t('timeline.hidden', { count: hidden })}</p>}
          </>
        )}
      </section>

      <ProjectItemPanel
        projectId={projectId}
        items={itemsQuery.data?.items ?? []}
        panel={panel}
        stages={stages}
        canManage={!!project?.can_manage}
        canReview={!!project?.can_review}
        listReady={!!itemsQuery.data}
      />
    </PageContainer>
  )
}
