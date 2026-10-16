import { forwardRef, type ReactNode } from 'react'
import { cn } from '../cn'
import { Icons } from '../icons'
import { Avatar } from '../primitives/Avatar'

/** Reuniões list row: Video tile, title, meta line, item count (README §5.6). */
export function MeetingRow({ tile, title, meta, count, onClick }: { tile: ReactNode; title: ReactNode; meta: ReactNode; count: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="grid min-h-row-2 w-full grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 border-b border-line-soft bg-surface px-4 py-2.5 text-left last:border-b-0 hover:bg-surface-2"
    >
      {tile}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-body font-semibold text-ink">{title}</span>
        <span className="truncate text-caption text-ink-2">{meta}</span>
      </span>
      <span className="whitespace-nowrap font-mono text-mono-sm text-ink-2">{count}</span>
    </button>
  )
}

/** Participant pill: avatar 22 + name + discipline code, 1 px line, fully rounded. */
export function ParticipantPill({ name, discipline }: { name: string; discipline?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface py-0.5 pl-0.5 pr-2.5 text-caption text-ink">
      <Avatar name={name} size={22} />
      <span className="truncate">{name}</span>
      {discipline}
    </span>
  )
}

export interface TranscriptTurnProps {
  /** mono "00:05:32" */
  time: string
  speaker: ReactNode
  text: ReactNode
  focused?: boolean
  /** Speaker attribution is uncertain: ⚠ + warning-ink, never colour alone */
  uncertain?: boolean
  /** Shown after the name when uncertain ("vozes sobrepostas") */
  reason?: ReactNode
  /** "Quem falou?" prompt with one button per candidate */
  prompt?: ReactNode
  /** Anchored item chips */
  chips?: ReactNode
  onSeek?: () => void
  seekLabel?: string
}

/** A transcript turn (COMPONENTS.md → TranscriptTurn): grid 64 · 1fr, focused = accent-weak + rail. */
export const TranscriptTurn = forwardRef<HTMLLIElement, TranscriptTurnProps>(function TranscriptTurn(
  { time, speaker, text, focused, uncertain, reason, prompt, chips, onSeek, seekLabel },
  ref,
) {
  const Warn = Icons.warning
  return (
    <li
      ref={ref}
      aria-current={focused || undefined}
      className={cn('grid grid-cols-[64px_minmax(0,1fr)] gap-2 rounded-md px-3 py-2.5', focused ? 'bg-accent-weak shadow-rail' : '')}
    >
      {onSeek ? (
        <button type="button" onClick={onSeek} aria-label={seekLabel} className="self-start text-left font-mono text-mono-sm text-ink-3 hover:text-accent">
          {time}
        </button>
      ) : (
        <span className="font-mono text-mono-sm text-ink-3">{time}</span>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <p className={cn('flex flex-wrap items-center gap-1.5 text-small font-semibold', uncertain ? 'text-warning-ink' : 'text-ink')}>
          {uncertain && <Warn className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />}
          {speaker}
          {uncertain && reason && <span className="font-normal">· {reason}</span>}
        </p>
        <p className="text-body leading-[1.55] text-ink">{text}</p>
        {prompt}
        {chips && <div className="flex flex-wrap gap-1.5">{chips}</div>}
      </div>
    </li>
  )
})

/** Anchored item chip inside a turn: accent-strong on accent-weak. */
export function TurnItemChip({ icon, label, onClick }: { icon: ReactNode; label: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex max-w-full items-center gap-1.5 rounded-sm bg-accent-weak px-2 py-0.5 text-caption font-semibold text-accent-strong hover:bg-accent-on-dark"
    >
      <span className="flex shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  )
}

export interface PlayerTick {
  id: string
  at: number
  label: string
}

/**
 * Player bar (COMPONENTS.md → MeetingViewer): time / duration in mono, a
 * scrubber with one tick per extracted item (the focused one in accent;
 * clicking a tick seeks), and a speed button.
 */
export function PlayerBar({
  current,
  duration,
  ticks,
  focusedId,
  onSeek,
  onTick,
  rate,
  onRate,
  rateLabel,
  timeLabel,
  formatTime,
}: {
  current: number
  duration: number
  ticks: PlayerTick[]
  focusedId?: string | null
  onSeek?: (seconds: number) => void
  onTick: (tick: PlayerTick) => void
  rate?: number
  onRate?: () => void
  rateLabel?: string
  timeLabel: string
  formatTime: (seconds: number) => string
}) {
  const pct = (s: number) => (duration > 0 ? Math.min(100, Math.max(0, (s / duration) * 100)) : 0)
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
      <span className="whitespace-nowrap font-mono text-mono text-ink-2" aria-label={timeLabel}>
        {formatTime(current)} / {formatTime(duration)}
      </span>
      <div className="relative h-6 flex-1">
        <button
          type="button"
          aria-label={timeLabel}
          disabled={!onSeek}
          onClick={(event) => {
            if (!onSeek || duration <= 0) return
            const box = event.currentTarget.getBoundingClientRect()
            onSeek(((event.clientX - box.left) / box.width) * duration)
          }}
          className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-surface-3 disabled:cursor-default"
        >
          <span aria-hidden className="absolute inset-y-0 left-0 rounded-full bg-ink" style={{ width: `${pct(current)}%` }} />
        </button>
        {ticks.map((tick) => (
          <button
            key={tick.id}
            type="button"
            title={tick.label}
            aria-label={tick.label}
            onClick={() => onTick(tick)}
            className={cn(
              'absolute top-0 h-6 w-1 -translate-x-1/2 rounded-full',
              tick.id === focusedId ? 'bg-accent' : 'bg-ink-3 hover:bg-ink-2',
            )}
            style={{ left: `${pct(tick.at)}%` }}
          />
        ))}
      </div>
      {onRate && (
        <button type="button" onClick={onRate} aria-label={rateLabel} className="rounded-md border border-line-strong px-2 py-0.5 font-mono text-mono-sm text-ink hover:bg-surface-2">
          {rate}×
        </button>
      )}
    </div>
  )
}
