/**
 * V2 Project Item types — replaces Decision type.
 * Story 5.3: Frontend Types & Hooks Migration
 */

export type ItemType = 'idea' | 'topic' | 'decision' | 'action_item' | 'information'
export type SourceType = 'meeting' | 'email' | 'document' | 'manual_input'

export type Discipline =
  | 'architecture'
  | 'structural'
  | 'mep'
  | 'electrical'
  | 'plumbing'
  | 'landscape'
  | 'fire_protection'
  | 'acoustical'
  | 'sustainability'
  | 'civil'
  | 'client'
  | 'contractor'
  | 'tenant'
  | 'engineer'
  | 'general'

export const ITEM_TYPES: ItemType[] = ['idea', 'topic', 'decision', 'action_item', 'information']
export const SOURCE_TYPES: SourceType[] = ['meeting', 'email', 'document', 'manual_input']

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  idea: 'Idea',
  topic: 'Topic',
  decision: 'Decision',
  action_item: 'Action Item',
  information: 'Information',
}

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  meeting: 'Meeting',
  email: 'Email',
  document: 'Document',
  manual_input: 'Manual Input',
}

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  architecture: 'Architecture',
  structural: 'Structural',
  mep: 'MEP',
  electrical: 'Electrical',
  plumbing: 'Plumbing',
  landscape: 'Landscape',
  fire_protection: 'Fire Protection',
  acoustical: 'Acoustical',
  sustainability: 'Sustainability',
  civil: 'Civil',
  client: 'Client',
  contractor: 'Contractor',
  tenant: 'Tenant',
  engineer: 'Engineer',
  general: 'General',
}

export interface ConsensusEntry {
  status: 'AGREE' | 'DISAGREE' | 'ABSTAIN'
  notes?: string | null
}

export type ConsensusMap = Partial<Record<Discipline, ConsensusEntry>>

export interface ImpactsSchema {
  cost_impact?: string | null
  timeline_impact?: string | null
  scope_impact?: string | null
  risk_level?: 'low' | 'medium' | 'high' | null
  affected_areas?: string[] | null
}

export interface SourceInfo {
  id: string
  title: string
  type: SourceType
  occurred_at: string
}

export interface ProjectItem {
  id: string
  project_id: string
  statement: string
  who: string
  timestamp?: string
  item_type: ItemType
  source_type: SourceType
  affected_disciplines: Discipline[]
  is_milestone: boolean
  is_done: boolean
  owner?: string | null
  why?: string | null
  causation?: string | null
  impacts?: ImpactsSchema | null
  consensus?: ConsensusMap | null
  confidence?: number | null
  similar_items?: Array<{
    item_id: string
    similarity_score: number
    statement: string
  }> | null
  consistency_notes?: string | null
  anomaly_flags?: unknown[] | null
  source_excerpt?: string | null
  source?: SourceInfo | null
  // V1 backward compat fields (may be present in API responses)
  decision_statement?: string
  discipline?: string
  transcript_id?: string
  meeting_title?: string
  meeting_type?: string
  meeting_date?: string
  meeting_participants?: Array<{ name: string; role?: string }>
  created_at: string
  updated_at?: string | null
}

export interface ProjectItemFacets {
  item_types: Record<string, number>
  source_types: Record<string, number>
  disciplines: Record<string, number>
}

export interface ProjectItemsResponse {
  items: ProjectItem[]
  total: number
  limit: number
  offset: number
  facets?: ProjectItemFacets
}

export interface ProjectItemFilters {
  itemTypes?: ItemType[]
  sourceTypes?: SourceType[]
  disciplines?: Discipline[]
  isMilestone?: boolean
  dateFrom?: string
  dateTo?: string
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface ProjectItemCreate {
  statement: string
  item_type: ItemType
  who: string
  affected_disciplines: Discipline[]
  source_type?: SourceType
  context_notes?: string
  date?: string
  why?: string
  causation?: string
  owner?: string
  due_date?: string
  is_done?: boolean
  impacts?: ImpactsSchema
  consensus?: Record<string, ConsensusEntry>
}

export const ALL_DISCIPLINES: Discipline[] = Object.keys(DISCIPLINE_LABELS) as Discipline[]

export interface ProjectItemUpdate {
  is_milestone?: boolean
  is_done?: boolean
  statement?: string
}
