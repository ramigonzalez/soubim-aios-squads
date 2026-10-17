import { describe, expect, it } from 'vitest'
import { layoutStages, stageForDate } from '../../lib/stages'

const STAGES = [
  { id: 'pe', name: 'Projeto Executivo', start: '2026-05-16', end: '2026-08-31' },
  { id: 'ep', name: 'Estudo Preliminar', start: '2026-01-15', end: '2026-02-15' },
  { id: 'ap', name: 'Anteprojeto', start: '2026-02-16', end: '2026-03-31' },
  { id: 'pl', name: 'Projeto Legal', start: '2026-04-01', end: '2026-05-15' },
]
const TODAY = new Date(2026, 2, 3)

describe('lib/stages', () => {
  it('sorts stages and assigns done / current / future', () => {
    const { segments, currentIndex } = layoutStages(STAGES, TODAY)
    expect(segments.map((s) => s.id)).toEqual(['ep', 'ap', 'pl', 'pe'])
    expect(segments.map((s) => s.status)).toEqual(['done', 'current', 'future', 'future'])
    expect(currentIndex).toBe(1)
  })

  it('computes durations, progress and days left for the current stage', () => {
    const { segments } = layoutStages(STAGES, TODAY)
    expect(segments[0].days).toBe(31)
    expect(segments[1].days).toBe(43)
    expect(segments[1].progress).toBeCloseTo(15 / 43)
    expect(segments[1].daysLeft).toBe(28)
    expect(segments[0].progress).toBe(1)
    expect(segments[2].progress).toBe(0)
  })

  it('places today across the whole strip', () => {
    const { todayPercent, segments } = layoutStages(STAGES, TODAY)
    const total = segments.reduce((sum, s) => sum + s.days, 0)
    expect(todayPercent).toBeCloseTo(((31 + 15) / total) * 100)
  })

  it('has no today marker outside the schedule', () => {
    const { todayPercent, currentIndex } = layoutStages(STAGES, new Date(2027, 0, 1))
    expect(todayPercent).toBeNull()
    expect(currentIndex).toBe(-1)
  })

  it('skips stages with invalid dates', () => {
    const { segments } = layoutStages([...STAGES, { id: 'x', name: 'Sem datas', start: null, end: '2026-01-01' }], TODAY)
    expect(segments).toHaveLength(4)
  })

  it('finds the stage of a date (items have no stage of their own)', () => {
    expect(stageForDate(STAGES, '2026-02-16')?.id).toBe('ap')
    expect(stageForDate(STAGES, '2026-02-15')?.id).toBe('ep')
    expect(stageForDate(STAGES, '2025-12-01')).toBeNull()
  })
})
