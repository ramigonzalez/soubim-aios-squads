/** Fathom connection status (Story 13.3) — GET /api/integrations/fathom */
export interface FathomStatus {
  configured: boolean
  connected: boolean
  needs_reconnect: boolean
  account_label: string | null
  connected_at: string | null
}
