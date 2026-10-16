/**
 * Promem revamp Phase 4c: Equipe (settings → team) and Plataforma on the design system (pt-BR).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import * as apiModule from '../../services/api'
import { ToastProvider, TooltipProvider } from '../../design-system'
import TeamSettings from '../../pages/TeamSettings'
import Platform from '../../pages/Platform'
import { useAuthStore } from '../../store/authStore'
import { useOrganizationStore } from '../../store/organizationStore'
import { usePortuguese } from '../design-system/render'

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
const api = apiModule.default as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', ReturnType<typeof vi.fn>>

const MEMBERS = [
  { user_id: 'u1', name: 'Gabriela Souza', email: 'gabriela@soubim.com', role: 'owner', joined_at: '2026-01-01T00:00:00Z' },
  { user_id: 'u2', name: 'Bruno Lima', email: 'bruno@soubim.com', role: 'member', joined_at: '2026-01-02T00:00:00Z' },
]
const TEAM_INVITATIONS = [
  { id: 'i1', email: 'carla@cliente.com', role: 'reviewer', status: 'pending', expires_at: '2026-10-21T00:00:00Z', created_at: '2026-10-14T00:00:00Z' },
]
const ORGS = [
  { id: 'org-1', name: 'Acme', slug: 'acme', status: 'active', created_at: '2026-01-01T00:00:00Z', member_count: 3, project_count: 2, last_activity_at: null },
  { id: 'org-2', name: 'Atrasada Ltda', slug: 'atrasada', status: 'payment_pending', created_at: '2026-02-01T00:00:00Z', member_count: 1, project_count: 0, last_activity_at: null },
]
const COMPANY_INVITATIONS = [
  { id: 'inv-1', organization_id: null, organization_name: 'NovaCo', email: 'ceo@novaco.com', role: 'owner', status: 'pending', expires_at: '2026-10-21T00:00:00Z', created_at: '2026-10-14T00:00:00Z' },
]

let membersFail = false
let organizations: unknown[] = ORGS

function mockApi() {
  api.get.mockImplementation((url: string) => {
    if (url === '/organizations/me') return Promise.resolve({ data: [{ id: 'o1', name: 'Soubim', slug: 'soubim', role: 'owner', status: 'active' }] })
    if (url === '/organizations/o1/members') return membersFail ? Promise.reject(new Error('500')) : Promise.resolve({ data: { members: MEMBERS } })
    if (url === '/organizations/o1/project-assignments') return Promise.resolve({ data: { projects: [], assignments: [] } })
    if (url === '/organizations/o1/invitations') return Promise.resolve({ data: { invitations: TEAM_INVITATIONS } })
    if (url === '/platform/organizations') return Promise.resolve({ data: { organizations } })
    if (url === '/platform/invitations') return Promise.resolve({ data: { invitations: COMPANY_INVITATIONS } })
    return Promise.reject(new Error(`unexpected GET ${url}`))
  })
  api.post.mockResolvedValue({ data: { id: 'i2', email: 'nova@soubim.com', role: 'member', invite_url: 'http://app/invite/xyz' } })
  api.patch.mockResolvedValue({ data: {} })
  api.delete.mockResolvedValue({ data: {} })
}

function wrap(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <ToastProvider>
          <MemoryRouter>{ui}</MemoryRouter>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

describe('Phase 4c — Equipe e Plataforma (pt-BR)', () => {
  usePortuguese()

  beforeEach(() => {
    vi.clearAllMocks()
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.releasePointerCapture = () => undefined
    Element.prototype.scrollIntoView = () => undefined
    membersFail = false
    organizations = ORGS
    localStorage.clear()
    useOrganizationStore.setState({ activeOrganizationId: null })
    useAuthStore.getState().setAuth({ id: 'u1', email: 'gabriela@soubim.com', name: 'Gabriela', role: 'client' }, 'jwt')
    mockApi()
  })

  describe('Equipe', () => {
    it('shows the page anatomy, members as rows and creates an invitation with the link shown once', async () => {
      const user = userEvent.setup()
      wrap(<TeamSettings />)
      expect(screen.getByRole('heading', { level: 1, name: 'Equipe' })).toBeInTheDocument()
      expect(await screen.findByText('Bruno Lima')).toBeInTheDocument()
      expect(screen.getByText('Você')).toBeInTheDocument()
      const remove = screen.getAllByRole('button', { name: 'Remover' })
      expect(remove[0]).toBeDisabled()

      await user.type(screen.getByLabelText('E-mail'), 'nova@soubim.com')
      await user.click(screen.getByRole('combobox', { name: 'Papel' }))
      await user.click(await screen.findByRole('option', { name: 'Revisor(a)' }))
      await user.click(screen.getByRole('button', { name: 'Enviar convite' }))
      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/invitations', { email: 'nova@soubim.com', role: 'reviewer', organization_id: 'o1' }))
      expect(await screen.findByLabelText('Link do convite')).toHaveValue('http://app/invite/xyz')
      expect(screen.getByRole('button', { name: 'Copiar link' })).toBeInTheDocument()
    })

    it('removes a person only after the dialog names the consequence', async () => {
      const user = userEvent.setup()
      wrap(<TeamSettings />)
      await screen.findByText('Bruno Lima')
      await user.click(screen.getAllByRole('button', { name: 'Remover' })[1])
      const dialog = await screen.findByRole('dialog', { name: 'Remover Bruno Lima?' })
      expect(within(dialog).getByText(/perde o acesso a Soubim/)).toBeInTheDocument()
      expect(api.delete).not.toHaveBeenCalled()
      await user.click(within(dialog).getByRole('button', { name: 'Remover pessoa' }))
      await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/organizations/o1/members/u2'))
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('changes a role at once and offers "Desfazer"', async () => {
      const user = userEvent.setup()
      wrap(<TeamSettings />)
      await screen.findByText('Bruno Lima')
      await user.click(screen.getByRole('combobox', { name: 'Papel Bruno Lima' }))
      await user.click(await screen.findByRole('option', { name: 'Administrador(a)' }))
      await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/organizations/o1/members/u2', { role: 'admin' }))
      expect(await screen.findByText('Papel de Bruno Lima alterado para Administrador(a)')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Desfazer' }))
      await waitFor(() => expect(api.patch).toHaveBeenLastCalledWith('/organizations/o1/members/u2', { role: 'member' }))
    })

    it('revokes a pending invitation from a confirmation dialog', async () => {
      const user = userEvent.setup()
      wrap(<TeamSettings />)
      expect(await screen.findByText('carla@cliente.com')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Revogar' }))
      const dialog = await screen.findByRole('dialog', { name: 'Revogar convite?' })
      await user.click(within(dialog).getByRole('button', { name: 'Revogar convite' }))
      await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/invitations/i1'))
    })

    it('shows an error with "Tentar de novo" when the members do not load', async () => {
      membersFail = true
      const user = userEvent.setup()
      wrap(<TeamSettings />)
      expect(await screen.findByText(/Não foi possível carregar os membros/)).toBeInTheDocument()
      membersFail = false
      await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
      expect(await screen.findByText('Bruno Lima')).toBeInTheDocument()
    })
  })

  describe('Plataforma', () => {
    it('lists organizations with a status badge and blocks only after confirming', async () => {
      const user = userEvent.setup()
      wrap(<Platform />)
      expect(screen.getByRole('heading', { level: 1, name: 'Plataforma' })).toBeInTheDocument()
      expect(await screen.findByText('Acme')).toBeInTheDocument()
      expect(screen.getByText('2 organizações clientes')).toBeInTheDocument()
      const lateRow = screen.getByText('Atrasada Ltda').closest('li') as HTMLElement
      expect(within(lateRow).getAllByText('Pagamento pendente').length).toBeGreaterThan(0)

      await user.click(screen.getByRole('combobox', { name: 'Situação de Acme' }))
      await user.click(await screen.findByRole('option', { name: 'Bloqueada' }))
      const dialog = await screen.findByRole('dialog', { name: 'Bloquear Acme?' })
      expect(api.patch).not.toHaveBeenCalled()
      await user.click(within(dialog).getByRole('button', { name: 'Bloquear organização' }))
      await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/platform/organizations/org-1', { status: 'blocked' }))
    })

    it('says what will appear when there are no organizations', async () => {
      organizations = []
      wrap(<Platform />)
      expect(await screen.findByText('Nenhuma organização ainda.')).toBeInTheDocument()
      expect(screen.getByText(/aparecem aqui quando alguém aceita um convite/)).toBeInTheDocument()
    })

    it('revokes a new-company invitation from a confirmation dialog', async () => {
      const user = userEvent.setup()
      wrap(<Platform />)
      expect(await screen.findByText('NovaCo')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Revogar' }))
      const dialog = await screen.findByRole('dialog', { name: 'Revogar convite?' })
      expect(within(dialog).getByText(/a organização não será criada/)).toBeInTheDocument()
      await user.click(within(dialog).getByRole('button', { name: 'Revogar convite' }))
      await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/platform/invitations/inv-1'))
    })
  })
})
