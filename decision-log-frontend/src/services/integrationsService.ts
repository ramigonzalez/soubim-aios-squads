import api from './api'
import type {
  FathomAutoImport,
  FathomImport,
  FathomImportProject,
  FathomPreview,
  FathomMeetingsPage,
  FathomStatus,
  FathomRule,
  FathomRuleField,
  FathomUnassignedMeeting,
} from '../types/integrations'
import type { MeetingVisibility } from '../types/projectItem'

export const integrationsService = {
  getFathomStatus: (): Promise<FathomStatus> =>
    api.get('/integrations/fathom').then(r => r.data),

  /**
   * Start the Fathom OAuth flow: fetch the consent URL (needs the JWT, so it is an API call)
   * and send the browser there. Fathom redirects back to /settings/integrations?fathom=pending&nonce=…
   */
  connectFathom: async (): Promise<void> => {
    const { data } = await api.get<{ url: string }>('/integrations/fathom/connect')
    window.location.assign(data.url)
  },

  /**
   * Second step of the connect flow: the backend callback parked the tokens and sent the browser
   * to /settings/integrations?fathom=pending&nonce=…; claim them for the logged-in user.
   */
  confirmFathom: (nonce: string): Promise<FathomStatus> =>
    api.post('/integrations/fathom/confirm', { nonce }).then(r => r.data),

  disconnectFathom: (): Promise<void> =>
    api.delete('/integrations/fathom').then(() => undefined),

  /** One page of the user's own Fathom meetings (Story 13.4); pass the previous page's next_cursor. */
  listFathomMeetings: (cursor?: string | null): Promise<FathomMeetingsPage> =>
    api.get('/integrations/fathom/meetings', { params: cursor ? { cursor } : {} }).then(r => r.data),

  /** Story 13.15: ask for a preview image of a meeting that is not imported (idempotent; 429 at 3 in progress) */
  requestFathomPreview: (recordingId: string): Promise<FathomPreview> =>
    api.post(`/integrations/fathom/meetings/${encodeURIComponent(recordingId)}/preview`).then(r => r.data),

  /** Story 13.15: status of the user's own previews (database only, cheap to poll) */
  getFathomPreviews: (recordingIds: string[]): Promise<Record<string, FathomPreview>> =>
    api.get('/integrations/fathom/previews', { params: { recording_ids: recordingIds.join(',') } }).then(r => r.data),

  getFathomImportProjects: (): Promise<FathomImportProject[]> =>
    api.get('/integrations/fathom/projects').then(r => r.data),

  importFathomMeeting: (body: {
    recording_id: string
    project_id: string
    visibility: MeetingVisibility
  }): Promise<FathomImport> =>
    api.post('/integrations/fathom/imports', body).then(r => r.data),

  retryFathomImport: (importId: string): Promise<FathomImport> =>
    api.post(`/integrations/fathom/imports/${encodeURIComponent(importId)}/retry`).then(r => r.data),

  /** Story 13.9: opt in/out of the Fathom webhook auto-import (off by default). Story 13.16: no default project */
  setFathomAutoImport: (body: {
    enabled: boolean
    visibility: MeetingVisibility
  }): Promise<FathomAutoImport> =>
    api.put('/integrations/fathom/auto-import', body).then(r => r.data),

  listFathomUnassigned: (): Promise<FathomUnassignedMeeting[]> =>
    api.get('/integrations/fathom/unassigned').then(r => r.data),

  assignFathomUnassigned: (id: string, body: { project_id: string; visibility: MeetingVisibility }): Promise<FathomImport> =>
    api.post(`/integrations/fathom/unassigned/${encodeURIComponent(id)}/assign`, body).then(r => r.data),

  discardFathomUnassigned: (id: string): Promise<void> =>
    api.delete(`/integrations/fathom/unassigned/${encodeURIComponent(id)}`).then(() => undefined),

  /** Story 13.16: Fathom routing rules of a project (admins and reviewers of the project) */
  listFathomRules: (projectId: string): Promise<FathomRule[]> =>
    api.get(`/projects/${encodeURIComponent(projectId)}/fathom-rules`).then(r => r.data),

  createFathomRule: (projectId: string, body: { field: FathomRuleField; value: string }): Promise<FathomRule> =>
    api.post(`/projects/${encodeURIComponent(projectId)}/fathom-rules`, body).then(r => r.data),

  deleteFathomRule: (projectId: string, ruleId: string): Promise<void> =>
    api.delete(`/projects/${encodeURIComponent(projectId)}/fathom-rules/${encodeURIComponent(ruleId)}`).then(() => undefined),
}
