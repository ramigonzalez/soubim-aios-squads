/**
 * FathomAutoImportSettings — opt-in automatic import of new Fathom meetings (Story 13.9).
 *
 * Off by default. When on, Fathom pushes each new meeting of the user's account to DecisionLog.
 * Story 13.16: there is no default project — the projects' Fathom rules (project settings) choose
 * where each meeting goes; a meeting that matches no project, or more than one, waits in Ingestão.
 * The visibility applies to every routed meeting (``shared`` falls back to internal on a project
 * where the user cannot share).
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
  const [visibility, setVisibility] = useState<MeetingVisibility>(settings?.visibility ?? 'internal')
  const [saved, setSaved] = useState(false)

  const { data: projects } = useQuery('fathom-import-projects', integrationsService.getFathomImportProjects, { staleTime: 60_000 })
  const canShare = !!projects?.some(p => p.can_share)

  const save = useMutation(integrationsService.setFathomAutoImport, {
    onSuccess: () => {
      setSaved(true)
      onSaved()
    },
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    save.mutate({ enabled, visibility: canShare ? visibility : 'internal' })
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
          <p className="text-gray-600">{t('fathom.autoImport.routing')}</p>
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
