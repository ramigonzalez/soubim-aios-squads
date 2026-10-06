export type SourceType = 'meeting' | 'email' | 'document'
export type IngestionStatus = 'pending' | 'approved' | 'rejected' | 'processed' | 'failed'

/** Latest background job of a source (Story 13.2) — set while it is queued/processing or after it failed */
export interface SourceJob {
  status: 'queued' | 'running' | 'succeeded' | 'failed'
  attempts: number
  max_attempts: number
  run_after: string | null
  last_error: string | null
}

export interface BaseSource {
  id: string
  project_id: string
  project_name: string
  source_type: SourceType
  status: IngestionStatus
  ai_summary: string | null
  included: boolean
  created_at: string
  approved_by_name: string | null
  approved_at: string | null
  rejected_by_name: string | null
  rejected_at: string | null
  extraction_error: string | null
  extracted_item_count: number
  job?: SourceJob | null
  /** Story 12.7: the user may approve / reject / retry this source (owning organization's owner/admin/reviewer) */
  can_review?: boolean
  /** Story 12.7: the user may delete this source (owning organization's owner/admin) */
  can_manage?: boolean
}

export interface MeetingSource extends BaseSource {
  source_type: 'meeting'
  call_id: string
  title: string
  meeting_date: string
  meeting_type: string
  source_label: string
  transcript_url: string | null
}

export interface EmailSource extends BaseSource {
  source_type: 'email'
  email_id: string
  email_date: string
  subject: string
  from_address: string
  recipient_count: number
  thread_url: string | null
}

export interface DocumentSource extends BaseSource {
  source_type: 'document'
  document_id: string
  upload_date: string
  file_name: string
  file_type: string
  file_size_bytes: number
  file_url: string | null
}

export type Source = MeetingSource | EmailSource | DocumentSource

export interface IngestionResponse {
  sources: Source[]
  total: number
  pending_count: number
}

export interface IngestionHistoryResponse {
  sources: Source[]
  total: number
}

export interface BatchActionPayload {
  source_ids: string[]
  action: 'approve' | 'reject'
}

export interface BatchActionResponse {
  updated: number
  failed: string[]
}

export interface DeleteSourceResponse {
  deleted_source_id: string
  deleted_items_count: number
}

export interface IngestionFilters {
  project_id: string | null
  source_type: SourceType | null
  date_from: string | null
  date_to: string | null
}
