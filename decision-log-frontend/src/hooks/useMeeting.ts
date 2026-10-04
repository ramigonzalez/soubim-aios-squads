/**
 * Hook for the meeting viewer: transcript, summary and recording link of a Source.
 * Story 7.13: Meeting viewer
 */
import { useQuery } from 'react-query'
import api from '../services/api'

export interface MeetingRecording {
  /** "file": stored recording streamed by the API (signed, expiring URL); "external": e.g. Fathom share link */
  type: 'file' | 'external'
  url: string
}

export interface Meeting {
  id: string
  project_id: string
  title: string | null
  source_type: string
  occurred_at: string | null
  duration_minutes: number | null
  summary: string | null
  transcript: string | null
  recording: MeetingRecording | null
}

/**
 * Absolute URL for a stored recording: the API returns a path under /api.
 */
export function recordingSrc(recording: MeetingRecording): string {
  if (recording.type === 'external') return recording.url
  const apiOrigin = new URL(api.defaults.baseURL || window.location.origin, window.location.origin).origin
  return `${apiOrigin}${recording.url}`
}

export function useMeeting(sourceId: string) {
  return useQuery<Meeting, Error>(
    ['meeting', sourceId],
    async () => (await api.get<Meeting>(`/sources/${sourceId}/meeting`)).data,
    {
      enabled: !!sourceId,
      // The recording link is signed for 6 hours; refetching on focus would reset the video.
      staleTime: 60 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    }
  )
}
