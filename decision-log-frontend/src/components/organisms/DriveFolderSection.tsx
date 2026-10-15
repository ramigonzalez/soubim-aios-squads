/**
 * DriveFolderSection — the project's Google Drive folder (Story 12.9).
 *
 * The organization shares a Drive folder with the platform's service account e-mail, then picks it
 * here from the folders its own members shared. The Drive monitor then imports new PDF/DOCX files.
 * Shown on the Project Edit page; renders nothing when the user cannot manage it (API 403: only the
 * owning organization's owner/admin can).
 */
import { useState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { integrationsService } from '../../services/integrationsService'
import type { DriveFolderOption, DriveFolderState } from '../../types/integrations'

export const driveFolderKey = (projectId: string) => ['drive-folder', projectId]
const optionsKey = (projectId: string) => ['drive-folder-options', projectId]

const KNOWN_ERRORS = ['folder_not_shared_by_organization', 'drive_unavailable']

function errorKey(error: unknown): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  return typeof detail === 'string' && KNOWN_ERRORS.includes(detail) ? `driveFolder.errors.${detail}` : 'driveFolder.errors.generic'
}

export default function DriveFolderSection({ projectId }: { projectId: string }) {
  const { t, i18n } = useTranslation('projects')
  const queryClient = useQueryClient()
  const { data: state, isLoading, isError } = useQuery<DriveFolderState>(
    driveFolderKey(projectId),
    () => integrationsService.getDriveFolder(projectId),
    { enabled: !!projectId, retry: false },
  )
  const options = useQuery<DriveFolderOption[]>(
    optionsKey(projectId),
    () => integrationsService.listDriveFolderOptions(projectId),
    { enabled: !!state?.configured, retry: false },
  )
  const [choice, setChoice] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const save = useMutation((folderId: string) => integrationsService.setDriveFolder(projectId, folderId), {
    onSuccess: data => {
      queryClient.setQueryData(driveFolderKey(projectId), data)
      setChoice('')
    },
  })
  const remove = useMutation(() => integrationsService.clearDriveFolder(projectId), {
    onSuccess: () => {
      queryClient.invalidateQueries(driveFolderKey(projectId))
      setConfirmRemove(false)
    },
  })

  if (isLoading || isError || !state) return null

  const formatDate = (iso: string) => new Date(iso).toLocaleString(i18n.language)

  const copyEmail = async () => {
    if (!state.service_account_email) return
    try {
      await navigator.clipboard.writeText(state.service_account_email)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const handleSave = async () => {
    setError(null)
    try {
      await save.mutateAsync(choice)
    } catch (err) {
      setError(t(errorKey(err)))
    }
  }

  const handleRemove = async () => {
    setError(null)
    try {
      await remove.mutateAsync()
    } catch (err) {
      setError(t(errorKey(err)))
    }
  }

  const folders = options.data || []
  const others = folders.filter(f => f.id !== state.folder_id)

  return (
    <section className="mt-10 pt-6 border-t border-gray-200 space-y-4" aria-labelledby="drive-folder-title">
      <div>
        <h2 id="drive-folder-title" className="text-lg font-medium text-gray-900">{t('driveFolder.title')}</h2>
        <p className="text-sm text-gray-500">{t('driveFolder.description')}</p>
      </div>

      {!state.configured ? (
        <p className="text-sm text-gray-600">{t('driveFolder.notConfigured')}</p>
      ) : (
        <>
          {error && (
            <div role="alert" className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>
          )}

          {state.folder_id && (
            <div className="rounded-md border border-gray-200 p-3 text-sm space-y-1">
              <p className="font-medium text-gray-900">{t('driveFolder.current', { name: state.folder_name || state.folder_id })}</p>
              <p className="text-gray-500">
                {state.last_checked_at
                  ? t('driveFolder.lastChecked', { date: formatDate(state.last_checked_at) })
                  : t('driveFolder.notCheckedYet')}
              </p>
              {state.error && (
                <p role="status" className="text-amber-700">{t(`driveFolder.errors.${state.error}`)}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href={`https://drive.google.com/drive/folders/${encodeURIComponent(state.folder_id)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                >
                  {t('driveFolder.open')} <ExternalLink className="w-3.5 h-3.5" />
                </a>
                {confirmRemove ? (
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span className="text-gray-700">{t('driveFolder.removeConfirm')}</span>
                    <button type="button" onClick={handleRemove} disabled={remove.isLoading}
                      className="rounded-md bg-red-600 px-3 py-1 text-white hover:bg-red-700 disabled:opacity-50">
                      {t('driveFolder.remove')}
                    </button>
                    <button type="button" onClick={() => setConfirmRemove(false)} className="text-gray-600 hover:underline">
                      {t('common:cancel')}
                    </button>
                  </span>
                ) : (
                  <button type="button" onClick={() => setConfirmRemove(true)} className="text-red-600 hover:underline">
                    {t('driveFolder.remove')}
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="rounded-md bg-gray-50 p-3 text-sm space-y-2">
            <p className="font-medium text-gray-900">{t('driveFolder.howTo.title')}</p>
            <ol className="list-decimal pl-5 space-y-1 text-gray-700">
              <li>{t('driveFolder.howTo.step1')}</li>
              <li>
                {t('driveFolder.howTo.step2')}{' '}
                <code className="break-all rounded bg-white px-1 py-0.5 border border-gray-200">{state.service_account_email}</code>{' '}
                <button type="button" onClick={copyEmail} className="text-blue-600 hover:underline">
                  {copied ? t('driveFolder.copied') : t('driveFolder.copy')}
                </button>
              </li>
              <li>{t('driveFolder.howTo.step3')}</li>
            </ol>
            <p className="text-gray-500">{t('driveFolder.howTo.note')}</p>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor="drive-folder-select" className="block text-sm font-medium text-gray-700">
                {t('driveFolder.select')}
              </label>
              <select
                id="drive-folder-select"
                value={choice}
                onChange={e => setChoice(e.target.value)}
                disabled={options.isLoading || others.length === 0}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">{t('driveFolder.selectPlaceholder')}</option>
                {others.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} — {t('driveFolder.sharedBy', { email: f.shared_by })}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={!choice || save.isLoading}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {save.isLoading ? t('driveFolder.saving') : t('driveFolder.save')}
            </button>
            <button
              type="button"
              onClick={() => options.refetch()}
              disabled={options.isFetching}
              className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${options.isFetching ? 'animate-spin' : ''}`} />
              {t('driveFolder.refresh')}
            </button>
          </div>
          {options.isLoading && <p className="text-sm text-gray-500">{t('driveFolder.loadingOptions')}</p>}
          {options.isError && <p role="alert" className="text-sm text-red-700">{t(errorKey(options.error))}</p>}
          {!options.isLoading && !options.isError && others.length === 0 && (
            <p className="text-sm text-gray-500">{t('driveFolder.noOptions')}</p>
          )}
        </>
      )}
    </section>
  )
}
