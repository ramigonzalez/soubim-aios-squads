import type { IngestionStatus, SourceJob } from './ingestion'

/** Fathom connection status (Story 13.3) — GET /api/integrations/fathom */
export interface FathomStatus {
  configured: boolean
  connected: boolean
  needs_reconnect: boolean
  account_label: string | null
  connected_at: string | null
}

export interface FathomPerson {
  name: string
  email: string | null
}

/** Import of a Fathom recording into a project (Story 13.4) */
export interface FathomImport {
  id: string
  project_id: string
  project_name: string
  /** imported: meeting created (see source_status); queued/running: with the worker; failed: see error */
  state: 'imported' | 'queued' | 'running' | 'failed'
  source_id: string | null
  source_status: IngestionStatus | null
  job: SourceJob | null
  error: string | null
  /** Only the importer can retry (the recording is in their Fathom account) */
  can_retry: boolean
}

/** One meeting of the user's own Fathom list — GET /api/integrations/fathom/meetings */
export interface FathomMeeting {
  recording_id: string
  title: string | null
  /** ISO, UTC */
  started_at: string | null
  duration_minutes: number | null
  invitees: FathomPerson[]
  recorded_by: FathomPerson | null
  share_url: string | null
  imports: FathomImport[]
}

export interface FathomMeetingsPage {
  items: FathomMeeting[]
  next_cursor: string | null
}

/** Project the user can import into (write access) — GET /api/integrations/fathom/projects */
export interface FathomImportProject {
  id: string
  name: string
}
