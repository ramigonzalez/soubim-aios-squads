export type SourceType = 'meeting' | 'email' | 'document'
export type IngestionStatus = 'pending' | 'approved' | 'rejected' | 'processed'

export interface BaseSource {
  id: string
  project_id: string
  project_name: string
  source_type: SourceType
  status: IngestionStatus
  ai_summary: string | null
  included: boolean
  created_at: string
}

export interface MeetingSource extends BaseSource {
  source_type: 'meeting'
  call_id: string
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

export interface BatchActionPayload {
  source_ids: string[]
  action: 'approve' | 'reject'
}

export interface BatchActionResponse {
  updated: number
  failed: string[]
}

export interface IngestionFilters {
  project_id: string | null
  source_type: SourceType | null
  date_from: string | null
  date_to: string | null
}
