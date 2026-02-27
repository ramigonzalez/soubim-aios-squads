/**
 * Hook for fetching a single project with details (stages, participants).
 * Story 6.2: Frontend — Project Create/Edit Form
 */
import { useQuery, UseQueryResult } from 'react-query'
import api from '../services/api'

export interface ProjectStageDetail {
  id: string
  stage_name: string
  stage_from: string | null
  stage_to: string | null
  sort_order: number
  is_current: boolean
}

export interface ProjectDetail {
  id: string
  name: string
  description?: string | null
  project_type?: string | null
  current_stage?: { name: string; stage_from?: string; stage_to?: string } | null
  stages: ProjectStageDetail[]
  participant_count: number
  created_at: string
  archived_at?: string | null
  members: Array<{ user_id: string; name: string; email: string; role: string }>
  stats?: {
    total_decisions: number
    decisions_last_week: number
    decisions_by_discipline: Record<string, number>
  }
}

export function useProject(
  projectId: string | undefined,
  enabled = true
): UseQueryResult<ProjectDetail> {
  return useQuery<ProjectDetail>(
    ['project', projectId],
    async () => {
      const response = await api.get(`/projects/${projectId}`)
      return response.data
    },
    {
      enabled: enabled && !!projectId,
      staleTime: 60 * 1000,
      retry: 1,
    }
  )
}
