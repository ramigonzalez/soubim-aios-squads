import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
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
    confirmFathom: vi.fn(),
    disconnectFathom: vi.fn(),
    getFathomImportProjects: vi.fn().mockResolvedValue([]),
    setFathomAutoImport: vi.fn(),
  },
}))

const service = integrationsService as unknown as {
  getFathomStatus: ReturnType<typeof vi.fn>
  connectFathom: ReturnType<typeof vi.fn>
  confirmFathom: ReturnType<typeof vi.fn>
  disconnectFathom: ReturnType<typeof vi.fn>
}

const base: FathomStatus = {
  configured: true,
  connected: false,
  needs_reconnect: false,
  account_label: null,
  connected_at: null,
}

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname + location.search}</div>
}

function renderPage(status: Partial<FathomStatus>, url = '/settings/integrations') {
  service.getFathomStatus.mockResolvedValue({ ...base, ...status })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[url]}>
        <IntegrationsSettings />
        <LocationProbe />
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

  describe('two-step connect (callback → confirm)', () => {
    const pendingUrl = '/settings/integrations?fathom=pending&nonce=n-123'

    it('confirms the pending connection with the logged-in user and shows it connected', async () => {
      service.confirmFathom.mockResolvedValue({ ...base, connected: true, account_label: 'rami@example.com' })
      renderPage({}, pendingUrl)
      expect(await screen.findByText('Fathom account connected.')).toBeInTheDocument()
      expect(service.confirmFathom).toHaveBeenCalledTimes(1)
      expect(service.confirmFathom.mock.calls[0][0]).toBe('n-123')
      expect(await screen.findByText('Connected as rami@example.com')).toBeInTheDocument()
      // the nonce is removed from the URL
      expect(screen.getByTestId('location')).toHaveTextContent('/settings/integrations?fathom=connected')
    })

    it('shows a waiting message while confirming', async () => {
      service.confirmFathom.mockReturnValue(new Promise(() => {}))
      renderPage({}, pendingUrl)
      expect(await screen.findByRole('status')).toHaveTextContent('Finishing the Fathom connection')
    })

    it('explains when the flow was started by another account (403)', async () => {
      service.confirmFathom.mockRejectedValue({ response: { status: 403 } })
      renderPage({}, pendingUrl)
      expect(await screen.findByRole('alert')).toHaveTextContent('started from another DecisionLog account')
      expect(screen.getByTestId('location')).toHaveTextContent('fathom=error&reason=other_user')
      expect(screen.getByTestId('location')).not.toHaveTextContent('n-123')
    })

    it('asks to connect again when the request expired (410)', async () => {
      service.confirmFathom.mockRejectedValue({ response: { status: 410 } })
      renderPage({}, pendingUrl)
      expect(await screen.findByRole('alert')).toHaveTextContent('expired. Please connect again')
    })

    it('shows the generic error for other failures', async () => {
      service.confirmFathom.mockRejectedValue({ response: { status: 404 } })
      renderPage({}, pendingUrl)
      expect(await screen.findByRole('alert')).toHaveTextContent('Could not connect to Fathom')
    })

    it('does not confirm without a nonce', async () => {
      renderPage({}, '/settings/integrations?fathom=pending')
      expect(await screen.findByText('Not connected')).toBeInTheDocument()
      expect(service.confirmFathom).not.toHaveBeenCalled()
    })
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

describe('integrationsService.confirmFathom', () => {
  it('posts the nonce to the confirm endpoint', async () => {
    const actual = await vi.importActual<typeof import('../../services/integrationsService')>('../../services/integrationsService')
    const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { ...base, connected: true } })
    try {
      await expect(actual.integrationsService.confirmFathom('n-1')).resolves.toMatchObject({ connected: true })
      expect(post).toHaveBeenCalledWith('/integrations/fathom/confirm', { nonce: 'n-1' })
    } finally {
      post.mockRestore()
    }
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
