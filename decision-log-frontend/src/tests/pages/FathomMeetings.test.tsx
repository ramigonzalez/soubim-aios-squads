import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import i18n from '../../i18n'
import FathomMeetings from '../../pages/FathomMeetings'
import { integrationsService } from '../../services/integrationsService'
import type { FathomImport, FathomMeeting, FathomStatus } from '../../types/integrations'

vi.mock('../../services/integrationsService', () => ({
  integrationsService: {
    getFathomStatus: vi.fn(),
    listFathomMeetings: vi.fn(),
    getFathomImportProjects: vi.fn(),
    importFathomMeeting: vi.fn(),
    retryFathomImport: vi.fn(),
    listFathomUnassigned: vi.fn().mockResolvedValue([]),
  },
}))

type Mocked = ReturnType<typeof vi.fn>
const service = integrationsService as unknown as Record<
  'getFathomStatus' | 'listFathomMeetings' | 'getFathomImportProjects' | 'importFathomMeeting' | 'retryFathomImport',
  Mocked
>

const connected: FathomStatus = {
  configured: true,
  connected: true,
  needs_reconnect: false,
  account_label: 'rami@example.com',
  connected_at: '2026-10-06T12:00:00',
}

function meeting(overrides: Partial<FathomMeeting> = {}): FathomMeeting {
  return {
    recording_id: '123',
    title: 'Coordenação D/SEASON',
    started_at: '2026-10-01T13:00:00Z',
    duration_minutes: 98,
    invitees: [
      { name: 'Ana Souza', email: 'ana@example.com' },
      { name: 'Bruno', email: 'bruno@example.com' },
    ],
    recorded_by: { name: 'Rami', email: 'rami@example.com' },
    share_url: 'https://fathom.video/share/abc',
    imports: [],
    ...overrides,
  }
}

function anImport(overrides: Partial<FathomImport> = {}): FathomImport {
  return {
    id: 'imp-1',
    project_id: 'p1',
    project_name: 'D/SEASON',
    state: 'imported',
    source_id: 'imp-1',
    source_status: 'pending',
    job: null,
    error: null,
    can_retry: false,
    ...overrides,
  }
}

