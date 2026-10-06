import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowLeft, Search } from 'lucide-react'
import { integrationsService } from '../services/integrationsService'
import { FathomImportDialog, FATHOM_MEETINGS_KEY } from '../components/organisms/FathomImportDialog'
import IngestionStatusBadge from '../components/molecules/IngestionStatusBadge'
import { FATHOM_STATUS_KEY } from './IntegrationsSettings'
import { formatDateTime } from '../lib/utils'
import type { FathomImport, FathomMeeting, FathomMeetingsPage } from '../types/integrations'

const SHOWN_INVITEES = 4
const POLL_MS = 5000

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
  const term = search.trim().toLowerCase()
  const shown = term ? all.filter(m => matches(m, term)) : all
  const needsReconnect = status?.needs_reconnect || apiDetail(meetings.error) === 'needs_reconnect'

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link to="/settings/integrations" className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-blue-600">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t('meetings.back')}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{t('meetings.title')}</h1>
        <p className="mt-1 text-sm text-gray-600">{t('meetings.subtitle')}</p>

        {statusLoading && <p className="mt-6 text-sm text-gray-500">{t('nav:loading')}</p>}
        {status && !status.configured && <p className="mt-6 text-sm text-gray-600">{t('fathom.notConfigured')}</p>}
        {status?.configured && (!status.connected || needsReconnect) && (
          <div className="mt-6 flex items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              {needsReconnect ? t('meetings.needsReconnect') : t('meetings.notConnected')}
            </p>
            <Link to="/settings/integrations" className="font-medium text-blue-700 hover:underline">
              {t('meetings.goToSettings')}
            </Link>
          </div>
        )}

        {connected && !needsReconnect && (
          <>
            <div className="mt-6">
              <label className="relative block">
                <span className="sr-only">{t('meetings.search')}</span>
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" aria-hidden />
                <input
                  type="search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={t('meetings.search')}
                  className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
                />
              </label>
              <p className="mt-1 text-xs text-gray-500">{t('meetings.searchHint')}</p>
            </div>

            {meetings.isLoading && <p className="mt-6 text-sm text-gray-500">{t('nav:loading')}</p>}
            {meetings.isError && !needsReconnect && (
              <p role="alert" className="mt-6 text-sm text-red-700">{t('meetings.errors.load')}</p>
            )}
            {meetings.isSuccess && all.length === 0 && <p className="mt-6 text-sm text-gray-600">{t('meetings.empty')}</p>}
            {meetings.isSuccess && all.length > 0 && shown.length === 0 && (
              <p className="mt-6 text-sm text-gray-600">{t('meetings.noMatch')}</p>
            )}

            {shown.length > 0 && (
              <ul className="mt-4 divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white shadow-sm">
                {shown.map(meeting => (
                  <MeetingRow key={meeting.recording_id} meeting={meeting} onImport={() => setImporting(meeting)} />
                ))}
              </ul>
            )}

            {meetings.hasNextPage && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => meetings.fetchNextPage()}
                  disabled={meetings.isFetchingNextPage}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  {meetings.isFetchingNextPage ? t('meetings.loadingMore') : t('meetings.loadMore')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <FathomImportDialog meeting={importing} onClose={() => setImporting(null)} />
    </main>
  )
}

function MeetingRow({ meeting, onImport }: { meeting: FathomMeeting; onImport: () => void }) {
  const { t } = useTranslation('integrations')
  const invitees = meeting.invitees
  const extra = invitees.length - SHOWN_INVITEES
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-gray-900">{meeting.title || t('meetings.untitled')}</p>
        <p className="mt-0.5 text-sm text-gray-600">
          {[
            meeting.started_at ? formatDateTime(meeting.started_at) : null,
            meeting.duration_minutes != null ? t('meetings.duration', { count: meeting.duration_minutes }) : null,
            invitees.length ? t('meetings.invitees', { count: invitees.length }) : null,
          ].filter(Boolean).join(' · ')}
        </p>
        {invitees.length > 0 && (
          <p className="mt-0.5 truncate text-xs text-gray-500">
            {invitees.slice(0, SHOWN_INVITEES).map(p => p.name).join(', ')}
            {extra > 0 && ` ${t('meetings.more', { count: extra })}`}
          </p>
        )}
        {meeting.imports.length > 0 && (
          <ul className="mt-2 space-y-1">
            {meeting.imports.map(imp => <ImportStatus key={imp.id} imp={imp} />)}
          </ul>
        )}
      </div>
      <button
        type="button"
        onClick={onImport}
        className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        aria-label={`${t('meetings.import')}: ${meeting.title || t('meetings.untitled')}`}
      >
        {t('meetings.import')}
      </button>
    </li>
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
      <li className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
        <span>{t('meetings.imports.imported', { project })}</span>
        <IngestionStatusBadge status={imp.source_status ?? 'pending'} />
      </li>
    )
  }
  if (imp.state === 'failed') {
    return (
      <li className="text-sm">
        <div className="flex flex-wrap items-center gap-2 text-red-800">
          <span>{t('meetings.imports.failed', { project })}</span>
          <IngestionStatusBadge status="failed" />
          {imp.can_retry && (
            <button
              type="button"
              onClick={() => retry.mutate()}
              disabled={retry.isLoading}
              className="text-sm font-medium text-blue-700 hover:underline disabled:opacity-60"
            >
              {t('meetings.imports.retry')}
            </button>
          )}
        </div>
        {imp.error && <p className="mt-0.5 text-xs text-red-700">{imp.error}</p>}
        {retry.isError && <p role="alert" className="mt-0.5 text-xs text-red-700">{t('meetings.imports.retryError')}</p>}
      </li>
    )
  }
  // queued / running: with the worker — same badge as Ingestão (Na fila / Processando / Nova tentativa)
  return (
    <li className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
      <span>{t('meetings.imports.importing', { project })}</span>
      <IngestionStatusBadge status="approved" job={imp.job} />
    </li>
  )
}
