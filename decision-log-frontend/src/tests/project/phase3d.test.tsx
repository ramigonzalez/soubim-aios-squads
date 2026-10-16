/**
 * Promem revamp Phase 3d: Ingestão inbox (pt-BR).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import * as apiModule from '../../services/api'
import { ToastProvider, TooltipProvider } from '../../design-system'
import IngestionInbox from '../../pages/IngestionInbox'
import { useIngestionStore } from '../../store/ingestionStore'
import { usePortuguese } from '../design-system/render'

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
const api = apiModule.default as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', ReturnType<typeof vi.fn>>

const base = { project_name: 'Residential Tower Alpha', status: 'pending', included: false, created_at: '2026-03-02T14:05:00', approved_by_name: null, approved_at: null, rejected_by_name: null, rejected_at: null, extraction_error: null, extracted_item_count: 0, can_review: true, can_manage: true, candidates_ready: true }
const MEETING = {
  ...base, id: 'm1', project_id: 'p1', source_type: 'meeting', ai_summary: 'Antecipação da abertura do pódio.', call_id: '', title: 'Revisão do pódio com o cliente', meeting_date: '2026-03-02T14:00:00', meeting_type: '', source_label: 'Fireflies', transcript_url: 'https://fireflies.ai/x',
  routing: { confidence: 'high', reasons: [{ code: 'fathom_rule', field: 'title', operator: 'contains', value: 'pódio' }, { code: 'participants_overlap', count: 3, total: 4 }] },
  flags: [{ kind: 'info', code: 'external', count: 1, names: ['Ana'] }, { kind: 'warn', code: 'duplicate', title: 'Revisão do pódio', date: '2026-03-02T11:02:00' }],
  preview: [{ at: '0:02:10', who: 'Ana', text: 'Precisamos abrir as lojas em setembro.' }],
  participants: ['Gabriela', 'Carlos', 'Ana'], duration_minutes: 52,
  candidates: [{ type: 'decision', title: 'Abrir as lojas do pódio em setembro', discipline: 'client' }, { type: 'action_item', title: 'Revisar vigas de transição', discipline: 'structural' }],
}
const EMAIL = { ...base, id: 'e1', project_id: 'p2', project_name: 'Commercial Plaza Beta', source_type: 'email', ai_summary: null, email_id: 't', email_date: '2026-03-01T09:00:00', subject: 'Prazo do granito', from_address: 'pedras@sp.com', recipient_count: 2, thread_url: null, routing: { confidence: 'low', reasons: [] }, flags: [{ kind: 'warn', code: 'lowConfidence' }], preview: [], participants: [], candidates: null, candidates_ready: false }
const PARKED = { id: 'f9', recording_id: 'r9', title: 'Semanal sem projeto', started_at: '2026-03-02T09:00:00', reason: 'no_match', received_at: '2026-03-02T09:30:00' }

function mockApi() {
  // decided sources leave the pending list until undone, like the backend
  const decided = new Set<string>()
  api.get.mockImplementation((url: string) => {
    const data = (() => {
      if (url === '/ingestion') {
        const sources = [MEETING, EMAIL].filter((s) => !decided.has(s.id))
        return { sources, total: sources.length, pending_count: sources.length }
      }
      if (url === '/ingestion/history') return { sources: [{ ...MEETING, id: 'h1', status: 'processed', approved_by_name: 'Gabriela', approved_at: '2026-03-02T10:00:00', extracted_item_count: 4 }], total: 1 }
      if (url === '/integrations/fathom/unassigned') return [PARKED]
      if (url === '/projects') return { projects: [{ id: 'p1', name: 'Residential Tower Alpha', access_level: 'admin' }, { id: 'p2', name: 'Commercial Plaza Beta', access_level: 'admin' }], total: 2, limit: 100, offset: 0 }
      if (url === '/organizations/me') return [{ id: 'o1', name: 'Escritório Exemplo', slug: 'x', role: 'admin', status: 'active' }]
      if (url === '/ingestion/count') return { pending: 2 }
      throw new Error(`unexpected GET ${url}`)
    })()
    return Promise.resolve({ data })
  })
  api.patch.mockImplementation((url: string) => {
    decided.add(url.split('/').pop()!)
    return Promise.resolve({ data: {} })
  })
  api.post.mockImplementation((url: string, body: { source_ids?: string[] }) => {
    if (url === '/ingestion/undo') {
      body.source_ids?.forEach((id) => decided.delete(id))
      return Promise.resolve({ data: { undone: body.source_ids, too_late: [] } })
    }
    body.source_ids?.forEach((id) => decided.add(id))
    return Promise.resolve({ data: { updated: body.source_ids?.length ?? 0 } })
  })
}

function renderInbox(path = '/ingestion') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[path]}>
            <IngestionInbox />
          </MemoryRouter>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

describe('Phase 3d · Ingestão', () => {
  usePortuguese()
  beforeEach(() => {
    vi.clearAllMocks()
    // Radix Select uses pointer capture and scrollIntoView, which happy-dom lacks
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.releasePointerCapture = () => undefined
    Element.prototype.scrollIntoView = () => undefined
    useIngestionStore.setState({ activeTab: 'pending', filters: { project_id: null, source_type: null, date_from: null, date_to: null } })
    mockApi()
  })

  it('shows what is being approved: summary, candidates, excerpt, reasons and flags', async () => {
    const user = userEvent.setup()
    renderInbox()
    await user.click(await screen.findByRole('option', { name: /Revisão do pódio com o cliente/ }))
    const panel = await screen.findByRole('complementary', { name: 'Revisão do pódio com o cliente' })
    expect(within(panel).getByText('Antecipação da abertura do pódio.')).toBeInTheDocument()
    expect(within(panel).getByText('Abrir as lojas do pódio em setembro')).toBeInTheDocument()
    expect(within(panel).getByText('Prévia feita a partir do resumo. Os itens finais são extraídos depois da aprovação.')).toBeInTheDocument()
    expect(within(panel).getByText('Precisamos abrir as lojas em setembro.')).toBeInTheDocument()
    expect(within(panel).getByText('Abrir em Fireflies ↗')).toHaveAttribute('href', 'https://fireflies.ai/x')
    expect(within(panel).getByText('Confiança alta')).toBeInTheDocument()
    expect(within(panel).getByText('Regra do projeto: título contém “pódio”')).toBeInTheDocument()
    expect(within(panel).getByText('3 de 4 participantes estão na equipe do projeto')).toBeInTheDocument()
    expect(within(panel).getByText(/1 participante externo \(Ana\)/)).toBeInTheDocument()
    expect(within(panel).getByText(/Possível duplicata de “Revisão do pódio”/)).toBeInTheDocument()
    expect(within(panel).getByText('Escolhido pelas regras do projeto')).toBeInTheDocument()
  })

  it('approves with A, moves on, and undoes from the toast', async () => {
    const user = userEvent.setup()
    renderInbox()
    // the parked Fathom meeting comes first; focus the first source row
    await user.click(await screen.findByRole('option', { name: /Revisão do pódio com o cliente/ }))
    await user.keyboard('a')
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/ingestion/m1', { ingestion_status: 'approved' }))
    expect(await screen.findByText('Aprovado · a IA está extraindo os itens')).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Revisão do pódio com o cliente/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Desfazer' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/ingestion/undo', { source_ids: ['m1'] }))
  })

  it('rejects with R', async () => {
    const user = userEvent.setup()
    renderInbox()
    await user.click(await screen.findByRole('option', { name: /Prazo do granito/ }))
    await user.keyboard('r')
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/ingestion/e1', { ingestion_status: 'rejected' }))
    expect(await screen.findByText('Recusado · não entra no projeto')).toBeInTheDocument()
  })

  it('approves into the project the reviewer chose', async () => {
    const user = userEvent.setup()
    renderInbox()
    await user.click(await screen.findByRole('option', { name: /Prazo do granito/ }))
    const panel = screen.getByRole('complementary', { name: 'Prazo do granito' })
    expect(within(panel).getByText('A IA não tem certeza do projeto. Confirme antes de aprovar.')).toBeInTheDocument()
    expect(within(panel).getByText('A IA está preparando a prévia dos itens…')).toBeInTheDocument()
    await user.click(within(panel).getByRole('combobox', { name: 'Entra no projeto' }))
    await user.click(await screen.findByRole('option', { name: 'Residential Tower Alpha' }))
    expect(within(panel).getByText('Você escolheu este projeto')).toBeInTheDocument()
    await user.click(within(panel).getByRole('button', { name: /Aprovar/ }))
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/ingestion/e1', { ingestion_status: 'approved', project_id: 'p1' }))
  })

  it('approves the selected sources in bulk', async () => {
    const user = userEvent.setup()
    renderInbox()
    await screen.findByRole('option', { name: /Prazo do granito/ })
    await user.click(screen.getByRole('checkbox', { name: 'Selecionar todos' }))
    expect(screen.getByText('2 selecionados')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Aprovar selecionados' }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/ingestion/batch', { source_ids: ['m1', 'e1'], action: 'approve' }))
    expect(await screen.findByText('2 itens aprovados · a IA está extraindo os itens')).toBeInTheDocument()
  })

  it('imports a Fathom meeting without a project once one is chosen', async () => {
    const user = userEvent.setup()
    api.post.mockResolvedValue({ data: {} })
    renderInbox()
    const panel = await screen.findByRole('complementary', { name: 'Semanal sem projeto' })
    expect(within(panel).getByText('Nenhum projeto combina com esta reunião. Escolha um para importar.')).toBeInTheDocument()
    expect(within(panel).getByRole('button', { name: /Importar/ })).toBeDisabled()
    await user.click(within(panel).getByRole('combobox', { name: 'Entra no projeto' }))
    await user.click(await screen.findByRole('option', { name: 'Commercial Plaza Beta' }))
    await user.click(within(panel).getByRole('button', { name: /Importar/ }))
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/integrations/fathom/unassigned/f9/assign', { project_id: 'p2', visibility: 'internal' }))
  })

  it('filters by source type and shows the history with who decided', async () => {
    const user = userEvent.setup()
    renderInbox()
    await screen.findByRole('option', { name: /Prazo do granito/ })
    await user.click(screen.getByRole('radio', { name: 'E-mails' }))
    expect(screen.queryByRole('option', { name: /Revisão do pódio/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Semanal sem projeto/ })).not.toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Todas' }))
    await user.click(screen.getByRole('tab', { name: /Histórico/ }))
    expect(await screen.findByText('por Gabriela · 02/03')).toBeInTheDocument()
    expect(screen.getByText('Processado')).toBeInTheDocument()
  })
})
