import { describe, expect, it } from 'vitest'
import {
  formatClock,
  formatDay,
  formatDayShortYear,
  formatDayTime,
  formatDaysLeft,
  formatDuration,
  formatFileSize,
  formatFullDate,
  formatGroupHeader,
  formatRange,
  formatRelativeDay,
  parseClock,
  toDate,
} from '../../lib/format'
import { usePortuguese } from './render'

describe('lib/format (pt-BR)', () => {
  usePortuguese()

  it('reads date-only strings as local dates (no UTC shift)', () => {
    const d = toDate('2026-02-06')!
    expect(d.getDate()).toBe(6)
    expect(d.getMonth()).toBe(1)
  })

  it('returns null or empty strings for invalid input', () => {
    expect(toDate('nope')).toBeNull()
    expect(toDate(null)).toBeNull()
    expect(formatDay(undefined)).toBe('')
  })

  it('formats rows, details and short years', () => {
    expect(formatDay('2026-02-06')).toBe('06/02')
    expect(formatFullDate('2026-02-06')).toBe('06/02/2026')
    expect(formatDayShortYear('2026-08-31')).toBe('31/08/26')
  })

  it('formats date and time as "02/03 às 14:00"', () => {
    expect(formatDayTime(new Date(2026, 2, 2, 14, 0))).toBe('02/03 às 14:00')
  })

  it('builds group headers with the weekday', () => {
    expect(formatGroupHeader('2026-02-06')).toEqual({ title: '6 de fevereiro', weekday: 'sexta-feira' })
  })

  it('uses an en dash with spaces for ranges', () => {
    expect(formatRange('2026-01-15', '2026-02-15')).toBe('15/01 – 15/02')
    expect(formatRange('2026-01-15', '2026-02-15', true)).toBe('15/01/2026 – 15/02/2026')
  })

  it('says hoje, ontem, há N dias, then falls back to the date', () => {
    const today = new Date(2026, 2, 3)
    expect(formatRelativeDay('2026-03-03', today)).toBe('hoje')
    expect(formatRelativeDay('2026-03-02', today)).toBe('ontem')
    expect(formatRelativeDay('2026-03-01', today)).toBe('há 2 dias')
    expect(formatRelativeDay('2026-02-01', today)).toBe('01/02')
  })

  it('pluralises the days left', () => {
    expect(formatDaysLeft(28)).toBe('faltam 28 dias')
    expect(formatDaysLeft(1)).toBe('falta 1 dia')
    expect(formatDaysLeft(0)).toBe('termina hoje')
    expect(formatDaysLeft(-3)).toBe('termina hoje')
  })

  it('formats durations', () => {
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(65)).toBe('1 h 05 min')
    expect(formatDuration(60)).toBe('1 h')
    expect(formatDuration(null)).toBe('')
  })

  it('round-trips transcript clocks', () => {
    expect(formatClock(510)).toBe('00:08:30')
    expect(parseClock('00:08:30')).toBe(510)
    expect(parseClock('12:34')).toBe(754)
    expect(parseClock('332')).toBe(332)
    expect(parseClock(12)).toBe(12)
    expect(parseClock('a:b')).toBeNull()
    expect(parseClock('')).toBeNull()
  })

  it('uses the decimal comma for file sizes', () => {
    expect(formatFileSize(4.2 * 1024 * 1024)).toBe('4,2 MB')
    expect(formatFileSize(512)).toBe('512 B')
  })
})
