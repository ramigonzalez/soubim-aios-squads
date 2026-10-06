/**
 * AddMeetingDialog — manual upload of a recording (.mp4 …) and/or a transcript (.txt) (Story 13.5).
 *
 * The video is PUT straight to storage with a signed URL (progress bar); the transcript is read in
 * the browser (UTF-8, Latin-1 fallback) and sent as text. The meeting then waits in Ingestão as
 * pending. Visibility is not offered yet: it arrives with Story 12.4.
 */

import { useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useQuery, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { uploadService } from '../../services/uploadService'
import { decodeText, titleFromFileName, transcriptProblem, videoProblem } from '../../lib/upload'
import type { FileProblem } from '../../lib/upload'

interface AddMeetingDialogProps {
  open: boolean
  onClose: () => void
}

type Stage = 'idle' | 'uploading' | 'saving' | 'error'

function localNow(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

function errorKey(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status
  if (status === 503) return 'storage'
  if (status === 413) return 'tooLarge'
  if (status === 415) return 'extension'
  if (status === 404) return 'missing'
  if (status === 403) return 'forbidden'
  return 'generic'
}

export function AddMeetingDialog({ open, onClose }: AddMeetingDialogProps) {
  const { t } = useTranslation('ingestion')
  const queryClient = useQueryClient()
  const [projectId, setProjectId] = useState('')
  const [title, setTitle] = useState('')
  const [occurredAt, setOccurredAt] = useState(localNow)
  const [participants, setParticipants] = useState('')
  const [video, setVideo] = useState<File | null>(null)
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null)
  const [transcriptText, setTranscriptText] = useState<string | null>(null)
  const [fileError, setFileError] = useState<{ field: 'video' | 'transcript'; problem: FileProblem } | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const { data: projects, isLoading } = useQuery('upload-projects', uploadService.getProjects, {
    enabled: open,
    staleTime: 60_000,
  })

  const busy = stage === 'uploading' || stage === 'saving'
  const canSubmit = !!projectId && title.trim() !== '' && (!!video || !!transcriptFile) && !busy

  const reset = () => {
    setProjectId('')
    setTitle('')
    setOccurredAt(localNow())
    setParticipants('')
    setVideo(null)
    setTranscriptFile(null)
    setTranscriptText(null)
    setFileError(null)
    setStage('idle')
    setProgress(0)
    setError(null)
  }

  const close = () => {
    if (busy) abortRef.current?.abort()
    reset()
    onClose()
  }

  const maybeSetTitle = (file: File) => {
    if (!title.trim()) setTitle(titleFromFileName(file.name))
  }

  const pickVideo = (file: File | undefined) => {
    setFileError(null)
    if (!file) return setVideo(null)
    const problem = videoProblem(file)
    if (problem) {
      setVideo(null)
      return setFileError({ field: 'video', problem })
    }
    setVideo(file)
    maybeSetTitle(file)
  }

  const pickTranscript = async (file: File | undefined) => {
    setFileError(null)
    if (!file) {
      setTranscriptFile(null)
      return setTranscriptText(null)
    }
    const problem = transcriptProblem(file)
    if (problem) {
      setTranscriptFile(null)
      setTranscriptText(null)
      return setFileError({ field: 'transcript', problem })
    }
    const text = decodeText(await file.arrayBuffer())
    if (!text.trim()) {
      setTranscriptFile(null)
      setTranscriptText(null)
      return setFileError({ field: 'transcript', problem: 'empty' })
    }
    setTranscriptFile(file)
    setTranscriptText(text)
    maybeSetTitle(file)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    setError(null)
    abortRef.current = new AbortController()
    try {
      let sourceId: string | null = null
      let extension: string | null = null
      if (video) {
        setStage('uploading')
        setProgress(0)
        const target = await uploadService.presign({ project_id: projectId, filename: video.name, size: video.size })
        await uploadService.putVideo(target, video, setProgress, abortRef.current.signal)
        sourceId = target.source_id
        extension = target.video_extension
      }
      setStage('saving')
      await uploadService.complete({
        project_id: projectId,
        title: title.trim(),
        occurred_at: new Date(occurredAt).toISOString(),
        participants: participants.split(',').map(p => p.trim()).filter(Boolean),
        transcript: transcriptText,
        source_id: sourceId,
        video_extension: extension,
      })
      queryClient.invalidateQueries('ingestion')
      queryClient.invalidateQueries('ingestion-history')
      queryClient.invalidateQueries('ingestion-pending-count')
      reset()
      onClose()
    } catch (e) {
      if (abortRef.current?.signal.aborted) return
      setStage('error')
      setError(errorKey(e))
    }
  }

  const field = 'mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm'

  return (
    <Dialog.Root open={open} onOpenChange={o => !o && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold text-gray-900">{t('addMeeting.title')}</Dialog.Title>
            <Dialog.Close className="rounded p-1 text-gray-500 hover:bg-gray-100" aria-label={t('addMeeting.close')}>
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-sm text-gray-600">{t('addMeeting.description')}</Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {isLoading && <p className="text-sm text-gray-500">{t('addMeeting.loadingProjects')}</p>}
            {projects && projects.length === 0 && <p className="text-sm text-gray-600">{t('addMeeting.noProjects')}</p>}
            {projects && projects.length > 0 && (
              <label className="block text-sm">
                <span className="font-medium text-gray-700">{t('addMeeting.project')}</span>
                <select value={projectId} onChange={e => setProjectId(e.target.value)} disabled={busy} className={field}>
                  <option value="">{t('addMeeting.selectProject')}</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
            )}

            <label className="block text-sm">
              <span className="font-medium text-gray-700">{t('addMeeting.meetingTitle')}</span>
              <input value={title} onChange={e => setTitle(e.target.value)} disabled={busy} maxLength={500} className={field} />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-gray-700">{t('addMeeting.date')}</span>
              <input type="datetime-local" value={occurredAt} onChange={e => setOccurredAt(e.target.value)} disabled={busy} className={field} />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-gray-700">{t('addMeeting.participants')}</span>
              <input value={participants} onChange={e => setParticipants(e.target.value)} disabled={busy} placeholder={t('addMeeting.participantsHint')} className={field} />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-gray-700">{t('addMeeting.video')}</span>
              <input
                type="file"
                accept=".mp4,.webm,.mov,.m4v,video/*"
                disabled={busy}
                onChange={e => pickVideo(e.target.files?.[0])}
                className="mt-1 block w-full text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-gray-700">{t('addMeeting.transcript')}</span>
              <input
                type="file"
                accept=".txt,text/plain"
                disabled={busy}
                onChange={e => void pickTranscript(e.target.files?.[0])}
                className="mt-1 block w-full text-sm"
              />
              <span className="mt-1 block text-xs text-gray-500">{t('addMeeting.transcriptHint')}</span>
            </label>

            {fileError && (
              <p role="alert" className="text-sm text-red-700">
                {t(`addMeeting.fileErrors.${fileError.field}.${fileError.problem}`)}
              </p>
            )}

            {!video && !transcriptFile && <p className="text-xs text-gray-500">{t('addMeeting.needFile')}</p>}
            {video && !transcriptFile && <p className="text-xs text-gray-500">{t('addMeeting.videoOnlyNote')}</p>}

            {(stage === 'uploading' || stage === 'saving') && (
              <div>
                <div
                  role="progressbar"
                  aria-label={t('addMeeting.progress')}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress * 100)}
                  className="h-2 w-full overflow-hidden rounded bg-gray-200"
                >
                  <div className="h-full bg-blue-600 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  {stage === 'uploading' ? t('addMeeting.uploading', { percent: Math.round(progress * 100) }) : t('addMeeting.saving')}
                </p>
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-red-700">
                {t(`addMeeting.errors.${error}`)}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('addMeeting.cancel')}
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {stage === 'error' ? t('addMeeting.retry') : t('addMeeting.submit')}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
