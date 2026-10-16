/**
 * Hook for fetching a single project with details (stages, participants).
 * Story 6.2: Frontend — Project Create/Edit Form
 */
import { useQuery, UseQueryResult } from 'react-query'
import api from '../services/api'
import type { ProjectCapabilities } from '../types/organization'
import type { ProjectSectionCounts, ProjectStageRef } from '../types/project'

export interface ProjectDetail extends ProjectCapabilities {
  id: string
  name: string
  description?: string | null
  project_type?: string | null
  /** Promem revamp: schedule for the header StageStrip (GET /stages keeps the editable shape) */
  stages: ProjectStageRef[]
  /** Promem revamp: sidebar section counts */
  counts: ProjectSectionCounts
  drive_folder_id?: string | null
  created_at: string
  archived_at?: string | null
  members: Array<{ user_id: string; name: string; email: string; role: string; is_external?: boolean }>  // 12.15: badge
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
