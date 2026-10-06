import api from './api'
import type { FathomStatus } from '../types/integrations'

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
}
