/**
 * Ingestão, the firm-level inbox (README §5.7, COMPONENTS.md → IngestionRow + IngestionDetail).
 * "Only what you approve enters the projects." A list beside a decision panel that says what
 * is being approved: AI summary, candidate items, excerpt, why this project, flags.
 * A / R decide the focused source, ↑/↓ move, Space toggles the checkbox. Decisions are
 * immediate with "Desfazer". Fathom meetings without a project are rows of the same list.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Banner,
  Button,
  Checkbox,
  DateRange,
  Dialog,
  disciplineMeta,
  DisciplineMarker,
  EmptyState,
  ErrorState,
  Icons,
  InboxColumns,
  IngestionRow,
  ItemTypeIcon,
  KeyValueList,
  PanelSection,
  SegmentedControl,
  Select,
  SkeletonRows,
  SourceTile,
  Tab,
  Tabs,
  TabsContent,
  TabsList,
  useToast,
} from '../design-system'
import { AddMeetingDialog } from '../components/organisms/AddMeetingDialog'
import { PageContainer, PageHeader } from '../components/templates/PageContainer'
import { useActiveOrganization } from '../hooks/useOrganizations'
import { useFathomUnassigned, unassignedDate, FATHOM_UNASSIGNED_KEY } from '../hooks/useFathomUnassigned'
import { useIngestionUrlSync } from '../hooks/useIngestionUrlSync'
import { SourceFlagBanner } from '../components/molecules/SourceFlagBanner'
import { useInboxDecision, useInboxHistory, useInboxPending } from '../hooks/useInbox'
import { useProjectList } from '../hooks/useProjectList'
import { useIngestionStore } from '../store/ingestionStore'
import { ingestionService } from '../services/ingestionService'
import { integrationsService } from '../services/integrationsService'
import { formatDay, formatDayTime, formatDuration } from '../lib/format'
import { sourceDate, sourceTitle } from '../lib/sources'
import type { Source, SourceRouting } from '../types/ingestion'
import type { FathomUnassignedMeeting } from '../types/integrations'

type Row = { kind: 'source'; id: string; source: Source } | { kind: 'unassigned'; id: string; meeting: FathomUnassignedMeeting }

const WRITE_LEVELS = ['write', 'review', 'admin']
const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))

export default function IngestionInbox() {
  const { t } = useTranslation(['inbox', 'labels'])
  useIngestionUrlSync()
  const [params, setParams] = useSearchParams()
  const { activeTab, filters, setActiveTab, setFilter } = useIngestionStore()
  const { active: organization } = useActiveOrganization()
  const pending = useInboxPending()
  const history = useInboxHistory(activeTab === 'history')
  const unassigned = useFathomUnassigned()
  const projects = useProjectList()
  const { decide } = useInboxDecision()
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [focusId, setFocusId] = useState<string | null>(params.get('focus'))
  const [projectChoice, setProjectChoice] = useState<Record<string, string>>({})
  const [addOpen, setAddOpen] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const inRange = (day: string) => (!filters.date_from || day >= filters.date_from) && (!filters.date_to || day <= filters.date_to)
  const rows: Row[] = useMemo(() => {
    const sources = (pending.data?.sources ?? [])
      .filter((s) => !filters.project_id || s.project_id === filters.project_id)
      .filter((s) => !filters.source_type || s.source_type === filters.source_type)
      .filter((s) => inRange(sourceDate(s).slice(0, 10)))
      .map((source): Row => ({ kind: 'source', id: source.id, source }))
    const parked =
      filters.project_id || (filters.source_type && filters.source_type !== 'meeting')
        ? []
        : (unassigned.data ?? []).filter((m) => inRange(unassignedDate(m).slice(0, 10))).map((meeting): Row => ({ kind: 'unassigned', id: `fathom:${meeting.id}`, meeting }))
    return [...parked, ...sources]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending.data, unassigned.data, filters])

  const focused = rows.find((r) => r.id === focusId) ?? rows[0] ?? null
  const position = focused ? rows.indexOf(focused) : -1
  const reviewable = (r: Row) => r.kind === 'unassigned' || !!r.source.can_review
  const checkedRows = rows.filter((r) => checked.has(r.id) && r.kind === 'source')

  // keep the focus on a row that still exists
  useEffect(() => {
    if (focused && focused.id !== focusId) setFocusId(focused.id)
  }, [focused, focusId])

  const nextAfter = (ids: string[]) => {
    const rest = rows.filter((r) => !ids.includes(r.id))
    const index = Math.max(0, rows.findIndex((r) => r.id === ids[0]))
    return rest[Math.min(index, rest.length - 1)]?.id ?? null
  }

  const decideRows = (target: Row[], action: 'approve' | 'reject') => {
    const sources = target.filter((r): r is Extract<Row, { kind: 'source' }> => r.kind === 'source' && !!r.source.can_review)
    if (!sources.length) return
    setFocusId(nextAfter(sources.map((r) => r.id)))
    setChecked(new Set())
    const single = sources.length === 1 ? sources[0] : null
    const chosen = single ? projectChoice[single.id] : undefined
    void decide(
      sources.map((r) => r.id),
      action,
      chosen && single && chosen !== single.source.project_id ? chosen : undefined,
    )
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isTyping(event.target) || event.metaKey || event.ctrlKey || event.altKey || !focused) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const next = rows[Math.min(rows.length - 1, Math.max(0, position + (event.key === 'ArrowDown' ? 1 : -1)))]
      if (next) {
        setFocusId(next.id)
        listRef.current?.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(next.id)}"]`)?.focus()
      }
    } else if (event.key === 'a' || event.key === 'A') {
      if (focused.kind === 'source') decideRows([focused], 'approve')
    } else if (event.key === 'r' || event.key === 'R') {
      if (focused.kind === 'source') decideRows([focused], 'reject')
    } else if (event.key === ' ' && focused.kind === 'source') {
      event.preventDefault()
      toggle(focused.id)
    }
  }

  const toggle = (id: string) =>
    setChecked((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const selectable = rows.filter((r) => r.kind === 'source' && reviewable(r))
  const allChecked = selectable.length > 0 && selectable.every((r) => checked.has(r.id))

  const projectOptions = (projects.data?.projects ?? []).map((p) => ({ value: p.id, label: p.name }))
  const pendingTotal = pending.data?.pending_count ?? 0
  const loading = pending.isLoading

  const list = (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex min-h-12 flex-wrap items-center gap-3 border-b border-line-soft bg-surface-2 px-3.5 py-2">
        <Checkbox
          checked={allChecked ? true : checked.size > 0 ? 'indeterminate' : false}
          onCheckedChange={(on) => setChecked(on ? new Set(selectable.map((r) => r.id)) : new Set())}
          aria-label={t('bulk.selectAll')}
          disabled={!selectable.length}
        />
        <span className="text-small font-semibold text-ink">
          {checked.size ? t('bulk.selected', { count: checked.size }) : t('bulk.pending', { count: rows.length })}
        </span>
        {checkedRows.length > 0 && (
          <span className="ml-auto flex gap-2">
            <Button size="sm" icon={<Icons.close />} onClick={() => decideRows(checkedRows, 'reject')}>
              {t('bulk.reject')}
            </Button>
            <Button size="sm" variant="primary" icon={<Icons.check />} onClick={() => decideRows(checkedRows, 'approve')}>
              {t('bulk.approve')}
            </Button>
          </span>
        )}
      </div>
      {loading && <SkeletonRows rows={6} rowClassName="h-16" />}
      {!loading && rows.length === 0 && (
        <EmptyState
          icon={<Icons.ingestion />}
          title={pendingTotal ? t('empty.filteredTitle') : t('empty.title')}
          text={pendingTotal ? t('empty.filteredText') : t('empty.text')}
        />
      )}
      <div ref={listRef} role="listbox" aria-label={t('tabs.pending')} onKeyDown={onKeyDown}>
        {rows.map((row) => {
          const isFocused = row.id === focused?.id
          if (row.kind === 'unassigned') {
            const m = row.meeting
            return (
              <IngestionRow
                key={row.id}
                rowId={row.id}
                focused={isFocused}
                onFocusRow={() => setFocusId(row.id)}
                check={<span aria-hidden className="h-4 w-4" />}
                tile={<SourceTile type="meeting" />}
                title={m.title || t('project:viewer.untitled')}
                meta={[t('labels:sourceType.meeting'), formatDayTime(unassignedDate(m)), m.reason === 'conflict' ? t('row.conflict') : t('row.noProject')].join(' · ')}
                date={formatDay(unassignedDate(m))}
              />
            )
          }
          const s = row.source
          return (
            <IngestionRow
              key={row.id}
              rowId={row.id}
              focused={isFocused}
              onFocusRow={() => setFocusId(row.id)}
              check={
                <Checkbox
                  checked={checked.has(row.id)}
                  onCheckedChange={() => toggle(row.id)}
                  disabled={!s.can_review}
                  aria-label={t('row.select', { title: sourceTitle(s) })}
                />
              }
              tile={<SourceTile type={s.source_type} />}
              title={sourceTitle(s) || t('project:viewer.untitled')}
              meta={
                <>
                  {[t(`labels:sourceType.${s.source_type}`), formatDayTime(sourceDate(s))].join(' · ')} ·{' '}
                  <span className="font-medium text-ink-soft">{t('row.to', { project: s.project_name })}</span>
                </>
              }
              date={formatDay(sourceDate(s))}
            />
          )
        })}
      </div>
    </div>
  )

  const panel = !focused ? null : focused.kind === 'unassigned' ? (
    <UnassignedPanel meeting={focused.meeting} projects={projects.data?.projects.filter((p) => WRITE_LEVELS.includes(p.access_level ?? '')) ?? []} />
  ) : (
    <DecisionPanel
      source={focused.source}
      index={position + 1}
      total={rows.length}
      projectOptions={projectOptions}
      chosenProject={projectChoice[focused.id]}
      onChooseProject={(pid) => setProjectChoice((cur) => ({ ...cur, [focused.id]: pid }))}
      onDecide={(action) => decideRows([focused], action)}
    />
  )

  return (
    <PageContainer>
      <PageHeader
        eyebrow={organization ? t('eyebrow', { org: organization.name }) : t('eyebrowNoOrg')}
        title={t('title')}
        description={t('subtitle')}
        actions={
          <Button icon={<Icons.add />} onClick={() => setAddOpen(true)}>
            {t('addMeeting')}
          </Button>
        }
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'history')}>
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line-soft">
          <TabsList className="border-b-0">
            <Tab value="pending" count={pendingTotal}>
              {t('tabs.pending')}
            </Tab>
            <Tab value="history" count={history.data?.total}>
              {t('tabs.history')}
            </Tab>
          </TabsList>
          <div className="flex flex-wrap items-center gap-2 pb-2">
            <Select
              size="toolbar"
              aria-label={t('filters.project')}
              className="w-56"
              value={filters.project_id ?? 'all'}
              onValueChange={(v) => setFilter('project_id', v === 'all' ? null : v)}
              options={[{ value: 'all', label: t('filters.allProjects') }, ...projectOptions]}
            />
            <SegmentedControl
              label={t('filters.source')}
              value={filters.source_type ?? 'all'}
              onValueChange={(v) => setFilter('source_type', v === 'all' ? null : v)}
              options={[
                { value: 'all', label: t('filters.all') },
                { value: 'meeting', label: t('filters.meeting') },
                { value: 'email', label: t('filters.email') },
                { value: 'document', label: t('filters.document') },
              ]}
            />
            <DateRange
              value={{ from: filters.date_from, to: filters.date_to }}
              onChange={({ from, to }) => {
                setFilter('date_from', from)
                setFilter('date_to', to)
              }}
              placeholder={t('filters.period')}
            />
          </div>
        </div>

        <TabsContent value="pending" className="pt-5">
          {pending.isError ? (
            <ErrorState title={t('error')} text={t('errorText')} onRetry={() => void pending.refetch()} />
          ) : (
            <>
              <InboxColumns list={list} panel={panel} />
              <p className="mt-3 hidden text-caption text-ink-3 lg:block">{t('keyboardHint')}</p>
            </>
          )}
        </TabsContent>
        <TabsContent value="history" className="pt-5">
          <HistoryList query={history} filters={filters} />
        </TabsContent>
      </Tabs>

      <AddMeetingDialog open={addOpen} onClose={() => setAddOpen(false)} />
      {params.get('focus') && <FocusParamCleaner params={params} setParams={setParams} />}
    </PageContainer>
  )
}

/** ?focus= is a one-time hint from the Visão geral; drop it once applied so it doesn't stick. */
function FocusParamCleaner({ params, setParams }: { params: URLSearchParams; setParams: (p: URLSearchParams, o: { replace: boolean }) => void }) {
  useEffect(() => {
    const next = new URLSearchParams(params)
    next.delete('focus')
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return null
}

function ReasonText({ reason }: { reason: SourceRouting['reasons'][number] }) {
  const { t } = useTranslation('inbox')
  if (reason.code === 'fathom_rule') {
    return <>{t('reasons.fathom_rule', { field: t(`ruleFields.${reason.field}`), operator: t(`ruleOperators.${reason.operator}`), value: reason.value })}</>
  }
  return <>{t(`reasons.${reason.code}`, reason as Record<string, string | number>)}</>
}

function DecisionPanel({
  source,
  index,
  total,
  projectOptions,
  chosenProject,
  onChooseProject,
  onDecide,
}: {
  source: Source
  index: number
  total: number
  projectOptions: { value: string; label: string }[]
  chosenProject?: string
  onChooseProject: (projectId: string) => void
  onDecide: (action: 'approve' | 'reject') => void
}) {
  const { t } = useTranslation(['inbox', 'labels'])
  const toast = useToast()
  const queryClient = useQueryClient()
  const kind = t(`labels:sourceType.${source.source_type}`)
  const routing = source.routing
  const tool = source.source_type === 'meeting' ? source.source_label : source.source_type === 'email' ? 'Gmail' : 'Google Drive'
  const original = source.source_type === 'meeting' ? source.transcript_url : source.source_type === 'email' ? source.thread_url : source.file_url
  const projectId = chosenProject ?? source.project_id
  const changed = projectId !== source.project_id
  const projectHint = changed
    ? t('panel.projectHintYou')
    : routing?.reasons.some((r) => ['drive_folder', 'fathom_rule', 'manual', 'webhook'].includes(r.code))
      ? t('panel.projectHintRule')
      : t('panel.projectHintAi')
  const retry = useMutation(() => ingestionService.retrySource(source.id), {
    onSuccess: () => {
      toast.show({ message: t('toast.retrying'), tone: 'success' })
      void queryClient.invalidateQueries('inbox')
    },
  })
  const meta = [
    formatDayTime(sourceDate(source)),
    source.source_type === 'meeting' ? source.source_label : null,
    source.duration_minutes ? formatDuration(source.duration_minutes) : null,
  ].filter(Boolean)
  const previewLabel = { meeting: t('panel.previewMeeting'), email: t('panel.previewEmail'), document: t('panel.previewDocument') }[source.source_type]
  const confidenceTone = { high: 'success', medium: 'warning', low: 'danger' } as const

  return (
    <aside className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface" aria-label={sourceTitle(source)}>
      <div className="flex flex-col gap-1.5 border-b border-line-soft px-5 py-4">
        <p className="flex items-center gap-1.5 text-caption text-ink-2">
          <SourceTile type={source.source_type} className="h-5 w-5 rounded-sm [&_svg]:h-3 [&_svg]:w-3" />
          {t('panel.position', { kind, index, total })}
        </p>
        <h2 className="text-h2 text-ink [text-wrap:pretty]">{sourceTitle(source)}</h2>
        {meta.length > 0 && <p className="text-small text-ink-2">{meta.join(' · ')}</p>}
      </div>

      <div className="flex flex-col gap-5 px-5 py-4">
        {(source.flags ?? []).map((flag, i) => (
          <SourceFlagBanner key={i} flag={flag} />
        ))}
        {source.status === 'failed' && (
          <Banner tone="danger" action={<Button size="sm" loading={retry.isLoading} onClick={() => retry.mutate()}>{t('panel.retry')}</Button>}>
            {t('panel.failed', { error: source.extraction_error ?? '' })}
          </Banner>
        )}

        <PanelSection label={t('panel.summary')}>
          {source.ai_summary ? (
            <p className="text-body text-ink-soft [text-wrap:pretty]">{source.ai_summary}</p>
          ) : (
            <p className="text-small italic text-ink-2">{t('panel.noSummary')}</p>
          )}
        </PanelSection>

        <PanelSection label={t('panel.candidates')} aside={source.candidates?.length ? <span className="font-mono text-mono-sm text-ink-2">{source.candidates.length}</span> : undefined}>
          {!source.candidates_ready ? (
            <p className="flex items-center gap-2 text-small text-ink-2">
              <SkeletonRows rows={1} rowClassName="h-6 border-0" className="w-40" />
              {t('panel.candidatesPending')}
            </p>
          ) : source.candidates && source.candidates.length > 0 ? (
            <>
              <ul className="flex flex-col divide-y divide-line-soft rounded-md border border-line">
                {source.candidates.map((c, i) => (
                  <li key={i} className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2">
                    <ItemTypeIcon type={c.type} />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate text-small font-medium text-ink">{c.title}</span>
                      <span className="text-caption text-ink-2">{t(`labels:itemType.${c.type}`)}</span>
                    </span>
                    <DisciplineMarker discipline={disciplineMeta(c.discipline).key} />
                  </li>
                ))}
              </ul>
              <p className="text-caption text-ink-3">{t('panel.candidateNote')}</p>
            </>
          ) : (
            <p className="text-small text-ink-2">{t('panel.noCandidates')}</p>
          )}
        </PanelSection>

        {(source.preview?.length ?? 0) > 0 && (
          <PanelSection label={previewLabel}>
            <div className="flex flex-col gap-1.5 rounded-md bg-surface-2 px-3 py-2.5">
              {source.preview!.map((line, i) => (
                <div key={i} className="grid grid-cols-[62px_minmax(0,1fr)] gap-2">
                  <span className="font-mono text-mono-sm text-ink-3">
                    {line.at ?? (line.who === 'from_to' ? t('panel.fromTo') : '')}
                  </span>
                  <p className="text-small text-ink">
                    {line.who && line.who !== 'from_to' && line.who !== 'text' && <b className="font-semibold">{line.who}: </b>}
                    {line.text}
                  </p>
                </div>
              ))}
              {original && (
                <a href={original} target="_blank" rel="noopener noreferrer" className="self-start text-small font-medium text-accent hover:text-accent-strong">
                  {tool ? t('panel.openOriginal', { tool }) : t('panel.openOriginalGeneric')}
                </a>
              )}
            </div>
          </PanelSection>
        )}

        {routing && (
          <PanelSection label={t('panel.why')} aside={<Badge tone={confidenceTone[routing.confidence]}>{t(`panel.confidence.${routing.confidence}`)}</Badge>}>
            <ul className="flex flex-col gap-1.5">
              {routing.reasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-2 text-small text-ink">
                  <Icons.check className="mt-0.5 h-3 w-3 shrink-0 text-success" strokeWidth={2.5} aria-hidden />
                  <ReasonText reason={reason} />
                </li>
              ))}
            </ul>
          </PanelSection>
        )}

        <KeyValueList
          variant="wide"
          items={[
            { label: t('panel.participants'), value: source.participants?.length ? source.participants.join(', ') : null },
            { label: t('panel.fromTo'), value: source.source_type === 'email' ? `${source.from_address}${source.recipient_count ? ` → ${source.recipient_count}` : ''}` : null },
            { label: t('panel.received'), value: formatDayTime(source.created_at) },
            { label: t('panel.addedBy'), value: source.created_by_name },
          ]}
        />
      </div>

      {source.can_review && (
        <div className="flex flex-col gap-3 border-t border-line bg-surface-2 px-5 py-4">
          <div className="flex flex-col gap-1.5">
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-label uppercase text-ink-2">{t('panel.project')}</span>
              <span className="truncate text-caption text-ink-2">{projectHint}</span>
            </span>
            <Select
              aria-label={t('panel.project')}
              value={projectId}
              onValueChange={onChooseProject}
              options={projectOptions.length ? projectOptions : [{ value: source.project_id, label: source.project_name }]}
            />
          </div>
          <div className="grid grid-cols-[1fr_1.6fr] gap-2">
            <Button icon={<Icons.close />} shortcut="R" onClick={() => onDecide('reject')}>
              {t('panel.reject')}
            </Button>
            <Button variant="primary" icon={<Icons.check />} shortcut="A" onClick={() => onDecide('approve')}>
              {t('panel.approve')}
            </Button>
          </div>
          <p className="text-caption text-ink-3">{t('panel.footnote')}</p>
        </div>
      )}
    </aside>
  )
}

