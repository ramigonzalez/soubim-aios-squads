/**
 * Resumo executivo (README §5.12, built from the system): a KpiTile row, highlights as
 * OverviewRows and items per discipline as bars. Every number is computed from the
 * project's items — no constants: totals, decisions marked as marco, open / late actions,
 * and the share of decisions where every discipline agrees ("Com ressalvas" counted apart).
 */
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  DISCIPLINE_ORDER,
  DisciplineBarList,
  DisciplineList,
  DueBadge,
  EmptyState,
  ErrorState,
  Icons,
  ItemTypeIcon,
  KpiTile,
  KpiTiles,
  OverviewRow,
  RowList,
  Skeleton,
  SkeletonRows,
  SourceIcon,
  disciplineMeta,
} from '../design-system'
import { ProjectHeader } from '../components/organisms/ProjectHeader'
import { ProjectItemPanel } from '../components/organisms/ProjectItemPanel'
import { PageContainer } from '../components/templates/PageContainer'
import { useAllProjectItems } from '../hooks/useAllProjectItems'
import { useItemPanel } from '../hooks/useItemPanel'
import { useProject } from '../hooks/useProject'
import { useProjectVisit } from '../hooks/useProjectVisit'
import { formatDay, toDate } from '../lib/format'
import { byDateDesc, consensusRows, impactLevel, isLate, isOpenAction, itemDate, itemTitle } from '../lib/items'
import type { ProjectItem } from '../types/projectItem'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const HIGHLIGHTS = 8

export interface SummaryNumbers {
  captured: number
  newCount: number
  decisions: number
  decisionMilestones: number
  openActions: number
  lateActions: number
  /** decisions with at least one discipline's consensus recorded */
  withConsensus: number
  /** of those, every discipline AGREE */
  fullConsensus: number
  /** of those, at least one MIXED ("Com ressalvas") */
  mixed: number
  byDiscipline: { discipline: string; count: number }[]
}

/** The executive numbers, computed from the items (exported for tests). */
export function summarize(items: ProjectItem[], since: Date | null, now: Date = new Date()): SummaryNumbers {
  const cutoff = since?.getTime() ?? now.getTime() - WEEK_MS
  const decisions = items.filter((i) => i.item_type === 'decision')
  const consensus = decisions.map(consensusRows).filter((rows) => rows.length > 0)
  const counts = new Map<string, number>()
  for (const item of items) {
    for (const d of new Set(item.affected_disciplines.map((x) => disciplineMeta(x).key))) counts.set(d, (counts.get(d) ?? 0) + 1)
  }
  return {
    captured: items.length,
    newCount: items.filter((i) => (toDate(i.created_at)?.getTime() ?? 0) > cutoff).length,
    decisions: decisions.length,
    decisionMilestones: decisions.filter((i) => i.is_milestone).length,
    openActions: items.filter(isOpenAction).length,
    lateActions: items.filter((i) => isLate(i, now)).length,
    withConsensus: consensus.length,
    fullConsensus: consensus.filter((rows) => rows.every((r) => r.status === 'AGREE')).length,
    mixed: consensus.filter((rows) => rows.some((r) => r.status === 'MIXED')).length,
    byDiscipline: DISCIPLINE_ORDER.filter((d) => counts.has(d))
      .map((d) => ({ discipline: d, count: counts.get(d)! }))
      .sort((a, b) => b.count - a.count),
  }
}