function renderPage(status: Partial<FathomStatus> = {}) {
  service.getFathomStatus.mockResolvedValue({ ...connected, ...status })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <FathomMeetings />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('FathomMeetings (Story 13.4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    service.getFathomImportProjects.mockResolvedValue([
      { id: 'p1', name: 'D/SEASON', can_share: true },
      { id: 'p2', name: 'Casa Verde', can_share: false },
    ])
  })

  it("lists the user's meetings with date, duration and invitees", async () => {
    service.listFathomMeetings.mockResolvedValue({ items: [meeting()], next_cursor: null })
    renderPage()
    expect(await screen.findByText('Coordenação D/SEASON')).toBeInTheDocument()
    expect(screen.getByText(/98 min · 2 invitees/)).toBeInTheDocument()
    expect(screen.getByText('Ana Souza, Bruno')).toBeInTheDocument()
    expect(service.listFathomMeetings).toHaveBeenCalledWith(undefined)
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })

  it('marks meetings already imported, with the meeting status', async () => {
    service.listFathomMeetings.mockResolvedValue({ items: [meeting({ imports: [anImport()] })], next_cursor: null })
    renderPage()
    expect(await screen.findByText('Imported into D/SEASON')).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
  })

  it('shows imports in progress with the worker badge', async () => {
    service.listFathomMeetings.mockResolvedValue({
      items: [meeting({
        imports: [anImport({
          state: 'queued', source_id: null, source_status: null,
          job: { status: 'queued', attempts: 1, max_attempts: 5, run_after: null, last_error: 'still preparing' },
        })],
      })],
      next_cursor: null,
    })
    renderPage()
    expect(await screen.findByText('Importing into D/SEASON')).toBeInTheDocument()
    expect(screen.getByText('Retrying (2/5)')).toBeInTheDocument()
  })

  it('loads the next page with the cursor', async () => {
    service.listFathomMeetings
      .mockResolvedValueOnce({ items: [meeting()], next_cursor: 'cur-2' })
      .mockResolvedValueOnce({ items: [meeting({ recording_id: '456', title: 'Entrevista' })], next_cursor: null })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Load more' }))
    expect(await screen.findByText('Entrevista')).toBeInTheDocument()
    expect(service.listFathomMeetings).toHaveBeenLastCalledWith('cur-2')
    expect(screen.getByText('Coordenação D/SEASON')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })

  it('searches loaded meetings by title and participant', async () => {
    service.listFathomMeetings.mockResolvedValue({
      items: [meeting(), meeting({ recording_id: '456', title: 'Entrevista', invitees: [{ name: 'Carla', email: null }] })],
      next_cursor: null,
    })
    renderPage()
    const search = await screen.findByPlaceholderText('Search by title or participant')
    await userEvent.type(search, 'carla')
    expect(screen.getByText('Entrevista')).toBeInTheDocument()
    expect(screen.queryByText('Coordenação D/SEASON')).not.toBeInTheDocument()
    await userEvent.clear(search)
    await userEvent.type(search, 'nothing-like-this')
    expect(screen.getByText('No loaded meeting matches the search.')).toBeInTheDocument()
  })

  it('imports into the chosen project; projects that already have it are disabled', async () => {
    service.listFathomMeetings.mockResolvedValue({ items: [meeting({ imports: [anImport()] })], next_cursor: null })
    service.importFathomMeeting.mockResolvedValue(anImport({ id: 'imp-2', project_id: 'p2', state: 'queued' }))
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Import: Coordenação D/SEASON' }))

    const dialog = await screen.findByRole('dialog')
    const select = await within(dialog).findByRole('combobox')
    expect(within(dialog).getByRole('option', { name: 'D/SEASON (already imported)' })).toBeDisabled()
    expect(within(dialog).getByRole('button', { name: 'Import' })).toBeDisabled()

    await userEvent.selectOptions(select, 'p2')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Import' }))

    await waitFor(() => expect(service.importFathomMeeting).toHaveBeenCalledWith({ recording_id: '123', project_id: 'p2', visibility: 'internal' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await waitFor(() => expect(service.listFathomMeetings).toHaveBeenCalledTimes(2)) // refreshed
  })

  it('imports as shared when chosen (Story 12.4); internal is the default', async () => {
    service.listFathomMeetings.mockResolvedValue({ items: [meeting()], next_cursor: null })
    service.importFathomMeeting.mockResolvedValue(anImport({ state: 'queued', visibility: 'shared' }))
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Import: Coordenação D/SEASON' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.selectOptions(await within(dialog).findByRole('combobox'), 'p1')
    const internal = within(dialog).getByRole('radio', { name: /Internal/ })
    const shared = within(dialog).getByRole('radio', { name: /Shared/ })
    expect(internal).toBeChecked()
    await userEvent.click(shared)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Import' }))
    await waitFor(() =>
      expect(service.importFathomMeeting).toHaveBeenCalledWith({ recording_id: '123', project_id: 'p1', visibility: 'shared' })
    )
  })

  it('shared is disabled where the user is not an admin of their organization', async () => {
    service.listFathomMeetings.mockResolvedValue({ items: [meeting()], next_cursor: null })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Import: Coordenação D/SEASON' }))
    const dialog = await screen.findByRole('dialog')
    const select = await within(dialog).findByRole('combobox')
    await userEvent.selectOptions(select, 'p1')
    await userEvent.click(within(dialog).getByRole('radio', { name: /Shared/ }))
    await userEvent.selectOptions(select, 'p2')
    expect(within(dialog).getByRole('radio', { name: /Shared/ })).toBeDisabled()
    expect(within(dialog).getByRole('radio', { name: /Internal/ })).toBeChecked()
    expect(within(dialog).getByText('Only admins of your organization can import a meeting as shared.')).toBeInTheDocument()
  })

  it('shows why an import was refused', async () => {
    service.listFathomMeetings.mockResolvedValue({ items: [meeting()], next_cursor: null })
    service.importFathomMeeting.mockRejectedValue({ response: { status: 409, data: { detail: { code: 'already_imported' } } } })
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Import: Coordenação D/SEASON' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.selectOptions(await within(dialog).findByRole('combobox'), 'p1')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Import' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('This meeting is already imported into this project.')
  })

  it('shows a failed import with its error and lets the importer retry', async () => {
    service.listFathomMeetings.mockResolvedValue({
      items: [meeting({
        imports: [anImport({
          state: 'failed', source_id: null, source_status: null, can_retry: true,
          error: 'Fathom has no media for this recording (HTTP 422)',
        })],
      })],
      next_cursor: null,
    })
    service.retryFathomImport.mockResolvedValue(anImport({ state: 'queued' }))
    renderPage()
    expect(await screen.findByText('Import into D/SEASON failed')).toBeInTheDocument()
    expect(screen.getByText('Fathom has no media for this recording (HTTP 422)')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(service.retryFathomImport).toHaveBeenCalledWith('imp-1'))
  })

  it('no retry button for imports made by somebody else', async () => {
    service.listFathomMeetings.mockResolvedValue({
      items: [meeting({ imports: [anImport({ state: 'failed', source_id: null, source_status: null, error: 'x' })] })],
      next_cursor: null,
    })
    renderPage()
    expect(await screen.findByText('Import into D/SEASON failed')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument()
  })

  it('asks to connect or reconnect instead of listing', async () => {
    renderPage({ connected: false })
    expect(await screen.findByText('Connect your Fathom account to see your meetings.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to Integrations' })).toHaveAttribute('href', '/settings/integrations')
    expect(service.listFathomMeetings).not.toHaveBeenCalled()
  })

  it('a reconnect answer from the list shows the reconnect message', async () => {
    service.listFathomMeetings.mockRejectedValue({ response: { status: 409, data: { detail: 'needs_reconnect' } } })
    renderPage()
    expect(await screen.findByText('The Fathom connection expired. Reconnect your account.')).toBeInTheDocument()
  })

  it('empty account', async () => {
    service.listFathomMeetings.mockResolvedValue({ items: [], next_cursor: null })
    renderPage()
    expect(await screen.findByText('No meetings found in your Fathom account.')).toBeInTheDocument()
  })

  describe('in Portuguese', () => {
    afterEach(() => i18n.changeLanguage('en'))

    it('labels the page in pt-BR', async () => {
      await i18n.changeLanguage('pt-BR')
      service.listFathomMeetings.mockResolvedValue({ items: [meeting({ imports: [anImport()] })], next_cursor: 'c' })
      renderPage()
      expect(await screen.findByRole('heading', { name: 'Reuniões do Fathom' })).toBeInTheDocument()
      expect(await screen.findByText('Importada em D/SEASON')).toBeInTheDocument()
      expect(screen.getByText(/98 min · 2 convidados/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Carregar mais' })).toBeInTheDocument()
    })
  })
})
