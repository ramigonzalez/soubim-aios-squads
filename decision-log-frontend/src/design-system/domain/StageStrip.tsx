import { useTranslation } from 'react-i18next'
import { formatDay, formatDaysLeft, formatRange } from '../../lib/format'
import { layoutStages, type StageInput, type StageSegment } from '../../lib/stages'
import { cn } from '../cn'

export interface StageStripProps {
  stages: StageInput[]
  today?: Date
  /** 6 px bars (app) · 8 px (public view) */
  barSize?: 'md' | 'lg'
  /** Hide the labels under the bars (previews) */
  compact?: boolean
  className?: string
}

/** Bar fill by status. The current stage fills ink up to its progress, then track. */
function barStyle(segment: StageSegment) {
  if (segment.status !== 'current') return undefined
  const p = Math.round(segment.progress * 100)
  return { background: `linear-gradient(90deg, var(--ink) 0 ${p}%, var(--track) ${p}%)` }
}

const BAR_TONE = { done: 'bg-ink', current: '', future: 'bg-line' } as const

/**
 * Proportional stage bars with a "hoje" marker and labels (COMPONENTS.md §3).
 * Column widths are the stage durations in days.
 */
export function StageStrip({ stages, today = new Date(), barSize = 'md', compact = false, className }: StageStripProps) {
  const { t } = useTranslation('ui')
  const { segments, todayPercent } = layoutStages(stages, today)
  if (segments.length === 0) return null
  const columns = segments.map((s) => `${s.days}fr`).join(' ')
  return (
    <div className={cn('flex w-full flex-col gap-2', className)}>
      <div className="relative">
        <div className="grid gap-1" style={{ gridTemplateColumns: columns }}>
          {segments.map((segment) => (
            <span
              key={segment.id}
              aria-hidden
              className={cn('block rounded-[1px] print:[print-color-adjust:exact]', barSize === 'md' ? 'h-1.5' : 'h-2', BAR_TONE[segment.status])}
              style={barStyle(segment)}
            />
          ))}
        </div>
        {todayPercent != null && (
          <span
            aria-hidden
            className="absolute -top-[5px] h-4 w-0.5 -translate-x-1/2 bg-accent print:[print-color-adjust:exact]"
            style={{ left: `${todayPercent}%` }}
          />
        )}
      </div>
      {!compact && (
        <ol className="grid gap-1" style={{ gridTemplateColumns: columns }}>
          {segments.map((segment) => (
            <li key={segment.id} className="flex min-w-0 flex-col gap-0.5" aria-current={segment.status === 'current' ? 'step' : undefined}>
              <span className={cn('truncate text-caption font-semibold', segment.status === 'current' ? 'text-ink' : 'text-ink-2')}>
                {segment.name}
                {segment.status === 'current' && <span className="text-accent"> · {t('stage.today', { date: formatDay(today) })}</span>}
              </span>
              <span className="truncate whitespace-nowrap font-mono text-mono-sm text-ink-3">
                {formatRange(segment.start, segment.end)}
                {segment.daysLeft != null && ` · ${formatDaysLeft(segment.daysLeft)}`}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/** 4 px mini bar for project rows and the switcher: one segment per stage, gap 2. */
export function MiniStageBar({ stages, today = new Date(), className }: { stages: StageInput[]; today?: Date; className?: string }) {
  const { segments } = layoutStages(stages, today)
  if (segments.length === 0) return null
  return (
    <div aria-hidden className={cn('grid gap-0.5', className)} style={{ gridTemplateColumns: segments.map((s) => `${s.days}fr`).join(' ') }}>
      {segments.map((segment) => (
        <span key={segment.id} className={cn('block h-1 rounded-[1px]', BAR_TONE[segment.status])} style={barStyle(segment)} />
      ))}
    </div>
  )
}
