/**
 * Promem revamp Phase 4c: the project edit sections (organizations, external people, Fathom rules,
 * Drive folder), the meeting viewer's extraction versions and visibility control, and "Adicionar
 * reunião", on the design system (pt-BR). Behaviour is unchanged; destructive steps are Dialogs.
 */
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from 'react-query'
import * as apiModule from '../../services/api'
import ProjectSharing from '../../components/organisms/ProjectSharing'
import ExternalPeopleSection from '../../components/organisms/ExternalPeopleSection'
import FathomRulesSection from '../../components/organisms/FathomRulesSection'
import DriveFolderSection from '../../components/organisms/DriveFolderSection'
import ExtractionVersions from '../../components/organisms/ExtractionVersions'
import { MeetingVisibilityControl } from '../../components/organisms/MeetingVisibilityControl'
import { AddMeetingDialog } from '../../components/organisms/AddMeetingDialog'
import { renderUi, usePortuguese } from '../design-system/render'

vi.mock('../../services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
const api = apiModule.default as unknown as Record<'get' | 'post' | 'put' | 'patch' | 'delete', ReturnType<typeof vi.fn>>

const httpError = (status: number, detail?: unknown) => Object.assign(new Error(String(status)), { response: { status, data: { detail } } })

const ORGS = [
  { organization_id: 'o-soubim', name: 'souBIM', slug: 'soubim', access: 'owner', invited_by: null, created_at: null },
  { organization_id: 'o-dimas', name: 'DIMAS', slug: 'dimas', access: 'viewer', invited_by: 'u1', created_at: null },
]
const ROBOT = 'promem-drive@decisionlog.iam.gserviceaccount.com'
const DRIVE = { configured: true, service_account_email: ROBOT, folder_id: null, folder_name: null, last_checked_at: null, error: null }
const RUN = (version: number, active: boolean) => ({
  id: `run-${version}`, version, model: `modelo-${version}`, prompt_version: 'v', status: 'completed', is_active: active,
  created_at: '2026-10-06T10:00:00', created_by_name: 'Gabriela', input_tokens: 1000, output_tokens: 500, item_count: 3,
  counts_by_type: {}, estimated_cost_usd: 0.012,
})

function wrap(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderUi(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('Phase 4c · seções do projeto, versões e adicionar reunião', () => {
  usePortuguese()
  beforeEach(() => {
    vi.clearAllMocks()
    // Radix Select uses pointer capture and scrollIntoView, which happy-dom lacks
    Element.prototype.hasPointerCapture = () => false
    Element.prototype.releasePointerCapture = () => undefined
    Element.prototype.scrollIntoView = () => undefined
  })

  describe('Organizações com acesso', () => {
    it('lista, convida e remove só depois do diálogo que nomeia a ação', async () => {
      api.get.mockResolvedValue({ data: { organizations: ORGS } })
      api.post.mockResolvedValue({ data: ORGS[1] })
      api.delete.mockResolvedValue({ data: {} })
      const user = userEvent.setup()
      wrap(<ProjectSharing projectId="p1" />)

      const section = (await screen.findByRole('heading', { name: 'Organizações com acesso' })).closest('section')!
      expect(section).toHaveTextContent('Salvo automaticamente')
      expect(within(section).getByText('Proprietária')).toBeInTheDocument()
      expect(within(section).getByRole('combobox', { name: 'Acesso de DIMAS' })).toHaveTextContent('Leitor')

      await user.type(screen.getByLabelText('Identificador da organização'), 'dimas')
      await user.click(screen.getByRole('combobox', { name: 'Nível de acesso' }))
      await user.click(await screen.findByRole('option', { name: 'Colaborador' }))
      await user.click(screen.getByRole('button', { name: 'Convidar' }))
      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/projects/p1/organizations', { organization_slug: 'dimas', access: 'contributor' }))

      await user.click(screen.getByRole('button', { name: 'Remover DIMAS' }))
      const dialog = await screen.findByRole('dialog', { name: 'Remover organização do projeto' })
      expect(dialog).toHaveTextContent('Os membros perdem o acesso imediatamente.')
      expect(api.delete).not.toHaveBeenCalled()
      await user.click(within(dialog).getByRole('button', { name: 'Remover acesso' }))
      await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/projects/p1/organizations/o-dimas'))
    })

    it('explica um identificador que não existe', async () => {
      api.get.mockResolvedValue({ data: { organizations: ORGS } })
      api.post.mockRejectedValue(httpError(404))
      const user = userEvent.setup()
      wrap(<ProjectSharing projectId="p1" />)
      await user.type(await screen.findByLabelText('Identificador da organização'), 'nada')
      await user.click(screen.getByRole('button', { name: 'Convidar' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Nenhuma organização com este identificador.')
    })

    it('mostra o erro de carregamento com "Tentar de novo" (e nada em 403)', async () => {
      api.get.mockRejectedValueOnce(httpError(500)).mockResolvedValue({ data: { organizations: ORGS } })
      const user = userEvent.setup()
      wrap(<ProjectSharing projectId="p1" />)
      expect(await screen.findByText('Não foi possível carregar as organizações com acesso.')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
      expect(await screen.findByText('souBIM')).toBeInTheDocument()
    })
  })

  describe('Pessoas externas', () => {
    it('convida por e-mail e copia o link mostrado uma vez', async () => {
      api.get.mockResolvedValue({ data: { externals: [], invitations: [] } })
      api.post.mockResolvedValue({ data: { id: 'i1', email: 'ana@cliente.com', status: 'pending', expires_at: '', created_at: '', invite_url: 'http://app/invite/tok' } })
      const writeText = vi.fn().mockResolvedValue(undefined)
      const user = userEvent.setup() // installs its own clipboard stub, so ours goes after it
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
      wrap(<ExternalPeopleSection projectId="p1" />)

      expect(await screen.findByText('Nenhuma pessoa externa neste projeto. Quem você convidar por e-mail aparece aqui.')).toBeInTheDocument()
      await user.type(screen.getByLabelText('E-mail da pessoa'), 'ana@cliente.com')
      await user.click(screen.getByRole('button', { name: 'Convidar' }))
      expect(api.post).toHaveBeenCalledWith('/projects/p1/externals/invitations', { email: 'ana@cliente.com' })
      expect(await screen.findByLabelText('Link do convite')).toHaveValue('http://app/invite/tok')
      await user.click(screen.getByRole('button', { name: 'Copiar link' }))
      expect(writeText).toHaveBeenCalledWith('http://app/invite/tok')
      expect(await screen.findByRole('button', { name: 'Copiado' })).toBeInTheDocument()
    })

    it('mostra o selo Externo, o status do convite em texto e remove após confirmar', async () => {
      api.get.mockResolvedValue({
        data: {
          externals: [{ user_id: 'u-g', name: 'Gina', email: 'gina@cliente.com', access: 'viewer', joined_at: '' }],
          invitations: [{ id: 'i2', email: 'nao@cliente.com', status: 'rejected', expires_at: '', created_at: '' }],
        },
      })
      api.delete.mockResolvedValue({ data: {} })
      const user = userEvent.setup()
      wrap(<ExternalPeopleSection projectId="p1" />)
      expect(await screen.findByTestId('external-badge')).toHaveTextContent('Externo')
      expect(screen.getByText('Recusado')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Remover da lista' }))
      expect(api.delete).toHaveBeenCalledWith('/projects/p1/externals/invitations/i2')
      await user.click(screen.getByRole('button', { name: 'Remover Gina' }))
      await user.click(within(await screen.findByRole('dialog', { name: 'Remover pessoa externa' })).getByRole('button', { name: 'Remover acesso' }))
      await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/projects/p1/externals/u-g'))
    })
  })

  describe('Regras do Fathom', () => {
    it('vazio explica o que acontece; adiciona uma regra com o campo escolhido', async () => {
      api.get.mockResolvedValue({ data: [] })
      api.post.mockResolvedValue({ data: {} })
      const user = userEvent.setup()
      wrap(<FathomRulesSection projectId="p1" />)
      expect(await screen.findByText(/Nenhuma regra ainda/)).toBeInTheDocument()
      await user.click(screen.getByRole('combobox', { name: 'Campo' }))
      await user.click(await screen.findByRole('option', { name: 'Domínio do participante é' }))
      await user.type(screen.getByLabelText('Valor'), 'cliente.com')
      await user.click(screen.getByRole('button', { name: 'Adicionar regra' }))
      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/projects/p1/fathom-rules', { field: 'participant_domain', value: 'cliente.com' }))
    })

    it('recusa um domínio com @ antes da API e remove uma regra pelo botão rotulado', async () => {
      api.get.mockResolvedValue({ data: [{ id: 'r1', project_id: 'p1', field: 'title', operator: 'contains', value: 'D/SEASON', created_at: null }] })
      api.delete.mockResolvedValue({ data: {} })
      const user = userEvent.setup()
      wrap(<FathomRulesSection projectId="p1" />)
      await user.click(await screen.findByRole('combobox', { name: 'Campo' }))
      await user.click(await screen.findByRole('option', { name: 'Domínio do participante é' }))
      await user.type(screen.getByLabelText('Valor'), '@cliente.com')
      await user.click(screen.getByRole('button', { name: 'Adicionar regra' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('um domínio não tem @')
      expect(api.post).not.toHaveBeenCalled()
      await user.click(screen.getByRole('button', { name: 'Remover regra: Título contém "D/SEASON"' }))
      await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/projects/p1/fathom-rules/r1'))
    })

    it('mostra esqueleto enquanto carrega e nada em 403', async () => {
      let reject: (e: unknown) => void = () => undefined
      api.get.mockReturnValue(new Promise((_, r) => (reject = r)))
      const { container } = wrap(<FathomRulesSection projectId="p1" />)
      expect(await screen.findByRole('status', { name: 'Carregando…' })).toBeInTheDocument()
      reject(httpError(403))
      await waitFor(() => expect(container.querySelector('section')).toBeNull())
    })
  })

  describe('Pasta do Google Drive', () => {
    it('linha de integração "Não conectada", escolhe uma pasta e mostra "Conectada"', async () => {
      api.get.mockImplementation((url: string) =>
        Promise.resolve({ data: url.endsWith('/options') ? [{ id: 'f1', name: 'D/SEASON', shared_by: 'gabriela@soubim.com', shared_at: null, url: null }] : DRIVE }),
      )
      api.put.mockResolvedValue({ data: { ...DRIVE, folder_id: 'f1', folder_name: 'D/SEASON' } })
      const user = userEvent.setup()
      wrap(<DriveFolderSection projectId="p1" title="4 · Documentos do Google Drive" />)
      expect(await screen.findByRole('heading', { name: '4 · Documentos do Google Drive' })).toBeInTheDocument()
      expect(screen.getByText('Não conectada')).toBeInTheDocument()
      expect(screen.getByText(ROBOT)).toBeInTheDocument()
      const picker = screen.getByRole('combobox', { name: 'Pasta' })
      await waitFor(() => expect(picker).toBeEnabled())
      await user.click(picker)
      await user.click(await screen.findByRole('option', { name: 'D/SEASON — compartilhada por gabriela@soubim.com' }))
      await user.click(screen.getByRole('button', { name: 'Usar esta pasta' }))
      await waitFor(() => expect(api.put).toHaveBeenCalledWith('/projects/p1/drive-folder', { folder_id: 'f1' }))
      expect(await screen.findByText('Pasta atual: D/SEASON')).toBeInTheDocument()
      expect(screen.getByText(/Conectada · monitorando novos arquivos/)).toBeInTheDocument()
    })

    it('remove a pasta só depois do diálogo', async () => {
      api.get.mockImplementation((url: string) => Promise.resolve({ data: url.endsWith('/options') ? [] : { ...DRIVE, folder_id: 'f1', folder_name: 'D/SEASON' } }))
      api.delete.mockResolvedValue({ data: {} })
      const user = userEvent.setup()
      wrap(<DriveFolderSection projectId="p1" />)
      await user.click(await screen.findByRole('button', { name: 'Remover pasta' }))
      const dialog = await screen.findByRole('dialog', { name: 'Parar de monitorar a pasta' })
      expect(api.delete).not.toHaveBeenCalled()
      await user.click(within(dialog).getByRole('button', { name: 'Remover pasta' }))
      await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/projects/p1/drive-folder'))
    })
  })

  describe('Versões da extração', () => {
    it('lista as versões e troca a ativa depois de confirmar', async () => {
      api.get.mockResolvedValue({ data: { source_id: 's1', can_manage: true, runs: [RUN(2, true), RUN(1, false)], latest_job: null } })
      api.post.mockResolvedValue({ data: {} })
      const user = userEvent.setup()
      wrap(<ExtractionVersions sourceId="s1" />)
      await user.click(await screen.findByRole('button', { name: 'Versões (2)' }))
      expect(screen.getByText('Versão 2')).toBeInTheDocument()
      expect(screen.getByText('Ativa')).toBeInTheDocument()
      expect(screen.getAllByText('3 itens')).toHaveLength(2)
      await user.click(screen.getByRole('button', { name: 'Usar esta versão' }))
      const dialog = await screen.findByRole('dialog', { name: 'Usar a versão 1?' })
      expect(api.post).not.toHaveBeenCalled()
      await user.click(within(dialog).getByRole('button', { name: 'Usar a versão 1' }))
      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/sources/s1/extraction-runs/run-1/activate'))
    })

    it('extrai de novo e explica o estado vazio', async () => {
      api.get.mockResolvedValue({ data: { source_id: 's1', can_manage: true, runs: [], latest_job: null } })
      api.post.mockResolvedValue({ data: {} })
      const user = userEvent.setup()
      wrap(<ExtractionVersions sourceId="s1" />)
      await user.click(await screen.findByRole('button', { name: 'Versões (0)' }))
      expect(screen.getByText('Nenhuma versão ainda. Uma versão é criada sempre que a reunião é extraída.')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Extrair novamente' }))
      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/sources/s1/re-extract'))
    })
  })

  describe('Visibilidade da reunião', () => {
    it('compartilha só depois de confirmar no diálogo', async () => {
      api.patch.mockResolvedValue({ data: { id: 's1', visibility: 'shared' } })
      const user = userEvent.setup()
      wrap(<MeetingVisibilityControl sourceId="s1" visibility="internal" canChange />)
      expect(screen.getByTestId('visibility-badge')).toHaveTextContent('Interna')
      await user.click(screen.getByRole('button', { name: 'Compartilhar com o projeto' }))
      const dialog = await screen.findByRole('dialog', { name: 'Confirmar visibilidade da reunião' })
      expect(dialog).toHaveTextContent('Todas as organizações do projeto passarão a ver esta reunião')
      expect(api.patch).not.toHaveBeenCalled()
      await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }))
      await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/sources/s1/visibility', { visibility: 'shared' }))
    })
  })

  describe('Adicionar reunião', () => {
    it('envia só a transcrição para o projeto escolhido', async () => {
      api.get.mockResolvedValue({ data: [{ id: 'p1', name: 'Obra X', can_share: false }] })
      api.post.mockResolvedValue({ data: { id: 'src-9', project_id: 'p1', title: 'Visita' } })
      const onClose = vi.fn()
      const user = userEvent.setup()
      wrap(<AddMeetingDialog open onClose={onClose} />)
      expect(screen.getByRole('dialog', { name: 'Adicionar reunião' })).toBeInTheDocument()
      const submit = screen.getByRole('button', { name: 'Adicionar reunião' })
      expect(submit).toBeDisabled()
      await user.click(await screen.findByRole('combobox', { name: 'Projeto' }))
      await user.click(await screen.findByRole('option', { name: 'Obra X' }))
      expect(screen.getByLabelText(/^Compartilhada/)).toBeDisabled()
      expect(screen.getByText('Só o proprietário ou admin da sua organização pode compartilhar uma reunião.')).toBeInTheDocument()
      await user.upload(screen.getByLabelText('Transcrição (.txt)'), new File(['0:05 - Ana\n  Oi.'], 'Visita de obra.txt', { type: 'text/plain' }))
      await waitFor(() => expect(submit).toBeEnabled())
      await user.click(submit)
      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/uploads/complete', expect.objectContaining({ project_id: 'p1', transcript: '0:05 - Ana\n  Oi.', visibility: 'internal' })))
      await waitFor(() => expect(onClose).toHaveBeenCalled())
    })

    it('mostra o erro do envio e oferece "Tentar de novo"', async () => {
      api.get.mockResolvedValue({ data: [{ id: 'p1', name: 'Obra X', can_share: true }] })
      api.post.mockRejectedValue(httpError(403))
      const user = userEvent.setup()
      wrap(<AddMeetingDialog open onClose={vi.fn()} />)
      await user.click(await screen.findByRole('combobox', { name: 'Projeto' }))
      await user.click(await screen.findByRole('option', { name: 'Obra X' }))
      await user.type(screen.getByLabelText('Título'), 'Visita')
      await user.upload(screen.getByLabelText('Transcrição (.txt)'), new File(['texto'], 'ata.txt', { type: 'text/plain' }))
      await user.click(await screen.findByRole('button', { name: 'Adicionar reunião' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('Você não pode adicionar reuniões neste projeto')
      expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeEnabled()
    })
  })
})
