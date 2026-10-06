import api from './api'
import type { FathomImport, FathomImportProject, FathomMeetingsPage, FathomStatus } from '../types/integrations'
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
}
