/**
 * FathomUnassignedList — meetings pushed by the Fathom webhook that have no project yet (Story 13.9).
 * The user assigns each to a project (an import is created, like picking it manually) or discards it.
 * Renders nothing when the list is empty.
 */

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { integrationsService } from '../../services/integrationsService'
import { FATHOM_MEETINGS_KEY } from './FathomImportDialog'
import { formatDateTime } from '../../lib/utils'
import type { FathomUnassignedMeeting } from '../../types/integrations'

export const FATHOM_UNASSIGNED_KEY = 'fathom-unassigned'

function assignErrorKey(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status
  if (status === 409) return 'alreadyImported'
  if (status === 503) return 'storage'
  return 'generic'
}

export function FathomUnassignedList() {
  const { t } = useTranslation('integrations')
  const { data: items } = useQuery(FATHOM_UNASSIGNED_KEY, integrationsService.listFathomUnassigned, { retry: false })
  if (!items || items.length === 0) return null
  return (
    <section className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4" aria-labelledby="fathom-unassigned-title">
      <h2 id="fathom-unassigned-title" className="text-base font-semibold text-gray-900">{t('unassigned.title')}</h2>
      <p className="mt-1 text-sm text-gray-700">{t('unassigned.description')}</p>
      <ul className="mt-3 divide-y divide-amber-200">
        {items.map(item => <UnassignedRow key={item.id} item={item} />)}
      </ul>
    </section>
  )
}

function UnassignedRow({ item }: { item: FathomUnassignedMeeting }) {
  const { t } = useTranslation('integrations')
  const queryClient = useQueryClient()
  const [projectId, setProjectId] = useState('')
  const { data: projects } = useQuery('fathom-import-projects', integrationsService.getFathomImportProjects, { staleTime: 60_000 })
  const title = item.title || t('meetings.untitled')

  const refresh = () => {
    queryClient.invalidateQueries(FATHOM_UNASSIGNED_KEY)
    queryClient.invalidateQueries(FATHOM_MEETINGS_KEY)
  }
  const assign = useMutation(
    () => integrationsService.assignFathomUnassigned(item.id, { project_id: projectId, visibility: 'internal' }),
    { onSuccess: refresh },
  )
  const discard = useMutation(() => integrationsService.discardFathomUnassigned(item.id), { onSuccess: refresh })

  return (
    <li className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-medium text-gray-900">{title}</p>
        {item.started_at && <p className="text-sm text-gray-600">{formatDateTime(item.started_at)}</p>}
        {assign.isError && (
          <p role="alert" className="text-xs text-red-700">{t(`unassigned.errors.${assignErrorKey(assign.error)}`)}</p>
        )}
        {discard.isError && <p role="alert" className="text-xs text-red-700">{t('unassigned.errors.generic')}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          aria-label={`${t('unassigned.project')}: ${title}`}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="">{t('meetings.dialog.selectProject')}</option>
          {(projects ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button
          type="button"
          onClick={() => assign.mutate()}
          disabled={!projectId || assign.isLoading}
          aria-label={`${t('unassigned.assign')}: ${title}`}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {t('unassigned.assign')}
        </button>
        <button
          type="button"
          onClick={() => discard.mutate()}
          disabled={discard.isLoading}
          aria-label={`${t('unassigned.discard')}: ${title}`}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-white disabled:opacity-60"
        >
          {t('unassigned.discard')}
        </button>
      </div>
    </li>
  )
}
