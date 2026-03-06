import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import IngestionApproval from '../../components/organisms/IngestionApproval'
import Ingestion from '../../pages/Ingestion'
import { useIngestionStore } from '../../store/ingestionStore'
import { useAuthStore } from '../../store/authStore'
import { formatFileSize } from '../../lib/utils'
import type { MeetingSource, EmailSource, DocumentSource, IngestionResponse, IngestionHistoryResponse } from '../../types/ingestion'

// Mock the hooks
vi.mock('../../hooks/useIngestion', () => ({
  useIngestion: vi.fn(),
  useIngestionHistory: vi.fn(),
  useFilteredSources: vi.fn(),
}))

vi.mock('../../hooks/useIngestionMutation', () => ({
  useBatchAction: vi.fn(),
  useApproveSource: vi.fn(),
  useRejectSource: vi.fn(),
  useRetrySource: vi.fn(),
  useDeleteSource: vi.fn(),
}))

vi.mock('../../services/ingestionService', () => ({
  ingestionService: {
    getSources: vi.fn(),
    getHistory: vi.fn(),
    approveSource: vi.fn(),
    rejectSource: vi.fn(),
    retrySource: vi.fn(),
    deleteSource: vi.fn(),
    batchAction: vi.fn(),
    getPendingCount: vi.fn(),
  },
}))

import { useIngestion, useIngestionHistory, useFilteredSources } from '../../hooks/useIngestion'
import { useBatchAction, useApproveSource, useRejectSource, useRetrySource, useDeleteSource } from '../../hooks/useIngestionMutation'

const mockUseIngestion = useIngestion as any
const mockUseIngestionHistory = useIngestionHistory as any
const mockUseFilteredSources = useFilteredSources as any
const mockUseBatchAction = useBatchAction as any
const mockUseApproveSource = useApproveSource as any
const mockUseRejectSource = useRejectSource as any
const mockUseRetrySource = useRetrySource as any
const mockUseDeleteSource = useDeleteSource as any

// --- Shared base fields ---
const baseFields = {
  approved_by_name: null as string | null,
  approved_at: null as string | null,
  rejected_by_name: null as string | null,
  rejected_at: null as string | null,
  extraction_error: null as string | null,
  extracted_item_count: 0,
}

// --- Test data ---

const meetingSource: MeetingSource = {
  id: 'src_001',
  project_id: 'proj_001',
  project_name: 'Soubim Tower',
  source_type: 'meeting',
  status: 'pending',
  ai_summary: 'Discussed facade material change from glass to aluminum panels due to budget constraints. Key decision: proceed with aluminum option B.',
  included: false,
  created_at: '2026-02-18T09:00:00Z',
  call_id: 'call_xyz789',
  title: 'Facade Material Review',
  meeting_date: '2026-02-18T09:00:00Z',
  meeting_type: 'Design Review',
  source_label: 'Fireflies',
  transcript_url: 'https://app.fireflies.ai/view/xyz789',
  ...baseFields,
}

const emailSource: EmailSource = {
  id: 'src_002',
  project_id: 'proj_001',
  project_name: 'Soubim Tower',
  source_type: 'email',
  status: 'approved',
  ai_summary: 'Structural load calculations review requested.',
  included: true,
  created_at: '2026-02-18T10:30:00Z',
  email_id: 'email_abc',
  email_date: '2026-02-18T10:30:00Z',
  subject: 'RE: Structural Load Calculations',
  from_address: 'engineer@firm.com',
  recipient_count: 4,
  thread_url: 'https://mail.example.com/thread/abc',
  ...baseFields,
}

