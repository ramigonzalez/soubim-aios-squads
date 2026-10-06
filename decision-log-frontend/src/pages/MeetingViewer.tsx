/**
 * Meeting viewer: recording + transcript in sync, opened at ?t=<seconds> (Story 7.13).
 *
 * - Stored recording: video with the transcript following playback; click a turn to seek.
 * - External recording (e.g. Fathom): "Open recording" link + transcript.
 * - No recording (text transcripts): transcript only, scrolled to and highlighting ?t.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, ArrowLeft, Calendar, Clock, ExternalLink } from 'lucide-react'
import ExtractionVersions from '../components/organisms/ExtractionVersions'
import { useMeeting, recordingSrc } from '../hooks/useMeeting'
import { MeetingVisibilityControl } from '../components/organisms/MeetingVisibilityControl'
import { formatSeconds, parseTranscript, turnIndexAt } from '../lib/transcript'
import { cn, formatDate } from '../lib/utils'

// After the user scrolls the transcript by hand, auto-scroll waits this long before following again.
const MANUAL_SCROLL_PAUSE_MS = 4000

export function MeetingViewer() {
  const { t } = useTranslation('meeting')
  const { sourceId = '' } = useParams<{ sourceId: string }>()
  const [searchParams] = useSearchParams()
  const startAt = Number(searchParams.get('t')) || 0
  const { data: meeting, isLoading, error } = useMeeting(sourceId)

  const turns = useMemo(() => parseTranscript(meeting?.transcript), [meeting?.transcript])
  const [activeIndex, setActiveIndex] = useState(-1)
  const [follow, setFollow] = useState(true)

  const videoRef = useRef<HTMLVideoElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const turnRefs = useRef<(HTMLLIElement | null)[]>([])
  const manualScrollUntil = useRef(0)

  const hasVideo = meeting?.recording?.type === 'file'
  // Story 13.5: text without "M:SS - Name" turns (e.g. an uploaded .txt) is shown as is, without turn links
  const plainText = turns.length === 0 && !!meeting?.transcript?.trim()

  const scrollToTurn = useCallback((index: number, smooth = true) => {
    const el = turnRefs.current[index]
    const list = listRef.current
    if (!el || !list) return
    list.scrollTo({ top: el.offsetTop - list.clientHeight / 3, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  // Initial position: the turn at ?t (works with or without a recording)
  useEffect(() => {
    if (!turns.length) return
    const index = Math.max(0, turnIndexAt(turns, startAt))
    setActiveIndex(index)
    // wait for the list to render before scrolling
    requestAnimationFrame(() => scrollToTurn(index, false))
  }, [turns, startAt, scrollToTurn])

  // Follow playback
  useEffect(() => {
    const video = videoRef.current
    if (!video || !turns.length) return
    const sync = () => {
      const index = turnIndexAt(turns, video.currentTime)
      setActiveIndex(prev => {
        if (index !== prev && follow && performance.now() > manualScrollUntil.current) scrollToTurn(index)
        return index
      })
    }
    video.addEventListener('timeupdate', sync)
    video.addEventListener('seeked', sync)
    return () => {
      video.removeEventListener('timeupdate', sync)
      video.removeEventListener('seeked', sync)
    }
  }, [turns, follow, scrollToTurn, hasVideo])

  const handleLoadedMetadata = () => {
    if (videoRef.current && startAt) videoRef.current.currentTime = startAt
  }

  const handleTurnClick = (index: number) => {
    setActiveIndex(index)
    manualScrollUntil.current = 0
    if (videoRef.current) {
      videoRef.current.currentTime = turns[index].start
      void videoRef.current.play().catch(() => undefined)
    }
  }

  const holdAutoScroll = () => {
    manualScrollUntil.current = performance.now() + MANUAL_SCROLL_PAUSE_MS
  }

  if (isLoading) {
    return <div className="flex justify-center py-16 text-gray-500">{t('loading')}</div>
  }
  if (error || !meeting) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-700 font-medium">{t('unavailable')}</p>
        <p className="text-sm text-gray-500 mt-1">{error?.message || t('loadError')}</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <Link
        to={`/projects/${meeting.project_id}#history`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        {t('backToProject')}
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-gray-900">{meeting.title || t('untitled')}</h1>
      <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-gray-500">
        {meeting.occurred_at && (
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-4 h-4" aria-hidden="true" />
            {formatDate(meeting.occurred_at)}
          </span>
        )}
        {meeting.duration_minutes ? (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="w-4 h-4" aria-hidden="true" />
            {t('durationMinutes', { count: meeting.duration_minutes })}
          </span>
        ) : null}
        {meeting.recording?.type === 'external' && (
          <a
            href={meeting.recording.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
            {t('openRecording')}
          </a>
        )}
        {meeting.visibility && (
          <MeetingVisibilityControl
            sourceId={meeting.id}
            visibility={meeting.visibility}
            canChange={!!meeting.can_change_visibility}
          />
        )}
      </div>
      {(meeting.source_type === 'meeting' || meeting.source_type === 'manual_input') && (
        <ExtractionVersions sourceId={meeting.id} />
      )}

      <div className={cn('mt-6 grid gap-6', hasVideo && 'lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]')}>
        {/* Recording */}
        {hasVideo && meeting.recording && (
          <div className="lg:sticky lg:top-6 self-start">
            <video
              ref={videoRef}
              src={recordingSrc(meeting.recording)}
              controls
              preload="metadata"
              onLoadedMetadata={handleLoadedMetadata}
              className="w-full rounded-lg bg-black"
              data-testid="meeting-video"
            />
            <label className="mt-3 flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={follow} onChange={e => setFollow(e.target.checked)} />
              {t('followRecording')}
            </label>
          </div>
        )}

        {/* Transcript */}
        <section className="rounded-lg border border-gray-200 bg-white flex flex-col min-h-0">
          <h2 className="px-4 py-3 border-b border-gray-200 text-sm font-semibold text-gray-700">
            {t('transcript.heading')}
            {!plainText && <span className="font-normal text-gray-400"> · {t('transcript.turns', { count: turns.length })}</span>}
          </h2>
          {plainText ? (
            <div className="overflow-y-auto max-h-[70vh] p-4" data-testid="transcript-plain">
              <p className="mb-3 text-xs text-gray-500">{t('transcript.plainNote')}</p>
              <p className="whitespace-pre-wrap text-sm text-gray-800">{meeting?.transcript?.trim()}</p>
            </div>
          ) : turns.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-500">{t('transcript.empty')}</p>
          ) : (
            <div
              ref={listRef}
              onWheel={holdAutoScroll}
              onTouchMove={holdAutoScroll}
              className="relative overflow-y-auto max-h-[70vh] p-2"
              data-testid="transcript-list"
            >
              <ol>
                {turns.map((turn, i) => (
                  <li
                    key={i}
                    ref={el => { turnRefs.current[i] = el }}
                    onClick={() => handleTurnClick(i)}
                    aria-current={i === activeIndex ? 'true' : undefined}
                    className={cn(
                      'px-3 py-2 rounded-md border-l-4 cursor-pointer text-sm',
                      i === activeIndex ? 'bg-amber-50 border-amber-400' : 'border-transparent hover:bg-gray-50',
                    )}
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono tabular-nums text-xs text-gray-400">{formatSeconds(turn.start)}</span>
                      <span className={cn('font-semibold', turn.uncertain ? 'text-amber-700' : 'text-gray-800')}>
                        {turn.uncertain && <AlertTriangle className="inline w-3.5 h-3.5 mr-1 -mt-0.5" aria-label={t('transcript.uncertainSpeaker')} />}
                        {turn.speaker}
                      </span>
                      {turn.reason && <span className="text-xs text-amber-600">{turn.reason}</span>}
                    </div>
                    <p className="mt-0.5 text-gray-700">{turn.text}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
