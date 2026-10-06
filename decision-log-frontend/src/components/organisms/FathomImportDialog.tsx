/**
 * FathomImportDialog — pick the target project for a Fathom recording (Story 13.4).
 *
 * Lists the projects the user can import into (write access). Projects that already have
 * this recording are disabled (the backend refuses duplicates too). Visibility (internal /
 * shared) is not offered yet: it arrives with Story 12.4.
 */

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { integrationsService } from '../../services/integrationsService'
import type { FathomMeeting } from '../../types/integrations'

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

export function FathomImportDialog({ meeting, onClose }: FathomImportDialogProps) {
  const { t } = useTranslation('integrations')
  const queryClient = useQueryClient()
  const [projectId, setProjectId] = useState('')

  const { data: projects, isLoading } = useQuery(IMPORT_PROJECTS_KEY, integrationsService.getFathomImportProjects, {
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
    importMutation.reset()
    onClose()
  }

  const importedInto = new Set((meeting?.imports ?? []).map(i => i.project_id))

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!meeting || !projectId) return
    importMutation.mutate({ recording_id: meeting.recording_id, project_id: projectId })
  }

  return (
    <Dialog.Root open={!!meeting} onOpenChange={open => !open && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-gray-900">{t('meetings.dialog.title')}</Dialog.Title>
              <p className="mt-1 text-sm font-medium text-gray-700">{meeting?.title || t('meetings.untitled')}</p>
            </div>
            <Dialog.Close className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label={t('meetings.dialog.close')}>
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-2 text-sm text-gray-600">{t('meetings.dialog.description')}</Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {isLoading && <p className="text-sm text-gray-500">{t('nav:loading')}</p>}
            {projects && projects.length === 0 && (
              <p className="text-sm text-gray-600">{t('meetings.dialog.noProjects')}</p>
            )}
            {projects && projects.length > 0 && (
              <label className="block text-sm">
                <span className="font-medium text-gray-700">{t('meetings.dialog.project')}</span>
                <select
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">{t('meetings.dialog.selectProject')}</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id} disabled={importedInto.has(p.id)}>
                      {importedInto.has(p.id) ? t('meetings.dialog.alreadyImported', { project: p.name }) : p.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {importMutation.isError && (
              <p role="alert" className="text-sm text-red-700">
                {t(`meetings.dialog.errors.${importErrorKey(importMutation.error)}`)}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('meetings.dialog.cancel')}
              </button>
              <button
                type="submit"
                disabled={!projectId || importMutation.isLoading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {importMutation.isLoading ? t('meetings.dialog.submitting') : t('meetings.dialog.submit')}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
