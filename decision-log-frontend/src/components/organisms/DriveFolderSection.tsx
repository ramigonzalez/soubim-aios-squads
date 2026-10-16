/**
 * DriveFolderSection — the project's Google Drive folder (Story 12.9), on the Promem design system.
 *
 * The organization shares a Drive folder with the platform's service account e-mail, then picks it
 * here from the folders its own members shared. The Drive monitor then imports new PDF/DOCX files.
 * Rendered as an integration row (icon, name, status, one action) inside its own section card, which
 * saves on its own. Renders nothing when the user cannot manage it (API 403: only the owning
 * organization's owner/admin can). `title` lets the project form number the card ("4 · …").
 */
import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Badge, Banner, Button, Dialog, ErrorState, Field, Icons, Select, SkeletonRows } from '../../design-system'
import { integrationsService } from '../../services/integrationsService'
import type { DriveFolderOption, DriveFolderState } from '../../types/integrations'
import { FormSection } from '../templates/FormShell'

export const driveFolderKey = (projectId: string) => ['drive-folder', projectId]
const optionsKey = (projectId: string) => ['drive-folder-options', projectId]

const KNOWN_ERRORS = ['folder_not_shared_by_organization', 'folder_in_use', 'drive_unavailable']

function errorKey(error: unknown): string {
  const detail = (error as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  return typeof detail === 'string' && KNOWN_ERRORS.includes(detail) ? `driveFolder.errors.${detail}` : 'driveFolder.errors.generic'
}

export default function DriveFolderSection({ projectId, title }: { projectId: string; title?: ReactNode }) {
  const { t, i18n } = useTranslation('projects')
  const queryClient = useQueryClient()
  const { data: state, isLoading, error: stateError, refetch } = useQuery<DriveFolderState>(
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
    onSuccess: (data) => {
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

  const section = (children: ReactNode) => (
    <FormSection
      title={title ?? t('driveFolder.title')}
      description={
        <>
          {t('driveFolder.description')}
          <span className="block text-ink-3">{t('settings.autoSaved')}</span>
        </>
      }
    >
      {children}
    </FormSection>
  )

  if (isLoading) return section(<SkeletonRows rows={2} rowClassName="h-row-2" className="rounded-lg border border-line" />)
  if (!state) {
    // 403: this user cannot manage the folder, so the section is hidden. Any other failure is shown.
    const forbidden = (stateError as { response?: { status?: number } })?.response?.status === 403
    if (forbidden || !stateError) return null
    return section(<ErrorState className="py-6" title={t('driveFolder.loadError')} text={t('driveFolder.errors.generic')} onRetry={() => void refetch()} />)
  }

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
      setConfirmRemove(false)
      setError(t(errorKey(err)))
    }
  }

  const folders = options.data || []
  const others = folders.filter((f) => f.id !== state.folder_id)
  const FolderIcon = Icons.projects

  if (!state.configured) return section(<Banner>{t('driveFolder.notConfigured')}</Banner>)

  return section(
    <>
      {error && <Banner tone="danger">{error}</Banner>}

      {/* Integration row (guidelines §5): icon, name, status, one action */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-surface-2 text-ink-2" aria-hidden>
          <FolderIcon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        {state.folder_id ? (
          <>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="break-words text-small font-medium text-ink">{t('driveFolder.current', { name: state.folder_name || state.folder_id })}</p>
              <p className="text-caption text-ink-2">
                {t('driveFolder.connected')} ·{' '}
                {state.last_checked_at ? t('driveFolder.lastChecked', { date: formatDate(state.last_checked_at) }) : t('driveFolder.notCheckedYet')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <Button asChild size="sm" variant="link">
                <a href={`https://drive.google.com/drive/folders/${encodeURIComponent(state.folder_id)}`} target="_blank" rel="noreferrer">
                  {t('driveFolder.open')} ↗
                </a>
              </Button>
              <Button size="sm" variant="danger-ghost" onClick={() => setConfirmRemove(true)}>
                {t('driveFolder.remove')}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <p className="text-small font-medium text-ink">{t('driveFolder.title')}</p>
            <Badge>{t('driveFolder.notConnected')}</Badge>
          </div>
        )}
      </div>

      {state.folder_id && state.error && (
        <Banner tone="warning">
          <span role="status">{t(`driveFolder.errors.${state.error}`)}</span>
        </Banner>
      )}

      <div className="flex flex-col gap-2 rounded-md bg-surface-2 p-4 text-small">
        <p className="font-semibold text-ink">{t('driveFolder.howTo.title')}</p>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-ink-soft">
          <li>{t('driveFolder.howTo.step1')}</li>
          <li>
            {t('driveFolder.howTo.step2')}{' '}
            <span className="inline-flex max-w-full flex-wrap items-center gap-1 align-middle">
              <code className="break-all rounded-sm border border-line bg-surface px-1.5 py-0.5 font-mono text-mono text-ink">{state.service_account_email}</code>
              <Button size="sm" variant="ghost" icon={<Icons.copy />} onClick={() => void copyEmail()}>
                {copied ? t('driveFolder.copied') : t('driveFolder.copy')}
              </Button>
            </span>
          </li>
          <li>{t('driveFolder.howTo.step3')}</li>
        </ol>
        <p className="text-caption text-ink-2">{t('driveFolder.howTo.note')}</p>
      </div>

      <div className="flex flex-col gap-2 md:flex-row md:items-end">
        <Field label={t('driveFolder.select')} className="min-w-0 flex-1">
          <Select
            value={choice}
            onValueChange={setChoice}
            placeholder={t('driveFolder.selectPlaceholder')}
            disabled={options.isLoading || others.length === 0}
            options={others.map((f) => ({ value: f.id, label: `${f.name} — ${t('driveFolder.sharedBy', { email: f.shared_by })}` }))}
          />
        </Field>
        <div className="flex flex-wrap gap-2 md:mb-px">
          <Button onClick={() => void handleSave()} disabled={!choice} loading={save.isLoading}>
            {save.isLoading ? t('driveFolder.saving') : t('driveFolder.save')}
          </Button>
          <Button variant="ghost" onClick={() => void options.refetch()} loading={options.isFetching}>
            {t('driveFolder.refresh')}
          </Button>
        </div>
      </div>
      {options.isLoading && <p className="text-caption text-ink-2">{t('driveFolder.loadingOptions')}</p>}
      {options.isError && <Banner tone="danger">{t(errorKey(options.error))}</Banner>}
      {!options.isLoading && !options.isError && others.length === 0 && (
        <p className="rounded-md border border-dashed border-line-strong px-4 py-5 text-center text-small text-ink-2">{t('driveFolder.noOptions')}</p>
      )}

      <Dialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={t('driveFolder.removeTitle')}
        description={t('driveFolder.removeConfirm')}
        footer={
          <>
            <Button onClick={() => setConfirmRemove(false)}>{t('common:cancel')}</Button>
            <Button variant="primary" loading={remove.isLoading} onClick={() => void handleRemove()}>
              {t('driveFolder.remove')}
            </Button>
          </>
        }
      />
    </>,
  )
}