const documentSource: DocumentSource = {
  id: 'src_003',
  project_id: 'proj_002',
  project_name: 'Marina Bay',
  source_type: 'document',
  status: 'rejected',
  ai_summary: null,
  included: false,
  created_at: '2026-02-17T14:00:00Z',
  document_id: 'doc_001',
  upload_date: '2026-02-17T14:00:00Z',
  file_name: 'facade-spec-v3.pdf',
  file_type: 'PDF',
  file_size_bytes: 2516582,
  file_url: 'https://storage.example.com/docs/facade-spec-v3.pdf',
  ...baseFields,
}

const failedMeetingSource: MeetingSource = {
  ...meetingSource,
  id: 'src_004',
  status: 'failed',
  included: true,
  extraction_error: 'Claude API timeout',
}

const processedMeetingSource: MeetingSource = {
  ...meetingSource,
  id: 'src_005',
  status: 'processed',
  included: true,
  approved_by_name: 'Gabriela Souza',
  approved_at: '2026-02-18T10:00:00Z',
  extracted_item_count: 5,
}

const allSources = [meetingSource, emailSource, documentSource]

const mockResponse: IngestionResponse = {
  sources: allSources,
  total: 3,
  pending_count: 1,
}

const mockHistoryResponse: IngestionHistoryResponse = {
  sources: [processedMeetingSource, { ...documentSource, rejected_by_name: 'Gabriela Souza', rejected_at: '2026-02-17T15:00:00Z' }, failedMeetingSource],
  total: 3,
}

// --- Helpers ---

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function setupMocks(overrides: Partial<{
  data: IngestionResponse | undefined
  isLoading: boolean
  error: Error | null
  filteredSources: any[]
  historyData: IngestionHistoryResponse | undefined
  historyLoading: boolean
  historyError: Error | null
}> = {}) {
  const batchMutateFn = vi.fn()
  const approveMutateFn = vi.fn()
  const rejectMutateFn = vi.fn()
  const retryMutateFn = vi.fn()
  const deleteMutateFn = vi.fn()

  mockUseIngestion.mockReturnValue({
    data: overrides.data !== undefined ? overrides.data : mockResponse,
    isLoading: overrides.isLoading ?? false,
    error: overrides.error ?? null,
    refetch: vi.fn(),
  })

  mockUseIngestionHistory.mockReturnValue({
    data: overrides.historyData !== undefined ? overrides.historyData : mockHistoryResponse,
    isLoading: overrides.historyLoading ?? false,
    error: overrides.historyError ?? null,
    refetch: vi.fn(),
  })

  mockUseFilteredSources.mockReturnValue(
    overrides.filteredSources !== undefined
      ? overrides.filteredSources
      : overrides.data?.sources ?? allSources
  )

  mockUseBatchAction.mockReturnValue({
    mutate: batchMutateFn,
    isLoading: false,
  })

  mockUseApproveSource.mockReturnValue({
    mutate: approveMutateFn,
    isLoading: false,
  })

  mockUseRejectSource.mockReturnValue({
    mutate: rejectMutateFn,
    isLoading: false,
  })

  mockUseRetrySource.mockReturnValue({
    mutate: retryMutateFn,
    isLoading: false,
  })

  mockUseDeleteSource.mockReturnValue({
    mutate: deleteMutateFn,
    isLoading: false,
  })

  return { batchMutateFn, approveMutateFn, rejectMutateFn, retryMutateFn, deleteMutateFn }
}

