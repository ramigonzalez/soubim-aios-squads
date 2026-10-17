import type { ReactNode } from 'react'
import { cn } from '../cn'

export interface TimelineMilestone {
  id: string
  icon: ReactNode
  title: ReactNode
  disciplines?: ReactNode
  /** "Decisão · Carlos · Revisão do projeto estrutural" */
  meta?: ReactNode
  /** dd/MM, mono */
  date: ReactNode
  /** For placing the "hoje" marker among the rows */
  at: Date | null
  /** Client variant: the "por quê" line, in Newsreader */
  why?: ReactNode
}

export interface TimelineStage {
  id: string
  name: ReactNode
  /** "15/01 – 15/02/2026" */
  dates?: ReactNode
  /** "Concluída" · "Em andamento · faltam 28 dias" · "Prevista" */
  status?: ReactNode
  state: 'done' | 'current' | 'future' | 'none'
  milestones: TimelineMilestone[]
  /** "Sem marcos ainda" when there are no milestones */
  emptyLabel?: ReactNode
}

export interface StageTimelineProps {
  stages: TimelineStage[]
  /** Pill text for the current stage ("HOJE · 03/03"); null hides the marker */
  todayLabel?: ReactNode
  today?: Date
  selectedId?: string | null
  onOpen?: (id: string) => void
  variant?: 'app' | 'client'
  className?: string
}

const STATUS_TONE = {
  done: 'text-success',
  current: 'text-accent',
  future: 'text-ink-3',
  none: 'text-ink-3',
} as const

/**
 * Presentation-ready milestone timeline (COMPONENTS.md → StageTimeline):
 * stage info on the left, a dot + rail in the middle, milestone rows on the
 * right. Below 768 px it becomes one column. Prints with exact colours.
 */
export function StageTimeline({ stages, todayLabel, today = new Date(), selectedId, onOpen, variant = 'app', className }: StageTimelineProps) {
  return (
    <ol className={cn('flex flex-col', className)}>
      {stages.map((stage, index) => {
        const last = index === stages.length - 1
        const railTone = stage.state === 'done' && stages[index + 1]?.state !== 'future' ? 'bg-ink' : 'bg-line'
        const todayIndex =
          stage.state === 'current' && todayLabel != null
            ? stage.milestones.filter((m) => m.at && m.at.getTime() <= today.getTime()).length
            : -1
        return (
          <li
            key={stage.id}
            className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-3 break-inside-avoid md:grid-cols-[minmax(120px,180px)_24px_minmax(0,1fr)] md:gap-x-4"
            aria-current={stage.state === 'current' ? 'step' : undefined}
          >
            <div className="col-start-2 row-start-1 flex flex-col gap-0.5 pb-2 md:col-start-1 md:items-end md:pb-6 md:text-right">
              <span className={cn('text-h3', stage.state === 'future' || stage.state === 'none' ? 'text-ink-2' : 'text-ink')}>{stage.name}</span>
              {stage.dates && <span className="whitespace-nowrap font-mono text-mono-sm text-ink-2">{stage.dates}</span>}
              {stage.status && <span className={cn('text-caption font-semibold', STATUS_TONE[stage.state])}>{stage.status}</span>}
            </div>

            <div className="col-start-1 row-span-2 row-start-1 flex flex-col items-center md:col-start-2 md:row-span-1" aria-hidden>
              <span
                className={cn(
                  'mt-1 h-[13px] w-[13px] shrink-0 rounded-full border-2 border-ink print:[print-color-adjust:exact]',
                  stage.state === 'done' ? 'bg-ink' : 'bg-surface',
                )}
              />
              {!last && <span className={cn('w-0.5 flex-1 print:[print-color-adjust:exact]', railTone)} />}
            </div>

            <div className="col-start-2 flex min-w-0 flex-col gap-1 pb-6 md:col-start-3 md:row-start-1">
              {stage.milestones.length === 0 && stage.emptyLabel && <span className="pt-1 text-small text-ink-3">{stage.emptyLabel}</span>}
              {stage.milestones.map((milestone, i) => (
                <div key={milestone.id} className="flex flex-col">
                  {i === todayIndex && <TodayMarker label={todayLabel} />}
                  <MilestoneRow milestone={milestone} selected={milestone.id === selectedId} onOpen={onOpen} variant={variant} />
                </div>
              ))}
              {todayIndex === stage.milestones.length && <TodayMarker label={todayLabel} />}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function TodayMarker({ label }: { label: ReactNode }) {
  return (
    <div className="flex items-center gap-2 py-1.5" role="note">
      <span className="whitespace-nowrap rounded-sm bg-accent px-2 py-0.5 font-mono text-mono-sm uppercase text-on-dark print:[print-color-adjust:exact]">
        {label}
      </span>
      <span aria-hidden className="h-px flex-1 border-t border-dashed border-accent" />
    </div>
  )
}

function MilestoneRow({
  milestone,
  selected,
  onOpen,
  variant,
}: {
  milestone: TimelineMilestone
  selected: boolean
  onOpen?: (id: string) => void
  variant: 'app' | 'client'
}) {
  const content = (
    <>
      <span className="mt-0.5 flex">{milestone.icon}</span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-body font-semibold text-ink [text-wrap:pretty]">{milestone.title}</span>
        <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
          {milestone.disciplines}
          {milestone.meta && <span className="min-w-0 truncate text-caption text-ink-2">{milestone.meta}</span>}
        </span>
        {variant === 'client' && milestone.why && <p className="mt-1 font-serif text-[15.5px] leading-normal text-ink-soft">{milestone.why}</p>}
      </span>
      <span className="whitespace-nowrap font-mono text-mono-sm text-ink-2">{milestone.date}</span>
    </>
  )
  const base = 'grid grid-cols-[20px_minmax(0,1fr)_auto] items-start gap-3 rounded-md px-2 py-2 text-left'
  if (!onOpen) return <div className={base}>{content}</div>
  return (
    <button
      type="button"
      data-item-id={milestone.id}
      onClick={() => onOpen(milestone.id)}
      className={cn(base, selected ? 'bg-accent-weak shadow-rail' : 'hover:bg-surface-2')}
    >
      {content}
    </button>
  )
}
