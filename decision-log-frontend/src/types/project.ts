export interface ProjectMember {
  user_id: string
  name: string
  email: string
  role: string
}

export interface ProjectStats {
  total_decisions: number
  decisions_last_week: number
  decisions_by_discipline: Record<string, number>
  decisions_by_meeting_type: Record<string, number>
}

export interface Project {
  id: string
  name: string
  description?: string
  created_at: string
  archived_at?: string | null
  member_count?: number
  decision_count?: number
  latest_decision?: string
  members?: ProjectMember[]
  stats?: ProjectStats
}

export interface ProjectsResponse {
  projects: Project[]
  total: number
  limit: number
  offset: number
}
