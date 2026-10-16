/**
 * Promem revamp Phase 3b: Histórico (filters, groups, keyboard) and manual item entry (pt-BR).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import * as apiModule from '../../services/api'
import { ToastProvider, TooltipProvider } from '../../design-system'
import ProjectHistory from '../../pages/ProjectHistory'
import ManualItemNew from '../../pages/ManualItemNew'
import { filterItems, type HistoryFilters } from '../../hooks/useHistoryFilters'
import { usePortuguese } from '../design-system/render'
import { item, PROJECT, TODAY } from './fixtures'

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))
const api = apiModule.default as unknown as Record<'get' | 'post' | 'patch', ReturnType<typeof vi.fn>>

const MEETING = { id: 'm1', title: 'Revisão do projeto estrutural', type: 'meeting' as const, occurred_at: '2026-02-06T10:00:00', duration_minutes: 45, participants: ['Gabriela', 'Carlos', 'Lucia', 'Ana'], label: 'Fathom', meeting_type: 'Design Review', visibility: 'internal' as const, summary: 'Definição da estrutura do pódio.' }
const EMAIL = { id: 'e1', title: 'Proposta do fornecedor', type: 'email' as const, occurred_at: '2026-02-07T09:00:00' }
const ITEMS = [
  item({ id: 'a', statement: 'Concreto C50 nos pilares', source: MEETING, who: 'Carlos', affected_disciplines: ['structural'] }),
  item({ id: 'b', statement: 'Laje protendida no pódio', source: MEETING, who: 'Gabriela', affected_disciplines: ['architecture', 'structural'], review_status: 'pending' }),
  item({ id: 'c', statement: 'Aprovar orçamento de esquadrias', source: EMAIL, source_type: 'email', item_type: 'action_item', owner: 'Lucia', due_date: '2026-02-10', who: 'Lucia', affected_disciplines: ['architecture'] }),
  item({ id: 'd', statement: 'Manter o piso original', source: null, source_type: 'manual_input', occurred_at: '2026-02-07T00:00:00', who: 'Gabriela', affected_disciplines: ['client'] }),
]

function mockApi() {
  api.get.mockImplementation((url: string) => {
    const data = (() => {
      if (url === '/projects/p1') return PROJECT
      if (url.startsWith('/projects/p1/items?')) return { items: ITEMS, total: ITEMS.length, limit: 200, offset: 0 }
      if (url === '/projects/p1/participants') return { participants: [{ id: 'x', name: 'Gabriela' }, { id: 'y', name: 'Carlos' }] }
      if (url === '/projects/p1/milestones/share') return { links: [] }
      if (url.endsWith('/similar')) return { items: [] }
      throw new Error(`unexpected GET ${url}`)
    })()
    return Promise.resolve({ data })
  })
  api.post.mockImplementation((url: string, body: Record<string, unknown>) =>
    Promise.resolve({ data: url.endsWith('/items/review') ? { updated: 1 } : { ...ITEMS[0], ...body, id: 'new' } }),
  )
  api.patch.mockImplementation((_url: string, body: object) => Promise.resolve({ data: { ...ITEMS[0], ...body } }))
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
              <Route path="/projects/:id/history" element={<><ProjectHistory /><Where /></>} />
              <Route path="/projects/:id/items/new" element={<><ManualItemNew /><Where /></>} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

const NO_FILTERS: HistoryFilters = { q: '', disc: [], type: [], src: [], mtype: [], who: [], from: null, to: null, group: 'date', rejected: false }

describe('Phase 3b', () => {
  usePortuguese()
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(TODAY)
    mockApi()
  })
  afterEach(() => vi.useRealTimers())

  describe('filterItems', () => {
    it('searches title, who and source ignoring accents', () => {
      expect(filterItems(ITEMS, { ...NO_FILTERS, q: 'podio' }).map((i) => i.id)).toEqual(['b'])
      expect(filterItems(ITEMS, { ...NO_FILTERS, q: 'fornecedor' }).map((i) => i.id)).toEqual(['c'])
    })
    it('combines discipline, type, source, meeting type, who and period', () => {
      expect(filterItems(ITEMS, { ...NO_FILTERS, disc: ['architecture'] }).map((i) => i.id)).toEqual(['b', 'c'])
      expect(filterItems(ITEMS, { ...NO_FILTERS, type: ['action_item'] }).map((i) => i.id)).toEqual(['c'])
      expect(filterItems(ITEMS, { ...NO_FILTERS, src: ['manual_input'] }).map((i) => i.id)).toEqual(['d'])
      expect(filterItems(ITEMS, { ...NO_FILTERS, mtype: ['Design Review'] }).map((i) => i.id)).toEqual(['a', 'b'])
      expect(filterItems(ITEMS, { ...NO_FILTERS, who: ['Gabriela'] }).map((i) => i.id)).toEqual(['b', 'd'])
      expect(filterItems(ITEMS, { ...NO_FILTERS, from: '2026-02-07', to: '2026-02-07' }).map((i) => i.id)).toEqual(['c', 'd'])
    })
  })

  describe('Histórico', () => {
    it('groups by date, then by source band with meta and summary', async () => {
      renderAt('/projects/p1/history')
      expect(await screen.findByText('4 itens')).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '7 de fevereiro' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '6 de fevereiro' })).toBeInTheDocument()
      expect(screen.getByText('45 min · Fathom · Gabriela, Carlos, Lucia +1')).toBeInTheDocument()
      expect(screen.getByText('Definição da estrutura do pódio.')).toBeInTheDocument()
      expect(screen.getByText('Entradas manuais')).toBeInTheDocument()
      expect(screen.getByText('atrasada · 10/02')).toBeInTheDocument()
      expect(screen.getByText('Pendente')).toBeInTheDocument()
    })

    it('filters from the URL and offers to clear', async () => {
      const user = userEvent.setup()
      renderAt('/projects/p1/history?type=action_item')
      expect((await screen.findAllByText('1 item'))[0]).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Remover filtro: Ação' })).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))
      expect(screen.getByText('4 itens')).toBeInTheDocument()
      expect(screen.getByTestId('where')).toHaveTextContent('/projects/p1/history')
    })

    it('says when nothing matches, with an action to clear', async () => {
      renderAt('/projects/p1/history?q=inexistente')
      expect(await screen.findByText('Nenhum item com esses filtros')).toBeInTheDocument()
    })

    it('groups by discipline with the SegmentedControl', async () => {
      const user = userEvent.setup()
      renderAt('/projects/p1/history')
      await screen.findByText('4 itens')
      await user.click(screen.getByRole('radio', { name: 'Disciplina' }))
      expect(screen.getByTestId('where')).toHaveTextContent('group=discipline')
      expect(screen.getByRole('heading', { name: 'Estrutura' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Cliente' })).toBeInTheDocument()
    })

    it('collapses and expands source bands', async () => {
      const user = userEvent.setup()
      renderAt('/projects/p1/history')
      await screen.findByText('4 itens')
      await user.click(screen.getByRole('button', { name: 'Ocultar itens de Revisão do projeto estrutural' }))
      expect(screen.queryByText('Concreto C50 nos pilares')).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Recolher tudo' }))
      expect(screen.queryByText('Manter o piso original')).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Expandir tudo' }))
      expect(screen.getByText('Concreto C50 nos pilares')).toBeInTheDocument()
    })

    it('moves with arrows, opens with Enter and toggles marco with M', async () => {
      const user = userEvent.setup()
      renderAt('/projects/p1/history')
      await screen.findByText('4 itens')
      await user.keyboard('{ArrowDown}')
      const first = document.activeElement as HTMLElement
      expect(first.dataset.itemId).toBeTruthy()
      await user.keyboard('{ArrowDown}')
      expect((document.activeElement as HTMLElement).dataset.itemId).not.toBe(first.dataset.itemId)
      await user.keyboard('m')
      await waitFor(() => expect(api.patch).toHaveBeenCalledWith(expect.stringMatching(/\/projects\/p1\/items\//), { is_milestone: true }))
      await user.keyboard('{Enter}')
      expect(screen.getByTestId('where')).toHaveTextContent('?item=')
    })

    it('focuses the search with /', async () => {
      const user = userEvent.setup()
      renderAt('/projects/p1/history')
      await screen.findByText('4 itens')
      await user.keyboard('/')
      expect(screen.getByRole('textbox', { name: 'Buscar no histórico' })).toHaveFocus()
    })

    it('approves the pending items of a source', async () => {
      const user = userEvent.setup()
      renderAt('/projects/p1/history')
      await user.click(await screen.findByRole('button', { name: 'Aprovar 1 pendente' }))
      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/projects/p1/items/review', { status: 'approved', source_id: 'm1', item_ids: undefined }))
      expect(await screen.findByText('1 item aprovado')).toBeInTheDocument()
    })
  })

  describe('Adicionar item', () => {
    it('validates on submit', async () => {
      const user = userEvent.setup()
      renderAt('/projects/p1/items/new')
      await user.click(await screen.findByRole('button', { name: 'Adicionar item' }))
      expect(screen.getByText('Descreva o item para continuar.')).toBeInTheDocument()
      expect(screen.getByText('Diga quem decidiu ou falou.')).toBeInTheDocument()
      expect(screen.getByText('Escolha pelo menos uma disciplina.')).toBeInTheDocument()
      expect(api.post).not.toHaveBeenCalled()
    })

    it('saves a manual action and opens it in the history', async () => {
      const user = userEvent.setup()
      renderAt('/projects/p1/items/new')
      await user.click(await screen.findByRole('radio', { name: /Ação/ }))
      await user.type(screen.getByLabelText(/Título/), 'Trocar caixilhos')
      await user.type(screen.getByLabelText('Descrição'), 'Cliente pediu caixilhos de alumínio')
      await user.type(screen.getByLabelText('Quem decidiu ou falou'), 'Gabriela')
      await user.click(screen.getByRole('button', { name: 'Arquitetura' }))
      await user.type(screen.getByLabelText(/Responsável/), 'Lucia')
      await user.click(screen.getByRole('button', { name: 'Adicionar item' }))
      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith(
          '/projects/p1/items',
          expect.objectContaining({
            item_type: 'action_item',
            title: 'Trocar caixilhos',
            statement: 'Cliente pediu caixilhos de alumínio',
            who: 'Gabriela',
            affected_disciplines: ['architecture'],
            owner: 'Lucia',
            occurred_at: '2026-03-03T00:00:00',
            is_done: false,
          }),
        ),
      )
      await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/projects/p1/history?item=new'))
    })
  })
})
