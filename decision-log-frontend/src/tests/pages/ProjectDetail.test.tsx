import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ProjectDetail } from '../../pages/ProjectDetail'

// Mock hooks used by ProjectDetail
vi.mock('../../hooks/useProjectItems', () => ({
  useProjectItems: vi.fn(() => ({
    data: { items: [] },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
}))

vi.mock('../../hooks/useProjectItemMutation', () => ({
  useToggleMilestone: vi.fn(() => ({ mutate: vi.fn() })),
}))

vi.mock('../../hooks/useMilestones', () => ({
  useMilestones: vi.fn(() => ({ data: { items: [] }, isLoading: false, error: null, refetch: vi.fn() })),
}))

vi.mock('../../hooks/useStages', () => ({
  useStages: vi.fn(() => ({ data: { stages: [] }, isLoading: false, error: null, refetch: vi.fn() })),
}))

vi.mock('../../hooks/useMilestoneFilters', () => ({
  useMilestoneFilters: vi.fn(() => ({
    sourceFilters: [],
    itemTypeFilters: [],
    toggleSource: vi.fn(),
    toggleItemType: vi.fn(),
    clearAll: vi.fn(),
    activeCount: 0,
  })),
}))

vi.mock('../../hooks/useFilterUrlSync', () => ({
  useFilterUrlSync: vi.fn(),
}))

// Mock child components to keep tests focused on ProjectDetail behavior
vi.mock('../../components/organisms/Timeline', () => ({
  Timeline: ({ decisions }: any) => (
    <div data-testid="timeline-component">
      Project History Timeline ({decisions.length} decisions)
    </div>
  ),
}))

vi.mock('../../components/organisms/ExecutiveDigest', () => ({
  ExecutiveDigest: () => <div data-testid="executive-digest">Executive Digest Content</div>,
}))

vi.mock('../../components/organisms/FilterBar', () => ({
  FilterBar: () => <div data-testid="filter-bar">Filter Bar</div>,
}))

vi.mock('../../components/organisms/DrilldownModal', () => ({
  DrilldownModal: () => null,
}))

vi.mock('../../components/molecules/DocumentUploadButton', () => ({
  DocumentUploadButton: () => null,
}))

vi.mock('../../components/molecules/ShareDialog', () => ({
  ShareDialog: () => null,
}))

// Mock useFilterStore to return empty filter state
vi.mock('../../store/filterStore', () => ({
  useFilterStore: () => ({
    disciplines: [],
    decisionMakers: [],
    meetingTypes: [],
    dateFrom: null,
    dateTo: null,
    searchQuery: '',
    sourceTypes: [],
    itemTypes: [],
  }),
}))

// Mock useAuthStore
vi.mock('../../store/authStore', () => ({
  useAuthStore: () => ({
    user: { role: 'director', name: 'Test Admin' },
  }),
}))

// Mock useParams — default to a valid project ID
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ id: 'test-project-id' }),
  }
})

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

function renderProjectDetail() {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ProjectDetail />
      </BrowserRouter>
    </QueryClientProvider>,
  )
}

