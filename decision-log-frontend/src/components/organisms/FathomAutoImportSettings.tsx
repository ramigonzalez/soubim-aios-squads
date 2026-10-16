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
import { Button, Checkbox, Icons } from '../../design-system'
import { integrationsService } from '../../services/integrationsService'
import type { FathomAutoImport } from '../../types/integrations'
import type { MeetingVisibility } from '../../types/projectItem'
import { VisibilityChoice } from './FathomImportDialog'

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
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4" aria-label={t('fathom.autoImport.title')}>
      <div className="flex flex-col gap-1">
        <h3 className="text-h3 text-ink">{t('fathom.autoImport.title')}</h3>
        <p className="text-caption text-ink-2 [text-wrap:pretty]">{t('fathom.autoImport.description')}</p>
      </div>

      <Checkbox
        className="-ml-1"
        checked={enabled}
        onCheckedChange={checked => { setEnabled(checked); setSaved(false) }}
        label={t('fathom.autoImport.enable')}
      />

      {enabled && (
        <>
          <p className="rounded-md bg-surface-2 px-3 py-2.5 text-caption text-ink-soft">{t('fathom.autoImport.routing')}</p>
          <VisibilityChoice
            name="fathom-auto-visibility"
            value={visibility}
            onChange={value => { setVisibility(value); setSaved(false) }}
            canShare={canShare}
          />
        </>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {save.isError && (
          <p role="alert" className="mr-auto flex items-start gap-1.5 text-caption text-danger-ink">
            <Icons.warning className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
            {t(`fathom.autoImport.errors.${errorKey(save.error)}`)}
          </p>
        )}
        {saved && !save.isError && (
          <p role="status" className="mr-auto flex items-center gap-1.5 text-caption text-success">
            <Icons.check className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
            {t('fathom.autoImport.saved')}
          </p>
        )}
        <Button type="submit" variant="primary" loading={save.isLoading}>
          {t('fathom.autoImport.save')}
        </Button>
      </div>
    </form>
  )
}