export default function ProjectSummary() {
  const { t } = useTranslation(['project', 'labels'])
  const navigate = useNavigate()
  const { id: projectId = '' } = useParams<{ id: string }>()
  const { data: project } = useProject(projectId)
  const visit = useProjectVisit(projectId)
  const itemsQuery = useAllProjectItems(projectId)
  const items = useMemo(() => itemsQuery.data?.items ?? [], [itemsQuery.data])
  const lastVisit = visit.data?.last_visit_at ?? null
  const since = useMemo(() => (lastVisit ? toDate(lastVisit) : null), [lastVisit])
  const numbers = useMemo(() => summarize(items, since), [items, since])
  const highlights = useMemo(() => items.filter((i) => i.is_milestone || impactLevel(i) === 'high').sort(byDateDesc), [items])
  const shown = highlights.slice(0, HIGHLIGHTS)
  const panel = useItemPanel(shown.map((i) => i.id))

  const body = (() => {
    if (itemsQuery.isLoading)
      return (
        <>
          <KpiTiles label={t('summaryPage.kpis')}>
            {[0, 1, 2, 3].map((i) => (
              <KpiTile key={i} label={<Skeleton width="70%" />} value={<Skeleton width="30%" className="h-7" />} />
            ))}
          </KpiTiles>
          <SkeletonRows rows={5} rowClassName="h-row-2" className="rounded-lg border border-line bg-surface" />
        </>
      )
    if (itemsQuery.isError) return <ErrorState title={t('summaryPage.error')} text={t('summaryPage.errorText')} onRetry={() => void itemsQuery.refetch()} />
    if (items.length === 0)
      return (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState
            icon={<Icons.summary />}
            title={t('summaryPage.empty')}
            text={t('summaryPage.emptyText')}
            action={project?.can_review ? <Button onClick={() => navigate(`/ingestion?project=${projectId}`)}>{t('summaryPage.emptyAction')}</Button> : undefined}
          />
        </div>
      )

    const pct = numbers.withConsensus ? Math.round((numbers.fullConsensus / numbers.withConsensus) * 100) : null
    return (
      <>
        <KpiTiles label={t('summaryPage.kpis')}>
          <KpiTile
            label={t('summaryPage.captured')}
            value={numbers.captured}
            note={since ? t('summaryPage.capturedSince', { count: numbers.newCount, date: formatDay(since) }) : t('summaryPage.capturedWeek', { count: numbers.newCount })}
          />
          <KpiTile label={t('summaryPage.decisions')} value={numbers.decisions} note={t('summaryPage.decisionsMilestones', { count: numbers.decisionMilestones })} />
          <KpiTile
            label={t('summaryPage.open')}
            value={numbers.openActions}
            note={t('summaryPage.late', { count: numbers.lateActions })}
            tone={numbers.lateActions ? 'danger' : 'neutral'}
          />
          <KpiTile
            label={t('summaryPage.consensus')}
            value={pct == null ? '–' : `${pct}%`}
            note={
              pct == null
                ? t('summaryPage.consensusNone')
                : numbers.mixed
                  ? t('summaryPage.consensusMixed', { count: numbers.mixed })
                  : t('summaryPage.consensusOf', { count: numbers.withConsensus })
            }
            tone={numbers.mixed ? 'warning' : 'neutral'}
          />
        </KpiTiles>

        <section className="flex flex-col gap-3" aria-labelledby="summary-highlights">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <h2 id="summary-highlights" className="text-h3 text-ink">
              {t('summaryPage.highlights')}
            </h2>
            <span className="text-caption text-ink-2">{t('summaryPage.highlightsSub')}</span>
          </div>
          <RowList
            footer={
              highlights.length > 0 ? (
                <>
                  <span>{t('summaryPage.highlightsFoot', { count: highlights.length })}</span>
                  <button
                    type="button"
                    onClick={() => navigate(`/projects/${projectId}/milestones`)}
                    className="ds-touch ml-auto whitespace-nowrap font-semibold text-accent hover:text-accent-strong"
                  >
                    {t('summaryPage.highlightsLink')}
                  </button>
                </>
              ) : undefined
            }
          >
            {shown.length === 0 ? (
              <EmptyState icon={<Icons.milestone />} title={t('summaryPage.highlightsEmpty')} text={t('summaryPage.highlightsEmptyText')} />
            ) : (
              shown.map((item) => (
                <div key={item.id} data-item-id={item.id} tabIndex={-1} className="outline-none">
                  <OverviewRow
                    icon={<ItemTypeIcon type={item.item_type} done={item.is_done} />}
                    title={itemTitle(item)}
                    badge={
                      <>
                        {item.is_milestone && (
                          <span role="img" aria-label={t('summaryPage.milestone')} className="inline-flex shrink-0">
                            <Icons.milestone aria-hidden className="h-3.5 w-3.5 fill-current text-accent" strokeWidth={1.75} />
                          </span>
                        )}
                        {impactLevel(item) === 'high' && <Badge tone="danger">{t('summaryPage.highImpact')}</Badge>}
                        {item.item_type === 'action_item' && item.due_date && <DueBadge due={item.due_date} done={item.is_done} />}
                      </>
                    }
                    meta={
                      <>
                        <SourceIcon type={item.source?.type ?? item.source_type} />
                        <span className="truncate">{[t(`labels:itemType.${item.item_type}`), item.who, item.source?.title].filter(Boolean).join(' · ')}</span>
                      </>
                    }
                    disciplines={<DisciplineList disciplines={item.affected_disciplines} />}
                    date={formatDay(itemDate(item))}
                    selected={panel.itemId === item.id}
                    onClick={() => panel.open(item.id)}
                  />
                </div>
              ))
            )}
          </RowList>
        </section>

        <section className="flex flex-col gap-3" aria-labelledby="summary-disciplines">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <h2 id="summary-disciplines" className="text-h3 text-ink">
              {t('summaryPage.disciplines')}
            </h2>
            <span className="text-caption text-ink-2">{t('summaryPage.disciplinesSub')}</span>
          </div>
          <div className="rounded-lg border border-line bg-surface p-4 md:p-5">
            {numbers.byDiscipline.length === 0 ? (
              <p className="text-small text-ink-2">{t('summaryPage.disciplinesEmpty')}</p>
            ) : (
              <DisciplineBarList rows={numbers.byDiscipline.map((row) => ({ ...row, label: t(`labels:discipline.${row.discipline}`) }))} />
            )}
          </div>
        </section>
      </>
    )
  })()

  return (
    <PageContainer>
      <ProjectHeader projectId={projectId} section="summary" />
      {body}
      <ProjectItemPanel
        projectId={projectId}
        items={items}
        panel={panel}
        stages={project?.stages ?? []}
        canManage={!!project?.can_manage}
        canReview={!!project?.can_review}
        listReady={!!itemsQuery.data}
      />
    </PageContainer>
  )
}
