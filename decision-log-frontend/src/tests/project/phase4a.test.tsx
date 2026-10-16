/**
 * Promem revamp Phase 4a: Resumo executivo (pt-BR). Every number comes from the items.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import * as apiModule from '../../services/api'
import { ToastProvider, TooltipProvider } from '../../design-system'
import ProjectSummary, { summarize } from '../../pages/ProjectSummary'
import { usePortuguese } from '../design-system/render'
import { PROJECT, TODAY, item } from './fixtures'

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))
const api = apiModule.default as unknown as Record<'get' | 'post' | 'patch', ReturnType<typeof vi.fn>>

const agree = { status: 'AGREE', notes: null }
const ITEMS = [
  item({ id: 'd1', statement: 'Concreto C50 nos pilares', is_milestone: true, affected_disciplines: ['structural', 'architecture'], consensus: { structural: agree, architecture: agree }, created_at: '2026-03-02T09:00:00' }),
  item({ id: 'd2', statement: 'Fachada ventilada', affected_disciplines: ['architecture'], consensus: { architecture: agree, mep: { status: 'MIXED', notes: 'custo' } }, created_at: '2026-02-01T09:00:00' }),
  item({ id: 'd3', statement: 'Sem consenso registrado', affected_disciplines: ['architecture'], created_at: '2026-02-01T09:00:00' }),
  item({ id: 'a1', statement: 'Análise de carga', item_type: 'action_item', due_date: '2026-02-10', affected_disciplines: ['electrical'], created_at: '2026-02-01T09:00:00' }),
  item({ id: 'a2', statement: 'Enviar memorial', item_type: 'action_item', due_date: '2026-03-20', affected_disciplines: ['structural'], created_at: '2026-02-01T09:00:00' }),
  item({ id: 'a3', statement: 'Ação concluída', item_type: 'action_item', is_done: true, affected_disciplines: ['structural'], created_at: '2026-02-01T09:00:00' }),
  item({ id: 't1', statement: 'Risco de prazo do granito', item_type: 'topic', affected_disciplines: ['client'], impacts: { risk_level: 'high' }, created_at: '2026-02-01T09:00:00' }),
] as ReturnType<typeof item>[]

function Where() {
  const location = useLocation()
  return <p data-testid="where">{`${location.pathname}${location.search}`}</p>
}

function mockApi(items = ITEMS) {
  api.get.mockImplementation((url: string) => {
    const data = (() => {
      if (url === '/projects/p1') return PROJECT
      if (url.startsWith('/projects/p1/items')) return { items, total: items.length, limit: 200, offset: 0 }
      if (url === '/projects/p1/participants') return { participants: [] }
      if (url.endsWith('/similar')) return { items: [] }
      throw new Error(`unexpected GET ${url}`)
    })()
    return Promise.resolve({ data })
  })
  api.post.mockResolvedValue({ data: { last_visit_at: '2026-02-27T10:00:00', visited_at: '2026-03-03T12:00:00' } })
}

function renderSummary() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={['/projects/p1/summary']}>
            <Routes>
              <Route path="/projects/:id/summary" element={<><ProjectSummary /><Where /></>} />
              <Route path="*" element={<Where />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

describe('Phase 4a · Resumo executivo', () => {
  usePortuguese()
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(TODAY)
    mockApi()
  })
  afterEach(() => vi.useRealTimers())

  it('computes every number from the items', () => {
    const n = summarize(ITEMS, new Date('2026-02-27T10:00:00'), TODAY)
    expect(n.captured).toBe(7)
    expect(n.newCount).toBe(1)
    expect(n.decisions).toBe(3)
    expect(n.decisionMilestones).toBe(1)
    expect(n.openActions).toBe(2)
    expect(n.lateActions).toBe(1)
    // only decisions with recorded consensus count; MIXED is not full consensus
    expect(n.withConsensus).toBe(2)
    expect(n.fullConsensus).toBe(1)
    expect(n.mixed).toBe(1)
    // an item counts once in each discipline it affects, largest first; ties keep the canonical order
    expect(n.byDiscipline.slice(0, 2)).toEqual([
      { discipline: 'architecture', count: 3 },
      { discipline: 'structural', count: 3 },
    ])
    expect(n.byDiscipline.at(-1)).toEqual({ discipline: 'client', count: 1 })
  })

  it('shows the KPI row, highlights and the discipline bars', async () => {
    const user = userEvent.setup()
    renderSummary()
    const kpis = await screen.findByLabelText('Indicadores do projeto')
    expect(within(kpis).getByText('Itens capturados')).toBeInTheDocument()
    expect(within(kpis).getByText('+1 desde 27/02')).toBeInTheDocument()
    expect(within(kpis).getByText('1 marcada como marco')).toBeInTheDocument()
    expect(within(kpis).getByText('1 atrasada')).toBeInTheDocument()
    expect(within(kpis).getByText('50%')).toBeInTheDocument()
    expect(within(kpis).getByText('1 com ressalvas')).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'Destaques' })).toBeInTheDocument()
    expect(screen.getByText('Concreto C50 nos pilares')).toBeInTheDocument()
    expect(screen.getByText('Risco de prazo do granito')).toBeInTheDocument()
    expect(screen.getByText('Impacto alto')).toBeInTheDocument()
    expect(screen.queryByText('Enviar memorial')).not.toBeInTheDocument()
    expect(screen.getByText('2 destaques no projeto')).toBeInTheDocument()

    const bars = screen.getByRole('heading', { name: 'Itens por disciplina' }).closest('section')!
    expect(within(bars).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Arquitetura3',
      'Estrutura3',
      'Elétrica1',
      'Cliente1',
    ])

    await user.click(screen.getByText('Concreto C50 nos pilares'))
    expect(screen.getByTestId('where')).toHaveTextContent('item=d1')
  })

  it('says when no decision has consensus recorded', async () => {
    mockApi([ITEMS[2]])
    renderSummary()
    expect(await screen.findByText('nenhuma decisão com consenso registrado')).toBeInTheDocument()
    expect(screen.getByText('Nenhum destaque ainda')).toBeInTheDocument()
  })

  it('has an empty state that points to the Ingestão', async () => {
    const user = userEvent.setup()
    mockApi([])
    renderSummary()
    expect(await screen.findByText('Ainda não há itens neste projeto')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Abrir a Ingestão' }))
    expect(screen.getByTestId('where')).toHaveTextContent('/ingestion?project=p1')
  })
})
