/**
 * Promem revamp Phase 3c: Reuniões list and meeting viewer (pt-BR).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import * as apiModule from '../../services/api'
import { ToastProvider, TooltipProvider } from '../../design-system'
import ProjectMeetings from '../../pages/ProjectMeetings'
import ProjectMeetingViewer from '../../pages/ProjectMeetingViewer'
import { usePortuguese } from '../design-system/render'
import { item, PROJECT } from './fixtures'

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() } }))
const api = apiModule.default as unknown as Record<'get' | 'post' | 'put' | 'patch', ReturnType<typeof vi.fn>>

const TRANSCRIPT = '0:05 - Gabriela\n  Vamos começar.\n5:30 - Carlos\n  Proponho C50 nos pilares.\n6:10 - ⚠️ Lucia [vozes sobrepostas]\n  Concordo.\n9:00 - Ana\n  Ok.'
const SOURCE = { id: 's1', title: 'Revisão do projeto estrutural', type: 'meeting' as const, occurred_at: '2026-02-06T10:00:00' }
const ITEMS = [
  item({ id: 'c50', statement: 'Concreto C50 nos pilares', timestamp: '5:32', source: SOURCE }),
  item({ id: 'act', statement: 'Enviar memorial', item_type: 'action_item', timestamp: '9:05', source: SOURCE }),
  item({ id: 'other', statement: 'De outra reunião', source: { ...SOURCE, id: 's2' } }),
]

function mockApi() {
  api.get.mockImplementation((url: string) => {
    const data = (() => {
      if (url === '/projects/p1') return PROJECT
      if (url === '/projects/p1/participants') return { participants: [{ id: '1', name: 'Carlos', discipline: 'structural' }] }
      if (url === '/projects/p1/milestones/share') return { links: [] }
      if (url === '/projects/p1/meetings')
        return {
          meetings: [
            { id: 's1', title: 'Revisão do projeto estrutural', occurred_at: '2026-02-06T10:00:00', duration_minutes: 45, label: 'Fireflies', participants: ['Gabriela', 'Carlos'], summary: null, visibility: 'internal', thumbnail_url: null, item_counts: { decision: 1, action_item: 1 }, item_count: 2, meeting_type: null },
          ],
        }
      if (url === '/sources/s1/meeting')
        return {
          id: 's1', project_id: 'p1', title: 'Revisão do projeto estrutural', source_type: 'meeting', occurred_at: '2026-02-06T10:00:00', duration_minutes: 45,
          summary: 'Definição da estrutura do pódio.', transcript: TRANSCRIPT, recording: null, visibility: 'internal', can_change_visibility: true,
          participants: ['Gabriela', 'Carlos', 'Lucia'], label: 'Fireflies', speaker_candidates: ['Gabriela', 'Lucia'], can_correct_speakers: true,
        }
      if (url.startsWith('/projects/p1/items?')) return { items: ITEMS, total: ITEMS.length, limit: 200, offset: 0 }
      if (url.startsWith('/sources/s1/extraction-runs')) return { runs: [], latest_job: null }
      if (url.endsWith('/similar')) return { items: [] }
      throw new Error(`unexpected GET ${url}`)
    })()
    return Promise.resolve({ data })
  })
  api.put.mockImplementation((_url: string, body: object) => Promise.resolve({ data: body }))
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
              <Route path="/projects/:id/meetings" element={<><ProjectMeetings /><Where /></>} />
              <Route path="/projects/:id/meetings/:sourceId" element={<><ProjectMeetingViewer /><Where /></>} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

describe('Phase 3c', () => {
  usePortuguese()
  beforeEach(() => {
    vi.clearAllMocks()
    Element.prototype.scrollTo = vi.fn()
    mockApi()
  })

  it('lists meetings with meta and item count, and opens the viewer', async () => {
    const user = userEvent.setup()
    renderAt('/projects/p1/meetings')
    const row = await screen.findByRole('button', { name: /Revisão do projeto estrutural/ })
    expect(row).toHaveTextContent('06/02 · 45 min · Fireflies · Gabriela, Carlos')
    expect(row).toHaveTextContent('2 itens')
    await user.click(row)
    expect(screen.getByTestId('where')).toHaveTextContent('/projects/p1/meetings/s1')
  })

  it('shows the header, AI summary with counts and the extracted items', async () => {
    renderAt('/projects/p1/meetings/s1')
    expect(await screen.findByRole('heading', { level: 1, name: 'Revisão do projeto estrutural' })).toBeInTheDocument()
    expect(screen.getByText('Reunião · Fireflies')).toBeInTheDocument()
    expect(screen.getByText(/06\/02\/2026 · sexta-feira · 45 min · 4 falas/)).toBeInTheDocument()
    expect(screen.getByText('Definição da estrutura do pódio.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('2 itens extraídos · 1 decisão · 1 ação')).toBeInTheDocument())
    expect(screen.queryByText('De outra reunião')).not.toBeInTheDocument()
  })

  it('anchors items to their turn and jumps there from the list', async () => {
    const user = userEvent.setup()
    renderAt('/projects/p1/meetings/s1')
    const list = await screen.findByTestId('transcript-list')
    const carlosTurn = within(list).getByText('Proponho C50 nos pilares.').closest('li')!
    await waitFor(() => expect(within(carlosTurn).getByRole('button', { name: /Decisão · Concreto C50 nos pilares/ })).toBeInTheDocument())
    const aside = screen.getByRole('heading', { name: /Itens extraídos/ }).closest('aside')!
    await user.click(within(aside).getByRole('button', { name: /Enviar memorial/ }))
    expect(screen.getByTestId('where')).toHaveTextContent('?t=545')
    expect(within(list).getByText('Ok.').closest('li')).toHaveAttribute('aria-current', 'true')
  })

  it('opens the item panel from an anchored chip', async () => {
    const user = userEvent.setup()
    renderAt('/projects/p1/meetings/s1')
    await user.click(await screen.findByRole('button', { name: /Decisão · Concreto C50 nos pilares/ }))
    expect(screen.getByTestId('where')).toHaveTextContent('item=c50')
  })

  it('lets the team pick who spoke in an uncertain turn', async () => {
    const user = userEvent.setup()
    renderAt('/projects/p1/meetings/s1')
    const list = await screen.findByTestId('transcript-list')
    const turn = within(list).getByText('Concordo.').closest('li')!
    expect(within(turn).getByText('Vozes sobrepostas. Quem falou?')).toBeInTheDocument()
    await user.click(within(turn).getByRole('button', { name: 'Gabriela' }))
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/sources/s1/speakers', { start: 370, speaker: 'Gabriela' }))
    expect(await screen.findByText('Fala atribuída a Gabriela')).toBeInTheDocument()
  })

  it('opens at ?t= on the matching turn', async () => {
    renderAt('/projects/p1/meetings/s1?t=00:06:15')
    const list = await screen.findByTestId('transcript-list')
    expect(within(list).getByText('Concordo.').closest('li')).toHaveAttribute('aria-current', 'true')
  })

  it('confirms a visibility change', async () => {
    const user = userEvent.setup()
    api.patch.mockResolvedValue({ data: { id: 's1', visibility: 'shared' } })
    renderAt('/projects/p1/meetings/s1')
    await user.click(await screen.findByRole('button', { name: 'Compartilhar com as organizações do projeto' }))
    const dialog = screen.getByRole('dialog', { name: 'Compartilhar reunião' })
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/sources/s1/visibility', { visibility: 'shared' }))
  })
})
