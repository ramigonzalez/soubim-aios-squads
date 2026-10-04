import { describe, it, expect } from 'vitest'
import { formatSeconds, meetingLink, parseTranscript, timestampToSeconds, turnIndexAt } from '../../lib/transcript'

const RAW = `souBIM + DIMAS | D/SEASON - Quinzenal - September 04
Re-transcribed locally.

---

0:00 - Camila Bittencourt Ivo (Dimas Construções)
  Oi, oi, oi,

0:02 - Gabriela Cavalheiro (eusoubim.com)
  bom dia. Olá, bom
  dia.

1:09 - ⚠️ Camila / Erica [mixed voices, overlapping speech]
  A outra reunião não é tão gostosa.

1:20:05 - Gabriela Cavalheiro (eusoubim.com)
  Caderno de detalhes.
`

describe('timestampToSeconds', () => {
  it('parses MM:SS, H:MM:SS and HH:MM:SS', () => {
    expect(timestampToSeconds('33:40')).toBe(2020)
    expect(timestampToSeconds('1:20:05')).toBe(4805)
    expect(timestampToSeconds('00:33:40')).toBe(2020)
  })

  it('returns null for missing or invalid values', () => {
    expect(timestampToSeconds(undefined)).toBeNull()
    expect(timestampToSeconds('')).toBeNull()
    expect(timestampToSeconds('soon')).toBeNull()
    expect(timestampToSeconds('2026-09-04')).toBeNull()
  })
})

describe('formatSeconds', () => {
  it('formats like transcript headers', () => {
    expect(formatSeconds(65)).toBe('1:05')
    expect(formatSeconds(4805)).toBe('1:20:05')
  })
})

describe('parseTranscript', () => {
  const turns = parseTranscript(RAW)

  it('reads turns, skipping the header lines', () => {
    expect(turns.map(t => t.start)).toEqual([0, 2, 69, 4805])
  })

  it('drops the company from the speaker and joins multi-line speech', () => {
    expect(turns[1].speaker).toBe('Gabriela Cavalheiro')
    expect(turns[1].text).toBe('bom dia. Olá, bom dia.')
  })

  it('keeps uncertain-speaker markers and reasons', () => {
    expect(turns[2]).toMatchObject({ speaker: 'Camila / Erica', uncertain: true, reason: 'mixed voices, overlapping speech' })
    expect(turns[1].uncertain).toBe(false)
  })

  it('handles empty input', () => {
    expect(parseTranscript(null)).toEqual([])
  })
})

describe('turnIndexAt', () => {
  const turns = parseTranscript(RAW)

  it('finds the turn playing at a given second', () => {
    expect(turnIndexAt(turns, 0)).toBe(0)
    expect(turnIndexAt(turns, 30)).toBe(1)
    expect(turnIndexAt(turns, 5000)).toBe(3)
  })

  it('returns -1 before the first turn', () => {
    expect(turnIndexAt(parseTranscript('0:10 - A\n  x'), 5)).toBe(-1)
  })
})

describe('meetingLink', () => {
  it('adds the timestamp in seconds when there is one', () => {
    expect(meetingLink('src-1', '00:33:40')).toBe('/meetings/src-1?t=2020')
    expect(meetingLink('src-1')).toBe('/meetings/src-1')
    expect(meetingLink('src-1', 'n/a')).toBe('/meetings/src-1')
  })
})
