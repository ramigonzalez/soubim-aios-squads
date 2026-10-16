import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Badge, Banner, Button, EmptyState, ErrorState, Icons, Input, SkeletonRows, Spinner, type BadgeTone } from '../design-system'
import { PageContainer, PageHeader } from '../components/templates/PageContainer'
import { integrationsService } from '../services/integrationsService'
import { FathomImportDialog, FATHOM_MEETINGS_KEY } from '../components/organisms/FathomImportDialog'
import { FATHOM_STATUS_KEY } from './IntegrationsSettings'
import { formatDayTime } from '../lib/format'
import type { IngestionStatus, SourceJob } from '../types/ingestion'
import type { FathomImport, FathomMeeting, FathomMeetingsPage, FathomPreview } from '../types/integrations'

const SHOWN_INVITEES = 4
const POLL_MS = 5000
const PREVIEW_POLL_MS = 10_000

function matches(meeting: FathomMeeting, term: string): boolean {
  const people = [...meeting.invitees, ...(meeting.recorded_by ? [meeting.recorded_by] : [])]
  return [meeting.title, ...people.flatMap(p => [p.name, p.email])]
    .some(value => (value || '').toLowerCase().includes(term))
}

function apiDetail(error: unknown): unknown {
  return (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
}

/**
 * Fathom meetings (Story 13.4): the connected user's own Fathom list, paginated by cursor.
 * The user picks which meetings to import into a project; nothing is imported automatically.
 * Promem revamp Phase 4c: list pattern — page header, search on top, dense rows in a bordered
 * container that wrap on phones.
 */
export default function FathomMeetings() {
  const { t } = useTranslation('integrations')
  const [search, setSearch] = useState('')
  const [importing, setImporting] = useState<FathomMeeting | null>(null)

  const { data: status, isLoading: statusLoading } = useQuery(FATHOM_STATUS_KEY, integrationsService.getFathomStatus)
  const connected = !!status?.configured && !!status.connected && !status.needs_reconnect

  const [polling, setPolling] = useState(false)
  const meetings = useInfiniteQuery<FathomMeetingsPage>(
    FATHOM_MEETINGS_KEY,
    ({ pageParam }) => integrationsService.listFathomMeetings(pageParam as string | undefined),
    {
      enabled: connected,
      getNextPageParam: last => last.next_cursor || undefined,
      // refresh while an import is with the worker
      refetchInterval: polling ? POLL_MS : false,
      onSuccess: data => setPolling(
        data.pages.some(p => p.items.some(m => m.imports.some(i => i.state === 'queued' || i.state === 'running')))
      ),
      retry: false,
    }
  )

  const all = useMemo(() => meetings.data?.pages.flatMap(p => p.items) ?? [], [meetings.data])

  // Story 13.15: previews asked for on this page override the list's copy; while any is generating,
  // poll the (database-only) status endpoint every 10 s
  const [previews, setPreviews] = useState<Record<string, FathomPreview>>({})
  const [previewErrors, setPreviewErrors] = useState<Record<string, 'limit' | 'generic'>>({})
  const previewOf = (m: FathomMeeting): FathomPreview | null => previews[m.recording_id] ?? m.preview ?? null
  const generatingIds = all
    .filter(m => {
      const status = previewOf(m)?.status
      return status === 'queued' || status === 'processing'
    })
    .map(m => m.recording_id)
    .sort()
  useQuery(['fathom-previews', generatingIds.join(',')], () => integrationsService.getFathomPreviews(generatingIds), {
    enabled: connected && generatingIds.length > 0,
    refetchInterval: PREVIEW_POLL_MS,
    onSuccess: data => setPreviews(prev => ({ ...prev, ...data })),
  })
  const requestPreview = useMutation(
    (recordingId: string) => integrationsService.requestFathomPreview(recordingId),
    {
      onMutate: id => setPreviewErrors(prev => Object.fromEntries(Object.entries(prev).filter(([key]) => key !== id))),
      onSuccess: (data, id) => setPreviews(prev => ({ ...prev, [id]: data })),
      onError: (error, id) => {
        const status = (error as { response?: { status?: number } })?.response?.status
        setPreviewErrors(prev => ({ ...prev, [id]: status === 429 ? 'limit' : 'generic' }))
      },
    }
  )
  const term = search.trim().toLowerCase()
  const shown = term ? all.filter(m => matches(m, term)) : all
  const needsReconnect = status?.needs_reconnect || apiDetail(meetings.error) === 'needs_reconnect'

  return (
    <PageContainer className="max-w-form">
      <div className="flex flex-col gap-2">
        <Link to="/settings/integrations" className="ds-touch inline-flex items-center gap-1 self-start text-small font-medium text-accent hover:text-accent-strong">
          <Icons.back className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          {t('meetings.back')}
        </Link>
        <PageHeader title={t('meetings.title')} description={t('meetings.subtitle')} />
      </div>

      {statusLoading && <SkeletonRows rows={4} rowClassName="h-16" className="rounded-lg border border-line bg-surface" />}
      {status && !status.configured && <Banner>{t('fathom.notConfigured')}</Banner>}
      {status?.configured && (!status.connected || needsReconnect) && (
        <Banner
          tone="warning"
          action={
            <Button asChild size="sm">
              <Link to="/settings/integrations">{t('meetings.goToSettings')}</Link>
            </Button>
          }
        >
          {needsReconnect ? t('meetings.needsReconnect') : t('meetings.notConnected')}
        </Banner>
      )}

      {connected && !needsReconnect && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Input
              type="search"
              size="toolbar"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('meetings.search')}
              aria-label={t('meetings.search')}
              aria-describedby="fathom-search-hint"
              leadingIcon={<Icons.search />}
            />
            <p id="fathom-search-hint" className="text-caption text-ink-2">{t('meetings.searchHint')}</p>
          </div>

          {meetings.isLoading && <SkeletonRows rows={5} rowClassName="h-24" className="rounded-lg border border-line bg-surface" />}
          {meetings.isError && !needsReconnect && (
            <div className="rounded-lg border border-line bg-surface">
              <ErrorState title={t('meetings.errors.load')} onRetry={() => void meetings.refetch()} />
            </div>
          )}
          {meetings.isSuccess && all.length === 0 && (
            <div className="rounded-lg border border-line bg-surface">
              <EmptyState
                icon={<Icons.meetings />}
                title={t('meetings.empty')}
                text={t('meetings.emptyText')}
                action={<Button loading={meetings.isFetching} onClick={() => void meetings.refetch()}>{t('meetings.refresh')}</Button>}
              />
            </div>
          )}
          {meetings.isSuccess && all.length > 0 && shown.length === 0 && (
            <div className="rounded-lg border border-line bg-surface">
              <EmptyState icon={<Icons.search />} title={t('meetings.noMatch')} action={<Button onClick={() => setSearch('')}>{t('meetings.clearSearch')}</Button>} />
            </div>
          )}

          {shown.length > 0 && (
            <ul className="overflow-hidden rounded-lg border border-line bg-surface">
              {shown.map(meeting => (
                <MeetingRow
                  key={meeting.recording_id}
                  meeting={meeting}
                  preview={previewOf(meeting)}
                  previewError={previewErrors[meeting.recording_id]}
                  requestingPreview={requestPreview.isLoading && requestPreview.variables === meeting.recording_id}
                  onGeneratePreview={() => requestPreview.mutate(meeting.recording_id)}
                  onImport={() => setImporting(meeting)}
                />
              ))}
            </ul>
          )}

          {meetings.hasNextPage && (
            <div className="flex justify-center">
              <Button onClick={() => meetings.fetchNextPage()} loading={meetings.isFetchingNextPage}>
                {meetings.isFetchingNextPage ? t('meetings.loadingMore') : t('meetings.loadMore')}
              </Button>
            </div>
          )}
        </div>
      )}
      <FathomImportDialog meeting={importing} onClose={() => setImporting(null)} />
    </PageContainer>
  )
}