describe('ProjectDetail Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset URL hash before each test
    window.location.hash = ''
  })

  // ------- Tab toggle rendering -------

  describe('Tab toggle', () => {
    it('renders tab toggle with "Milestone Timeline", "Project History", and "Executive Digest"', () => {
      renderProjectDetail()

      const tablist = screen.getByRole('tablist')
      const tabs = within(tablist).getAllByRole('tab')

      expect(tabs).toHaveLength(3)
      expect(tabs[0]).toHaveTextContent('Milestone Timeline')
      expect(tabs[1]).toHaveTextContent('Project History')
      expect(tabs[2]).toHaveTextContent('Executive Digest')
    })

    it('defaults to "milestones" view when no URL hash is present', () => {
      renderProjectDetail()

      const milestonesTab = screen.getByRole('tab', { name: /Milestone Timeline/i })
      expect(milestonesTab).toHaveAttribute('aria-selected', 'true')
    })

    it('switches to Project History view when its tab is clicked', async () => {
      const user = userEvent.setup()
      renderProjectDetail()

      const historyTab = screen.getByRole('tab', { name: /Project History/i })
      await user.click(historyTab)

      expect(historyTab).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByTestId('timeline-component')).toBeInTheDocument()
    })

    it('switches to Executive Digest view when its tab is clicked', async () => {
      const user = userEvent.setup()
      renderProjectDetail()

      const digestTab = screen.getByRole('tab', { name: /Executive Digest/i })
      await user.click(digestTab)

      expect(digestTab).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByTestId('executive-digest')).toBeInTheDocument()
    })

    it('shows FilterBar only in Project History view', async () => {
      const user = userEvent.setup()
      renderProjectDetail()

      // Milestones view — no filter bar
      expect(screen.queryByTestId('filter-bar')).not.toBeInTheDocument()

      // Switch to history
      await user.click(screen.getByRole('tab', { name: /Project History/i }))
      expect(screen.getByTestId('filter-bar')).toBeInTheDocument()

      // Switch to digest — filter bar disappears
      await user.click(screen.getByRole('tab', { name: /Executive Digest/i }))
      expect(screen.queryByTestId('filter-bar')).not.toBeInTheDocument()
    })
  })

  // ------- URL hash persistence -------

  describe('URL hash persistence', () => {
    it('reads #history hash on mount and opens Project History tab', () => {
      window.location.hash = '#history'
      renderProjectDetail()

      const historyTab = screen.getByRole('tab', { name: /Project History/i })
      expect(historyTab).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByTestId('timeline-component')).toBeInTheDocument()
    })

    it('reads #milestones hash on mount and opens Milestone Timeline tab', () => {
      window.location.hash = '#milestones'
      renderProjectDetail()

      const milestonesTab = screen.getByRole('tab', { name: /Milestone Timeline/i })
      expect(milestonesTab).toHaveAttribute('aria-selected', 'true')
    })

    it('reads #digest hash on mount and opens Executive Digest tab', () => {
      window.location.hash = '#digest'
      renderProjectDetail()

      const digestTab = screen.getByRole('tab', { name: /Executive Digest/i })
      expect(digestTab).toHaveAttribute('aria-selected', 'true')
      expect(screen.getByTestId('executive-digest')).toBeInTheDocument()
    })

    it('defaults to milestones for invalid hash', () => {
      window.location.hash = '#invalid-hash'
      renderProjectDetail()

      const milestonesTab = screen.getByRole('tab', { name: /Milestone Timeline/i })
      expect(milestonesTab).toHaveAttribute('aria-selected', 'true')
    })

    it('updates URL hash when switching tabs', async () => {
      const replaceStateSpy = vi.spyOn(window.history, 'replaceState')
      const user = userEvent.setup()
      renderProjectDetail()

      await user.click(screen.getByRole('tab', { name: /Project History/i }))
      expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '#history')

      await user.click(screen.getByRole('tab', { name: /Executive Digest/i }))
      expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '#digest')

      await user.click(screen.getByRole('tab', { name: /Milestone Timeline/i }))
      expect(replaceStateSpy).toHaveBeenCalledWith(null, '', '#milestones')

      replaceStateSpy.mockRestore()
    })
  })

  // ------- Breadcrumb -------

  describe('Breadcrumb', () => {
    it('renders breadcrumb navigation', () => {
      renderProjectDetail()

      const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i })
      expect(breadcrumb).toBeInTheDocument()
      expect(breadcrumb).toHaveTextContent('Projects')
    })

    it('shows "Milestone Timeline" in breadcrumb for milestones view', () => {
      window.location.hash = '#milestones'
      renderProjectDetail()

      const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i })
      expect(breadcrumb).toHaveTextContent('Milestone Timeline')
    })

    it('shows "Project History" in breadcrumb for history view', () => {
      window.location.hash = '#history'
      renderProjectDetail()

      const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i })
      expect(breadcrumb).toHaveTextContent('Project History')
    })

    it('shows "Executive Digest" in breadcrumb for digest view', () => {
      window.location.hash = '#digest'
      renderProjectDetail()

      const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i })
      expect(breadcrumb).toHaveTextContent('Executive Digest')
    })

    it('updates breadcrumb when switching tabs', async () => {
      const user = userEvent.setup()
      renderProjectDetail()

      const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i })
      expect(breadcrumb).toHaveTextContent('Milestone Timeline')

      await user.click(screen.getByRole('tab', { name: /Project History/i }))
      expect(breadcrumb).toHaveTextContent('Project History')

      await user.click(screen.getByRole('tab', { name: /Executive Digest/i }))
      expect(breadcrumb).toHaveTextContent('Executive Digest')
    })
  })

  // ------- Page heading -------

  describe('Page heading', () => {
    it('shows dynamic heading matching the active tab', async () => {
      const user = userEvent.setup()
      renderProjectDetail()

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Milestone Timeline')

      await user.click(screen.getByRole('tab', { name: /Project History/i }))
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Project History')

      await user.click(screen.getByRole('tab', { name: /Executive Digest/i }))
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Executive Digest')
    })
  })

  // ------- No standalone "Timeline" text -------

  describe('Rename verification', () => {
    it('does not render standalone "Timeline" text (only "Milestone Timeline" or "Project History")', () => {
      renderProjectDetail()

      const body = document.body.textContent || ''
      const withoutMilestoneTimeline = body.replace(/Milestone Timeline/g, '')
      expect(withoutMilestoneTimeline).not.toContain('Timeline')
    })
  })

  // ------- Decision count -------

  describe('Decision count', () => {
    it('displays "0 decisions found" when empty', () => {
      renderProjectDetail()
      expect(screen.getByText('0 decisions found')).toBeInTheDocument()
    })
  })
})
