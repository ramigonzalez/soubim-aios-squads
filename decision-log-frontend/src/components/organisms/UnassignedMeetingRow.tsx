/**
 * UnassignedMeetingRow — a Fathom webhook meeting without a project, as a row of the Ingestão
 * Pendentes table (Story 13.16; replaces the 13.9 yellow box).
 *
 * Status "No project" (no rule matched, or a 13.9 reason) or "Conflict" (rules of 2+ projects matched,
 * the explanation names them). The project cell is a picker — for a conflict the matched projects come
 * first — and the actions are Import (once a project is picked) and Discard, the 13.9 endpoints.
 * The row cannot be bulk-selected: it needs a project first.
 */
import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { integrationsService } from '../../services/integrationsService'
import { FATHOM_UNASSIGNED_KEY } from '../../hooks/useFathomUnassigned'
import { FATHOM_MEETINGS_KEY } from './FathomImportDialog'
import { cn, formatDateTime } from '../../lib/utils'
import type { FathomUnassignedMeeting } from '../../types/integrations'

function errorKey(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status
  if (status === 409) return 'alreadyImported'
  if (status === 503) return 'storage'
  if (status === 403) return 'forbidden'
  return 'generic'
}

export function unassignedExplanation(
  item: FathomUnassignedMeeting,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const matched = item.matched_projects ?? []
  if (item.reason === 'conflict' && matched.length > 0) {
    return t('unassigned.conflictHint', { count: matched.length, projects: matched.map((p) => p.name).join(', ') })
  }
  return t('unassigned.noProjectHint')
}

export default function UnassignedMeetingRow({ item }: { item: FathomUnassignedMeeting }) {
  const { t } = useTranslation('ingestion')
  const queryClient = useQueryClient()
  const isConflict = item.reason === 'conflict'
  const matched = item.matched_projects ?? []
  const [projectId, setProjectId] = useState(isConflict && matched.length === 1 ? matched[0].id : '')
  const { data: projects } = useQuery('fathom-import-projects', integrationsService.getFathomImportProjects, {
    staleTime: 60_000,
  })
  const title = item.title || t('unassigned.untitled')
  const explanation = unassignedExplanation(item, t)
  const matchedIds = new Set(matched.map((p) => p.id))
  const others = (projects ?? []).filter((p) => !matchedIds.has(p.id))

  const refresh = () => {
    queryClient.invalidateQueries(FATHOM_UNASSIGNED_KEY)
    queryClient.invalidateQueries(FATHOM_MEETINGS_KEY)
    queryClient.invalidateQueries('ingestion')
    queryClient.invalidateQueries('ingestion-pending-count')
  }
  const assign = useMutation(
    () => integrationsService.assignFathomUnassigned(item.id, { project_id: projectId, visibility: 'internal' }),
    { onSuccess: refresh },
  )
  const discard = useMutation(() => integrationsService.discardFathomUnassigned(item.id), { onSuccess: refresh })
  const busy = assign.isLoading || discard.isLoading
  const date = item.started_at || item.received_at

  return (
    <tr className={cn('transition-colors duration-100', isConflict ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-gray-50')}>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={false}
          disabled
          className="h-4 w-4 rounded border-gray-300"
          aria-label={t('actions.selectItem', { name: item.recording_id })}
          title={t('unassigned.notSelectable')}
        />
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 truncate font-mono" title={item.recording_id}>
        {item.recording_id}
      </td>
      <td className="px-4 py-3 text-sm">
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          disabled={busy}
          aria-label={t('unassigned.project', { name: title })}
          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
        >
          <option value="">{t('unassigned.selectProject')}</option>
          {matched.length > 0 ? (
            <>
              <optgroup label={t('unassigned.matchedGroup')}>
                {matched.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </optgroup>
              {others.length > 0 && (
                <optgroup label={t('unassigned.otherGroup')}>
                  {others.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </optgroup>
              )}
            </>
          ) : (
            others.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)
          )}
        </select>
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
        {date ? formatDateTime(date) : '--'}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900">{title}</td>
      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{t('unassigned.source')}</td>
      <td className="px-4 py-3 text-sm text-gray-400">--</td>
      <td className="px-4 py-3">
        <span
          className={cn(
            'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap',
            isConflict ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700',
          )}
          aria-label={t('status.ariaLabel', { status: isConflict ? t('unassigned.conflict') : t('unassigned.noProject') })}
          title={explanation}
        >
          {isConflict && <AlertTriangle className="w-3 h-3" aria-hidden="true" />}
          {isConflict ? t('unassigned.conflict') : t('unassigned.noProject')}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">--</td>
      <td className="px-4 py-3 text-sm">
        <p className={isConflict ? 'text-amber-800' : 'text-gray-500'}>{explanation}</p>
        {assign.isError && (
          <p role="alert" className="mt-1 text-xs text-red-700">{t(`unassigned.errors.${errorKey(assign.error)}`)}</p>
        )}
        {discard.isError && <p role="alert" className="mt-1 text-xs text-red-700">{t('unassigned.errors.generic')}</p>}
      </td>
      <td className="px-4 py-3 text-sm text-gray-400">--</td>
      <td className="px-4 py-3">
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            onClick={() => assign.mutate()}
            disabled={!projectId || busy}
            aria-label={t('unassigned.importItem', { name: title })}
            className="rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {t('unassigned.import')}
          </button>
          <button
            type="button"
            onClick={() => discard.mutate()}
            disabled={busy}
            aria-label={t('unassigned.discardItem', { name: title })}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {t('unassigned.discard')}
          </button>
        </div>
      </td>
    </tr>
  )
}