/** Story 13.16: a Fathom meeting no project rule matched (or several did). Import = approve into a project. */
function UnassignedPanel({ meeting, projects }: { meeting: FathomUnassignedMeeting; projects: { id: string; name: string }[] }) {
  const { t } = useTranslation(['inbox', 'labels'])
  const toast = useToast()
  const queryClient = useQueryClient()
  const choices = meeting.reason === 'conflict' && meeting.matched_projects?.length ? meeting.matched_projects : projects
  const [projectId, setProjectId] = useState<string>('')
  const done = () => {
    void queryClient.invalidateQueries(FATHOM_UNASSIGNED_KEY)
    void queryClient.invalidateQueries('inbox')
  }
  const assign = useMutation(() => integrationsService.assignFathomUnassigned(meeting.id, { project_id: projectId, visibility: 'internal' }), {
    onSuccess: () => {
      toast.show({ message: t('toast.imported'), tone: 'success' })
      done()
    },
    onError: () => toast.show({ message: t('toast.error'), tone: 'error' }),
  })
  const discard = useMutation(() => integrationsService.discardFathomUnassigned(meeting.id), {
    onSuccess: () => {
      toast.show({ message: t('toast.discarded'), tone: 'neutral' })
      done()
    },
    onError: () => toast.show({ message: t('toast.error'), tone: 'error' }),
  })
  return (
    <aside className="flex flex-col overflow-hidden rounded-lg border border-line bg-surface" aria-label={meeting.title ?? ''}>
      <div className="flex flex-col gap-1.5 border-b border-line-soft px-5 py-4">
        <p className="text-caption text-ink-2">{[t('labels:sourceType.meeting'), 'Fathom'].join(' · ')}</p>
        <h2 className="text-h2 text-ink">{meeting.title || t('project:viewer.untitled')}</h2>
        <p className="text-small text-ink-2">{formatDayTime(unassignedDate(meeting))}</p>
      </div>
      <div className="flex flex-col gap-4 px-5 py-4">
        <Banner tone="warning">
          {meeting.reason === 'conflict'
            ? t('flags.conflict', { projects: (meeting.matched_projects ?? []).map((p) => p.name).join(', ') })
            : t('flags.noProject')}
        </Banner>
      </div>
      <div className="flex flex-col gap-3 border-t border-line bg-surface-2 px-5 py-4">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-label uppercase text-ink-2">{t('panel.project')}</span>
          <span className="text-caption text-ink-2">{t('panel.projectHintNone')}</span>
        </span>
        <Select
          aria-label={t('panel.project')}
          placeholder={t('panel.chooseProject')}
          value={projectId || undefined}
          onValueChange={setProjectId}
          options={choices.map((p) => ({ value: p.id, label: p.name }))}
        />
        <div className="grid grid-cols-[1fr_1.6fr] gap-2">
          <Button icon={<Icons.close />} loading={discard.isLoading} onClick={() => discard.mutate()}>
            {t('panel.discard')}
          </Button>
          <Button variant="primary" icon={<Icons.check />} disabled={!projectId} loading={assign.isLoading} onClick={() => assign.mutate()}>
            {t('panel.import')}
          </Button>
        </div>
      </div>
    </aside>
  )
}

