/**
 * Hook for the meeting viewer: transcript, summary and recording link of a Source.
 * Story 7.13: Meeting viewer
 * Story 12.4: meeting visibility (internal / shared)
 */
import { useMutation, useQuery, useQueryClient } from 'react-query'
import api from '../services/api'
import type { MeetingVisibility } from '../types/projectItem'

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
  /** Story 13.12: presigned thumbnail, used as the video poster */
  thumbnail_url?: string | null
  /** Story 12.4: internal (owner organization only) or shared (every organization on the project) */
  visibility?: MeetingVisibility
  /** Story 12.4: true for admins of the meeting's owner organization */
  can_change_visibility?: boolean
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

/**
 * Story 12.4: share a meeting with every organization on the project, or make it internal again.
 * Its items follow the meeting, so the project's item lists are refetched.
 */
export function useSetMeetingVisibility(sourceId: string) {
  const queryClient = useQueryClient()
  return useMutation<{ id: string; visibility: MeetingVisibility }, Error, MeetingVisibility>(
    async visibility => (await api.patch(`/sources/${sourceId}/visibility`, { visibility })).data,
    {
      onSuccess: data => {
        queryClient.setQueryData<Meeting | undefined>(['meeting', sourceId], old =>
          old ? { ...old, visibility: data.visibility } : old
        )
        void queryClient.invalidateQueries('projectItems')
        void queryClient.invalidateQueries('milestones')
      },
    }
  )
}
