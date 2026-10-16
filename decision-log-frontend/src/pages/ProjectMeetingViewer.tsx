/**
 * Meeting viewer (README §5.6, COMPONENTS.md → MeetingViewer parts): header with
 * participants, AI summary, player bar with one tick per extracted item, and two
 * columns: the transcript (own scroll) and the extracted items. Clicking an item
 * or a tick sets ?t=, seeks the recording, scrolls the transcript to the turn and
 * highlights it. Uncertain speakers can be corrected (G4).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Badge,
  Button,
  Checkbox,
  DisciplineList,
  DisciplineMarker,
  EmptyState,
  ErrorState,
  Icons,
  ItemTypeIcon,
  ITEM_TYPE_ORDER,
  ParticipantPill,
  PlayerBar,
  SkeletonRows,
  TranscriptTurn,
  TurnItemChip,
  useToast,
  type PlayerTick,
} from '../design-system'
import ExtractionVersions from '../components/organisms/ExtractionVersions'
import { MeetingVisibility } from '../components/organisms/MeetingVisibility'
import { ProjectItemPanel } from '../components/organisms/ProjectItemPanel'
import { PageContainer } from '../components/templates/PageContainer'
import { useAllProjectItems } from '../hooks/useAllProjectItems'
import { useItemPanel } from '../hooks/useItemPanel'
import { recordingSrc, useCorrectSpeaker, useMeeting } from '../hooks/useMeeting'
import { useParticipants } from '../hooks/useParticipants'
import { useProject } from '../hooks/useProject'
import { formatClock, formatDuration, formatFullDate, formatGroupHeader, parseClock } from '../lib/format'
import { itemTitle } from '../lib/items'
import { parseTranscript, turnIndexAt } from '../lib/transcript'
import type { ProjectItem } from '../types/projectItem'

const SCROLL_OFFSET = 60
const RATES = [1, 1.25, 1.5, 2]
// After the user scrolls the transcript by hand, following the recording waits this long.
const MANUAL_SCROLL_PAUSE_MS = 4000

export default function ProjectMeetingViewer() {
  const { t } = useTranslation(['project', 'labels'])
  const toast = useToast()
  const { id: projectId = '', sourceId = '' } = useParams<{ id: string; sourceId: string }>()
  const [params, setParams] = useSearchParams()
  const { data: project } = useProject(projectId)
  const { data: participants } = useParticipants(projectId)
  const meetingQuery = useMeeting(sourceId)
  const meeting = meetingQuery.data
  const itemsQuery = useAllProjectItems(projectId)
  const correct = useCorrectSpeaker(sourceId)

  const turns = useMemo(() => parseTranscript(meeting?.transcript), [meeting?.transcript])
  const plainText = turns.length === 0 && !!meeting?.transcript?.trim()
  const items = useMemo(
    () =>
      (itemsQuery.data?.items ?? [])
        .filter((i) => i.source?.id === sourceId)
        .sort((a, b) => (parseClock(a.timestamp) ?? 0) - (parseClock(b.timestamp) ?? 0)),
    [itemsQuery.data, sourceId],
  )
  const itemsByTurn = useMemo(() => {
    const map = new Map<number, ProjectItem[]>()
    for (const item of items) {
      const seconds = parseClock(item.timestamp)
      if (seconds == null) continue
      const index = turnIndexAt(turns, seconds)
      if (index < 0) continue
      map.set(index, [...(map.get(index) ?? []), item])
    }
    return map
  }, [items, turns])
  const panel = useItemPanel(items.map((i) => i.id))

  const videoRef = useRef<HTMLVideoElement>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const turnRefs = useRef<(HTMLLIElement | null)[]>([])
  const manualUntil = useRef(0)
  const startAt = parseClock(params.get('t')) ?? 0
  const [focused, setFocused] = useState(-1)
  const [focusedItem, setFocusedItem] = useState<string | null>(null)
  const [current, setCurrent] = useState(startAt)
  const [videoDuration, setVideoDuration] = useState(0)
  const [rate, setRate] = useState(1)
  const [follow, setFollow] = useState(true)
  const hasVideo = meeting?.recording?.type === 'file'
  const duration = videoDuration || (meeting?.duration_minutes ?? 0) * 60 || (turns.length ? turns[turns.length - 1].start + 30 : 0)

  const scrollToTurn = useCallback((index: number, smooth = true) => {
    const el = turnRefs.current[index]
    const list = listRef.current
    if (!el || !list) return
    list.scrollTo({ top: el.offsetTop - SCROLL_OFFSET, behavior: smooth ? 'smooth' : 'auto' })
  }, [])

  // Arriving with ?t= focuses that moment
  useEffect(() => {
    if (!turns.length) return
    const index = Math.max(0, turnIndexAt(turns, startAt))
    setFocused(index)
    requestAnimationFrame(() => scrollToTurn(index, false))
    // only on arrival / new transcript, not on every ?t change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turns, scrollToTurn])

  // Follow playback
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const sync = () => {
      setCurrent(video.currentTime)
      if (!turns.length) return
      const index = turnIndexAt(turns, video.currentTime)
      setFocused((prev) => {
        if (index !== prev && follow && performance.now() > manualUntil.current) scrollToTurn(index)
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

  const seek = (seconds: number, play = false) => {
    const target = Math.max(0, seconds)
    setCurrent(target)
    const next = new URLSearchParams(params)
    next.set('t', String(Math.floor(target)))
    setParams(next, { replace: true })
    if (turns.length) {
      const index = Math.max(0, turnIndexAt(turns, target))
      setFocused(index)
      manualUntil.current = 0
      scrollToTurn(index)
    }
    if (videoRef.current) {
      videoRef.current.currentTime = target
      if (play) void videoRef.current.play().catch(() => undefined)
    }
  }

  const jumpToItem = (item: ProjectItem) => {
    setFocusedItem(item.id)
    const seconds = parseClock(item.timestamp)
    if (seconds != null) seek(seconds)
  }

  const disciplineOf = (name: string) => participants?.find((p) => p.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))?.discipline

  if (meetingQuery.isLoading) {
    return (
      <PageContainer>
        <SkeletonRows rows={8} />
      </PageContainer>
    )
  }
  if (meetingQuery.isError || !meeting) {
    return (
      <PageContainer>
        <ErrorState title={t('viewer.error')} text={t('viewer.errorText')} onRetry={() => void meetingQuery.refetch()} />
      </PageContainer>
    )
  }

  const header = meeting.occurred_at ? formatGroupHeader(meeting.occurred_at) : null
  const counts = ITEM_TYPE_ORDER.map((type) => ({ type, count: items.filter((i) => i.item_type === type).length })).filter((c) => c.count > 0)
  const ticks: PlayerTick[] = items.flatMap((i) => {
    const at = parseClock(i.timestamp)
    return at == null ? [] : [{ id: i.id, at, label: `${formatClock(at)} · ${itemTitle(i)}` }]
  })
  const candidates = meeting.speaker_candidates ?? []
  const External = Icons.link

  return (
    <PageContainer>
      <header className="flex flex-col gap-3">
        <Link to={`/projects/${projectId}/meetings`} className="self-start text-small font-medium text-accent hover:text-accent-strong">
          {t('viewer.back')}
        </Link>
        <p className="font-mono text-mono-sm uppercase text-ink-2">
          {[t('viewer.eyebrow'), meeting.label].filter(Boolean).join(' · ')}
        </p>
        <h1 className="text-h1 text-ink [text-wrap:balance]">{meeting.title || t('viewer.untitled')}</h1>
        <p className="text-small text-ink-2">
          {[
            meeting.occurred_at ? formatFullDate(meeting.occurred_at) : null,
            header?.weekday,
            meeting.duration_minutes ? formatDuration(meeting.duration_minutes) : null,
            turns.length ? t('viewer.turns', { count: turns.length }) : null,
            meeting.meeting_type,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {(meeting.participants ?? []).map((name) => {
            const discipline = disciplineOf(name)
            return <ParticipantPill key={name} name={name} discipline={discipline ? <DisciplineMarker discipline={discipline} /> : undefined} />
          })}
          {meeting.created_by_name && (
            <span className="inline-flex items-center gap-1.5 text-caption text-ink-2">
              {t('viewer.addedBy', { name: meeting.created_by_name })}
              {meeting.created_by_external && <Badge>{t('common:external.badge')}</Badge>}
            </span>
          )}
          {meeting.visibility && (
            <span className="ml-auto inline-flex items-center gap-2">
              <MeetingVisibility sourceId={meeting.id} visibility={meeting.visibility} canChange={!!meeting.can_change_visibility} />
            </span>
          )}
        </div>
      </header>

      {meeting.summary && (
        <section className="flex flex-col gap-2 rounded-lg border border-line bg-surface px-5 py-4">
          <h2 className="text-label uppercase text-ink-2">{t('viewer.summary')}</h2>
          <p className="font-serif text-reading text-ink [text-wrap:pretty]">{meeting.summary}</p>
          <p className="text-caption text-ink-2">
            {[t('viewer.extracted', { count: items.length }), ...counts.map((c) => t(`viewer.byType.${c.type}`, { count: c.count }))].join(' · ')}
          </p>
        </section>
      )}

      <div className="flex flex-col gap-3">
        {hasVideo && meeting.recording && (
          <video
            ref={videoRef}
            src={recordingSrc(meeting.recording)}
            controls
            preload="metadata"
            poster={meeting.thumbnail_url || undefined}
            onLoadedMetadata={(e) => {
              setVideoDuration(e.currentTarget.duration || 0)
              if (startAt) e.currentTarget.currentTime = startAt
            }}
            className="max-h-96 w-full rounded-lg bg-ink"
            data-testid="meeting-video"
          />
        )}
        {duration > 0 && (
          <PlayerBar
            current={current}
            duration={duration}
            ticks={ticks}
            focusedId={focusedItem}
            onSeek={(s) => seek(s, hasVideo)}
            onTick={(tick) => {
              const item = items.find((i) => i.id === tick.id)
              if (item) jumpToItem(item)
            }}
            rate={hasVideo ? rate : undefined}
            onRate={
              hasVideo
                ? () => {
                    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length]
                    setRate(next)
                    if (videoRef.current) videoRef.current.playbackRate = next
                  }
                : undefined
            }
            rateLabel={t('viewer.speed')}
            timeLabel={t('viewer.position')}
            formatTime={formatClock}
          />
        )}
        <div className="flex flex-wrap items-center gap-4">
          {hasVideo && <Checkbox checked={follow} onCheckedChange={setFollow} label={t('viewer.follow')} />}
          {meeting.recording?.type === 'external' && (
            <a href={meeting.recording.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-small font-medium text-accent hover:text-accent-strong">
              <External className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              {t('viewer.openRecording')}
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <section className="flex min-w-0 flex-[1.4] flex-col overflow-hidden rounded-lg border border-line bg-surface">
          <h2 className="border-b border-line-soft px-4 py-3 text-h3 text-ink">
            {t('viewer.transcript')}
            {turns.length > 0 && <span className="font-normal text-ink-2"> · {t('viewer.turns', { count: turns.length })}</span>}
          </h2>
          {plainText ? (
            <div className="max-h-[70vh] overflow-y-auto p-4" data-testid="transcript-plain">
              <p className="mb-3 text-caption text-ink-2">{t('viewer.plainNote')}</p>
              <p className="whitespace-pre-wrap text-body text-ink">{meeting.transcript?.trim()}</p>
            </div>
          ) : turns.length === 0 ? (
            <EmptyState icon={<Icons.meetings />} title={t('viewer.transcriptEmpty')} />
          ) : (
            <ol
              ref={listRef}
              onWheel={() => (manualUntil.current = performance.now() + MANUAL_SCROLL_PAUSE_MS)}
              onTouchMove={() => (manualUntil.current = performance.now() + MANUAL_SCROLL_PAUSE_MS)}
              className="relative flex max-h-[70vh] flex-col overflow-y-auto p-2"
              data-testid="transcript-list"
            >
              {turns.map((turn, index) => (
                <TranscriptTurn
                  key={`${turn.start}-${index}`}
                  ref={(el) => {
                    turnRefs.current[index] = el
                  }}
                  time={formatClock(turn.start)}
                  speaker={turn.speaker}
                  text={turn.text}
                  focused={index === focused}
                  uncertain={turn.uncertain}
                  reason={turn.reason}
                  onSeek={() => seek(turn.start, true)}
                  seekLabel={t('viewer.seek', { time: formatClock(turn.start) })}
                  prompt={
                    turn.uncertain && meeting.can_correct_speakers && candidates.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-2 text-caption text-warning-ink">
                        <span>{t('viewer.whoSpoke')}</span>
                        {candidates.map((name) => (
                          <Button
                            key={name}
                            size="sm"
                            disabled={correct.isLoading}
                            onClick={() =>
                              correct.mutate(
                                { start: turn.start, speaker: name },
                                {
                                  onSuccess: () => toast.show({ message: t('viewer.speakerSaved', { name }), tone: 'success' }),
                                  onError: () => toast.show({ message: t('viewer.speakerError'), tone: 'error' }),
                                },
                              )
                            }
                          >
                            {name}
                          </Button>
                        ))}
                      </div>
                    ) : undefined
                  }
                  chips={
                    itemsByTurn.get(index)?.map((item) => (
                      <TurnItemChip
                        key={item.id}
                        icon={<ItemTypeIcon type={item.item_type} size={12} />}
                        label={`${t(`labels:itemType.${item.item_type}`)} · ${itemTitle(item)}`}
                        onClick={() => panel.open(item.id)}
                      />
                    ))
                  }
                />
              ))}
            </ol>
          )}
        </section>

        <aside className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-line bg-surface lg:sticky lg:top-6">
          <h2 className="border-b border-line-soft px-4 py-3 text-h3 text-ink">
            {t('viewer.items')} <span className="font-normal text-ink-2">· {t('viewer.itemsHint')}</span>
          </h2>
          {itemsQuery.isLoading && <SkeletonRows rows={4} />}
          {itemsQuery.data && items.length === 0 && <p className="px-4 py-6 text-small text-ink-2">{t('viewer.itemsEmpty')}</p>}
          <ul>
            {items.map((item) => {
              const seconds = parseClock(item.timestamp)
              return (
                <li key={item.id} className="flex items-center gap-2 border-b border-line-soft pr-3 last:border-b-0">
                  <button
                    type="button"
                    data-item-id={item.id}
                    onClick={() => jumpToItem(item)}
                    className={
                      'grid min-w-0 flex-1 grid-cols-[20px_minmax(0,1fr)_56px] items-center gap-3 px-4 py-2.5 text-left ' +
                      (focusedItem === item.id ? 'bg-accent-weak shadow-rail' : 'hover:bg-surface-2')
                    }
                  >
                    <ItemTypeIcon type={item.item_type} done={item.is_done} />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="truncate text-small font-medium text-ink">{itemTitle(item)}</span>
                      <DisciplineList disciplines={item.affected_disciplines} />
                    </span>
                    <span className="text-right font-mono text-mono-sm text-ink-2">{seconds != null ? formatClock(seconds) : ''}</span>
                  </button>
                  <Button size="sm" variant="link" onClick={() => panel.open(item.id)}>
                    {t('viewer.detail')}
                  </Button>
                </li>
              )
            })}
          </ul>
        </aside>
      </div>

      {(meeting.source_type === 'meeting' || meeting.source_type === 'manual_input') && (
        <section className="flex flex-col gap-2">
          <h2 className="text-h3 text-ink">{t('viewer.versions')}</h2>
          <ExtractionVersions sourceId={meeting.id} />
        </section>
      )}

      <ProjectItemPanel
        projectId={projectId}
        items={items}
        panel={panel}
        stages={project?.stages ?? []}
        canManage={!!project?.can_manage}
        canReview={!!project?.can_review}
        listReady={!!itemsQuery.data}
      />
    </PageContainer>
  )
}
