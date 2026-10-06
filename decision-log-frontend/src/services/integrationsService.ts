import api from './api'
import type { FathomStatus } from '../types/integrations'

export const integrationsService = {
  getFathomStatus: (): Promise<FathomStatus> =>
    api.get('/integrations/fathom').then(r => r.data),

  /**
   * Start the Fathom OAuth flow: fetch the consent URL (needs the JWT, so it is an API call)
   * and send the browser there. Fathom redirects back to /settings/integrations?fathom=…
   */
  connectFathom: async (): Promise<void> => {
    const { data } = await api.get<{ url: string }>('/integrations/fathom/connect')
    window.location.assign(data.url)
  },

  disconnectFathom: (): Promise<void> =>
    api.delete('/integrations/fathom').then(() => undefined),
}
