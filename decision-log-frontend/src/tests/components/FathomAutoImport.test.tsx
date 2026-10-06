import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from 'react-query'
import i18n from '../../i18n'
import { FathomAutoImportSettings } from '../../components/organisms/FathomAutoImportSettings'
import { FathomUnassignedList } from '../../components/organisms/FathomUnassignedList'
import { integrationsService } from '../../services/integrationsService'

vi.mock('../../services/integrationsService', () => ({
  integrationsService: {
    getFathomImportProjects: vi.fn(),
    setFathomAutoImport: vi.fn(),
    listFathomUnassigned: vi.fn(),
    assignFathomUnassigned: vi.fn(),
    discardFathomUnassigned: vi.fn(),
  },
}))

type Mocked = ReturnType<typeof vi.fn>
const service = integrationsService as unknown as Record<
  'getFathomImportProjects' | 'setFathomAutoImport' | 'listFathomUnassigned' | 'assignFathomUnassigned' | 'discardFathomUnassigned',
  Mocked
>

const PROJECTS = [
  { id: 'p1', name: 'D/SEASON', can_share: true },
  { id: 'p2', name: 'Casa Verde', can_share: false },
]

function wrap(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('FathomAutoImportSettings (Story 13.9)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
    service.getFathomImportProjects.mockResolvedValue(PROJECTS)
    service.setFathomAutoImport.mockResolvedValue({ enabled: true, project_id: null, project_name: null, visibility: 'internal' })
  })

  it('is off by default and hides the options', () => {
    wrap(<FathomAutoImportSettings settings={undefined} onSaved={() => {}} />)
    expect(screen.getByRole('checkbox', { name: 'Import new Fathom meetings automatically' })).not.toBeChecked()
    expect(screen.queryByLabelText('Default project')).not.toBeInTheDocument()
  })

  it('enables with a default project (internal)', async () => {
    const onSaved = vi.fn()
    wrap(<FathomAutoImportSettings settings={{ enabled: false, project_id: null, project_name: null, visibility: 'internal' }} onSaved={onSaved} />)
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.selectOptions(await screen.findByLabelText('Default project'), 'p2')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(service.setFathomAutoImport).toHaveBeenCalledWith({ enabled: true, project_id: 'p2', visibility: 'internal' }))
    expect(await screen.findByRole('status')).toHaveTextContent('saved')
    expect(onSaved).toHaveBeenCalled()
  })

  it('shared is only offered where the user can share', async () => {
    wrap(<FathomAutoImportSettings settings={{ enabled: true, project_id: null, project_name: null, visibility: 'internal' }} onSaved={() => {}} />)
    await userEvent.selectOptions(await screen.findByLabelText('Default project'), 'p2')
    expect(screen.getByRole('radio', { name: /Shared/ })).toBeDisabled()
    await userEvent.selectOptions(screen.getByLabelText('Default project'), 'p1')
    expect(screen.getByRole('radio', { name: /Shared/ })).toBeEnabled()
    await userEvent.click(screen.getByRole('radio', { name: /Shared/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(service.setFathomAutoImport).toHaveBeenCalledWith({ enabled: true, project_id: 'p1', visibility: 'shared' }))
  })

  it('turns it off', async () => {
    wrap(<FathomAutoImportSettings settings={{ enabled: true, project_id: 'p1', project_name: 'D/SEASON', visibility: 'internal' }} onSaved={() => {}} />)
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(service.setFathomAutoImport).toHaveBeenCalledWith({ enabled: false, project_id: 'p1', visibility: 'internal' }))
  })

  it('shows a message when Fathom fails to register the webhook', async () => {
    service.setFathomAutoImport.mockRejectedValue({ response: { status: 502 } })
    wrap(<FathomAutoImportSettings settings={undefined} onSaved={() => {}} />)
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('could not register the webhook')
  })
})

describe('FathomUnassignedList (Story 13.9)', () => {
  const item = { id: 'u1', recording_id: '777', title: 'Coordenação semanal', started_at: '2026-10-02T13:00:00Z', reason: 'no_default_project', received_at: null }

  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
    service.getFathomImportProjects.mockResolvedValue(PROJECTS)
    service.listFathomUnassigned.mockResolvedValue([item])
    service.assignFathomUnassigned.mockResolvedValue({})
    service.discardFathomUnassigned.mockResolvedValue(undefined)
  })

  it('renders nothing when there are no unassigned meetings', async () => {
    service.listFathomUnassigned.mockResolvedValue([])
    const { container } = wrap(<FathomUnassignedList />)
    await waitFor(() => expect(service.listFathomUnassigned).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('assigns a meeting to a project (internal)', async () => {
    wrap(<FathomUnassignedList />)
    expect(await screen.findByText('Coordenação semanal')).toBeInTheDocument()
    const assign = screen.getByRole('button', { name: 'Import: Coordenação semanal' })
    expect(assign).toBeDisabled()
    await userEvent.selectOptions(screen.getByLabelText('Project: Coordenação semanal'), 'p1')
    await userEvent.click(assign)
    await waitFor(() => expect(service.assignFathomUnassigned).toHaveBeenCalledWith('u1', { project_id: 'p1', visibility: 'internal' }))
  })

  it('discards a meeting', async () => {
    wrap(<FathomUnassignedList />)
    await userEvent.click(await screen.findByRole('button', { name: 'Discard: Coordenação semanal' }))
    await waitFor(() => expect(service.discardFathomUnassigned).toHaveBeenCalledWith('u1'))
  })

  it('explains a duplicate', async () => {
    service.assignFathomUnassigned.mockRejectedValue({ response: { status: 409 } })
    wrap(<FathomUnassignedList />)
    await screen.findByText('Coordenação semanal')
    await userEvent.selectOptions(screen.getByLabelText('Project: Coordenação semanal'), 'p1')
    await userEvent.click(screen.getByRole('button', { name: 'Import: Coordenação semanal' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('already imported')
  })
})
