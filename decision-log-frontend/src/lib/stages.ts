/**
 * Stage maths shared by StageStrip, MiniStageBar, StageTimeline and the
 * project switcher (README §9.2 "derived data").
 */
import { differenceInCalendarDays } from 'date-fns'
import { toDate, type DateInput } from './format'

export interface StageInput {
  id: string
  name: string
  start: DateInput
  end: DateInput
}

export type StageStatus = 'done' | 'current' | 'future'

export interface StageSegment {
  id: string
  name: string
  start: Date
  end: Date
  /** Calendar days from start to end (at least 1); drives the proportional width */
  days: number
  status: StageStatus
  /** Elapsed share of the stage, 0–1 (1 for done, 0 for future) */
  progress: number
  /** Days until the end, only for the current stage */
  daysLeft: number | null
}

export interface StageLayout {
  segments: StageSegment[]
  /** Index of the current stage, or -1 when today is outside every stage */
  currentIndex: number
  /** Today's position across the whole strip, 0–100, or null when outside the schedule */
  todayPercent: number | null
}

/** Stages with valid dates, sorted by start date, with status and progress for `today`. */
export function layoutStages(stages: StageInput[], today: Date = new Date()): StageLayout {
  const valid = stages
    .map((s) => ({ ...s, startDate: toDate(s.start), endDate: toDate(s.end) }))
    .filter((s): s is typeof s & { startDate: Date; endDate: Date } => !!s.startDate && !!s.endDate)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())

  let currentIndex = -1
  const segments: StageSegment[] = valid.map((s, index) => {
    const days = Math.max(1, differenceInCalendarDays(s.endDate, s.startDate))
    const elapsed = differenceInCalendarDays(today, s.startDate)
    const afterEnd = differenceInCalendarDays(today, s.endDate) > 0
    let status: StageStatus = 'future'
    if (afterEnd) status = 'done'
    else if (elapsed >= 0) status = 'current'
    if (status === 'current' && currentIndex === -1) currentIndex = index
    else if (status === 'current') status = 'future' // overlapping stages: the first one wins
    const progress = status === 'done' ? 1 : status === 'current' ? Math.min(1, elapsed / days) : 0
    return {
      id: s.id,
      name: s.name,
      start: s.startDate,
      end: s.endDate,
      days,
      status,
      progress,
      daysLeft: status === 'current' ? Math.max(0, differenceInCalendarDays(s.endDate, today)) : null,
    }
  })

  const total = segments.reduce((sum, s) => sum + s.days, 0)
  let todayPercent: number | null = null
  if (currentIndex >= 0 && total > 0) {
    const before = segments.slice(0, currentIndex).reduce((sum, s) => sum + s.days, 0)
    const current = segments[currentIndex]
    todayPercent = ((before + current.progress * current.days) / total) * 100
  }

  return { segments, currentIndex, todayPercent }
}

/** The stage whose date range contains `date` (items have no stage of their own). */
export function stageForDate<T extends StageInput>(stages: T[], date: DateInput): T | null {
  const d = toDate(date)
  if (!d) return null
  return (
    stages.find((s) => {
      const start = toDate(s.start)
      const end = toDate(s.end)
      return !!start && !!end && differenceInCalendarDays(d, start) >= 0 && differenceInCalendarDays(end, d) >= 0
    }) ?? null
  )
}
