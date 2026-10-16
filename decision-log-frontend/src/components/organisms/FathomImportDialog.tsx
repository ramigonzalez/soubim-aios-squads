/**
 * FathomImportDialog — pick the target project for a Fathom recording (Story 13.4).
 *
 * Lists the projects the user can import into (write access). Projects that already have
 * this recording are disabled (the backend refuses duplicates too). Story 12.4: visibility of the
 * imported meeting — internal (default) or shared; shared only where the user is an admin of the
 * organization they act for (`can_share`).
 */

import { useId, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Banner, Button, Dialog, Field, Icons, Select, SkeletonRows, cn } from '../../design-system'
import { integrationsService } from '../../services/integrationsService'
import type { FathomMeeting } from '../../types/integrations'
import type { MeetingVisibility } from '../../types/projectItem'

export const FATHOM_MEETINGS_KEY = 'fathom-meetings'
const IMPORT_PROJECTS_KEY = 'fathom-import-projects'

interface FathomImportDialogProps {
  meeting: FathomMeeting | null
  onClose: () => void
}

function importErrorKey(error: unknown): string {
  const response = (error as { response?: { status?: number } })?.response
  if (response?.status === 409) return 'alreadyImported'
  if (response?.status === 503) return 'storage'
  return 'generic'
}

/**
 * Internal / shared choice of a Fathom meeting, as a vertical radio group: the labels are full
 * sentences, too long for a SegmentedControl on a phone. Shared with the auto-import settings.
 */
export function VisibilityChoice({
  name,
  value,
  onChange,
  canShare,
  sharedDisabledMuted = true,
  note,
}: {
  name: string
  value: MeetingVisibility
  onChange: (value: MeetingVisibility) => void
  canShare: boolean
  /** Grey out the shared label when it cannot be chosen */
  sharedDisabledMuted?: boolean
  note?: ReactNode
}) {
  const { t } = useTranslation('integrations')
  const legendId = useId()
  const options: { value: MeetingVisibility; label: string; disabled: boolean }[] = [
    { value: 'internal', label: t('meetings.dialog.visibilityInternal'), disabled: false },
    { value: 'shared', label: t('meetings.dialog.visibilityShared'), disabled: !canShare },
  ]
  return (
    <fieldset className="flex flex-col gap-1" aria-labelledby={legendId}>
      <legend id={legendId} className="mb-1 text-small font-semibold text-ink">
        {t('meetings.dialog.visibility')}
      </legend>
      {options.map(option => (
        <label
          key={option.value}
          className={cn(
            'flex min-h-touch cursor-pointer items-center gap-2.5 text-small md:min-h-0 md:py-1',
            option.disabled ? 'cursor-not-allowed' : '',
            option.disabled && sharedDisabledMuted ? 'text-ink-3' : 'text-ink',
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            disabled={option.disabled}
            onChange={() => onChange(option.value)}
            className="h-4 w-4 shrink-0 accent-ink focus-visible:shadow-focus focus-visible:outline-none"
          />
          {option.label}
        </label>
      ))}
      {note && <p className="text-caption text-ink-2">{note}</p>}
    </fieldset>
  )
}

export function FathomImportDialog({ meeting, onClose }: FathomImportDialogProps) {
  const { t } = useTranslation('integrations')
  const queryClient = useQueryClient()
  const formId = useId()
  const [projectId, setProjectId] = useState('')
  const [visibility, setVisibility] = useState<MeetingVisibility>('internal')

  const { data: projects, isLoading, isError, refetch } = useQuery(IMPORT_PROJECTS_KEY, integrationsService.getFathomImportProjects, {
    enabled: !!meeting,
    staleTime: 60_000,
  })
  const importMutation = useMutation(integrationsService.importFathomMeeting, {
    onSuccess: () => {
      queryClient.invalidateQueries(FATHOM_MEETINGS_KEY)
      close()
    },
    onError: () => queryClient.invalidateQueries(FATHOM_MEETINGS_KEY),
  })

  const close = () => {
    setProjectId('')
    setVisibility('internal')
    importMutation.reset()
    onClose()
  }

  const importedInto = new Set((meeting?.imports ?? []).map(i => i.project_id))
  const canShare = !!projects?.find(p => p.id === projectId)?.can_share

  const selectProject = (id: string) => {
    setProjectId(id)
    if (!projects?.find(p => p.id === id)?.can_share) setVisibility('internal')
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!meeting || !projectId) return
    importMutation.mutate({
      recording_id: meeting.recording_id,
      project_id: projectId,
      visibility: canShare ? visibility : 'internal',
    })
  }

  const hasProjects = !!projects && projects.length > 0

  return (
    <Dialog
      open={!!meeting}
      onOpenChange={open => !open && close()}
      title={t('meetings.dialog.title')}
      description={t('meetings.dialog.description')}
      footer={
        <>
          <Button onClick={close}>{t('meetings.dialog.cancel')}</Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            icon={<Icons.download />}
            disabled={!projectId}
            loading={importMutation.isLoading}
          >
            {t('meetings.dialog.submit')}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-label uppercase text-ink-2">{t('meetings.dialog.meeting')}</span>
          <p className="text-body font-semibold text-ink">{meeting?.title || t('meetings.untitled')}</p>
        </div>

        {isLoading && <SkeletonRows rows={2} rowClassName="h-10" />}
        {isError && (
          <Banner
            tone="danger"
            action={
              <Button size="sm" variant="link" onClick={() => void refetch()}>
                {t('ui:state.retry')}
              </Button>
            }
          >
            {t('meetings.dialog.projectsError')}
          </Banner>
        )}
        {projects && projects.length === 0 && <Banner>{t('meetings.dialog.noProjects')}</Banner>}

        {hasProjects && (
          <Field label={t('meetings.dialog.project')}>
            <Select
              value={projectId || undefined}
              onValueChange={selectProject}
              placeholder={t('meetings.dialog.selectProject')}
              options={projects.map(p => ({
                value: p.id,
                label: importedInto.has(p.id) ? t('meetings.dialog.alreadyImported', { project: p.name }) : p.name,
                disabled: importedInto.has(p.id),
              }))}
            />
          </Field>
        )}

        {hasProjects && (
          <VisibilityChoice
            name="fathom-import-visibility"
            value={visibility}
            onChange={setVisibility}
            canShare={canShare}
            sharedDisabledMuted={!!projectId}
            note={projectId && !canShare ? t('meetings.dialog.sharedAdminOnly') : undefined}
          />
        )}

        {importMutation.isError && (
          <p role="alert" className="flex items-start gap-1.5 text-caption text-danger-ink">
            <Icons.warning className="mt-px h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
            {t(`meetings.dialog.errors.${importErrorKey(importMutation.error)}`)}
          </p>
        )}
      </form>
    </Dialog>
  )
}
