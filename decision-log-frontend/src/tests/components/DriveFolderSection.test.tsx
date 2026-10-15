import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from 'react-query'
import i18n from '../../i18n'
import DriveFolderSection from '../../components/organisms/DriveFolderSection'
import { integrationsService } from '../../services/integrationsService'

vi.mock('../../services/integrationsService', () => ({
  integrationsService: {
    getDriveFolder: vi.fn(),
    listDriveFolderOptions: vi.fn(),
    setDriveFolder: vi.fn(),
    clearDriveFolder: vi.fn(),
  },
}))

type Mocked = ReturnType<typeof vi.fn>
const service = integrationsService as unknown as Record<
  'getDriveFolder' | 'listDriveFolderOptions' | 'setDriveFolder' | 'clearDriveFolder', Mocked
>

const ROBOT = 'promem-drive@decisionlog-soubim.iam.gserviceaccount.com'
const EMPTY = { configured: true, service_account_email: ROBOT, folder_id: null, folder_name: null, last_checked_at: null, error: null }
const OPTIONS = [
  { id: 'f1', name: 'D/SEASON', shared_by: 'gabriela@eusoubim.com', shared_at: null, url: null },
  { id: 'f2', name: 'Outro', shared_by: 'ana@eusoubim.com', shared_at: null, url: null },
]

function wrap() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}><DriveFolderSection projectId="p1" /></QueryClientProvider>)
}

describe('DriveFolderSection (Story 12.9)', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
    service.getDriveFolder.mockResolvedValue(EMPTY)
    service.listDriveFolderOptions.mockResolvedValue(OPTIONS)
    service.setDriveFolder.mockResolvedValue({ ...EMPTY, folder_id: 'f1', folder_name: 'D/SEASON' })
    service.clearDriveFolder.mockResolvedValue(undefined)
  })

  it('shows the service account e-mail and the folders shared by the organization', async () => {
    wrap()
    expect(await screen.findByRole('heading', { name: 'Google Drive folder' })).toBeInTheDocument()
    expect(screen.getByText(ROBOT)).toBeInTheDocument()
    expect(await screen.findByRole('option', { name: /D\/SEASON — shared by gabriela@eusoubim.com/ })).toBeInTheDocument()
  })

  it('renders nothing when the user cannot manage it (403)', async () => {
    service.getDriveFolder.mockRejectedValue({ response: { status: 403 } })
    const { container } = wrap()
    await waitFor(() => expect(service.getDriveFolder).toHaveBeenCalled())
    expect(container).toBeEmptyDOMElement()
  })

  it('says when Drive is not configured, without listing folders', async () => {
    service.getDriveFolder.mockResolvedValue({ ...EMPTY, configured: false, service_account_email: null })
    wrap()
    expect(await screen.findByText(/not enabled on this server/)).toBeInTheDocument()
    expect(service.listDriveFolderOptions).not.toHaveBeenCalled()
  })

  it('chooses a folder', async () => {
    const user = userEvent.setup()
    wrap()
    await screen.findByRole('option', { name: /D\/SEASON/ })
    await user.selectOptions(screen.getByLabelText('Folder'), 'f1')
    await user.click(screen.getByRole('button', { name: 'Use this folder' }))
    await waitFor(() => expect(service.setDriveFolder).toHaveBeenCalledWith('p1', 'f1'))
    expect(await screen.findByText('Current folder: D/SEASON')).toBeInTheDocument()
  })

  it('shows the API reason when the folder is refused', async () => {
    service.setDriveFolder.mockRejectedValue({ response: { status: 403, data: { detail: 'folder_not_shared_by_organization' } } })
    const user = userEvent.setup()
    wrap()
    await screen.findByRole('option', { name: /D\/SEASON/ })
    await user.selectOptions(screen.getByLabelText('Folder'), 'f1')
    await user.click(screen.getByRole('button', { name: 'Use this folder' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('not shared by someone in your organization')
  })

  it('shows the current folder, its poll error, and removes it after confirming', async () => {
    service.getDriveFolder.mockResolvedValue({ ...EMPTY, folder_id: 'f1', folder_name: 'D/SEASON', error: 'folder_not_accessible' })
    const user = userEvent.setup()
    wrap()
    expect(await screen.findByText('Current folder: D/SEASON')).toBeInTheDocument()
    expect(screen.getByText(/Is it still shared/)).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /D\/SEASON/ })).not.toBeInTheDocument() // the current one is not offered again
    await user.click(screen.getByRole('button', { name: 'Remove folder' }))
    expect(screen.getByText(/Stop monitoring this folder/)).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Remove folder' })[0])
    await waitFor(() => expect(service.clearDriveFolder).toHaveBeenCalledWith('p1'))
  })

  it('shows an empty state with the next step', async () => {
    service.listDriveFolderOptions.mockResolvedValue([])
    wrap()
    expect(await screen.findByText(/No shared folders yet/)).toBeInTheDocument()
  })
})
