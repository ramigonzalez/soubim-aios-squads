import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from 'react-query'
import { MilestoneTimeline } from '../../components/organisms/MilestoneTimeline'
import { ProjectItem, ProjectStage } from '../../types/projectItem'

// --- Mock hooks ---
const mockUseMilestones = vi.fn()
const mockUseStages = vi.fn()

vi.mock('../../hooks/useMilestones', () => ({
  useMilestones: (...args: unknown[]) => mockUseMilestones(...args),
}))

vi.mock('../../hooks/useStages', () => ({
  useStages: (...args: unknown[]) => mockUseStages(...args),
}))

// --- Test data factories ---

function makeStage(overrides: Partial<ProjectStage> = {}): ProjectStage {
  return {
    id: `stage-${Math.random().toString(36).slice(2, 8)}`,
    stage_name: 'Schematic Design',
    stage_from: '2026-01-01',
    stage_to: '2026-03-31',
    ...overrides,
  }
}

function makeMilestone(overrides: Partial<ProjectItem> = {}): ProjectItem {
  return {
    id: `ms-${Math.random().toString(36).slice(2, 8)}`,
    project_id: 'proj-1',
    statement: 'Foundation design approved by structural team',
    decision_statement: 'Foundation design approved by structural team',
    who: 'Carlos',
    item_type: 'decision',
    source_type: 'meeting',
    affected_disciplines: ['structural', 'architecture'],
    is_milestone: true,
    is_done: false,
    discipline: 'structural',
    why: 'Critical structural decision',
    created_at: '2026-02-10T10:00:00Z',
    ...overrides,
  }
}

// --- Test helpers ---

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
    },
  })
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

// --- Test suite ---

