import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from 'react-query'
import i18n from '../../i18n'
import { FathomAutoImportSettings } from '../../components/organisms/FathomAutoImportSettings'
import { integrationsService } from '../../services/integrationsService'

vi.mock('../../services/integrationsService', () => ({
  integrationsService: {
    getFathomImportProjects: vi.fn(),
    setFathomAutoImport: vi.fn(),
  },
}))

type Mocked = ReturnType<typeof vi.fn>
const service = integrationsService as unknown as Record<'getFathomImportProjects' | 'setFathomAutoImport', Mocked>

const PROJECTS = [
  { id: 'p1', name: 'D/SEASON', can_share: true },
  { id: 'p2', name: 'Casa Verde', can_share: false },
]

function wrap(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('FathomAutoImportSettings (Story 13.9, no default project since 13.16)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
    service.getFathomImportProjects.mockResolvedValue(PROJECTS)
    service.setFathomAutoImport.mockResolvedValue({ enabled: true, visibility: 'internal' })
  })

  it('is off by default and hides the options', () => {
    wrap(<FathomAutoImportSettings settings={undefined} onSaved={() => {}} />)
    expect(screen.getByRole('checkbox', { name: 'Import new Fathom meetings automatically' })).not.toBeChecked()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })

  it('has no default-project picker; routing is explained instead', async () => {
    wrap(<FathomAutoImportSettings settings={{ enabled: true, visibility: 'internal' }} onSaved={() => {}} />)
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByText(/Fathom rules it matches/)).toBeInTheDocument()
  })

  it('enables it (internal)', async () => {
    const onSaved = vi.fn()
    wrap(<FathomAutoImportSettings settings={{ enabled: false, visibility: 'internal' }} onSaved={onSaved} />)
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(service.setFathomAutoImport).toHaveBeenCalledWith({ enabled: true, visibility: 'internal' }))
    expect(await screen.findByRole('status')).toHaveTextContent('saved')
    expect(onSaved).toHaveBeenCalled()
  })

  it('shared is offered when the user can share on some project', async () => {
    wrap(<FathomAutoImportSettings settings={{ enabled: true, visibility: 'internal' }} onSaved={() => {}} />)
    await waitFor(() => expect(screen.getByRole('radio', { name: /Shared/ })).toBeEnabled())
    await userEvent.click(screen.getByRole('radio', { name: /Shared/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(service.setFathomAutoImport).toHaveBeenCalledWith({ enabled: true, visibility: 'shared' }))
  })

  it('shared is disabled when the user cannot share anywhere', async () => {
    service.getFathomImportProjects.mockResolvedValue([PROJECTS[1]])
    wrap(<FathomAutoImportSettings settings={{ enabled: true, visibility: 'internal' }} onSaved={() => {}} />)
    await waitFor(() => expect(service.getFathomImportProjects).toHaveBeenCalled())
    expect(screen.getByRole('radio', { name: /Shared/ })).toBeDisabled()
  })

  it('turns it off', async () => {
    wrap(<FathomAutoImportSettings settings={{ enabled: true, visibility: 'internal' }} onSaved={() => {}} />)
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(service.setFathomAutoImport).toHaveBeenCalledWith({ enabled: false, visibility: 'internal' }))
  })

  it('shows a message when Fathom fails to register the webhook', async () => {
    service.setFathomAutoImport.mockRejectedValue({ response: { status: 502 } })
    wrap(<FathomAutoImportSettings settings={undefined} onSaved={() => {}} />)
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('could not register the webhook')
  })
})
