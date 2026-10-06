import type { IngestionStatus, SourceJob } from './ingestion'
import type { MeetingVisibility } from './projectItem'

/** Fathom connection status (Story 13.3) — GET /api/integrations/fathom */
export interface FathomStatus {
  configured: boolean
  connected: boolean
  needs_reconnect: boolean
  account_label: string | null
  connected_at: string | null
  /** Story 13.9 */
  auto_import?: FathomAutoImport
}

/** Webhook auto-import settings (Story 13.9) — off by default */
export interface FathomAutoImport {
  enabled: boolean
  project_id: string | null
  project_name: string | null
  visibility: MeetingVisibility
}

/** A recording pushed by the Fathom webhook that waits for a project (Story 13.9) */
export interface FathomUnassignedMeeting {
  id: string
  recording_id: string
  title: string | null
  started_at: string | null
  reason: 'no_default_project' | 'project_unavailable'
  received_at: string | null
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
  /** Story 12.4: visibility of the (future) meeting */
  visibility?: MeetingVisibility
  source_id: string | null
  source_status: IngestionStatus | null
  /** Story 13.12: presigned thumbnail of the imported meeting, null until generated */
  thumbnail_url?: string | null
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
  /** Story 13.12: video-call platform from the meeting link; null when unknown */
  platform?: 'meet' | 'zoom' | 'teams' | null
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
  /** Story 12.4: the user may import as shared (admin of the organization they act for) */
  can_share?: boolean
}