describe('MilestoneTimeline', () => {
  const mockOnSelectItem = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- Loading state ---

  it('renders loading skeleton when data is loading', () => {
    mockUseStages.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    })
    mockUseMilestones.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    })

    renderWithProviders(
      <MilestoneTimeline projectId="proj-1" onSelectItem={mockOnSelectItem} />
    )

    expect(screen.getByTestId('timeline-skeleton')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  // --- Error state ---

  it('renders error state with retry button when fetch fails', async () => {
    const mockRefetchStages = vi.fn()
    const mockRefetchMilestones = vi.fn()

    mockUseStages.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Network error'),
      refetch: mockRefetchStages,
    })
    mockUseMilestones.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: mockRefetchMilestones,
    })

    renderWithProviders(
      <MilestoneTimeline projectId="proj-1" onSelectItem={mockOnSelectItem} />
    )

    expect(screen.getByTestId('error-state')).toBeInTheDocument()
    expect(screen.getByText('Failed to load milestone timeline.')).toBeInTheDocument()

    const retryButton = screen.getByRole('button', { name: /retry/i })
    const user = userEvent.setup()
    await user.click(retryButton)

    expect(mockRefetchStages).toHaveBeenCalledTimes(1)
    expect(mockRefetchMilestones).toHaveBeenCalledTimes(1)
  })

  // --- No stages state ---

  it('renders no-stages state when there are no stages', () => {
    mockUseStages.mockReturnValue({
      data: { stages: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
    mockUseMilestones.mockReturnValue({
      data: { items: [], total: 0, limit: 50, offset: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    renderWithProviders(
      <MilestoneTimeline projectId="proj-1" onSelectItem={mockOnSelectItem} />
    )

    expect(screen.getByTestId('no-stages-state')).toBeInTheDocument()
    expect(
      screen.getByText(/Set up project stages in Project Settings/)
    ).toBeInTheDocument()
  })

  // --- Empty milestones state ---

  it('renders empty state when stages exist but no milestones', () => {
    const stages = [
      makeStage({ id: 's1', stage_name: 'Design Development' }),
    ]

    mockUseStages.mockReturnValue({
      data: { stages },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
    mockUseMilestones.mockReturnValue({
      data: { items: [], total: 0, limit: 50, offset: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    renderWithProviders(
      <MilestoneTimeline projectId="proj-1" onSelectItem={mockOnSelectItem} />
    )

    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    expect(
      screen.getByText(/No milestones yet/)
    ).toBeInTheDocument()
  })

  // --- Renders stages as large dots ---

  it('renders stages with names and date ranges', () => {
    const stages = [
      makeStage({
        id: 's1',
        stage_name: 'Schematic Design',
        stage_from: '2026-01-01',
        stage_to: '2026-02-28',
      }),
      makeStage({
        id: 's2',
        stage_name: 'Design Development',
        stage_from: '2026-03-01',
        stage_to: '2026-05-31',
      }),
    ]

    const milestones = [
      makeMilestone({
        id: 'ms-1',
        statement: 'Milestone in SD',
        decision_statement: 'Milestone in SD',
        created_at: '2026-01-15T10:00:00Z',
      }),
    ]

    mockUseStages.mockReturnValue({
      data: { stages },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
    mockUseMilestones.mockReturnValue({
      data: { items: milestones, total: 1, limit: 50, offset: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    renderWithProviders(
      <MilestoneTimeline projectId="proj-1" onSelectItem={mockOnSelectItem} />
    )

    // Stage names
    expect(screen.getByText('Schematic Design')).toBeInTheDocument()
    expect(screen.getByText('Design Development')).toBeInTheDocument()

    // Stage dots exist
    expect(screen.getByTestId('stage-dot-s1')).toBeInTheDocument()
    expect(screen.getByTestId('stage-dot-s2')).toBeInTheDocument()

    // Large dot size (w-5 h-5)
    const dot1 = screen.getByTestId('stage-dot-s1')
    expect(dot1.className).toContain('w-5')
    expect(dot1.className).toContain('h-5')
    expect(dot1.className).toContain('rounded-full')
  })

  // --- Milestones within correct stages ---

  it('renders milestones within their correct parent stage', () => {
    const stages = [
      makeStage({
        id: 's1',
        stage_name: 'Schematic Design',
        stage_from: '2026-01-01',
        stage_to: '2026-02-28',
      }),
      makeStage({
        id: 's2',
        stage_name: 'Design Development',
        stage_from: '2026-03-01',
        stage_to: '2026-05-31',
      }),
    ]

    const milestones = [
      makeMilestone({
        id: 'ms-1',
        statement: 'SD Milestone',
        decision_statement: 'SD Milestone',
        created_at: '2026-01-15T10:00:00Z',
      }),
      makeMilestone({
        id: 'ms-2',
        statement: 'DD Milestone',
        decision_statement: 'DD Milestone',
        created_at: '2026-04-10T10:00:00Z',
      }),
    ]

    mockUseStages.mockReturnValue({
      data: { stages },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
    mockUseMilestones.mockReturnValue({
      data: { items: milestones, total: 2, limit: 50, offset: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    renderWithProviders(
      <MilestoneTimeline projectId="proj-1" onSelectItem={mockOnSelectItem} />
    )

    // Both milestones rendered
    expect(screen.getByText('SD Milestone')).toBeInTheDocument()
    expect(screen.getByText('DD Milestone')).toBeInTheDocument()

    // SD Milestone should be within the Schematic Design section
    const sdSection = screen.getByRole('region', { name: /Schematic Design/i })
    expect(within(sdSection).getByText('SD Milestone')).toBeInTheDocument()

    // DD Milestone should be within the Design Development section
    const ddSection = screen.getByRole('region', { name: /Design Development/i })
    expect(within(ddSection).getByText('DD Milestone')).toBeInTheDocument()
  })

  // --- Current stage highlighted ---

  it('highlights the current stage with blue dot and Current badge', () => {
    // Create a stage that contains today's date
    const today = new Date()
    const monthAgo = new Date(today)
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    const monthAhead = new Date(today)
    monthAhead.setMonth(monthAhead.getMonth() + 1)

    const stages = [
      makeStage({
        id: 's-past',
        stage_name: 'Past Stage',
        stage_from: '2025-01-01',
        stage_to: '2025-06-30',
      }),
      makeStage({
        id: 's-current',
        stage_name: 'Current Stage',
        stage_from: monthAgo.toISOString().split('T')[0],
        stage_to: monthAhead.toISOString().split('T')[0],
      }),
    ]

    const milestones = [
      makeMilestone({
        id: 'ms-1',
        statement: 'Some milestone',
        decision_statement: 'Some milestone',
        created_at: monthAgo.toISOString(),
      }),
    ]

    mockUseStages.mockReturnValue({
      data: { stages },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
    mockUseMilestones.mockReturnValue({
      data: { items: milestones, total: 1, limit: 50, offset: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    renderWithProviders(
      <MilestoneTimeline projectId="proj-1" onSelectItem={mockOnSelectItem} />
    )

    // Current stage dot should have blue-600 background
    const currentDot = screen.getByTestId('stage-dot-s-current')
    expect(currentDot.className).toContain('bg-blue-600')
    expect(currentDot.className).toContain('ring-2')
    expect(currentDot.className).toContain('ring-blue-200')

    // Past stage dot should have gray background
    const pastDot = screen.getByTestId('stage-dot-s-past')
    expect(pastDot.className).toContain('bg-gray-400')

    // "Current" badge should appear
    expect(screen.getByText('Current')).toBeInTheDocument()
  })

  // --- Today marker ---

  it('renders today marker when today falls within timeline range', () => {
    const today = new Date()
    const monthAgo = new Date(today)
    monthAgo.setMonth(monthAgo.getMonth() - 1)
    const monthAhead = new Date(today)
    monthAhead.setMonth(monthAhead.getMonth() + 1)

    const stages = [
      makeStage({
        id: 's1',
        stage_name: 'Active Stage',
        stage_from: monthAgo.toISOString().split('T')[0],
        stage_to: monthAhead.toISOString().split('T')[0],
      }),
    ]

    const milestones = [
      makeMilestone({
        id: 'ms-1',
        statement: 'Test milestone',
        decision_statement: 'Test milestone',
        created_at: monthAgo.toISOString(),
      }),
    ]

    mockUseStages.mockReturnValue({
      data: { stages },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
    mockUseMilestones.mockReturnValue({
      data: { items: milestones, total: 1, limit: 50, offset: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    renderWithProviders(
      <MilestoneTimeline projectId="proj-1" onSelectItem={mockOnSelectItem} />
    )

    expect(screen.getByTestId('today-marker')).toBeInTheDocument()
    expect(screen.getByText('Today')).toBeInTheDocument()
  })

  // --- Click milestone calls onSelectItem ---

  it('calls onSelectItem when a milestone is clicked', async () => {
    const stages = [
      makeStage({
        id: 's1',
        stage_name: 'Design',
        stage_from: '2026-01-01',
        stage_to: '2026-06-30',
      }),
    ]

    const milestones = [
      makeMilestone({
        id: 'ms-click',
        statement: 'Clickable milestone',
        decision_statement: 'Clickable milestone',
        created_at: '2026-02-10T10:00:00Z',
      }),
    ]

    mockUseStages.mockReturnValue({
      data: { stages },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
    mockUseMilestones.mockReturnValue({
      data: { items: milestones, total: 1, limit: 50, offset: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    renderWithProviders(
      <MilestoneTimeline projectId="proj-1" onSelectItem={mockOnSelectItem} />
    )

    const user = userEvent.setup()
    const milestoneButton = screen.getByRole('button', { name: /Clickable milestone/ })
    await user.click(milestoneButton)

    expect(mockOnSelectItem).toHaveBeenCalledWith('ms-click')
  })

  // --- Keyboard Enter triggers click ---

  it('calls onSelectItem when Enter key is pressed on a milestone', async () => {
    const stages = [
      makeStage({
        id: 's1',
        stage_name: 'Design',
        stage_from: '2026-01-01',
        stage_to: '2026-06-30',
      }),
    ]

    const milestones = [
      makeMilestone({
        id: 'ms-keyboard',
        statement: 'Keyboard milestone',
        decision_statement: 'Keyboard milestone',
        created_at: '2026-02-10T10:00:00Z',
      }),
    ]

    mockUseStages.mockReturnValue({
      data: { stages },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
    mockUseMilestones.mockReturnValue({
      data: { items: milestones, total: 1, limit: 50, offset: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    renderWithProviders(
      <MilestoneTimeline projectId="proj-1" onSelectItem={mockOnSelectItem} />
    )

    const user = userEvent.setup()
    const milestoneButton = screen.getByRole('button', { name: /Keyboard milestone/ })
    milestoneButton.focus()
    await user.keyboard('{Enter}')

    expect(mockOnSelectItem).toHaveBeenCalledWith('ms-keyboard')
  })

  // --- Semantic HTML: nav with aria-label ---

  it('renders with proper semantic HTML and aria-label', () => {
    mockUseStages.mockReturnValue({
      data: { stages: [] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
    mockUseMilestones.mockReturnValue({
      data: { items: [], total: 0, limit: 50, offset: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    renderWithProviders(
      <MilestoneTimeline projectId="proj-1" onSelectItem={mockOnSelectItem} />
    )

    const nav = screen.getByRole('navigation', { name: /Milestone Timeline/i })
    expect(nav).toBeInTheDocument()
  })

  // --- Milestones outside any stage go to "Other" ---

  it('groups milestones outside stage ranges under Other section', () => {
    const stages = [
      makeStage({
        id: 's1',
        stage_name: 'Schematic Design',
        stage_from: '2026-01-01',
        stage_to: '2026-02-28',
      }),
    ]

    const milestones = [
      makeMilestone({
        id: 'ms-in',
        statement: 'Inside milestone',
        decision_statement: 'Inside milestone',
        created_at: '2026-01-15T10:00:00Z',
      }),
      makeMilestone({
        id: 'ms-out',
        statement: 'Outside milestone',
        decision_statement: 'Outside milestone',
        created_at: '2026-06-15T10:00:00Z',
      }),
    ]

    mockUseStages.mockReturnValue({
      data: { stages },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
    mockUseMilestones.mockReturnValue({
      data: { items: milestones, total: 2, limit: 50, offset: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    renderWithProviders(
      <MilestoneTimeline projectId="proj-1" onSelectItem={mockOnSelectItem} />
    )

    // "Inside milestone" in Schematic Design section
    const sdSection = screen.getByRole('region', { name: /Schematic Design/i })
    expect(within(sdSection).getByText('Inside milestone')).toBeInTheDocument()

    // "Outside milestone" in Other section
    const otherSection = screen.getByRole('region', { name: /Other milestones/i })
    expect(within(otherSection).getByText('Outside milestone')).toBeInTheDocument()

    // "Other" label
    expect(screen.getByText('Other')).toBeInTheDocument()
  })

  // --- Milestone row shows item type badge ---

  it('renders item type badges on milestone rows', () => {
    const stages = [
      makeStage({
        id: 's1',
        stage_name: 'Design',
        stage_from: '2026-01-01',
        stage_to: '2026-06-30',
      }),
    ]

    const milestones = [
      makeMilestone({
        id: 'ms-dec',
        item_type: 'decision',
        statement: 'Decision milestone',
        decision_statement: 'Decision milestone',
        created_at: '2026-02-10T10:00:00Z',
      }),
      makeMilestone({
        id: 'ms-act',
        item_type: 'action_item',
        statement: 'Action milestone',
        decision_statement: 'Action milestone',
        created_at: '2026-02-11T10:00:00Z',
      }),
    ]

    mockUseStages.mockReturnValue({
      data: { stages },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
    mockUseMilestones.mockReturnValue({
      data: { items: milestones, total: 2, limit: 50, offset: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    renderWithProviders(
      <MilestoneTimeline projectId="proj-1" onSelectItem={mockOnSelectItem} />
    )

    expect(screen.getByText('Decision')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
  })

  // --- Milestone row shows discipline circles ---

  it('renders discipline circles on milestone rows', () => {
    const stages = [
      makeStage({
        id: 's1',
        stage_name: 'Design',
        stage_from: '2026-01-01',
        stage_to: '2026-06-30',
      }),
    ]

    const milestones = [
      makeMilestone({
        id: 'ms-disc',
        affected_disciplines: ['structural', 'architecture', 'mep', 'electrical'],
        statement: 'Multi-discipline milestone',
        decision_statement: 'Multi-discipline milestone',
        created_at: '2026-02-10T10:00:00Z',
      }),
    ]

    mockUseStages.mockReturnValue({
      data: { stages },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
    mockUseMilestones.mockReturnValue({
      data: { items: milestones, total: 1, limit: 50, offset: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    renderWithProviders(
      <MilestoneTimeline projectId="proj-1" onSelectItem={mockOnSelectItem} />
    )

    // First 3 disciplines shown as circle initials (atom), 4th as overflow
    expect(screen.getByText('S')).toBeInTheDocument()  // structural
    expect(screen.getByText('A')).toBeInTheDocument()  // architecture
    expect(screen.getByText('M')).toBeInTheDocument()  // mep
    expect(screen.getByText('+1')).toBeInTheDocument()
  })

  // --- Multiple stages and milestones render correctly ---

  it('renders a complete timeline with multiple stages and milestones', () => {
    const stages = [
      makeStage({
        id: 's1',
        stage_name: 'Concept',
        stage_from: '2025-10-01',
        stage_to: '2025-12-31',
      }),
      makeStage({
        id: 's2',
        stage_name: 'Schematic Design',
        stage_from: '2026-01-01',
        stage_to: '2026-03-31',
      }),
      makeStage({
        id: 's3',
        stage_name: 'Design Development',
        stage_from: '2026-04-01',
        stage_to: '2026-06-30',
      }),
    ]

    const milestones = [
      makeMilestone({
        id: 'ms-c1',
        statement: 'Concept approved',
        decision_statement: 'Concept approved',
        created_at: '2025-11-15T10:00:00Z',
      }),
      makeMilestone({
        id: 'ms-s1',
        statement: 'Floor plan finalized',
        decision_statement: 'Floor plan finalized',
        created_at: '2026-02-01T10:00:00Z',
      }),
      makeMilestone({
        id: 'ms-s2',
        statement: 'MEP coordination complete',
        decision_statement: 'MEP coordination complete',
        created_at: '2026-03-15T10:00:00Z',
      }),
    ]

    mockUseStages.mockReturnValue({
      data: { stages },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
    mockUseMilestones.mockReturnValue({
      data: { items: milestones, total: 3, limit: 50, offset: 0 },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    renderWithProviders(
      <MilestoneTimeline projectId="proj-1" onSelectItem={mockOnSelectItem} />
    )

    // All stages rendered
    expect(screen.getByText('Concept')).toBeInTheDocument()
    expect(screen.getByText('Schematic Design')).toBeInTheDocument()
    expect(screen.getByText('Design Development')).toBeInTheDocument()

    // All milestones rendered
    expect(screen.getByText('Concept approved')).toBeInTheDocument()
    expect(screen.getByText('Floor plan finalized')).toBeInTheDocument()
    expect(screen.getByText('MEP coordination complete')).toBeInTheDocument()

    // Milestones in correct sections
    const conceptSection = screen.getByRole('region', { name: /Concept/i })
    expect(within(conceptSection).getByText('Concept approved')).toBeInTheDocument()

    const sdSection = screen.getByRole('region', { name: /Schematic Design/i })
    expect(within(sdSection).getByText('Floor plan finalized')).toBeInTheDocument()
    expect(within(sdSection).getByText('MEP coordination complete')).toBeInTheDocument()
  })
})
