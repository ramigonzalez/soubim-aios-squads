/**
 * FathomAutoImportSettings — opt-in automatic import of new Fathom meetings (Story 13.9).
 *
 * Off by default. When on, Fathom pushes each new meeting of the user's account to DecisionLog:
 * it goes to the default project (internal unless chosen otherwise) as a pending meeting in
 * Ingestão, or — with no default project — waits in the Unassigned list.
 */

import { useState } from 'react'
import { useMutation, useQuery } from 'react-query'
import { useTranslation } from 'react-i18next'
import { integrationsService } from '../../services/integrationsService'
import type { FathomAutoImport } from '../../types/integrations'
import type { MeetingVisibility } from '../../types/projectItem'

interface FathomAutoImportSettingsProps {
  settings: FathomAutoImport | undefined
  onSaved: () => void
}

function errorKey(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status
  if (status === 409) return 'reconnect'
  if (status === 502) return 'fathom'
  if (status === 403) return 'forbidden'
  return 'generic'
}

export function FathomAutoImportSettings({ settings, onSaved }: FathomAutoImportSettingsProps) {
  const { t } = useTranslation('integrations')
  const [enabled, setEnabled] = useState(settings?.enabled ?? false)
  const [projectId, setProjectId] = useState(settings?.project_id ?? '')
  const [visibility, setVisibility] = useState<MeetingVisibility>(settings?.visibility ?? 'internal')
  const [saved, setSaved] = useState(false)

  const { data: projects } = useQuery('fathom-import-projects', integrationsService.getFathomImportProjects, { staleTime: 60_000 })
  const canShare = !!projects?.find(p => p.id === projectId)?.can_share

  const save = useMutation(integrationsService.setFathomAutoImport, {
    onSuccess: () => {
      setSaved(true)
      onSaved()
    },
  })

  const selectProject = (id: string) => {
    setProjectId(id)
    setSaved(false)
    if (!projects?.find(p => p.id === id)?.can_share) setVisibility('internal')
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    save.mutate({
      enabled,
      project_id: projectId || null,
      visibility: projectId && canShare ? visibility : 'internal',
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t border-gray-100 pt-4 text-sm" aria-label={t('fathom.autoImport.title')}>
      <h3 className="font-semibold text-gray-900">{t('fathom.autoImport.title')}</h3>
      <p className="text-gray-600">{t('fathom.autoImport.description')}</p>

      <label className="flex items-center gap-2 text-gray-800">
        <input
          type="checkbox"
          checked={enabled}
          onChange={e => { setEnabled(e.target.checked); setSaved(false) }}
        />
        {t('fathom.autoImport.enable')}
      </label>

      {enabled && (
        <>
          <label className="block">
            <span className="font-medium text-gray-700">{t('fathom.autoImport.project')}</span>
            <select
              value={projectId}
              onChange={e => selectProject(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">{t('fathom.autoImport.noProject')}</option>
              {(projects ?? []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          {projectId && (
            <fieldset>
              <legend className="font-medium text-gray-700">{t('fathom.autoImport.visibility')}</legend>
              <label className="mt-1 flex items-center gap-2 text-gray-700">
                <input
                  type="radio"
                  name="fathom-auto-visibility"
                  checked={visibility === 'internal'}
                  onChange={() => { setVisibility('internal'); setSaved(false) }}
                />
                {t('meetings.dialog.visibilityInternal')}
              </label>
              <label className={`mt-1 flex items-center gap-2 ${canShare ? 'text-gray-700' : 'text-gray-400'}`}>
                <input
                  type="radio"
                  name="fathom-auto-visibility"
                  checked={visibility === 'shared'}
                  disabled={!canShare}
                  onChange={() => { setVisibility('shared'); setSaved(false) }}
                />
                {t('meetings.dialog.visibilityShared')}
              </label>
            </fieldset>
          )}
        </>
      )}

      {save.isError && <p role="alert" className="text-red-700">{t(`fathom.autoImport.errors.${errorKey(save.error)}`)}</p>}
      {saved && !save.isError && <p role="status" className="text-green-700">{t('fathom.autoImport.saved')}</p>}

      <button
        type="submit"
        disabled={save.isLoading}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
      >
        {save.isLoading ? t('fathom.autoImport.saving') : t('fathom.autoImport.save')}
      </button>
    </form>
  )
}
