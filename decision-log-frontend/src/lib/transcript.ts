/**
 * Meeting transcript helpers (Story 7.13).
 *
 * Transcripts are stored in Fathom's format: a turn header "M:SS - Name" (or
 * "H:MM:SS - Name") followed by indented speech lines. Re-transcribed meetings
 * mark uncertain speakers as "⚠️ Name [reason]".
 */

export interface TranscriptTurn {
  /** Start of the turn, in seconds from the beginning of the recording */
  start: number
  speaker: string
  /** Speaker attribution is uncertain (⚠️) */
  uncertain: boolean
  /** Why the speaker is uncertain, e.g. "mixed voices" */
  reason?: string
  text: string
}

const TURN_HEADER = /^(\d+):(\d{2})(?::(\d{2}))? - (⚠️ )?(.+?)(?: \[(.*)\])?$/

/**
 * Timestamp ("HH:MM:SS", "H:MM:SS" or "MM:SS") in seconds; null if it isn't one.
 */
export function timestampToSeconds(ts?: string | null): number | null {
  const parts = (ts || '').trim().split(':').map(Number)
  if (parts.length < 2 || parts.length > 3 || parts.some(Number.isNaN)) return null
  return parts.reduce((acc, p) => acc * 60 + p, 0)
}

/**
 * Seconds as "M:SS" (or "H:MM:SS" from one hour), like the transcript headers.
 */
export function formatSeconds(total: number): string {
  const s = Math.max(0, Math.floor(total))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/**
 * Parse a stored transcript into turns. Lines before the first turn header
 * (title, notes) are ignored.
 */
export function parseTranscript(raw: string | null | undefined): TranscriptTurn[] {
  const turns: TranscriptTurn[] = []
  for (const line of (raw || '').split('\n')) {
    const header = line.trimEnd().match(TURN_HEADER)
    if (header) {
      const [, a, b, c, warn, name, reason] = header
      const start = c === undefined ? Number(a) * 60 + Number(b) : Number(a) * 3600 + Number(b) * 60 + Number(c)
      turns.push({ start, speaker: name.split(' (')[0], uncertain: Boolean(warn), reason, text: '' })
    } else if (turns.length && line.startsWith('  ')) {
      const last = turns[turns.length - 1]
      last.text = `${last.text} ${line.trim()}`.trim()
    }
  }
  return turns
}

/**
 * Index of the turn playing at `seconds` (last turn starting at or before it); -1 before the first.
 */
export function turnIndexAt(turns: TranscriptTurn[], seconds: number): number {
  let lo = 0
  let hi = turns.length - 1
  let found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (turns[mid].start <= seconds) {
      found = mid
      lo = mid + 1
    } else {
      hi = mid - 1
    }
  }
  return found
}

/**
 * In-app link to a meeting, optionally opening at a timestamp.
 */
export function meetingLink(sourceId: string, timestamp?: string | null): string {
  const seconds = timestampToSeconds(timestamp)
  return seconds === null ? `/meetings/${sourceId}` : `/meetings/${sourceId}?t=${seconds}`
}
