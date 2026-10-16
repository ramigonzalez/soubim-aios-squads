/** Promem revamp G3: the project's approved meetings for the Reuniões list. */
import { useQuery } from 'react-query'
import api from '../services/api'

export interface ProjectMeeting {
  id: string
  title: string | null
  occurred_at: string | null
  duration_minutes: number | null
  label: string | null
  meeting_type: string | null
  participants: string[]
  summary: string | null
  visibility: 'internal' | 'shared'
  thumbnail_url: string | null
  item_counts: Record<string, number>
  item_count: number
}

export function useProjectMeetings(projectId: string) {
  return useQuery<ProjectMeeting[], Error>(
    ['projectMeetings', projectId],
    async () => (await api.get<{ meetings: ProjectMeeting[] }>(`/projects/${projectId}/meetings`)).data.meetings,
    { enabled: !!projectId, staleTime: 60 * 1000 },
  )
}
