import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import i18n from '../../i18n'
import IntegrationsSettings from '../../pages/IntegrationsSettings'
import { integrationsService } from '../../services/integrationsService'
import api from '../../services/api'
import type { FathomStatus } from '../../types/integrations'

vi.mock('../../services/integrationsService', () => ({
  integrationsService: {
    getFathomStatus: vi.fn(),
    connectFathom: vi.fn(),
    disconnectFathom: vi.fn(),
  },
}))

const service = integrationsService as unknown as {
  getFathomStatus: ReturnType<typeof vi.fn>
  connectFathom: ReturnType<typeof vi.fn>
  disconnectFathom: ReturnType<typeof vi.fn>
}

const base: FathomStatus = {
  configured: true,
  connected: false,
  needs_reconnect: false,
  account_label: null,
  connected_at: null,
}

function renderPage(status: Partial<FathomStatus>, url = '/settings/integrations') {
  service.getFathomStatus.mockResolvedValue({ ...base, ...status })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <IntegrationsSettings />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('IntegrationsSettings (Story 13.3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    service.connectFathom.mockResolvedValue(undefined)
    service.disconnectFathom.mockResolvedValue(undefined)
  })

  it('not connected: shows the connect button, which starts the OAuth flow', async () => {
    renderPage({})
    expect(await screen.findByText('Not connected')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Connect to Fathom' }))
    expect(service.connectFathom).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Disconnect' })).not.toBeInTheDocument()
  })

  it('connected: shows the account and disconnects after confirmation', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage({ connected: true, account_label: 'rami@example.com', connected_at: '2026-10-06T12:00:00' })
    expect(await screen.findByText('Connected as rami@example.com')).toBeInTheDocument()
    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Connect to Fathom' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Disconnect' }))
    expect(confirm).toHaveBeenCalled()
    await waitFor(() => expect(service.disconnectFathom).toHaveBeenCalledTimes(1))
    confirm.mockRestore()
  })

  it('does not disconnect when the confirmation is cancelled', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderPage({ connected: true })
    await userEvent.click(await screen.findByRole('button', { name: 'Disconnect' }))
    expect(service.disconnectFathom).not.toHaveBeenCalled()
    confirm.mockRestore()
  })

  it('needs reconnect: warns and offers to reconnect', async () => {
    renderPage({ connected: true, needs_reconnect: true })
    expect(await screen.findByText(/The connection expired/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reconnect' }))
    expect(service.connectFathom).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Connected')).not.toBeInTheDocument()
  })

  it('integration not configured on the server', async () => {
    renderPage({ configured: false })
    expect(await screen.findByText(/not available on this server/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows the OAuth callback result', async () => {
    renderPage({ connected: true }, '/settings/integrations?fathom=connected')
    expect(await screen.findByRole('status')).toHaveTextContent('Fathom account connected.')
  })

  it('shows an error after a failed OAuth callback', async () => {
    renderPage({}, '/settings/integrations?fathom=error&reason=invalid_state')
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not connect to Fathom')
  })

  describe('in Portuguese', () => {
    afterEach(() => i18n.changeLanguage('en'))

    it('labels the connect button "Conectar ao Fathom"', async () => {
      await i18n.changeLanguage('pt-BR')
      renderPage({})
      expect(await screen.findByRole('button', { name: 'Conectar ao Fathom' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Integrações' })).toBeInTheDocument()
    })
  })
})

describe('integrationsService.connectFathom', () => {
  it('calls the connect endpoint and sends the browser to the consent URL', async () => {
    const actual = await vi.importActual<typeof import('../../services/integrationsService')>('../../services/integrationsService')
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: { url: 'https://fathom.video/external/v1/oauth2/authorize?x=1' } })
    const assign = vi.fn()
    const original = window.location
    // jsdom's location cannot be spied on; swap it for this test
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, assign } })
    try {
      await actual.integrationsService.connectFathom()
      expect(get).toHaveBeenCalledWith('/integrations/fathom/connect')
      expect(assign).toHaveBeenCalledWith('https://fathom.video/external/v1/oauth2/authorize?x=1')
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: original })
      get.mockRestore()
    }
  })
})
