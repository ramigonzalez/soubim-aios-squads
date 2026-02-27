import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import IngestionApproval from '../../components/organisms/IngestionApproval'
import Ingestion from '../../pages/Ingestion'
import { useIngestionStore } from '../../store/ingestionStore'
import { useAuthStore } from '../../store/authStore'
import { formatFileSize } from '../../lib/utils'
import type { MeetingSource, EmailSource, DocumentSource, IngestionResponse } from '../../types/ingestion'

// Mock the hooks
vi.mock('../../hooks/useIngestion', () => ({
  useIngestion: vi.fn(),
  useFilteredSources: vi.fn(),
}))

vi.mock('../../hooks/useIngestionMutation', () => ({
  useToggleInclude: vi.fn(),
  useBatchAction: vi.fn(),
}))

vi.mock('../../services/ingestionService', () => ({
  ingestionService: {
    getSources: vi.fn(),
    updateSource: vi.fn(),
    batchAction: vi.fn(),
    getPendingCount: vi.fn(),
  },
}))

import { useIngestion, useFilteredSources } from '../../hooks/useIngestion'
import { useToggleInclude, useBatchAction } from '../../hooks/useIngestionMutation'

const mockUseIngestion = useIngestion as any
const mockUseFilteredSources = useFilteredSources as any
const mockUseToggleInclude = useToggleInclude as any
const mockUseBatchAction = useBatchAction as any

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
  meeting_date: '2026-02-18T09:00:00Z',
  meeting_type: 'Design Review',
  source_label: 'Fireflies',
  transcript_url: 'https://app.fireflies.ai/view/xyz789',
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
}

const allSources = [meetingSource, emailSource, documentSource]

const mockResponse: IngestionResponse = {
  sources: allSources,
  total: 3,
  pending_count: 1,
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
}> = {}) {
  const mutateFn = vi.fn()
  const batchMutateFn = vi.fn()

  mockUseIngestion.mockReturnValue({
    data: overrides.data !== undefined ? overrides.data : mockResponse,
    isLoading: overrides.isLoading ?? false,
    error: overrides.error ?? null,
    refetch: vi.fn(),
  })

  mockUseFilteredSources.mockReturnValue(
    overrides.filteredSources !== undefined
      ? overrides.filteredSources
      : overrides.data?.sources ?? allSources
  )

  mockUseToggleInclude.mockReturnValue({
    mutate: mutateFn,
    isLoading: false,
  })

  mockUseBatchAction.mockReturnValue({
    mutate: batchMutateFn,
    isLoading: false,
  })

  return { mutateFn, batchMutateFn }
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
      selectedIds: new Set(),
      filters: { project_id: null, source_type: null, date_from: null, date_to: null },
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

  describe('Include toggle', () => {
    it('calls mutate when include toggle is clicked', async () => {
      const user = userEvent.setup()
      const { mutateFn } = setupMocks()
      renderIngestionApproval()

      // Toggle the meeting source (currently not included)
      const toggles = screen.getAllByRole('switch')
      await user.click(toggles[0])

      expect(mutateFn).toHaveBeenCalledWith(
        { id: 'src_001', included: true }
      )
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
      // Check that the options exist in the dropdown (use within to scope)
      const options = within(select).getAllByRole('option')
      const optionTexts = options.map((o) => o.textContent)
      expect(optionTexts).toContain('Soubim Tower')
      expect(optionTexts).toContain('Marina Bay')
    })

    it('Clear All Filters resets all filters', async () => {
      const user = userEvent.setup()
      setupMocks()
      // Set a filter first
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

      // The meeting source has a long summary (>80 chars)
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
      mockUseFilteredSources.mockReturnValue([])
      mockUseToggleInclude.mockReturnValue({ mutate: vi.fn(), isLoading: false })
      mockUseBatchAction.mockReturnValue({ mutate: vi.fn(), isLoading: false })

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

    it('include toggles have aria-label', () => {
      setupMocks()
      renderIngestionApproval()

      expect(screen.getByLabelText('Include src_001')).toBeInTheDocument()
      expect(screen.getByLabelText('Include src_002')).toBeInTheDocument()
      expect(screen.getByLabelText('Include src_003')).toBeInTheDocument()
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
