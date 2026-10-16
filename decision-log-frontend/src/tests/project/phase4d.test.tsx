/**
 * Promem revamp Phase 4d: global search ⌘K (pt-BR).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import * as apiModule from '../../services/api'
import { GlobalSearch, useSearchShortcut } from '../../components/organisms/GlobalSearch'
import { useSearchStore } from '../../store/searchStore'
import { usePortuguese } from '../design-system/render'

vi.mock('../../services/api', () => ({ default: { get: vi.fn() } }))
const api = apiModule.default as unknown as Record<'get', ReturnType<typeof vi.fn>>

const RESULTS = {
  query: 'fundacao',
  projects: [{ id: 'p1', name: 'Residential Tower Alpha', description: 'Torre', archived: false }],
  items: [
    { id: 'i1', project_id: 'p1', project_name: 'Residential Tower Alpha', title: 'Fundação em estacas', statement: 'x', item_type: 'decision', source_type: 'meeting', is_milestone: true, is_done: false, affected_disciplines: ['structural'], date: '2026-02-06T10:00:00' },
  ],
  meetings: [{ id: 'm1', project_id: 'p1', project_name: 'Residential Tower Alpha', title: 'Revisão da fundação', occurred_at: '2026-02-06T10:00:00' }],
  more: { projects: false, items: true, meetings: false },
}

function Where() {
  const location = useLocation()
  return <p data-testid="where">{`${location.pathname}${location.search}`}</p>
}

function Harness() {
  useSearchShortcut()
  return (
    <>
      <GlobalSearch />
      <Where />
    </>
  )
}

function renderSearch() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/projects']}>
        <Routes>
          <Route path="*" element={<Harness />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Phase 4d · Busca global', () => {
  usePortuguese()
  beforeEach(() => {
    vi.clearAllMocks()
    useSearchStore.setState({ open: false })
    Element.prototype.scrollIntoView = () => undefined
    api.get.mockImplementation((url: string, config: { params: { q: string } }) =>
      Promise.resolve({ data: config.params.q === 'nada' ? { ...RESULTS, projects: [], items: [], meetings: [], more: { projects: false, items: false, meetings: false } } : RESULTS }),
    )
  })

  it('opens with ⌘K and Ctrl+K, and asks for 2 letters first', async () => {
    const user = userEvent.setup()
    renderSearch()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.keyboard('{Meta>}k{/Meta}')
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Digite pelo menos 2 letras/)).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.keyboard('{Control>}k{/Control}')
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(api.get).not.toHaveBeenCalled()
  })

  it('groups the results and opens the active one with Enter', async () => {
    const user = userEvent.setup()
    renderSearch()
    act(() => useSearchStore.setState({ open: true }))
    await user.type(await screen.findByRole('combobox', { name: 'Buscar em todos os projetos' }), 'fundacao')
    const list = await screen.findByRole('listbox')
    expect(api.get).toHaveBeenCalledWith('/search', { params: { q: 'fundacao' } })
    expect(within(list).getByRole('group', { name: 'Projetos' })).toBeInTheDocument()
    expect(within(list).getByRole('group', { name: 'Itens' })).toHaveTextContent('Fundação em estacas')
    expect(within(list).getByRole('group', { name: 'Reuniões' })).toHaveTextContent('Revisão da fundação')
    expect(screen.getByText(/Refine a busca/)).toBeInTheDocument()
    expect(within(list).getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true')

    await user.keyboard('{ArrowDown}')
    expect(within(list).getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{Enter}')
    expect(screen.getByTestId('where')).toHaveTextContent('/projects/p1/history?item=i1')
    expect(useSearchStore.getState().open).toBe(false)
  })

  it('a click opens a meeting in the viewer', async () => {
    const user = userEvent.setup()
    renderSearch()
    act(() => useSearchStore.setState({ open: true }))
    await user.type(await screen.findByRole('combobox'), 'fundacao')
    await user.click(await screen.findByText('Revisão da fundação'))
    expect(screen.getByTestId('where')).toHaveTextContent('/projects/p1/meetings/m1')
  })

  it('says when nothing matches', async () => {
    const user = userEvent.setup()
    renderSearch()
    act(() => useSearchStore.setState({ open: true }))
    await user.type(await screen.findByRole('combobox'), 'nada')
    expect(await screen.findByText('Nada encontrado para “nada”')).toBeInTheDocument()
  })
})
