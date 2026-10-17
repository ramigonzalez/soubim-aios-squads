/**
 * AddMeetingDialog — manual upload of a recording (.mp4 …) and/or a transcript (.txt) (Story 13.5).
 *
 * The video is PUT straight to storage with a signed URL (progress bar); the transcript is read in
 * the browser (UTF-8, Latin-1 fallback) and sent as text. The meeting then waits in Ingestão as
 * pending. Internal / shared visibility (Story 12.4). Built on the Promem design system Dialog.
 */

import { useRef, useState } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { useTranslation } from 'react-i18next'
import { Banner, Button, cn, Dialog, Field, Icons, Input, Select, SkeletonRows } from '../../design-system'
import { uploadService } from '../../services/uploadService'
import { decodeText, titleFromFileName, transcriptProblem, transcriptTextProblem, videoProblem } from '../../lib/upload'
import type { FileProblem } from '../../lib/upload'
import type { MeetingVisibility } from '../../types/projectItem'

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
  const [visibility, setVisibility] = useState<MeetingVisibility>('internal')
  const [video, setVideo] = useState<File | null>(null)
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null)
  const [transcriptText, setTranscriptText] = useState<string | null>(null)
  const [fileError, setFileError] = useState<{ field: 'video' | 'transcript'; problem: FileProblem } | null>(null)
  const [stage, setStage] = useState<Stage>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const { data: projects, isLoading, isError, refetch } = useQuery('upload-projects', uploadService.getProjects, {
    enabled: open,
    staleTime: 60_000,
  })

  const canShare = !!projects?.find(p => p.id === projectId)?.can_share
  const busy = stage === 'uploading' || stage === 'saving'
  const canSubmit = !!projectId && title.trim() !== '' && (!!video || !!transcriptFile) && !busy

  const reset = () => {
    setProjectId('')
    setTitle('')
    setOccurredAt(localNow())
    setParticipants('')
    setVisibility('internal')
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
    const textProblem = transcriptTextProblem(text)
    if (textProblem) {
      setTranscriptFile(null)
      setTranscriptText(null)
      return setFileError({ field: 'transcript', problem: textProblem })
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
      let token: string | null = null
      if (video) {
        setStage('uploading')
        setProgress(0)
        const target = await uploadService.presign({ project_id: projectId, filename: video.name, size: video.size })
        await uploadService.putVideo(target, video, setProgress, abortRef.current.signal)
        sourceId = target.source_id
        extension = target.video_extension
        token = target.upload_token
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
        upload_token: token,
        visibility: canShare ? visibility : 'internal',
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

  const percent = Math.round(progress * 100)
  const fileInput =
    'block w-full min-w-0 text-small text-ink-2 file:mr-3 file:h-9 file:cursor-pointer file:rounded-md file:border file:border-solid ' +
    'file:border-line-strong file:bg-surface file:px-3 file:text-small file:font-medium file:text-ink hover:file:bg-surface-2 ' +
    'disabled:cursor-not-allowed disabled:opacity-45 max-md:file:h-11'

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && close()}
      title={t('addMeeting.title')}
      description={t('addMeeting.description')}
      footer={
        <>
          <Button onClick={close}>{t('addMeeting.cancel')}</Button>
          <Button type="submit" form="add-meeting-form" variant="primary" disabled={!canSubmit} icon={<Icons.upload />}>
            {stage === 'error' ? t('addMeeting.retry') : t('addMeeting.submit')}
          </Button>
        </>
      }
    >
      <form id="add-meeting-form" noValidate onSubmit={handleSubmit} className="flex flex-col gap-4 py-1">
        {isLoading && <SkeletonRows rows={1} rowClassName="h-row-2" />}
        {isError && (
          <Banner
            tone="danger"
            action={
              <Button size="sm" variant="link" onClick={() => void refetch()}>
                {t('ui:state.retry')}
              </Button>
            }
          >
            {t('addMeeting.loadError')}
          </Banner>
        )}
        {projects && projects.length === 0 && <Banner>{t('addMeeting.noProjects')}</Banner>}
        {projects && projects.length > 0 && (
          <Field label={t('addMeeting.project')}>
            <Select
              value={projectId}
              placeholder={t('addMeeting.selectProject')}
              disabled={busy}
              onValueChange={(value) => {
                setProjectId(value)
                if (!projects?.find((p) => p.id === value)?.can_share) setVisibility('internal')
              }}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
            />
          </Field>
        )}

        <Field label={t('addMeeting.meetingTitle')}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} maxLength={500} />
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label={t('addMeeting.date')}>
            <Input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} disabled={busy} />
          </Field>
          <Field label={t('addMeeting.participants')}>
            <Input value={participants} onChange={(e) => setParticipants(e.target.value)} disabled={busy} placeholder={t('addMeeting.participantsHint')} />
          </Field>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-small font-semibold text-ink">{t('addMeeting.visibility')}</legend>
          {(['internal', 'shared'] as const).map((value) => {
            const unavailable = value === 'shared' && (!canShare || busy)
            const checked = visibility === value
            return (
              <label
                key={value}
                className={cn(
                  'flex min-h-touch items-center gap-2.5 rounded-md border px-3 py-2 text-small md:min-h-0',
                  checked ? 'border-ink bg-surface-2 text-ink' : 'border-line text-ink-soft',
                  unavailable ? 'cursor-not-allowed text-ink-3' : 'cursor-pointer hover:bg-surface-2',
                )}
              >
                <input
                  type="radio"
                  name="add-meeting-visibility"
                  value={value}
                  checked={checked}
                  disabled={value === 'shared' ? !canShare || busy : busy}
                  onChange={() => setVisibility(value)}
                  className="h-4 w-4 shrink-0 accent-ink"
                />
                {value === 'internal' ? t('addMeeting.visibilityInternal') : t('addMeeting.visibilityShared')}
              </label>
            )
          })}
          {projectId && !canShare && <p className="text-caption text-ink-2">{t('addMeeting.sharedAdminOnly')}</p>}
        </fieldset>

        <Field label={t('addMeeting.video')}>
          <input type="file" accept=".mp4,.webm,.mov,.m4v,video/*" disabled={busy} onChange={(e) => pickVideo(e.target.files?.[0])} className={fileInput} />
        </Field>

        <Field label={t('addMeeting.transcript')} help={t('addMeeting.transcriptHint')}>
          <input type="file" accept=".txt,text/plain" disabled={busy} onChange={(e) => void pickTranscript(e.target.files?.[0])} className={fileInput} />
        </Field>

        {fileError && <Banner tone="danger">{t(`addMeeting.fileErrors.${fileError.field}.${fileError.problem}`)}</Banner>}

        {!video && !transcriptFile && <p className="text-caption text-ink-2">{t('addMeeting.needFile')}</p>}
        {video && !transcriptFile && <Banner tone="warning">{t('addMeeting.videoOnlyNote')}</Banner>}

        {busy && (
          <div className="flex flex-col gap-1.5">
            <div
              role="progressbar"
              aria-label={t('addMeeting.progress')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="h-2 w-full overflow-hidden rounded-sm bg-surface-sunk"
            >
              <div className="h-full bg-ink transition-all duration-base ease-promem" style={{ width: `${percent}%` }} />
            </div>
            <p className="font-mono text-mono text-ink-2">
              {stage === 'uploading' ? t('addMeeting.uploading', { percent }) : t('addMeeting.saving')}
            </p>
          </div>
        )}

        {error && <Banner tone="danger">{t(`addMeeting.errors.${error}`)}</Banner>}
      </form>
    </Dialog>
  )
}
