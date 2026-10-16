/**
 * Display formats for Promem (UX-UI-GUIDELINES §8), built on date-fns.
 * Dates and times render in mono in the UI; this file only produces strings.
 *
 * API dates arrive as "YYYY-MM-DD" or ISO datetimes. Date-only strings are read
 * as local dates so "2026-02-06" never shifts to the 5th in Brazil (UTC−3).
 */
import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns'
import { enUS, ptBR } from 'date-fns/locale'
import i18n from '../i18n'

export type DateInput = string | Date | null | undefined

const locale = () => (i18n.language === 'en' ? enUS : ptBR)

/** Parse an API date; date-only strings become local midnight. Invalid → null. */
export function toDate(value: DateInput): Date | null {
  if (!value) return null
  if (value instanceof Date) return isValid(value) ? value : null
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? parseISO(`${value}T00:00:00`) : parseISO(value)
  return isValid(date) ? date : null
}

/** "06/02": rows and compact metadata. */
export function formatDay(value: DateInput): string {
  const d = toDate(value)
  return d ? format(d, 'dd/MM', { locale: locale() }) : ''
}

/** "06/02/2026": detail panels. */
export function formatFullDate(value: DateInput): string {
  const d = toDate(value)
  return d ? format(d, 'dd/MM/yyyy', { locale: locale() }) : ''
}

/** "31/08/26": range ends in compact controls. */
export function formatDayShortYear(value: DateInput): string {
  const d = toDate(value)
  return d ? format(d, 'dd/MM/yy', { locale: locale() }) : ''
}

/** "02/03 às 14:00" (24 h). */
export function formatDayTime(value: DateInput): string {
  const d = toDate(value)
  if (!d) return ''
  return i18n.t('ui:date.at', { date: format(d, 'dd/MM'), time: format(d, 'HH:mm') })
}

/** Group header parts: { title: "6 de fevereiro", weekday: "sexta-feira" }. */
export function formatGroupHeader(value: DateInput): { title: string; weekday: string } {
  const d = toDate(value)
  if (!d) return { title: '', weekday: '' }
  const title = i18n.language === 'en' ? format(d, 'MMMM d', { locale: enUS }) : format(d, "d 'de' MMMM", { locale: ptBR })
  return { title, weekday: format(d, 'EEEE', { locale: locale() }) }
}

/** "15/01 – 15/02" (en dash with spaces). Full years with `withYear`. */
export function formatRange(start: DateInput, end: DateInput, withYear = false): string {
  const fmt = withYear ? formatFullDate : formatDay
  return `${fmt(start)} – ${fmt(end)}`
}

/** "hoje", "ontem", "há 2 dias"; older dates fall back to dd/MM. */
export function formatRelativeDay(value: DateInput, today: Date = new Date()): string {
  const d = toDate(value)
  if (!d) return ''
  const days = differenceInCalendarDays(today, d)
  if (days === 0) return i18n.t('ui:date.today')
  if (days === 1) return i18n.t('ui:date.yesterday')
  if (days > 1 && days < 7) return i18n.t('ui:date.daysAgo', { count: days })
  return formatDay(d)
}

/** "faltam 28 dias" / "falta 1 dia". */
export function formatDaysLeft(days: number): string {
  return i18n.t('ui:stage.daysLeft', { count: Math.max(0, days) })
}

/** "45 min" · "1 h 05 min". */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || minutes < 0) return ''
  const m = Math.round(minutes)
  if (m < 60) return i18n.t('ui:duration.minutes', { count: m })
  return i18n.t('ui:duration.hours', { hours: Math.floor(m / 60), minutes: String(m % 60).padStart(2, '0') })
}

/** Seconds → "00:08:30" (always HH:MM:SS, as in the player and panels). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const hh = String(Math.floor(s / 3600)).padStart(2, '0')
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

/** "12:34", "1:02:03", "00:08:30" or a plain number of seconds → seconds. Invalid → null. */
export function parseClock(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? Math.floor(value) : null
  const trimmed = value.trim()
  if (/^\d+$/.test(trimmed)) return Number(trimmed)
  const parts = trimmed.split(':').map(Number)
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => Number.isNaN(p) || p < 0)) return null
  return parts.reduce((acc, p) => acc * 60 + p, 0)
}

/** "4,2 MB" (decimal comma in pt-BR). */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = unit === 0 ? 0 : 1
  const number = new Intl.NumberFormat(i18n.language === 'en' ? 'en-US' : 'pt-BR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(value)
  return `${number} ${units[unit]}`
}
