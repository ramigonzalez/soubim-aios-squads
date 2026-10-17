/**
 * Promem revamp Phase 3e: Projetos list and the create / edit form (pt-BR).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import * as apiModule from '../../services/api'
import { ToastProvider, TooltipProvider } from '../../design-system'
import ProjectsList, { attention } from '../../pages/ProjectsList'
import ProjectFormPage, { stageProblems } from '../../pages/ProjectFormPage'
import { usePortuguese } from '../design-system/render'
import { STAGES } from './fixtures'

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
vi.mock('../../components/organisms/DriveFolderSection', () => ({ default: () => <p>drive</p> }))
vi.mock('../../components/organisms/ProjectSharing', () => ({ default: () => <p>sharing</p> }))
vi.mock('../../components/organisms/ExternalPeopleSection', () => ({ default: () => <p>externals</p> }))
vi.mock('../../components/organisms/FathomRulesSection', () => ({ default: () => <p>rules</p> }))
const api = apiModule.default as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', ReturnType<typeof vi.fn>>

const PROJECTS = [
  { id: 'a', name: 'Residential Tower Alpha', description: 'Torre', member_count: 8, stages: STAGES, new_items: { count: 3, since: '', basis: 'last_visit' }, last_activity: { at: '2026-03-03T10:00:00', label: 'Reunião semanal', source_type: 'meeting' }, late_actions: 1, pending_ingestion: 3, can_manage: true, created_at: '' },
  { id: 'b', name: 'Commercial Plaza Beta', description: 'Uso misto', member_count: 5, stages: [], new_items: { count: 0, since: '', basis: 'last_7_days' }, last_activity: { at: '2026-03-04T10:00:00', label: 'Revisão', source_type: 'meeting' }, late_actions: 0, pending_ingestion: 0, can_manage: false, created_at: '' },
  { id: 'c', name: 'Clínica Moema', archived_at: '2026-01-15T00:00:00', member_count: 2, stages: [], new_items: { count: 0, since: '', basis: 'last_7_days' }, last_activity: null, late_actions: 0, pending_ingestion: 0, can_manage: true, created_at: '' },
]

function mockApi() {
  api.get.mockImplementation((url: string) => {
    const data = (() => {
      if (url === '/projects') return { projects: PROJECTS, total: 3, limit: 100, offset: 0 }
      if (url === '/organizations/me') return [{ id: 'o1', name: 'Escritório Exemplo', slug: 'x', role: 'admin', status: 'active' }]
      if (url === '/stage-templates') return { templates: [{ id: 't1', project_type: 'casa', template_name: 'Casa', stages: [{ stage_name: 'Estudo Preliminar', default_duration_days: 30 }, { stage_name: 'Anteprojeto', default_duration_days: 45 }] }] }
      if (url === '/projects/a') return { id: 'a', name: 'Residential Tower Alpha', description: 'Torre', project_type: 'residential', can_manage: true, stages: [], counts: { items: 0, milestones: 0, meetings: 0 } }
      if (url === '/projects/a/stages') return { stages: [{ id: 's1', stage_name: 'Estudo Preliminar', stage_from: '2026-01-15T00:00:00', stage_to: '2026-02-15T00:00:00', sort_order: 0, is_current: false }] }
      if (url === '/projects/a/participants') return { participants: [{ id: 'p1', name: 'Carlos', email: 'c@x.com', discipline: 'structural', role: 'Lead Engineer' }] }
      throw new Error(`unexpected GET ${url}`)
    })()
    return Promise.resolve({ data })
  })
  api.post.mockImplementation((url: string) => Promise.resolve({ data: url === '/projects/' || url === '/projects' ? { id: 'new' } : {} }))
  api.patch.mockResolvedValue({ data: {} })
  api.delete.mockResolvedValue({ data: {} })
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
              <Route path="/projects" element={<><ProjectsList /><Where /></>} />
              <Route path="/projects/new" element={<><ProjectFormPage mode="create" /><Where /></>} />
              <Route path="/projects/:id/edit" element={<><ProjectFormPage mode="edit" /><Where /></>} />
              <Route path="*" element={<Where />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </TooltipProvider>
    </QueryClientProvider>,
  )
}

describe('Phase 3e', () => {
  usePortuguese()
  beforeEach(() => {
    vi.clearAllMocks()
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.releasePointerCapture = () => undefined
    Element.prototype.scrollIntoView = () => undefined
    mockApi()
  })

  it('scores attention as late × 10 + pending', () => {
    expect(attention(PROJECTS[0] as never)).toBe(13)
    expect(attention(PROJECTS[1] as never)).toBe(0)
  })

  it('finds missing, inverted and overlapping stages', () => {
    expect(stageProblems([{ key: 'a', name: 'EP', start: '2026-01-15', end: '2026-02-15' }, { key: 'b', name: 'AP', start: '2026-02-10', end: '2026-03-31' }]).map((p) => p.kind)).toEqual(['overlap'])
    expect(stageProblems([{ key: 'a', name: 'EP', start: '2026-02-15', end: '2026-01-15' }]).map((p) => p.kind)).toEqual(['inverted'])
    expect(stageProblems([{ key: 'a', name: '', start: '2026-02-15', end: '' }]).map((p) => p.kind)).toEqual(['missing'])
  })

  describe('Projetos', () => {
    it('lists active projects with stage, news and attention, sorted by recent activity', async () => {
      renderAt('/projects')
      // the "⋯" buttons are named "Ações do projeto …": keep only the rows
      const rows = (await screen.findAllByRole('button', { name: /^(Residential Tower Alpha|Commercial Plaza Beta)/ }))
      expect(rows.map((r) => r.textContent?.includes('Commercial'))).toEqual([true, false])
      expect(screen.getByText('2 projetos ativos · 1 com pendências')).toBeInTheDocument()
      const alpha = screen.getByRole('button', { name: /^Residential Tower Alpha/ })
      expect(alpha).toHaveTextContent('3 novos')
      expect(alpha).toHaveTextContent('1 ação atrasada')
      expect(alpha).toHaveTextContent('3 aguardando aprovação')
      expect(screen.getByRole('button', { name: /^Commercial Plaza Beta/ })).toHaveTextContent('Nenhuma pendência')
      expect(screen.queryByText('Clínica Moema')).not.toBeInTheDocument()
    })

    it('filters to projects needing attention and searches without accents', async () => {
      const user = userEvent.setup()
      renderAt('/projects')
      await screen.findByText('Commercial Plaza Beta')
      await user.click(screen.getByText('Só com pendências'))
      expect(screen.queryByText('Commercial Plaza Beta')).not.toBeInTheDocument()
      expect(screen.getByTestId('where')).toHaveTextContent('attention=1')
      await user.click(screen.getByText('Só com pendências'))
      await user.type(screen.getByRole('textbox', { name: 'Buscar projeto…' }), 'plaza')
      expect(screen.queryByText('Residential Tower Alpha')).not.toBeInTheDocument()
    })

    it('shows archived projects in their own view and opens a project on its Visão geral', async () => {
      const user = userEvent.setup()
      renderAt('/projects')
      await screen.findByText('Commercial Plaza Beta')
      await user.click(screen.getByRole('radio', { name: 'Arquivados' }))
      expect(await screen.findByText('Arquivado em 15/01')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /^Clínica Moema/ }))
      expect(screen.getByTestId('where')).toHaveTextContent('/projects/c/overview')
    })
  })

  describe('Novo projeto', () => {
    it('needs a name', async () => {
      const user = userEvent.setup()
      renderAt('/projects/new')
      await user.click(await screen.findByRole('button', { name: 'Criar projeto' }))
      expect(screen.getByText('Dê um nome ao projeto para continuar.')).toBeInTheDocument()
      expect(api.post).not.toHaveBeenCalled()
    })

    it('chains a template from the start date and creates project, stages and team', async () => {
      const user = userEvent.setup()
      renderAt('/projects/new')
      await user.type(await screen.findByLabelText('Nome do projeto'), 'Casa Jardim Botânico')
      const start = screen.getByLabelText(/Data de início do projeto/)
      await user.clear(start)
      await user.type(start, '2026-03-01')
      await user.click(await screen.findByRole('button', { name: 'Casa' }))
      expect(screen.getByDisplayValue('Anteprojeto')).toBeInTheDocument()
      expect(screen.getByText('30 dias')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Adicionar participante' }))
      await user.type(screen.getByLabelText('Nome da pessoa 1'), 'Lucia')
      await user.click(screen.getByRole('button', { name: 'Criar projeto' }))
      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith('/projects/new/stages', [
          { stage_name: 'Estudo Preliminar', stage_from: '2026-03-01', stage_to: '2026-03-31' },
          { stage_name: 'Anteprojeto', stage_from: '2026-04-01', stage_to: '2026-05-16' },
        ]),
      )
      expect(api.post).toHaveBeenCalledWith('/projects/new/participants', { name: 'Lucia', email: undefined, discipline: 'general', role: undefined })
      await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/projects/new/edit'))
    })
  })

  describe('Editar projeto', () => {
    it('pre-fills dates and people, keeps free-text roles, and blocks overlapping stages', async () => {
      const user = userEvent.setup()
      renderAt('/projects/a/edit')
      expect(await screen.findByDisplayValue('Residential Tower Alpha')).toBeInTheDocument()
      expect(screen.getByLabelText('Início da etapa 1')).toHaveValue('2026-01-15')
      expect(screen.getByLabelText('Fim da etapa 1')).toHaveValue('2026-02-15')
      expect(within(screen.getByRole('combobox', { name: 'Papel da pessoa 1' })).getByText('Lead Engineer')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Adicionar etapa' }))
      const start2 = screen.getByLabelText('Início da etapa 2')
      await user.clear(start2)
      await user.type(start2, '2026-02-01')
      await user.type(screen.getByLabelText('Nome da etapa 2'), 'Anteprojeto')
      await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))
      expect(screen.getByText('“Estudo Preliminar” e “Anteprojeto” se sobrepõem. Ajuste as datas para salvar.')).toBeInTheDocument()
      expect(api.patch).not.toHaveBeenCalled()
      expect(screen.getByText('sharing')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Arquivar' })).toBeInTheDocument()
    })
  })
})
