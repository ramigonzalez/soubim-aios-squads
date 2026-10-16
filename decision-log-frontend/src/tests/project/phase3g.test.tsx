/**
 * Promem revamp Phase 3g: the mobile pass (pt-BR, ≤ 767 px). Filter sheet with "Ver N itens",
 * full-screen detail with Anterior / Próximo, the stage card and tile shortcuts on Visão geral,
 * Mais → approvals (sources, Recusar / Aprovar with Desfazer) and the mobile project header.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import * as apiModule from '../../services/api'
import { ToastProvider, TooltipProvider } from '../../design-system'
import { ItemDetailPanel } from '../../components/organisms/ItemDetailPanel'
import ProjectApprovals from '../../pages/ProjectApprovals'
import ProjectHistory from '../../pages/ProjectHistory'
import ProjectMore from '../../pages/ProjectMore'
import ProjectOverview from '../../pages/ProjectOverview'
import { useAuthStore } from '../../store/authStore'
import { usePortuguese } from '../design-system/render'
import { PROJECT, TODAY, item } from './fixtures'

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
const api = apiModule.default as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', ReturnType<typeof vi.fn>>

const ITEMS = [
  item({ id: 'a1', statement: 'Shaft de prumadas ampliado', affected_disciplines: ['structural'], created_at: '2026-03-02T09:00:00', is_milestone: true }),
  item({ id: 'a2', statement: 'Paleta da fachada', affected_disciplines: ['architecture'], created_at: '2026-03-01T09:00:00' }),
  item({ id: 'a3', statement: 'Enviar memorial', item_type: 'action_item', owner: 'Lucia', due_date: '2026-02-20', affected_disciplines: ['structural'], created_at: '2026-02-01T09:00:00' }),
]
const base = { project_id: 'p1', project_name: 'Residential Tower Alpha', status: 'pending', included: false, created_at: '2026-03-02T14:05:00', approved_by_name: null, approved_at: null, rejected_by_name: null, rejected_at: null, extraction_error: null, extracted_item_count: 0, can_review: true, candidates_ready: true }
const PENDING = [
  {
    ...base, id: 'm1', source_type: 'meeting', ai_summary: null, call_id: '', title: 'Coordenação MEP', meeting_date: '2026-03-03T10:00:00', meeting_type: '', source_label: 'Fathom', transcript_url: null,
    routing: { confidence: 'high', reasons: [] },
    candidates: [
      { type: 'decision', title: 'Reservar 40 cm acima do forro', discipline: 'mep' },
      { type: 'action_item', title: 'Revisar a ligação viga-pilar', discipline: 'structural' },
      { type: 'topic', title: 'Quadro elétrico do térreo', discipline: 'electrical' },
      { type: 'idea', title: 'Shaft extra', discipline: 'mep' },
    ],
  },
  { ...base, id: 'e1', source_type: 'email', ai_summary: 'Carlos pergunta sobre o eixo C.', subject: 'Re: eixo C', email_date: '2026-03-02T10:00:00', candidates: [], flags: [{ kind: 'warn', code: 'lowConfidence' }] },
]

let decided = new Set<string>()
function mockApi() {
  decided = new Set()
  api.get.mockImplementation((url: string) => {
    const data = (() => {
      if (url === '/projects/p1') return PROJECT
      if (url.startsWith('/projects/p1/items')) return { items: ITEMS, total: ITEMS.length, limit: 200, offset: 0 }
      if (url === '/projects/p1/participants') return { participants: [] }
      if (url === '/ingestion') {
        const sources = PENDING.filter((s) => !decided.has(s.id))
        return { sources, total: sources.length, pending_count: sources.length }
      }
      if (url === '/ingestion/count') return { pending: 2 }
      if (url === '/organizations/me') return [{ id: 'o1', name: 'Escritório Exemplo', slug: 'x', role: 'admin', status: 'active' }]
      if (url === '/projects') return { projects: [{ id: 'p1', name: 'Residential Tower Alpha', pending_ingestion: 2 }], total: 1, limit: 100, offset: 0 }
      if (url.endsWith('/similar')) return { items: [] }
      throw new Error(`unexpected GET ${url}`)
    })()
    return Promise.resolve({ data })
  })
  api.post.mockImplementation((url: string, body: { source_ids?: string[] }) => {
    if (url === '/ingestion/undo') {
      body.source_ids?.forEach((id) => decided.delete(id))
      return Promise.resolve({ data: { undone: body.source_ids, too_late: [] } })
    }
    return Promise.resolve({ data: { last_visit_at: '2026-02-27T10:00:00', visited_at: '2026-03-03T12:00:00' } })
  })
  api.patch.mockImplementation((url: string) => {
    decided.add(url.split('/').pop()!)
    return Promise.resolve({ data: {} })
  })
}

function Where() {
  const location = useLocation()
  return <p data-testid="where">{`${location.pathname}${location.search}`}</p>
}

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/projects/:id/overview" element={<><ProjectOverview /><Where /></>} />
              <Route path="/projects/:id/history" element={<><ProjectHistory /><Where /></>} />
              <Route path="/projects/:id/more" element={<><ProjectMore /><Where /></>} />
              <Route path="/projects/:id/approvals" element={<><ProjectApprovals /><Where /></>} />
              <Route path="*" element={<Where />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

const desktopMatchMedia = window.matchMedia
function phone() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('max-width: 767px'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia
}

describe('Phase 3g · mobile', () => {
  usePortuguese()
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(TODAY)
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.releasePointerCapture = () => undefined
    Element.prototype.scrollIntoView = () => undefined
    useAuthStore.setState({ isAuthenticated: true })
    phone()
    mockApi()
  })
  afterEach(() => {
    vi.useRealTimers()
    window.matchMedia = desktopMatchMedia
  })

  describe('Histórico', () => {
    it('filters in a bottom sheet and shows "Ver N itens"', async () => {
      const user = userEvent.setup()
      renderAt('/projects/p1/history')
      await screen.findByText('Shaft de prumadas ampliado')
      // on phones the top bar names the project; the h1 stays for screen readers only
      expect(screen.getByRole('heading', { level: 1 })).toHaveClass('sr-only')
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Histórico do projeto · Residential Tower Alpha')
      expect(screen.getByRole('button', { name: 'Adicionar item' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Filtros' }))
      const sheet = await screen.findByRole('dialog', { name: 'Filtros' })
      expect(within(sheet).getByText('Disciplina')).toBeInTheDocument()
      // the 5 canonical types
      for (const type of ['Decisão', 'Ação', 'Tópico', 'Ideia', 'Informação']) expect(within(sheet).getByRole('button', { name: type })).toBeInTheDocument()

      await user.click(within(sheet).getByRole('button', { name: 'Estrutura' }))
      expect(within(sheet).getByRole('button', { name: 'Estrutura' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByTestId('where')).toHaveTextContent('disc=structural')
      await user.click(within(sheet).getByRole('button', { name: 'Ver 2 itens' }))
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Filtros' })).not.toBeInTheDocument())
      expect(screen.getByRole('button', { name: 'Filtros · 1' })).toBeInTheDocument()
      expect(screen.queryByText('Paleta da fachada')).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'Filtros · 1' }))
      await user.click(within(await screen.findByRole('dialog', { name: 'Filtros' })).getByRole('button', { name: 'Limpar' }))
      expect(screen.getByTestId('where')).not.toHaveTextContent('disc=')
    })

    it('opens the item full screen with Anterior / Próximo', async () => {
      const user = userEvent.setup()
      renderAt('/projects/p1/history')
      await user.click(await screen.findByText('Shaft de prumadas ampliado'))
      const detail = await screen.findByRole('dialog')
      expect(within(detail).getByRole('button', { name: 'Anterior' })).toBeDisabled()
      await user.click(within(detail).getByRole('button', { name: 'Próximo' }))
      expect(screen.getByTestId('where')).toHaveTextContent('item=a2')
      await user.click(within(detail).getByRole('button', { name: 'Anterior' }))
      expect(screen.getByTestId('where')).toHaveTextContent('item=a1')
      await user.click(within(detail).getByRole('button', { name: 'Voltar' }))
      expect(screen.getByTestId('where')).not.toHaveTextContent('item=')
    })
  })

  describe('Detalhe', () => {
    it('has a 44 px "Ouvir trecho" and the "Concluir ação" toggle', async () => {
      const user = userEvent.setup()
      const onToggleDone = vi.fn()
      const action = item({ id: 'x1', statement: 'Enviar memorial', item_type: 'action_item', timestamp: '00:08:30' })
      render(
        <QueryClientProvider client={new QueryClient()}>
          <ToastProvider>
            <MemoryRouter>
              <ItemDetailPanel
                projectId="p1" open item={action} stages={[]} canManage canReview={false}
                hasPrevious={false} hasNext={false} onPrevious={vi.fn()} onNext={vi.fn()} onClose={vi.fn()}
                onOpenItem={vi.fn()} onToggleMilestone={vi.fn()} onToggleDone={onToggleDone}
              />
            </MemoryRouter>
          </ToastProvider>
        </QueryClientProvider>,
      )
      expect(screen.getByRole('link', { name: /Ouvir trecho · 00:08:30/ })).toHaveAttribute('href', '/projects/p1/meetings/s1?t=510')
      await user.click(screen.getByRole('button', { name: 'Concluir ação' }))
      expect(onToggleDone).toHaveBeenCalledWith(action)
      expect(screen.getByRole('button', { name: 'Copiar link do item' })).toBeInTheDocument()
    })
  })

  describe('Visão geral', () => {
    it('shows the stage card and "em aberto" opens Histórico filtered to Ações', async () => {
      const user = userEvent.setup()
      renderAt('/projects/p1/overview')
      expect(await screen.findByText('Etapas do projeto')).toBeInTheDocument()
      expect(screen.getByText(/Hoje 03\/03 · \d+% da etapa · entrega em 31\/03/)).toBeInTheDocument()
      expect(await screen.findByText('1 atrasada')).toBeInTheDocument()
      await user.click(screen.getByRole('tab', { name: /em aberto/ }))
      expect(screen.getByTestId('where')).toHaveTextContent('/projects/p1/history?type=action_item')
    })

    it('"aguardando aprovação" opens the approvals list', async () => {
      const user = userEvent.setup()
      renderAt('/projects/p1/overview')
      await user.click(await screen.findByRole('tab', { name: /aguardando aprovação/ }))
      expect(screen.getByTestId('where')).toHaveTextContent('/projects/p1/approvals')
    })
  })

  describe('Mais → Aguardando aprovação', () => {
    it('Mais lists approvals and Editar projeto', async () => {
      const user = userEvent.setup()
      renderAt('/projects/p1/more')
      expect(await screen.findByRole('button', { name: /Editar projeto/ })).toBeInTheDocument()
      await user.click(await screen.findByRole('button', { name: /Aguardando aprovação/ }))
      expect(screen.getByTestId('where')).toHaveTextContent('/projects/p1/approvals')
    })

    it('approves sources (not items) with Desfazer, and rejects with Recusar', async () => {
      const user = userEvent.setup()
      renderAt('/projects/p1/approvals')
      expect(await screen.findByRole('heading', { name: 'Aguardando aprovação' })).toBeInTheDocument()
      expect(await screen.findByText('Reunião · Coordenação MEP · 03/03')).toBeInTheDocument()
      expect(screen.getByText('Reservar 40 cm acima do forro')).toBeInTheDocument()
      expect(screen.getByText('+ 1 item')).toBeInTheDocument()
      expect(screen.getByText('Confiança alta')).toBeInTheDocument()
      expect(screen.getByText('Carlos pergunta sobre o eixo C.')).toBeInTheDocument()
      expect(screen.queryByText('Descartar')).not.toBeInTheDocument()

      const meeting = screen.getByText('Reunião · Coordenação MEP · 03/03').closest('li')!
      await user.click(within(meeting).getByRole('button', { name: 'Aprovar' }))
      expect(api.patch).toHaveBeenCalledWith('/ingestion/m1', { ingestion_status: 'approved', project_id: 'p1' })
      await waitFor(() => expect(screen.queryByText('Reunião · Coordenação MEP · 03/03')).not.toBeInTheDocument())
      await user.click(await screen.findByRole('button', { name: 'Desfazer' }))
      expect(api.post).toHaveBeenCalledWith('/ingestion/undo', { source_ids: ['m1'] })
      expect(await screen.findByText('Reunião · Coordenação MEP · 03/03')).toBeInTheDocument()

      const email = screen.getByText('E-mail · Re: eixo C · 02/03').closest('li')!
      await user.click(within(email).getByRole('button', { name: 'Recusar' }))
      expect(api.patch).toHaveBeenCalledWith('/ingestion/e1', { ingestion_status: 'rejected' })
    })

    it('shows the empty state when nothing is pending', async () => {
      decided = new Set(['m1', 'e1'])
      renderAt('/projects/p1/approvals')
      expect(await screen.findByText('Nada aguardando aprovação')).toBeInTheDocument()
    })
  })
})