function HistoryList({ query, filters }: { query: ReturnType<typeof useInboxHistory>; filters: ReturnType<typeof useIngestionStore.getState>['filters'] }) {
  const { t } = useTranslation(['inbox', 'labels'])
  const toast = useToast()
  const queryClient = useQueryClient()
  const [deleting, setDeleting] = useState<Source | null>(null)
  const refresh = () => void queryClient.invalidateQueries('inbox')
  const retry = useMutation((id: string) => ingestionService.retrySource(id), {
    onSuccess: () => {
      toast.show({ message: t('toast.retrying'), tone: 'success' })
      refresh()
    },
  })
  const remove = useMutation((id: string) => ingestionService.deleteSource(id), {
    onSuccess: () => {
      setDeleting(null)
      toast.show({ message: t('toast.deleted'), tone: 'neutral' })
      refresh()
    },
  })
  if (query.isLoading) return <SkeletonRows rows={6} rowClassName="h-16" className="rounded-lg border border-line bg-surface" />
  if (query.isError) return <ErrorState title={t('error')} onRetry={() => void query.refetch()} />
  const sources = (query.data?.sources ?? [])
    .filter((s) => !filters.project_id || s.project_id === filters.project_id)
    .filter((s) => !filters.source_type || s.source_type === filters.source_type)
  if (!sources.length)
    return (
      <div className="rounded-lg border border-line bg-surface">
        <EmptyState icon={<Icons.ingestion />} title={t('empty.historyTitle')} text={t('empty.historyText')} />
      </div>
    )
  const tone = { approved: 'success', processed: 'success', rejected: 'muted', failed: 'danger', pending: 'neutral' } as const
  return (
    <>
      <ul className="overflow-hidden rounded-lg border border-line bg-surface">
        {sources.map((s) => {
          const by = s.status === 'rejected' ? s.rejected_by_name : s.approved_by_name
          const at = s.status === 'rejected' ? s.rejected_at : s.approved_at
          return (
            <li key={s.id} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0">
              <SourceTile type={s.source_type} />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-body font-semibold text-ink">{sourceTitle(s)}</span>
                <span className="truncate text-caption text-ink-2">
                  {[t(`labels:sourceType.${s.source_type}`), formatDayTime(sourceDate(s)), `→ ${s.project_name}`, s.extracted_item_count ? t('history.items', { count: s.extracted_item_count }) : null]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
              <span className="flex flex-col items-end gap-1">
                <span className="flex items-center gap-1.5">
                  {s.job && s.job.status !== 'succeeded' && s.job.status !== 'failed' && (
                    <Badge tone="neutral">{t(`history.job.${s.job.status === 'queued' && s.job.attempts > 0 ? 'retrying' : s.job.status}`)}</Badge>
                  )}
                  <Badge tone={tone[s.status]} icon={s.status === 'rejected' ? <Icons.close /> : s.status === 'failed' ? <Icons.warning /> : <Icons.check />}>
                    {t(`history.${s.status}`)}
                  </Badge>
                </span>
                {by && at && <span className="text-caption text-ink-2">{t('history.by', { name: by, date: formatDay(at) })}</span>}
                <span className="flex gap-1">
                  {s.status === 'failed' && s.can_review && (
                    <Button size="sm" variant="link" loading={retry.isLoading} onClick={() => retry.mutate(s.id)}>
                      {t('panel.retry')}
                    </Button>
                  )}
                  {s.can_manage && (
                    <Button size="sm" variant="danger-ghost" onClick={() => setDeleting(s)}>
                      {t('history.delete')}
                    </Button>
                  )}
                </span>
              </span>
            </li>
          )
        })}
      </ul>
      <Dialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('history.deleteTitle')}
        description={t('history.deleteText')}
        footer={
          <>
            {remove.isError && <p className="mr-auto text-caption text-danger-ink">{t('history.deleteError')}</p>}
            <Button onClick={() => setDeleting(null)}>{t('project:viewer.visibility.cancel')}</Button>
            <Button variant="primary" loading={remove.isLoading} onClick={() => deleting && remove.mutate(deleting.id)}>
              {t('history.deleteConfirm')}
            </Button>
          </>
        }
      />
    </>
  )
}