/**
 * Meeting thumbnail (Story 13.12): a fixed 16:9 box (no layout shift) with a lazy-loaded image.
 * Without a `src`, or when the image fails to load (e.g. an expired link), a neutral placeholder
 * with `children` (platform, duration, preview progress).
 */
function Thumbnail({ src, alt, children }: { src?: string | null; alt: string; children?: ReactNode }) {
  const [failed, setFailed] = useState(false)
  const showImage = !!src && !failed
  return (
    <div className="relative aspect-video overflow-hidden rounded-md border border-line-soft bg-surface-sunk">
      {showImage ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div
          data-testid="meeting-thumbnail-placeholder"
          className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 px-1 text-center text-caption text-ink-2"
        >
          <Icons.meetings className="h-4 w-4 text-ink-3" strokeWidth={1.75} aria-hidden />
          {children}
        </div>
      )}
    </div>
  )
}

interface MeetingRowProps {
  meeting: FathomMeeting
  preview: FathomPreview | null
  previewError?: 'limit' | 'generic'
  requestingPreview: boolean
  onGeneratePreview: () => void
  onImport: () => void
}

function MeetingRow({ meeting, preview, previewError, requestingPreview, onGeneratePreview, onImport }: MeetingRowProps) {
  const { t } = useTranslation('integrations')
  const invitees = meeting.invitees
  const extra = invitees.length - SHOWN_INVITEES
  // Story 13.12: the thumbnail of an imported copy (the API only sends it for meetings the user may see)
  const thumbnail = meeting.imports.find(i => i.state === 'imported' && i.thumbnail_url)?.thumbnail_url
  // Story 13.15: a not-imported meeting can get an on-demand preview
  const imported = meeting.imports.some(i => i.state === 'imported')
  const generating = requestingPreview || preview?.status === 'queued' || preview?.status === 'processing'
  const title = meeting.title || t('meetings.untitled')
  const previewLabel = preview?.status === 'failed' ? t('meetings.preview.retry') : t('meetings.preview.generate')
  return (
    <li className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3 gap-y-3 border-b border-line-soft px-4 py-3 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
      <div className="flex w-24 flex-col gap-1 sm:w-40">
        <Thumbnail
          src={thumbnail ?? (preview?.status === 'ready' ? preview.url : null)}
          alt={thumbnail ? t('meetings.thumbnailAlt', { title }) : t('meetings.preview.alt', { title })}
        >
          {generating ? (
            <span role="status" className="flex flex-col items-center gap-1">
              <Spinner />
              {t('meetings.preview.generating')}
            </span>
          ) : (
            <>
              {meeting.platform && <span className="font-semibold text-ink-soft">{t(`meetings.platform.${meeting.platform}`)}</span>}
              {meeting.duration_minutes != null && <span className="font-mono text-mono-sm">{t('meetings.duration', { count: meeting.duration_minutes })}</span>}
            </>
          )}
        </Thumbnail>
        {!imported && !thumbnail && !generating && preview?.status !== 'ready' && (
          <div className="flex flex-col items-start">
            {preview?.status === 'failed' && <p className="text-caption text-danger-ink">{t('meetings.preview.failed')}</p>}
            <Button size="sm" variant="link" onClick={onGeneratePreview} aria-label={`${previewLabel}: ${title}`}>
              {previewLabel}
            </Button>
          </div>
        )}
        {previewError && (
          <p role="alert" className="text-caption text-danger-ink">
            {t(previewError === 'limit' ? 'meetings.preview.limit' : 'meetings.preview.error')}
          </p>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <p className="text-body font-semibold text-ink [overflow-wrap:anywhere]">{title}</p>
        <p className="text-caption text-ink-2">
          {[
            meeting.started_at ? formatDayTime(meeting.started_at) : null,
            meeting.duration_minutes != null ? t('meetings.duration', { count: meeting.duration_minutes }) : null,
            invitees.length ? t('meetings.invitees', { count: invitees.length }) : null,
          ].filter(Boolean).join(' · ')}
        </p>
        {invitees.length > 0 && (
          <p className="truncate text-caption text-ink-3">
            {invitees.slice(0, SHOWN_INVITEES).map(p => p.name).join(', ')}
            {extra > 0 && ` ${t('meetings.more', { count: extra })}`}
          </p>
        )}
        {meeting.imports.length > 0 && (
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {meeting.imports.map(imp => <ImportStatus key={imp.id} imp={imp} />)}
          </ul>
        )}
      </div>
      <div className="col-span-2 flex justify-end sm:col-span-1">
        <Button size="sm" icon={<Icons.download />} onClick={onImport} aria-label={`${t('meetings.import')}: ${title}`}>
          {t('meetings.import')}
        </Button>
      </div>
    </li>
  )
}

const SOURCE_TONE: Record<IngestionStatus, BadgeTone> = {
  pending: 'neutral',
  approved: 'success',
  processed: 'success',
  rejected: 'muted',
  failed: 'danger',
}

/** Status of an imported copy, in the words of Ingestão; while with the worker: Na fila / Processando / Nova tentativa. */
function SourceBadge({ status, job }: { status: IngestionStatus; job?: SourceJob | null }) {
  const { t } = useTranslation('integrations')
  const processing = status === 'approved' && job
    ? job.status === 'running' ? 'running' : job.status === 'queued' ? (job.attempts > 0 ? 'retrying' : 'queued') : null
    : null
  if (processing) {
    return (
      <Badge tone={processing === 'running' ? 'accent' : 'neutral'} title={processing === 'retrying' && job?.last_error ? job.last_error : undefined}>
        {t(`meetings.job.${processing}`, { attempt: (job?.attempts ?? 0) + 1, max: job?.max_attempts ?? 0 })}
      </Badge>
    )
  }
  const Icon = status === 'failed' ? Icons.warning : status === 'rejected' ? Icons.close : status === 'pending' ? null : Icons.check
  return (
    <Badge tone={SOURCE_TONE[status]} icon={Icon ? <Icon /> : undefined}>
      {t(`meetings.sourceStatus.${status}`)}
    </Badge>
  )
}

function ImportStatus({ imp }: { imp: FathomImport }) {
  const { t } = useTranslation('integrations')
  const queryClient = useQueryClient()
  const retry = useMutation(() => integrationsService.retryFathomImport(imp.id), {
    onSettled: () => queryClient.invalidateQueries(FATHOM_MEETINGS_KEY),
  })
  const project = imp.project_name

  if (imp.state === 'imported') {
    return (
      <li className="flex flex-wrap items-center gap-2 text-caption text-ink-soft">
        <span>{t('meetings.imports.imported', { project })}</span>
        <SourceBadge status={imp.source_status ?? 'pending'} />
      </li>
    )
  }
  if (imp.state === 'failed') {
    return (
      <li className="flex flex-col gap-0.5 text-caption">
        <div className="flex flex-wrap items-center gap-2 text-danger-ink">
          <span>{t('meetings.imports.failed', { project })}</span>
          <SourceBadge status="failed" />
          {imp.can_retry && (
            <Button size="sm" variant="link" loading={retry.isLoading} onClick={() => retry.mutate()}>
              {t('meetings.imports.retry')}
            </Button>
          )}
        </div>
        {imp.error && <p className="text-danger-ink [overflow-wrap:anywhere]">{imp.error}</p>}
        {retry.isError && <p role="alert" className="text-danger-ink">{t('meetings.imports.retryError')}</p>}
      </li>
    )
  }
  // queued / running: with the worker — same labels as Ingestão (Na fila / Processando / Nova tentativa)
  return (
    <li className="flex flex-wrap items-center gap-2 text-caption text-ink-soft">
      <span>{t('meetings.imports.importing', { project })}</span>
      <SourceBadge status="approved" job={imp.job} />
    </li>
  )
}
