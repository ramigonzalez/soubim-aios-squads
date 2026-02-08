export interface Decision {
  id: string
  decision_statement: string
  who: string
  timestamp: string
  discipline: string
  meeting_type?: string
  meeting_date?: string
  why: string
  causation?: string
  consensus?: Record<string, string>
  impacts?: Array<{ type: string; change: string }>
  confidence: number
  anomaly_flags?: unknown[]
  similar_decisions?: Array<{
    decision_id: string
    similarity_score: number
    decision_statement: string
  }>
  consistency_notes?: string
  transcript_excerpt?: {
    text: string
    start: string
    end: string
  }
  meeting?: {
    id: string
    type: string
    date: string
    duration_minutes: number
    participants: Array<{ name: string; email: string; role: string }>
  }
  created_at: string
  updated_at?: string
}

export interface DecisionsResponse {
  decisions: Decision[]
  total: number
  limit: number
  offset: number
  facets?: {
    disciplines: Record<string, number>
    meeting_types: Record<string, number>
  }
}

export interface DecisionFilters {
  discipline?: string
  meeting_type?: string
  date_from?: string
  date_to?: string
  confidence_min?: number
  has_anomalies?: boolean
  search?: string
  limit?: number
  offset?: number
  sort_by?: string
  sort_order?: string
}