function renderIngestionApproval() {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <IngestionApproval />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

function renderIngestionPage(role: 'director' | 'architect' | 'client' = 'director') {
  const queryClient = createQueryClient()
  // Set auth store
  useAuthStore.setState({
    user: { id: 'u1', email: 'test@test.com', name: 'Test User', role },
    token: 'fake-token',
    isAuthenticated: true,
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Ingestion />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

// --- Tests ---

describe('IngestionApproval', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useIngestionStore.setState({
      activeTab: 'pending',
      selectedIds: new Set(),
      filters: { project_id: null, source_type: null, date_from: null, date_to: null },
      deleteConfirmId: null,
    })
  })

  describe('Rendering source rows', () => {
    it('renders meeting, email, and document source rows', () => {
      setupMocks()
      renderIngestionApproval()

      // Meeting row
      expect(screen.getByText('call_xyz789')).toBeInTheDocument()
      expect(screen.getByText('Fireflies')).toBeInTheDocument()
      expect(screen.getByText('Design Review')).toBeInTheDocument()

      // Email row
      expect(screen.getByText('email_abc')).toBeInTheDocument()
      expect(screen.getByText('RE: Structural Load Calculations')).toBeInTheDocument()
      expect(screen.getByText('engineer@firm.com')).toBeInTheDocument()
      expect(screen.getByText('4 recipients')).toBeInTheDocument()

      // Document row
      expect(screen.getByText('doc_001')).toBeInTheDocument()
      expect(screen.getByText('facade-spec-v3.pdf')).toBeInTheDocument()
      expect(screen.getByText('2.4 MB')).toBeInTheDocument()
    })
  })

  describe('Admin access control', () => {
    it('non-admin user is redirected away from /ingestion', () => {
      setupMocks()
      renderIngestionPage('architect')
      // Should not render the IngestionApproval content
      expect(screen.queryByText('Ingestion Approval')).not.toBeInTheDocument()
    })

    it('admin user (director) can access /ingestion', () => {
      setupMocks()
      renderIngestionPage('director')
      expect(screen.getByText('Ingestion Approval')).toBeInTheDocument()
    })
  })

  describe('Status badges', () => {
    it('renders correct color classes per status', () => {
      setupMocks()
      renderIngestionApproval()

      const pendingBadge = screen.getByText('pending')
      expect(pendingBadge.className).toContain('bg-yellow-100')
      expect(pendingBadge.className).toContain('text-yellow-800')

      const approvedBadge = screen.getByText('approved')
      expect(approvedBadge.className).toContain('bg-green-100')
      expect(approvedBadge.className).toContain('text-green-800')

      const rejectedBadge = screen.getByText('rejected')
      expect(rejectedBadge.className).toContain('bg-red-100')
      expect(rejectedBadge.className).toContain('text-red-800')
    })

    it('status badges have aria-label', () => {
      setupMocks()
      renderIngestionApproval()

      expect(screen.getByLabelText('Status: pending')).toBeInTheDocument()
      expect(screen.getByLabelText('Status: approved')).toBeInTheDocument()
      expect(screen.getByLabelText('Status: rejected')).toBeInTheDocument()
    })
  })

  describe('Read-only included indicator', () => {
    it('shows read-only included/not-included icons (no toggle)', () => {
      setupMocks()
      renderIngestionApproval()

      // Meeting (included=false) should show "Not included"
      expect(screen.getAllByLabelText('Not included').length).toBeGreaterThan(0)
      // Email (included=true) should show "Included"
      expect(screen.getAllByLabelText('Included').length).toBeGreaterThan(0)
      // No toggle switches should exist
      expect(screen.queryAllByRole('switch').length).toBe(0)
    })
  })

  describe('Checkbox selection', () => {
    it('toggles selection when row checkbox is clicked', async () => {
      const user = userEvent.setup()
      setupMocks()
      renderIngestionApproval()

      const checkboxes = screen.getAllByRole('checkbox')
      // checkboxes[0] is Select All, checkboxes[1] is first row
      await user.click(checkboxes[1])

      const state = useIngestionStore.getState()
      expect(state.selectedIds.has('src_001')).toBe(true)
    })

    it('Select All selects all visible rows', async () => {
      const user = userEvent.setup()
      setupMocks()
      renderIngestionApproval()

      const selectAll = screen.getByLabelText('Select all')
      await user.click(selectAll)

      const state = useIngestionStore.getState()
      expect(state.selectedIds.size).toBe(3)
      expect(state.selectedIds.has('src_001')).toBe(true)
      expect(state.selectedIds.has('src_002')).toBe(true)
      expect(state.selectedIds.has('src_003')).toBe(true)
    })
  })

  describe('BulkActionBar', () => {
    it('appears when items are selected', () => {
      setupMocks()
      useIngestionStore.setState({ selectedIds: new Set(['src_001', 'src_002']) })
      renderIngestionApproval()

      expect(screen.getByText('2 items selected')).toBeInTheDocument()
      expect(screen.getByText('Approve Selected')).toBeInTheDocument()
      expect(screen.getByText('Reject Selected')).toBeInTheDocument()
    })

    it('is hidden when no items are selected', () => {
      setupMocks()
      renderIngestionApproval()

      expect(screen.queryByText('Approve Selected')).not.toBeInTheDocument()
      expect(screen.queryByText('Reject Selected')).not.toBeInTheDocument()
    })

    it('Approve Selected calls batch API with approve action', async () => {
      const user = userEvent.setup()
      const { batchMutateFn } = setupMocks()
      useIngestionStore.setState({ selectedIds: new Set(['src_001', 'src_002']) })
      renderIngestionApproval()

      await user.click(screen.getByText('Approve Selected'))

      expect(batchMutateFn).toHaveBeenCalledWith(
        { source_ids: ['src_001', 'src_002'], action: 'approve' },
        expect.anything()
      )
    })

    it('Reject Selected calls batch API with reject action', async () => {
      const user = userEvent.setup()
      const { batchMutateFn } = setupMocks()
      useIngestionStore.setState({ selectedIds: new Set(['src_001']) })
      renderIngestionApproval()

      await user.click(screen.getByText('Reject Selected'))

      expect(batchMutateFn).toHaveBeenCalledWith(
        { source_ids: ['src_001'], action: 'reject' },
        expect.anything()
      )
    })
  })

  describe('Per-row approve/reject', () => {
    it('shows approve and reject buttons for pending sources', () => {
      setupMocks()
      renderIngestionApproval()

      // Meeting source is pending - should have approve/reject
      expect(screen.getByLabelText('Approve Facade Material Review')).toBeInTheDocument()
      expect(screen.getByLabelText('Reject Facade Material Review')).toBeInTheDocument()
    })

    it('does not show approve/reject buttons for non-pending sources', () => {
      setupMocks()
      renderIngestionApproval()

      // Email source is 'approved' - should NOT have action buttons
      expect(screen.queryByLabelText('Approve RE: Structural Load Calculations')).not.toBeInTheDocument()
      // Document source is 'rejected' - should NOT have action buttons
      expect(screen.queryByLabelText('Approve facade-spec-v3.pdf')).not.toBeInTheDocument()
    })

    it('calls approve mutation when approve button is clicked', async () => {
      const user = userEvent.setup()
      const { approveMutateFn } = setupMocks()
      renderIngestionApproval()

      await user.click(screen.getByLabelText('Approve Facade Material Review'))
      expect(approveMutateFn).toHaveBeenCalledWith('src_001')
    })

    it('calls reject mutation when reject button is clicked', async () => {
      const user = userEvent.setup()
      const { rejectMutateFn } = setupMocks()
      renderIngestionApproval()

      await user.click(screen.getByLabelText('Reject Facade Material Review'))
      expect(rejectMutateFn).toHaveBeenCalledWith('src_001')
    })
  })

  describe('Tabs', () => {
    it('renders Pending and History tabs', () => {
      setupMocks()
      renderIngestionApproval()

      expect(screen.getByText('Pending')).toBeInTheDocument()
      expect(screen.getByText('History')).toBeInTheDocument()
    })

    it('shows pending count badge on Pending tab', () => {
      setupMocks()
      renderIngestionApproval()

      // The pending tab badge should show count "1" from mockResponse
      const pendingTab = screen.getByText('Pending').closest('button')!
      expect(within(pendingTab).getByText('1')).toBeInTheDocument()
    })

    it('switches to history tab on click', async () => {
      const user = userEvent.setup()
      setupMocks()
      renderIngestionApproval()

      await user.click(screen.getByText('History'))

      const state = useIngestionStore.getState()
      expect(state.activeTab).toBe('history')
    })

    it('clears selection when switching tabs', async () => {
      const user = userEvent.setup()
      setupMocks()
      useIngestionStore.setState({ selectedIds: new Set(['src_001']) })
      renderIngestionApproval()

      await user.click(screen.getByText('History'))

      const state = useIngestionStore.getState()
      expect(state.selectedIds.size).toBe(0)
    })
  })

  describe('History tab', () => {
    it('renders history table with correct headers', async () => {
      const user = userEvent.setup()
      setupMocks()
      // Set to history tab
      useIngestionStore.setState({ activeTab: 'history' })
      // Need useFilteredSources to return history data
      mockUseFilteredSources.mockReturnValue(mockHistoryResponse.sources)
      renderIngestionApproval()

      expect(screen.getByText('Source')).toBeInTheDocument()
      expect(screen.getByText('Reviewed By')).toBeInTheDocument()
      expect(screen.getByText('Reviewed At')).toBeInTheDocument()
      expect(screen.getByText('Items')).toBeInTheDocument()
    })

    it('shows extracted item count for processed sources', () => {
      setupMocks()
      useIngestionStore.setState({ activeTab: 'history' })
      mockUseFilteredSources.mockReturnValue(mockHistoryResponse.sources)
      renderIngestionApproval()

      expect(screen.getByText('5 items')).toBeInTheDocument()
    })

    it('shows reviewer name for history items', () => {
      setupMocks()
      useIngestionStore.setState({ activeTab: 'history' })
      mockUseFilteredSources.mockReturnValue(mockHistoryResponse.sources)
      renderIngestionApproval()

      expect(screen.getAllByText('Gabriela Souza').length).toBeGreaterThan(0)
    })
  })

  describe('Delete confirmation', () => {
    it('shows delete confirmation dialog when delete button clicked', async () => {
      const user = userEvent.setup()
      setupMocks()
      useIngestionStore.setState({ activeTab: 'history' })
      mockUseFilteredSources.mockReturnValue(mockHistoryResponse.sources)
      renderIngestionApproval()

      // Find delete buttons — they should be in the history view
      const deleteButtons = screen.getAllByTitle('Delete source and extracted items')
      await user.click(deleteButtons[0])

      expect(screen.getByText('Delete Source')).toBeInTheDocument()
      expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument()
    })

    it('cancel closes delete dialog', async () => {
      const user = userEvent.setup()
      setupMocks()
      useIngestionStore.setState({ activeTab: 'history', deleteConfirmId: 'src_005' })
      mockUseFilteredSources.mockReturnValue(mockHistoryResponse.sources)
      renderIngestionApproval()

      await user.click(screen.getByText('Cancel'))

      const state = useIngestionStore.getState()
      expect(state.deleteConfirmId).toBeNull()
    })

    it('calls delete mutation when confirmed', async () => {
      const user = userEvent.setup()
      const { deleteMutateFn } = setupMocks()
      useIngestionStore.setState({ activeTab: 'history', deleteConfirmId: 'src_005' })
      mockUseFilteredSources.mockReturnValue(mockHistoryResponse.sources)
      renderIngestionApproval()

      await user.click(screen.getByText('Delete'))

      expect(deleteMutateFn).toHaveBeenCalledWith('src_005', expect.anything())
    })
  })

  describe('Retry for failed sources', () => {
    it('shows retry button for failed sources in history', () => {
      setupMocks()
      useIngestionStore.setState({ activeTab: 'history' })
      mockUseFilteredSources.mockReturnValue(mockHistoryResponse.sources)
      renderIngestionApproval()

      const retryButtons = screen.getAllByTitle('Retry')
      expect(retryButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Filters', () => {
    it('source type filter is rendered with All, Meeting, Email, Document buttons', () => {
      setupMocks()
      renderIngestionApproval()

      expect(screen.getByText('All')).toBeInTheDocument()
      expect(screen.getByText('Meeting')).toBeInTheDocument()
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByText('Document')).toBeInTheDocument()
    })

    it('clicking a source type chip updates the store filter', async () => {
      const user = userEvent.setup()
      setupMocks()
      renderIngestionApproval()

      await user.click(screen.getByText('Meeting'))

      const state = useIngestionStore.getState()
      expect(state.filters.source_type).toBe('meeting')
    })

    it('project filter dropdown is populated from unique projects', () => {
      setupMocks()
      renderIngestionApproval()

      const select = screen.getByLabelText('Filter by project') as HTMLSelectElement
      expect(select).toBeInTheDocument()
      const options = within(select).getAllByRole('option')
      const optionTexts = options.map((o) => o.textContent)
      expect(optionTexts).toContain('Soubim Tower')
      expect(optionTexts).toContain('Marina Bay')
    })

    it('Clear All Filters resets all filters', async () => {
      const user = userEvent.setup()
      setupMocks()
      useIngestionStore.setState({
        filters: { project_id: 'proj_001', source_type: 'meeting', date_from: null, date_to: null },
      })
      renderIngestionApproval()

      await user.click(screen.getByText('Clear All Filters'))

      const state = useIngestionStore.getState()
      expect(state.filters.project_id).toBeNull()
      expect(state.filters.source_type).toBeNull()
    })

    it('renders active filter chips when filters are active', () => {
      setupMocks()
      useIngestionStore.setState({
        filters: { project_id: 'proj_001', source_type: 'email', date_from: null, date_to: null },
      })
      renderIngestionApproval()

      expect(screen.getByText(/Project:/)).toBeInTheDocument()
      expect(screen.getByText(/Type:/)).toBeInTheDocument()
    })
  })

  describe('AI Summary expander', () => {
    it('shows "Show more" for long summaries and expands on click', async () => {
      const user = userEvent.setup()
      setupMocks()
      renderIngestionApproval()

      const showMore = screen.getByText('Show more')
      expect(showMore).toBeInTheDocument()

      await user.click(showMore)

      expect(screen.getByText('Show less')).toBeInTheDocument()
    })

    it('collapses summary on second click', async () => {
      const user = userEvent.setup()
      setupMocks()
      renderIngestionApproval()

      const showMore = screen.getByText('Show more')
      await user.click(showMore)
      const showLess = screen.getByText('Show less')
      await user.click(showLess)

      expect(screen.getByText('Show more')).toBeInTheDocument()
    })

    it('shows "No summary available" for null summaries', () => {
      setupMocks()
      renderIngestionApproval()

      expect(screen.getByText('No summary available')).toBeInTheDocument()
    })
  })

  describe('Loading state', () => {
    it('renders skeleton rows during loading', () => {
      setupMocks({ isLoading: true, data: undefined, filteredSources: [] })
      const { container } = renderIngestionApproval()

      const pulseElements = container.querySelectorAll('.animate-pulse')
      expect(pulseElements.length).toBeGreaterThan(0)
    })
  })

  describe('Empty state', () => {
    it('renders empty state when no sources match', () => {
      setupMocks({ data: { sources: [], total: 0, pending_count: 0 }, filteredSources: [] })
      renderIngestionApproval()

      expect(screen.getByText('No pending items')).toBeInTheDocument()
    })
  })

  describe('Error state', () => {
    it('renders error state with retry button', () => {
      setupMocks({ error: new Error('Network error'), data: undefined, filteredSources: [] })
      renderIngestionApproval()

      expect(screen.getByText('Failed to load sources')).toBeInTheDocument()
      expect(screen.getByText('Network error')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })

    it('retry button calls refetch', async () => {
      const user = userEvent.setup()
      const refetchFn = vi.fn()
      mockUseIngestion.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: new Error('fail'),
        refetch: refetchFn,
      })
      mockUseIngestionHistory.mockReturnValue({
        data: undefined,
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      })
      mockUseFilteredSources.mockReturnValue([])
      mockUseBatchAction.mockReturnValue({ mutate: vi.fn(), isLoading: false })
      mockUseApproveSource.mockReturnValue({ mutate: vi.fn(), isLoading: false })
      mockUseRejectSource.mockReturnValue({ mutate: vi.fn(), isLoading: false })
      mockUseRetrySource.mockReturnValue({ mutate: vi.fn(), isLoading: false })
      mockUseDeleteSource.mockReturnValue({ mutate: vi.fn(), isLoading: false })

      renderIngestionApproval()
      await user.click(screen.getByText('Retry'))

      expect(refetchFn).toHaveBeenCalled()
    })
  })

  describe('formatFileSize utility', () => {
    it('returns bytes for small values', () => {
      expect(formatFileSize(500)).toBe('500 B')
    })

    it('returns KB for kilobyte values', () => {
      expect(formatFileSize(2048)).toBe('2.0 KB')
    })

    it('returns MB for megabyte values', () => {
      expect(formatFileSize(2516582)).toBe('2.4 MB')
    })
  })

  describe('Page header', () => {
    it('shows pending count and total in header', () => {
      setupMocks()
      renderIngestionApproval()

      expect(screen.getByText('Ingestion Approval')).toBeInTheDocument()
      expect(screen.getByText(/1 pending item/)).toBeInTheDocument()
      expect(screen.getByText(/3 total/)).toBeInTheDocument()
    })
  })

  describe('External links', () => {
    it('transcript link opens in new tab', () => {
      setupMocks()
      renderIngestionApproval()

      const transcriptLink = screen.getByText('Transcript').closest('a')
      expect(transcriptLink).toHaveAttribute('target', '_blank')
      expect(transcriptLink).toHaveAttribute('href', 'https://app.fireflies.ai/view/xyz789')
    })

    it('thread link opens in new tab', () => {
      setupMocks()
      renderIngestionApproval()

      const threadLink = screen.getByText('Thread').closest('a')
      expect(threadLink).toHaveAttribute('target', '_blank')
      expect(threadLink).toHaveAttribute('href', 'https://mail.example.com/thread/abc')
    })

    it('file link opens in new tab', () => {
      setupMocks()
      renderIngestionApproval()

      const fileLink = screen.getByText('File').closest('a')
      expect(fileLink).toHaveAttribute('target', '_blank')
      expect(fileLink).toHaveAttribute('href', 'https://storage.example.com/docs/facade-spec-v3.pdf')
    })
  })

  describe('Accessibility', () => {
    it('uses semantic table elements', () => {
      setupMocks()
      const { container } = renderIngestionApproval()

      expect(container.querySelector('table')).toBeInTheDocument()
      expect(container.querySelector('thead')).toBeInTheDocument()
      expect(container.querySelector('tbody')).toBeInTheDocument()
      expect(container.querySelectorAll('th[scope="col"]').length).toBeGreaterThan(0)
    })

    it('included indicators have aria-label', () => {
      setupMocks()
      renderIngestionApproval()

      // Read-only indicators use Included/Not included aria-labels
      expect(screen.getAllByLabelText('Included').length).toBeGreaterThan(0)
      expect(screen.getAllByLabelText('Not included').length).toBeGreaterThan(0)
    })

    it('bulk action bar has aria-live attribute', () => {
      setupMocks()
      useIngestionStore.setState({ selectedIds: new Set(['src_001']) })
      renderIngestionApproval()

      const bar = screen.getByRole('status')
      expect(bar).toHaveAttribute('aria-live', 'polite')
    })
  })
})
