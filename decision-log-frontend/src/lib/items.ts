/**
 * Read helpers over the platform's ProjectItem (REVAMP-MAPPING §1.1): title,
 * date, lateness, consensus rows, impact level and stage. UI code uses these
 * instead of reading the raw fields, so the API shape stays in one place.
 */
import { differenceInCalendarDays } from 'date-fns'
import type { ConsensusRow, ConsensusStatus } from '../design-system'
import type { ProjectItem } from '../types/projectItem'
import { toDate } from './format'
import { stageForDate, type StageInput } from './stages'

/** Short headline, else the statement (V1 items only have decision_statement). */
export function itemTitle(item: ProjectItem): string {
  return item.title || item.statement || item.decision_statement || ''
}

/** When the item happened: its own date (manual items), its source date, else when it was captured. */
export function itemDate(item: ProjectItem): string {
  return item.occurred_at || item.source?.occurred_at || item.meeting_date || item.created_at
}

/** "late" = open action past its due date (README §9.1). */
export function isLate(item: ProjectItem, today: Date = new Date()): boolean {
  if (item.item_type !== 'action_item' || item.is_done || !item.due_date) return false
  const due = toDate(item.due_date)
  return !!due && differenceInCalendarDays(due, today) < 0
}

export function isOpenAction(item: ProjectItem): boolean {
  return item.item_type === 'action_item' && !item.is_done
}

const CONSENSUS: Record<string, ConsensusStatus> = {
  AGREE: 'AGREE',
  MIXED: 'MIXED',
  DISAGREE: 'DISAGREE',
  DISSENT: 'DISAGREE',
  ABSTAIN: 'ABSTAIN',
}

/** Consensus map → rows. Accepts `{status, notes}` and legacy plain-string values. */
export function consensusRows(item: ProjectItem): ConsensusRow[] {
  const map = (item.consensus ?? {}) as Record<string, unknown>
  return Object.entries(map).flatMap(([discipline, value]) => {
    const raw = typeof value === 'string' ? value : (value as { status?: string } | null)?.status
    const status = raw ? CONSENSUS[raw.toUpperCase()] : undefined
    if (!status) return []
    const notes = typeof value === 'object' && value ? (value as { notes?: string | null }).notes ?? null : null
    return [{ discipline, status, notes }]
  })
}

/** Impact level shown by ImpactIndicator: the AI's risk level. */
export function impactLevel(item: ProjectItem): 'low' | 'medium' | 'high' | null {
  return item.impacts?.risk_level ?? null
}

/** Impact rows by kind (the platform stores cost / timeline / scope, not per discipline). */
export function impactRows(item: ProjectItem): { kind: 'cost' | 'timeline' | 'scope' | 'areas'; text: string }[] {
  const impacts = item.impacts
  if (!impacts) return []
  const rows: { kind: 'cost' | 'timeline' | 'scope' | 'areas'; text: string }[] = []
  if (impacts.cost_impact) rows.push({ kind: 'cost', text: impacts.cost_impact })
  if (impacts.timeline_impact) rows.push({ kind: 'timeline', text: impacts.timeline_impact })
  if (impacts.scope_impact) rows.push({ kind: 'scope', text: impacts.scope_impact })
  if (impacts.affected_areas?.length) rows.push({ kind: 'areas', text: impacts.affected_areas.join(', ') })
  return rows
}

/** Items have no stage of their own: the stage whose dates contain the item date. */
export function itemStage<T extends StageInput>(item: ProjectItem, stages: T[]): T | null {
  return stageForDate(stages, itemDate(item))
}

/** Newest first (ties: newest capture first). */
export function byDateDesc(a: ProjectItem, b: ProjectItem): number {
  return itemDate(b).localeCompare(itemDate(a)) || b.created_at.localeCompare(a.created_at)
}

export interface ExcerptLine {
  time?: string
  speaker?: string
  text: string
}

/** Split a source excerpt ("M:SS - Speaker: text", one turn per line); other lines stay plain text. */
export function parseExcerpt(excerpt: string | null | undefined): ExcerptLine[] {
  return (excerpt ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*-\s*([^:]+?):\s*(.*)$/)
      return m ? { time: m[1], speaker: m[2], text: m[3] } : { text: l }
    })
}
