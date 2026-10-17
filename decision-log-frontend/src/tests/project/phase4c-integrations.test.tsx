/**
 * Promem revamp Phase 4c: Integrações (Fathom connect / disconnect / auto-import) and the
 * Fathom meetings list with the import dialog, on the design system (pt-BR).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import * as apiModule from '../../services/api'
import { ToastProvider, TooltipProvider } from '../../design-system'
import IntegrationsSettings from '../../pages/IntegrationsSettings'
import FathomMeetings from '../../pages/FathomMeetings'
import { usePortuguese } from '../design-system/render'

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
const api = apiModule.default as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', ReturnType<typeof vi.fn>>

const NOT_CONNECTED = { configured: true, connected: false, needs_reconnect: false, account_label: null, connected_at: null }
const CONNECTED = {
  configured: true,
  connected: true,
  needs_reconnect: false,
  account_label: 'gabriela@soubim.com',
  connected_at: '2026-10-06T12:00:00',
  auto_import: { enabled: false, visibility: 'internal' },
}
const PROJECTS = [
  { id: 'p1', name: 'Residential Tower Alpha', can_share: true },
  { id: 'p2', name: 'Casa Verde', can_share: false },
]
const MEETING = {
  recording_id: '123',
  title: 'Coordenação de fachada',
  started_at: '2026-10-01T13:00:00',
  duration_minutes: 45,
  invitees: [{ name: 'Ana Souza', email: 'ana@example.com' }],
  recorded_by: { name: 'Gabriela', email: 'gabriela@soubim.com' },
  share_url: null,
  platform: 'meet',
  imports: [
    { id: 'imp-1', project_id: 'p1', project_name: 'Residential Tower Alpha', state: 'imported', source_id: 's1', source_status: 'pending', job: null, error: null, can_retry: false },
  ],
}

let status: Record<string, unknown> = NOT_CONNECTED
let meetings: unknown[] = [MEETING]
function mockApi() {
  api.get.mockImplementation((url: string) => {
    if (url === '/integrations/fathom') return Promise.resolve({ data: status })
    if (url === '/integrations/fathom/connect') return new Promise(() => undefined) // the browser leaves for Fathom
    if (url === '/integrations/fathom/projects') return Promise.resolve({ data: PROJECTS })
    if (url === '/integrations/fathom/meetings') return Promise.resolve({ data: { items: meetings, next_cursor: null } })
    return Promise.reject(new Error(`unexpected GET ${url}`))
  })
  api.post.mockImplementation((url: string) => {
    if (url === '/integrations/fathom/confirm') return Promise.resolve({ data: CONNECTED })
    if (url === '/integrations/fathom/imports') return Promise.resolve({ data: { ...MEETING.imports[0], id: 'imp-2', project_id: 'p2', state: 'queued' } })
    return Promise.reject(new Error(`unexpected POST ${url}`))
  })
  api.put.mockResolvedValue({ data: { enabled: true, visibility: 'internal' } })
  api.delete.mockImplementation(() => {
    status = NOT_CONNECTED
    return Promise.resolve({ data: {} })
  })
}

function wrap(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/settings/integrations" element={<IntegrationsSettings />} />
              <Route path="/settings/integrations/fathom" element={<FathomMeetings />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

describe('Phase 4c — Integrações', () => {
  usePortuguese()
  beforeEach(() => {
    vi.clearAllMocks()
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.releasePointerCapture = () => undefined
    Element.prototype.scrollIntoView = () => undefined
    status = NOT_CONNECTED
    meetings = [MEETING]
    mockApi()
  })

  describe('Integrações', () => {
    it('shows Fathom as a row with its status and one action that starts the connection', async () => {
      const user = userEvent.setup()
      wrap('/settings/integrations')
      expect(screen.getByRole('heading', { name: 'Integrações', level: 1 })).toBeInTheDocument()
      expect(screen.getByText('Configurações')).toBeInTheDocument()
      expect(await screen.findByText('Não conectado')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Fathom' })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Conectar ao Fathom' }))
      expect(api.get).toHaveBeenCalledWith('/integrations/fathom/connect')
      expect(await screen.findByRole('button', { name: /Abrindo o Fathom/ })).toBeDisabled()
      expect(screen.queryByRole('button', { name: 'Desconectar' })).not.toBeInTheDocument()
    })

    it('finishes the OAuth flow with the nonce and shows the account', async () => {
      wrap('/settings/integrations?fathom=pending&nonce=n-1')
      expect(await screen.findByText('Conta do Fathom conectada.')).toBeInTheDocument()
      expect(api.post).toHaveBeenCalledWith('/integrations/fathom/confirm', { nonce: 'n-1' })
      expect(await screen.findByText('Conectado como gabriela@soubim.com')).toBeInTheDocument()
      expect(screen.getByText('Conectado em 06/10/2026')).toBeInTheDocument()
      expect(screen.getByText('Conectado')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Ver reuniões do Fathom' })).toHaveAttribute('href', '/settings/integrations/fathom')
    })

    it('explains a connection started by another account', async () => {
      wrap('/settings/integrations?fathom=error&reason=other_user')
      expect(await screen.findByRole('alert')).toHaveTextContent('iniciada por outra conta do Promem')
    })

    it('asks to reconnect when the connection expired', async () => {
      status = { ...CONNECTED, needs_reconnect: true }
      wrap('/settings/integrations')
      expect(await screen.findByText('A conexão expirou. Reconecte sua conta do Fathom.')).toBeInTheDocument()
      expect(screen.getByText('Conexão expirada')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Reconectar' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Desconectar' })).toBeInTheDocument()
    })

    it('says when the integration is not available, with no actions', async () => {
      status = { ...NOT_CONNECTED, configured: false }
      wrap('/settings/integrations')
      expect(await screen.findByText('A integração com o Fathom ainda não está disponível neste servidor.')).toBeInTheDocument()
      expect(screen.getByText('Indisponível')).toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('offers "Tentar de novo" when the status cannot be loaded', async () => {
      api.get.mockImplementation((url: string) =>
        url === '/integrations/fathom/projects' ? Promise.resolve({ data: PROJECTS }) : Promise.reject(new Error('boom')),
      )
      const user = userEvent.setup()
      wrap('/settings/integrations')
      expect(await screen.findByText('Não foi possível carregar o status da integração.')).toBeInTheDocument()
      mockApi()
      await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
      expect(await screen.findByText('Não conectado')).toBeInTheDocument()
    })

    it('disconnects only after confirming in a dialog that names the action', async () => {
      status = CONNECTED
      const user = userEvent.setup()
      wrap('/settings/integrations')
      await user.click(await screen.findByRole('button', { name: 'Desconectar' }))
      const dialog = await screen.findByRole('dialog', { name: 'Desconectar o Fathom?' })
      expect(within(dialog).getByText(/As reuniões já importadas continuam no Promem/)).toBeInTheDocument()
      expect(api.delete).not.toHaveBeenCalled()
      await user.click(within(dialog).getByRole('button', { name: 'Desconectar o Fathom' }))
      expect(api.delete).toHaveBeenCalledWith('/integrations/fathom')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
      expect(await screen.findByText('Não conectado')).toBeInTheDocument()
    })

    it('turns on the automatic import and saves it', async () => {
      status = CONNECTED
      const user = userEvent.setup()
      wrap('/settings/integrations')
      const form = await screen.findByRole('form', { name: 'Importação automática' })
      await user.click(within(form).getByRole('checkbox', { name: 'Importar novas reuniões do Fathom automaticamente' }))
      expect(within(form).getByRole('radio', { name: /Interna/ })).toBeChecked()
      await user.click(within(form).getByRole('radio', { name: /Compartilhada/ }))
      await user.click(within(form).getByRole('button', { name: 'Salvar' }))
      await waitFor(() => expect(api.put).toHaveBeenCalledWith('/integrations/fathom/auto-import', { enabled: true, visibility: 'shared' }))
      expect(await within(form).findByRole('status')).toHaveTextContent('Configuração de importação automática salva.')
    })
  })

  describe('Reuniões do Fathom', () => {
    it('lists the meetings as rows with meta, the import status and the back link', async () => {
      status = CONNECTED
      wrap('/settings/integrations/fathom')
      expect(screen.getByRole('heading', { name: 'Reuniões do Fathom', level: 1 })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Integrações' })).toHaveAttribute('href', '/settings/integrations')
      expect(await screen.findByText('Coordenação de fachada')).toBeInTheDocument()
      expect(screen.getByText('01/10 às 13:00 · 45 min · 1 convidado')).toBeInTheDocument()
      expect(screen.getByText('Importada em Residential Tower Alpha')).toBeInTheDocument()
      expect(screen.getByText('Pendente')).toBeInTheDocument()
      expect(screen.getByText('Google Meet')).toBeInTheDocument()
    })

    it('imports into a project picked in the dialog', async () => {
      status = CONNECTED
      const user = userEvent.setup()
      wrap('/settings/integrations/fathom')
      await user.click(await screen.findByRole('button', { name: 'Importar: Coordenação de fachada' }))
      const dialog = await screen.findByRole('dialog', { name: 'Importar reunião' })
      expect(within(dialog).getByRole('button', { name: 'Importar' })).toBeDisabled()
      await user.click(await within(dialog).findByRole('combobox', { name: 'Projeto' }))
      expect(await screen.findByRole('option', { name: 'Residential Tower Alpha (já importada)' })).toHaveAttribute('aria-disabled', 'true')
      await user.click(screen.getByRole('option', { name: 'Casa Verde' }))
      expect(within(dialog).getByRole('radio', { name: /Compartilhada/ })).toBeDisabled()
      expect(within(dialog).getByText('Só administradores da sua organização podem importar uma reunião como compartilhada.')).toBeInTheDocument()
      await user.click(within(dialog).getByRole('button', { name: 'Importar' }))
      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith('/integrations/fathom/imports', { recording_id: '123', project_id: 'p2', visibility: 'internal' }),
      )
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('filters the loaded meetings and offers to clear the search', async () => {
      status = CONNECTED
      const user = userEvent.setup()
      wrap('/settings/integrations/fathom')
      const search = await screen.findByRole('searchbox', { name: 'Buscar por título ou participante' })
      await screen.findByText('Coordenação de fachada')
      await user.type(search, 'nada disso')
      expect(screen.getByText('Nenhuma reunião carregada corresponde à busca.')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Limpar busca' }))
      expect(screen.getByText('Coordenação de fachada')).toBeInTheDocument()
    })

    it('says what will appear when the account has no meetings', async () => {
      status = CONNECTED
      meetings = []
      wrap('/settings/integrations/fathom')
      expect(await screen.findByText('Nenhuma reunião encontrada na sua conta do Fathom.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Atualizar lista' })).toBeInTheDocument()
    })

    it('points to Integrações when the account is not connected', async () => {
      wrap('/settings/integrations/fathom')
      expect(await screen.findByText('Conecte sua conta do Fathom para ver suas reuniões.')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Ir para Integrações' })).toHaveAttribute('href', '/settings/integrations')
      expect(api.get).not.toHaveBeenCalledWith('/integrations/fathom/meetings', expect.anything())
    })
  })
})
