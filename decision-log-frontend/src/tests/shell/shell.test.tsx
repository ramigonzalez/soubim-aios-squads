/**
 * Promem revamp Phase 2: app shell, sidebar, project switcher, mobile bars, redirects, deep links.
 * Asserts pt-BR (REVAMP-MAPPING §6.1 #6).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import * as apiModule from '../../services/api'
import { ToastProvider, TooltipProvider } from '../../design-system'
import { AppShell } from '../../components/templates/AppShell'
import { LegacyMeetingRedirect, ProjectIndexRedirect } from '../../components/common/ProjectRedirects'
import { useAuthStore } from '../../store/authStore'
import { useIngestionStore } from '../../store/ingestionStore'
import { useIngestionUrlSync } from '../../hooks/useIngestionUrlSync'
import { summarizeStages } from '../../lib/projectStage'
import { usePortuguese } from '../design-system/render'

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
const api = apiModule.default as unknown as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> }

const STAGES = [
  { id: 'ep', name: 'Estudo Preliminar', start: '2026-01-15T00:00:00', end: '2026-02-15T00:00:00' },
  { id: 'ap', name: 'Anteprojeto', start: '2026-02-16T00:00:00', end: '2026-03-31T00:00:00' },
  { id: 'pl', name: 'Projeto Legal', start: '2026-04-01T00:00:00', end: '2026-05-15T00:00:00' },
  { id: 'pe', name: 'Projeto Executivo', start: '2026-05-16T00:00:00', end: '2026-08-31T00:00:00' },
]

let orgRole = 'admin'

function mockApi() {
  api.get.mockImplementation((url: string) => {
    const data = (() => {
      if (url === '/projects/p1')
        return { id: 'p1', name: 'Residential Tower Alpha', description: 'Torre', stages: STAGES, counts: { items: 21, milestones: 7, meetings: 6 }, can_manage: true, can_review: true }
      if (url === '/projects')
        return {
          projects: [
            { id: 'p1', name: 'Residential Tower Alpha', stages: STAGES, new_items: { count: 3, since: '', basis: 'last_visit' }, last_activity: null, pending_ingestion: 2 },
            { id: 'p2', name: 'Commercial Plaza Beta', stages: [], new_items: { count: 0, since: '', basis: 'last_7_days' }, last_activity: null },
          ],
          total: 2,
          limit: 100,
          offset: 0,
        }
      if (url === '/organizations/me') return [{ id: 'o1', name: 'Escritório Exemplo', slug: 'ex', role: orgRole, status: 'active' }]
      if (url === '/ingestion/count') return { pending: 7 }
      if (url === '/sources/s1/meeting') return { id: 's1', project_id: 'p1', title: 'Revisão', transcript: '' }
      throw new Error(`unexpected GET ${url}`)
    })()
    return Promise.resolve({ data })
  })
  api.post.mockResolvedValue({ data: { last_visit_at: null, visited_at: '2026-03-03T12:00:00' } })
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
              <Route element={<AppShell />}>
                <Route path="/projects" element={<Where />} />
                <Route path="/projects/:id" element={<ProjectIndexRedirect />} />
                <Route path="/projects/:id/:section" element={<Where />} />
                <Route path="/projects/:id/meetings/:sourceId" element={<Where />} />
                <Route path="/meetings/:sourceId" element={<LegacyMeetingRedirect />} />
                <Route path="/ingestion" element={<Where />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

describe('Promem app shell', () => {
  usePortuguese()

  beforeEach(() => {
    vi.clearAllMocks()
    orgRole = 'admin'
    mockApi()
    useAuthStore.setState({ user: { id: 'u1', email: 'g@x.com', name: 'Gabriela', role: 'director' }, isAuthenticated: true })
  })
  afterEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false })
  })

  it('shows the project sections with their counts, in order', async () => {
    renderAt('/projects/p1/history')
    const nav = await screen.findByRole('list', { name: 'Seções do projeto' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/projects/p1/overview',
      '/projects/p1/milestones',
      '/projects/p1/history',
      '/projects/p1/meetings',
      '/projects/p1/summary',
    ])
    await waitFor(() => expect(within(nav).getByRole('link', { name: /Histórico/ })).toHaveTextContent('21'))
    expect(within(nav).getByRole('link', { name: /Marcos/ })).toHaveTextContent('7')
    expect(within(nav).getByRole('link', { name: /Reuniões/ })).toHaveTextContent('6')
    expect(within(nav).getByRole('link', { name: /Histórico/ })).toHaveAttribute('aria-current', 'page')
  })

  it('shows the firm section, the ingestion count and the user', async () => {
    renderAt('/projects/p1/overview')
    expect(await screen.findAllByRole('link', { name: 'Todos os projetos' })).not.toHaveLength(0)
    await waitFor(() => expect(screen.getAllByRole('link', { name: /Ingestão/ })[0]).toHaveTextContent('7'))
    expect(screen.getAllByText('Escritório Exemplo')[0]).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Menu da conta' })[0]).toHaveTextContent('GabrielaAdmin')
  })

  it('records the visit when a project page opens', async () => {
    renderAt('/projects/p1/overview')
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/projects/p1/visit'))
  })

  it('shows the current stage on the switcher', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 2, 3))
    try {
      renderAt('/projects/p1/overview')
      const trigger = (await screen.findAllByRole('button', { name: 'Trocar projeto' }))[0]
      await waitFor(() => expect(trigger).toHaveTextContent('Anteprojeto · 2 de 4'))
    } finally {
      vi.useRealTimers()
    }
  })

  it('lists active projects and opens the picked one on its Visão geral', async () => {
    const user = userEvent.setup()
    renderAt('/projects/p1/history')
    const trigger = (await screen.findAllByRole('button', { name: 'Trocar projeto' }))[0]
    await user.click(trigger)
    const option = await screen.findByRole('button', { name: /Commercial Plaza Beta/ })
    expect(screen.getByRole('button', { name: /Residential Tower Alpha/ })).toHaveTextContent('3 novos')
    await user.click(option)
    expect(screen.getByTestId('where')).toHaveTextContent('/projects/p2/overview')
  })

  it('offers "Criar projeto" only to organization owners and admins', async () => {
    const user = userEvent.setup()
    orgRole = 'member'
    renderAt('/projects/p1/history')
    await user.click((await screen.findAllByRole('button', { name: 'Trocar projeto' }))[0])
    await screen.findByRole('button', { name: /Commercial Plaza Beta/ })
    expect(screen.queryByRole('button', { name: 'Criar projeto' })).not.toBeInTheDocument()
  })

  it('shows the mobile tab bar on project pages only', async () => {
    const { unmount } = renderAt('/projects/p1/milestones')
    const tabs = await screen.findByRole('navigation', { name: 'Seções do projeto' })
    expect(within(tabs).getAllByRole('link').map((l) => l.textContent)).toEqual(['Visão geral', 'Marcos', 'Histórico', 'Mais'])
    unmount()
    renderAt('/ingestion')
    await screen.findAllByRole('link', { name: 'Todos os projetos' })
    expect(screen.queryByRole('navigation', { name: 'Seções do projeto' })).not.toBeInTheDocument()
  })

  describe('old URLs', () => {
    it('opens Visão geral by default', async () => {
      renderAt('/projects/p1')
      expect(await screen.findByTestId('where')).toHaveTextContent('/projects/p1/overview')
    })

    it.each([
      ['#history', '/projects/p1/history'],
      ['#milestones', '/projects/p1/milestones'],
      ['#digest', '/projects/p1/summary'],
    ])('redirects %s to its section', async (hash, target) => {
      renderAt(`/projects/p1${hash}`)
      expect(await screen.findByTestId('where')).toHaveTextContent(target)
    })

    it('sends /meetings/:id to the meeting inside its project, keeping ?t=', async () => {
      renderAt('/meetings/s1?t=332')
      await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/projects/p1/meetings/s1?t=332'))
    })
  })
})

describe('Ingestão deep links', () => {
  function Probe() {
    useIngestionUrlSync()
    const { activeTab, filters } = useIngestionStore()
    return (
      <>
        <p data-testid="state">{`${activeTab}|${filters.project_id}|${filters.source_type}`}</p>
        <Where />
      </>
    )
  }

  beforeEach(() => {
    useIngestionStore.setState({ activeTab: 'pending', filters: { project_id: null, source_type: null, date_from: null, date_to: null } })
  })

  it('restores the tab and filters from the URL', () => {
    render(
      <MemoryRouter initialEntries={['/ingestion?tab=history&project=p1&source=email']}>
        <Routes>
          <Route path="/ingestion" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('state')).toHaveTextContent('history|p1|email')
    expect(screen.getByTestId('where')).toHaveTextContent('/ingestion?tab=history&project=p1&source=email')
  })

  it('ignores unknown values', () => {
    render(
      <MemoryRouter initialEntries={['/ingestion?tab=nope&source=fax']}>
        <Routes>
          <Route path="/ingestion" element={<Probe />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('state')).toHaveTextContent('pending|null|null')
  })
})

describe('summarizeStages', () => {
  usePortuguese()
  const today = new Date(2026, 2, 3)

  it('names the current stage and its position', () => {
    expect(summarizeStages(STAGES, today)).toEqual({ label: 'Anteprojeto · 2 de 4', daysLeft: 'faltam 28 dias', currentName: 'Anteprojeto' })
  })

  it('covers no stages, not started and finished', () => {
    expect(summarizeStages([], today).label).toBe('Sem etapas definidas')
    expect(summarizeStages(STAGES, new Date(2026, 0, 1)).label).toBe('Começa em 15/01')
    expect(summarizeStages(STAGES, new Date(2027, 0, 1)).label).toBe('Etapas concluídas')
  })
})
