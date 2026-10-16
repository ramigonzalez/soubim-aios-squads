export interface ProjectMember {
  user_id: string
  name: string
  email: string
  role: string
  /** Story 12.15: "Externo" badge */
  is_external?: boolean
}

export interface ProjectStats {
  total_decisions: number
  decisions_last_week: number
  decisions_by_discipline: Record<string, number>
  decisions_by_meeting_type: Record<string, number>
}

import type { ProjectCapabilities } from './organization'
import type { SourceType } from './projectItem'

/** Promem revamp: a stage as the list/detail endpoints send it (current stage is derived from dates). */
export interface ProjectStageRef {
  id: string
  name: string
  start: string
  end: string
}

/** Items created since the user's last visit, or in the last 7 days without a recorded visit. */
export interface ProjectNewItems {
  count: number
  since: string
  basis: 'last_visit' | 'last_7_days'
}

export interface ProjectLastActivity {
  at: string
  label: string
  source_type: SourceType
}

/** Promem revamp: counts next to the project sections in the sidebar. */
export interface ProjectSectionCounts {
  items: number
  milestones: number
  meetings: number
}

/** Story 12.7: list and detail responses carry the user's capabilities on the project. */
export interface Project extends ProjectCapabilities {
  id: string
  name: string
  description?: string
  project_type?: string
  drive_folder_id?: string  // Story 10.3: Google Drive folder monitoring
  created_at: string
  archived_at?: string | null
  member_count?: number
  decision_count?: number
  latest_decision?: string
  members?: ProjectMember[]
  stats?: ProjectStats
  // Promem revamp aggregates (list endpoint)
  stages?: ProjectStageRef[]
  new_items?: ProjectNewItems
  last_visit_at?: string | null
  last_activity?: ProjectLastActivity | null
  late_actions?: number
  pending_ingestion?: number
}

export interface ProjectsResponse {
  projects: Project[]
  total: number
  limit: number
  offset: number
}
