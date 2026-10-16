/**
 * Promem revamp Phase 3a: Visão geral, Marcos, item SidePanel (pt-BR).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import * as apiModule from '../../services/api'
import { OverviewTiles, StageTimeline, ToastProvider, TooltipProvider } from '../../design-system'
import ProjectOverview from '../../pages/ProjectOverview'
import ProjectMilestones from '../../pages/ProjectMilestones'
import { consensusRows, impactRows, isLate, parseExcerpt } from '../../lib/items'
import { usePortuguese } from '../design-system/render'
import { item, PROJECT, TODAY } from './fixtures'

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))
const api = apiModule.default as unknown as Record<'get' | 'post' | 'patch', ReturnType<typeof vi.fn>>

const ITEMS = [
  item({ id: 'new1', statement: 'Concreto C50 nos pilares', created_at: '2026-03-02T09:00:00', is_milestone: true, source: { id: 's1', title: 'Revisão estrutural', type: 'meeting', occurred_at: '2026-03-02T09:00:00' } }),
  item({ id: 'old1', statement: 'Paleta da fachada', created_at: '2026-01-20T09:00:00', is_milestone: true, item_type: 'decision', affected_disciplines: ['architecture'], source: { id: 's2', title: 'Revisão de arquitetura', type: 'meeting', occurred_at: '2026-01-20T09:00:00' } }),
  item({ id: 'late1', statement: 'Análise de carga elétrica', item_type: 'action_item', owner: 'Miguel', due_date: '2026-02-10', created_at: '2026-02-01T09:00:00' }),
  item({ id: 'act1', statement: 'Enviar memorial', item_type: 'action_item', owner: 'Lucia', due_date: '2026-03-20', created_at: '2026-02-01T09:00:00' }),
]

function mockApi({ lastVisit = '2026-02-27T10:00:00' }: { lastVisit?: string | null } = {}) {
  api.get.mockImplementation((url: string) => {
    const data = (() => {
      if (url === '/projects/p1') return PROJECT
      if (url.startsWith('/projects/p1/items?')) return { items: ITEMS, total: ITEMS.length, limit: 200, offset: 0, can_manage: true, can_review: true }
      if (url === '/projects/p1/participants') return { participants: [{ id: 'x', name: 'A' }, { id: 'y', name: 'B' }] }
      if (url === '/ingestion') return { sources: [{ id: 'src9', source_type: 'email', subject: 'Proposta do fornecedor', email_date: '2026-03-02T14:00:00', created_at: '2026-03-02T14:00:00' }], total: 1, pending_count: 1 }
      if (url === '/ingestion/count') return { pending: 4 }
      if (url.endsWith('/similar')) return { items: [] }
      if (url === '/projects/p1/milestones/share') return { links: [] }
      throw new Error(`unexpected GET ${url}`)
    })()
    return Promise.resolve({ data })
  })
  api.post.mockResolvedValue({ data: { last_visit_at: lastVisit, visited_at: '2026-03-03T12:00:00' } })
  api.patch.mockImplementation((_url: string, body: object) => Promise.resolve({ data: { ...ITEMS[0], ...body } }))
}

function Where() {
  const location = useLocation()
  return <p data-testid="where">{`${location.pathname}${location.search}`}</p>
}

function renderPage(path: string, element: JSX.Element) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/projects/:id/overview" element={<>{element}<Where /></>} />
              <Route path="/projects/:id/milestones" element={<>{element}<Where /></>} />
              <Route path="*" element={<Where />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

describe('Phase 3a', () => {
  usePortuguese()
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(TODAY)
    mockApi()
  })
  afterEach(() => vi.useRealTimers())

  describe('lib/items', () => {
    it('reads consensus in both stored shapes', () => {
      expect(consensusRows(item({ consensus: { structural: { status: 'AGREE', notes: 'ok' }, client: 'DISAGREE' } as never }))).toEqual([
        { discipline: 'structural', status: 'AGREE', notes: 'ok' },
        { discipline: 'client', status: 'DISAGREE', notes: null },
      ])
    })
    it('lists impacts by kind', () => {
      expect(impactRows(item({ impacts: { cost_impact: '+5%', scope_impact: 'Pódio', affected_areas: ['Térreo'] } }))).toEqual([
        { kind: 'cost', text: '+5%' },
        { kind: 'scope', text: 'Pódio' },
        { kind: 'areas', text: 'Térreo' },
      ])
    })
    it('marks only open overdue actions as late', () => {
      expect(isLate(ITEMS[2], TODAY)).toBe(true)
      expect(isLate(ITEMS[3], TODAY)).toBe(false)
      expect(isLate({ ...ITEMS[2], is_done: true }, TODAY)).toBe(false)
    })
    it('splits an excerpt into turns', () => {
      expect(parseExcerpt('5:32 - Carlos: C50 nos pilares\nnota solta')).toEqual([
        { time: '5:32', speaker: 'Carlos', text: 'C50 nos pilares' },
        { text: 'nota solta' },
      ])
    })
  })

  describe('design system', () => {
    it('OverviewTiles behave as tabs', async () => {
      const onChange = vi.fn()
      render(
        <OverviewTiles
          label="Visão geral"
          value="a"
          onValueChange={onChange}
          tiles={[
            { key: 'a', value: 3, label: 'novos', note: 'x' },
            { key: 'b', value: 5, label: 'em aberto', note: '1 atrasada', alert: true },
          ]}
        />,
      )
      expect(screen.getByRole('tab', { name: /novos/ })).toHaveAttribute('aria-selected', 'true')
      screen.getByRole('tab', { name: /em aberto/ }).click()
      expect(onChange).toHaveBeenCalledWith('b')
    })

    it('StageTimeline puts the hoje marker among the current stage rows', () => {
      render(
        <StageTimeline
          today={TODAY}
          todayLabel="Hoje · 03/03"
          stages={[
            {
              id: 'ap',
              name: 'Anteprojeto',
              state: 'current',
              milestones: [
                { id: 'a', icon: null, title: 'Antes', date: '01/03', at: new Date(2026, 2, 1) },
                { id: 'b', icon: null, title: 'Depois', date: '10/03', at: new Date(2026, 2, 10) },
              ],
            },
            { id: 'pl', name: 'Projeto Legal', state: 'future', milestones: [], emptyLabel: 'Sem marcos ainda' },
          ]}
        />,
      )
      const text = screen.getByRole('list').textContent ?? ''
      expect(text.indexOf('Antes')).toBeLessThan(text.indexOf('Hoje · 03/03'))
      expect(text.indexOf('Hoje · 03/03')).toBeLessThan(text.indexOf('Depois'))
      expect(screen.getByText('Sem marcos ainda')).toBeInTheDocument()
    })
  })

  describe('Visão geral', () => {
    it('counts what is new since the last visit, open actions and pending sources', async () => {
      renderPage('/projects/p1/overview', <ProjectOverview />)
      const tabs = await screen.findByRole('tablist', { name: 'Visão geral' })
      await waitFor(() => expect(within(tabs).getByRole('tab', { name: /novos desde 27\/02/ })).toHaveTextContent('1'))
      expect(within(tabs).getByRole('tab', { name: /em aberto/ })).toHaveTextContent('2 ações em aberto · 1 atrasada')
      await waitFor(() => expect(within(tabs).getByRole('tab', { name: /aguardando aprovação/ })).toHaveTextContent('1'))
      expect(screen.getByRole('heading', { name: 'Desde sua última visita' })).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: /Concreto C50 nos pilares/ })[0]).toHaveTextContent('Revisão estrutural')
    })

    it('falls back to the last 7 days on a first visit', async () => {
      mockApi({ lastVisit: null })
      renderPage('/projects/p1/overview', <ProjectOverview />)
      expect(await screen.findByRole('tab', { name: /novos nos últimos 7 dias/ })).toBeInTheDocument()
    })

    it('lists open actions, late ones first, with their due badge', async () => {
      const user = userEvent.setup()
      renderPage('/projects/p1/overview', <ProjectOverview />)
      await user.click(await screen.findByRole('tab', { name: /em aberto/ }))
      const rows = await screen.findAllByRole('button', { name: /Análise de carga elétrica|Enviar memorial/ })
      expect(rows[0]).toHaveTextContent('Análise de carga elétrica')
      expect(rows[0]).toHaveTextContent('atrasada · 10/02')
      expect(rows[1]).toHaveTextContent('até 20/03')
    })

    it('opens the item panel from a row and closes it with Esc', async () => {
      const user = userEvent.setup()
      renderPage('/projects/p1/overview', <ProjectOverview />)
      await user.click((await screen.findAllByRole('button', { name: /Concreto C50 nos pilares/ }))[0])
      expect(screen.getByTestId('where')).toHaveTextContent('?item=new1')
      const panel = await screen.findByRole('dialog')
      expect(within(panel).getAllByRole('heading', { level: 2 })[0]).toHaveTextContent('Concreto C50 nos pilares')
      expect(within(panel).getByText('Na gravação')).toBeInTheDocument()
      await user.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    })

    it('shows the current stage milestones in the side box', async () => {
      renderPage('/projects/p1/overview', <ProjectOverview />)
      const box = (await screen.findByRole('heading', { name: 'Marcos da etapa atual' })).closest('section')!
      await waitFor(() => expect(within(box).getByText('Concreto C50 nos pilares')).toBeInTheDocument())
      expect(within(box).getByText('Anteprojeto')).toBeInTheDocument()
      expect(within(box).getByText('Estudo Preliminar concluída com 1 marco')).toBeInTheDocument()
    })
  })

  describe('Marcos', () => {
    it('places milestones in their stage and counts them', async () => {
      renderPage('/projects/p1/milestones', <ProjectMilestones />)
      expect(await screen.findByText(/2 marcos · 3 etapas/)).toBeInTheDocument()
      const timeline = screen.getAllByRole('list').find((l) => l.tagName === 'OL' && within(l).queryByText('Em andamento · faltam 28 dias'))!
      const current = within(timeline).getByText('Anteprojeto').closest('li')!
      expect(within(current).getByText('Concreto C50 nos pilares')).toBeInTheDocument()
      expect(within(current).getByText('Em andamento · faltam 28 dias')).toBeInTheDocument()
      expect(within(current).getByRole('note')).toHaveTextContent('Hoje · 03/03')
    })

    it('filters by type from the URL', async () => {
      renderPage('/projects/p1/milestones?disc=architecture', <ProjectMilestones />)
      expect(await screen.findByText('Paleta da fachada')).toBeInTheDocument()
      expect(screen.queryByText('Concreto C50 nos pilares')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /1 disciplina/ })).toBeInTheDocument()
    })

    it('hides stages without milestones and says how many', async () => {
      const user = userEvent.setup()
      renderPage('/projects/p1/milestones', <ProjectMilestones />)
      await screen.findByText(/2 marcos/)
      await user.click(screen.getByRole('switch', { name: 'Mostrar etapas sem marcos' }))
      expect(screen.getByTestId('where')).toHaveTextContent('empty=0')
      expect(screen.getByText('1 etapa sem marcos está oculta.')).toBeInTheDocument()
    })

    it('toggles a milestone from the panel with an undo toast', async () => {
      const user = userEvent.setup()
      renderPage('/projects/p1/milestones?item=new1', <ProjectMilestones />)
      const panel = await screen.findByRole('dialog')
      await user.click(within(panel).getByRole('button', { name: 'Remover dos marcos' }))
      await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/projects/p1/items/new1', { is_milestone: false }))
      expect(screen.getByRole('status')).toHaveTextContent('Removido dos marcos')
      expect(screen.getByRole('button', { name: 'Desfazer' })).toBeInTheDocument()
    })
  })
})
