/**
 * Promem revamp Phase 3f: share dialog, the public milestone page (incl. expired and revoked
 * links) and the Escritório branding settings (pt-BR).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import * as apiModule from '../../services/api'
import { ToastProvider, TooltipProvider } from '../../design-system'
import PublicTimeline from '../../pages/PublicTimeline'
import WorkspaceSettings from '../../pages/WorkspaceSettings'
import { ShareMilestonesDialog } from '../../components/organisms/ShareMilestonesDialog'
import { useAuthStore } from '../../store/authStore'
import { usePortuguese } from '../design-system/render'
import { PROJECT, STAGES, item } from './fixtures'

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
vi.mock('../../lib/exportTimeline', () => ({ exportAsPDF: vi.fn().mockResolvedValue(undefined) }))
const api = apiModule.default as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', ReturnType<typeof vi.fn>>

const ORG = { id: 'o1', name: 'Escritório Exemplo', tagline: 'Arquitetura e coordenação BIM', contact_email: 'contato@exemplo.com', logo: null }
const httpError = (status: number, detail?: unknown) => Object.assign(new Error(String(status)), { isAxiosError: true, response: { status, data: { detail } } })

const PUBLIC = {
  project: { id: 'p1', name: 'Residential Tower Alpha', description: 'Torre residencial' },
  organization: ORG,
  shared_by: 'Gabriela',
  link: { created_at: '2026-03-01T00:00:00', expires_at: null },
  updated_at: '2026-03-02T10:00:00',
  stages: STAGES.map((s, i) => ({ id: s.id, stage_name: s.name, stage_from: s.start, stage_to: s.end, sort_order: i })),
  milestones: [
    { id: 'm1', statement: 'Aprovar a fachada ventilada', title: 'Fachada ventilada aprovada', item_type: 'decision', why: 'Reduz a carga térmica', who: 'Carlos', date: '2026-02-20T10:00:00', is_done: false, affected_disciplines: ['architecture'] },
  ],
}

let links: unknown[] = []
function mockApi() {
  api.get.mockImplementation((url: string) => {
    if (url === '/projects/p1') return Promise.resolve({ data: { ...PROJECT, organization: ORG } })
    if (url.startsWith('/projects/p1/items')) return Promise.resolve({ data: { items: [item({ is_milestone: true }), item()], total: 2, limit: 100, offset: 0 } })
    if (url === '/projects/p1/milestones/share') return Promise.resolve({ data: { links } })
    if (url === '/organizations/me') return Promise.resolve({ data: [{ id: 'o1', name: 'Escritório Exemplo', slug: 'x', role: 'admin', status: 'active' }] })
    if (url === '/organizations/o1/branding') return Promise.resolve({ data: ORG })
    if (url === '/shared/milestones/ok') return Promise.resolve({ data: PUBLIC })
    if (url === '/shared/milestones/old') return Promise.reject(httpError(410, { code: 'expired', expired_at: '2026-02-01T00:00:00', project: 'Residential Tower Alpha', organization: ORG }))
    if (url === '/shared/milestones/gone') return Promise.reject(httpError(404))
    return Promise.reject(new Error(`unexpected GET ${url}`))
  })
  api.post.mockImplementation(() => {
    links = [{ share_token: 'tok', created_at: '2026-03-03T00:00:00', expires_at: '2026-04-02T00:00:00', view_count: 0, resource_type: 'milestones' }]
    return Promise.resolve({ data: {} })
  })
  api.patch.mockResolvedValue({ data: {} })
  api.put.mockResolvedValue({ data: ORG })
  api.delete.mockImplementation(() => {
    links = []
    return Promise.resolve({ data: {} })
  })
}

function wrap(ui: React.ReactNode, path = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/m/:token" element={<PublicTimeline />} />
              <Route path="*" element={ui} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

describe('Phase 3f', () => {
  usePortuguese()
  beforeEach(() => {
    vi.clearAllMocks()
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.releasePointerCapture = () => undefined
    Element.prototype.scrollIntoView = () => undefined
    links = []
    useAuthStore.setState({ isAuthenticated: true })
    mockApi()
  })

  describe('Compartilhar marcos', () => {
    it('creates a 30-day link, then shows it with the expiry, views and revoke', async () => {
      const user = userEvent.setup()
      wrap(<ShareMilestonesDialog projectId="p1" open onOpenChange={() => undefined} />)
      expect(await screen.findByText('Compartilhar marcos')).toBeInTheDocument()
      expect(await screen.findByText('Escritório Exemplo')).toBeInTheDocument()
      await user.click(await screen.findByRole('button', { name: 'Criar link' }))
      expect(api.post).toHaveBeenCalledWith('/projects/p1/milestones/share', { expires_in_days: 30 })
      expect(await screen.findByRole('button', { name: 'Copiar link' })).toBeInTheDocument()
      expect((screen.getByLabelText('Link público') as HTMLInputElement).value).toMatch(/\/m\/tok$/)
      expect(screen.getByText('Ainda não foi visualizado')).toBeInTheDocument()
      expect(screen.getByText(/válido até/)).toBeInTheDocument()
    })

    it('switches the link to never expire', async () => {
      links = [{ share_token: 'tok', created_at: null, expires_at: '2026-04-02T00:00:00', view_count: 3, resource_type: 'milestones' }]
      const user = userEvent.setup()
      wrap(<ShareMilestonesDialog projectId="p1" open onOpenChange={() => undefined} />)
      await user.click(await screen.findByRole('combobox', { name: 'Expira em' }))
      await user.click(await screen.findByRole('option', { name: 'Nunca' }))
      expect(api.patch).toHaveBeenCalledWith('/projects/p1/milestones/share/tok', { expires_in_days: null })
      expect(screen.getByText('vezes', { exact: false })).toBeInTheDocument()
    })

    it('revokes only after confirming', async () => {
      links = [{ share_token: 'tok', created_at: null, expires_at: null, view_count: 0, resource_type: 'milestones' }]
      const user = userEvent.setup()
      wrap(<ShareMilestonesDialog projectId="p1" open onOpenChange={() => undefined} />)
      expect(await screen.findByText('não expira')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Revogar link' }))
      expect(api.delete).not.toHaveBeenCalled()
      expect(await screen.findByText('Revogar o link público?')).toBeInTheDocument()
      const confirm = screen.getAllByRole('button', { name: 'Revogar link' }).at(-1)!
      await user.click(confirm)
      expect(api.delete).toHaveBeenCalledWith('/projects/p1/milestones/share/tok')
      expect(await screen.findByText('Link revogado')).toBeInTheDocument()
    })
  })

  describe('Página pública', () => {
    it('leads with the firm, shows the milestones with their why and the link footer', async () => {
      wrap(null, '/m/ok')
      expect(await screen.findByRole('heading', { name: 'Residential Tower Alpha' })).toBeInTheDocument()
      expect(screen.getAllByText('Escritório Exemplo').length).toBeGreaterThan(0)
      expect(screen.getByText('Arquitetura e coordenação BIM')).toBeInTheDocument()
      expect(screen.getByText('Fachada ventilada aprovada')).toBeInTheDocument()
      expect(screen.getByText('Reduz a carga térmica')).toBeInTheDocument()
      expect(screen.getByText('Compartilhado por Gabriela · Escritório Exemplo')).toBeInTheDocument()
      expect(screen.getByText('Link sem data de expiração')).toBeInTheDocument()
      expect(screen.getByText('Feito com')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Baixar PDF' })).toBeInTheDocument()
    })

    it('says whom to ask when the link expired', async () => {
      wrap(null, '/m/old')
      expect(await screen.findByRole('heading', { name: 'Este link expirou' })).toBeInTheDocument()
      expect(screen.getByText(/Peça um novo link a Escritório Exemplo/)).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'contato@exemplo.com' })).toHaveAttribute('href', 'mailto:contato@exemplo.com')
    })

    it('shows the unavailable state for revoked links', async () => {
      wrap(null, '/m/gone')
      expect(await screen.findByRole('heading', { name: 'Link indisponível' })).toBeInTheDocument()
    })
  })

  describe('Escritório', () => {
    it('loads the branding and saves tagline and contact', async () => {
      const user = userEvent.setup()
      wrap(<WorkspaceSettings />)
      const tagline = await screen.findByDisplayValue('Arquitetura e coordenação BIM')
      await user.clear(tagline)
      await user.type(tagline, 'Projetos BIM')
      await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
      await waitFor(() =>
        expect(api.put).toHaveBeenCalledWith('/organizations/o1/branding', { tagline: 'Projetos BIM', contact_email: 'contato@exemplo.com', logo: null }),
      )
      expect(await screen.findByText('Marca salva')).toBeInTheDocument()
    })

    it('rejects a logo over 300 KB', async () => {
      const user = userEvent.setup()
      wrap(<WorkspaceSettings />)
      await screen.findByDisplayValue('Arquitetura e coordenação BIM')
      const big = new File([new Uint8Array(301 * 1024)], 'logo.png', { type: 'image/png' })
      await user.upload(screen.getByTestId('logo-input'), big)
      expect(screen.getByText('O arquivo passa de 300 KB. Use uma versão menor.')).toBeInTheDocument()
    })
  })
})
