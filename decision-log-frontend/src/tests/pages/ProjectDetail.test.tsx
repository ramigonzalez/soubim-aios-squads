import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ProjectDetail, type ProjectDetailView } from '../../pages/ProjectDetail'
import { useProjectItems } from '../../hooks/useProjectItems'

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

function renderProjectDetail(view: ProjectDetailView = 'milestones') {
  const queryClient = createQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ProjectDetail view={view} />
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

  // ------- Section from the route (Promem revamp Phase 2: the sidebar replaces the tabs) -------

  describe('Section from the route', () => {
    it('renders the milestone timeline by default, without tabs or breadcrumb', () => {
      renderProjectDetail()
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Milestone Timeline')
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
      expect(screen.queryByRole('navigation', { name: /breadcrumb/i })).not.toBeInTheDocument()
    })

    it('renders Project History with the filter bar', () => {
      renderProjectDetail('history')
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Project History')
      expect(screen.getByTestId('timeline-component')).toBeInTheDocument()
      expect(screen.getByTestId('filter-bar')).toBeInTheDocument()
    })

    it('renders the Executive Digest without the filter bar', () => {
      renderProjectDetail('digest')
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Executive Digest')
      expect(screen.getByTestId('executive-digest')).toBeInTheDocument()
      expect(screen.queryByTestId('filter-bar')).not.toBeInTheDocument()
    })

    it('has no filter bar on the milestone timeline', () => {
      renderProjectDetail('milestones')
      expect(screen.queryByTestId('filter-bar')).not.toBeInTheDocument()
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

// Story 12.7: admin UI follows the project capabilities returned by the API, not the legacy users.role
describe('ProjectDetail capabilities (Story 12.7)', () => {
  const withCapabilities = (capabilities: { can_manage?: boolean; can_review?: boolean }) =>
    vi.mocked(useProjectItems).mockReturnValue({
      data: { items: [], total: 0, limit: 50, offset: 0, ...capabilities },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useProjectItems>)

  beforeEach(() => {
    window.location.hash = ''
  })

  it('shows Edit / Archive to users who can manage the project', () => {
    withCapabilities({ can_manage: true, can_review: true })
    renderProjectDetail()
    expect(screen.getByRole('button', { name: /Edit/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Archive/ })).toBeInTheDocument()
  })

  it('hides them from reviewers and members, whatever their legacy users.role', () => {
    withCapabilities({ can_manage: false, can_review: true })
    renderProjectDetail()
    expect(screen.queryByRole('button', { name: /Edit/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Archive/ })).not.toBeInTheDocument()
  })

  it('shows reviewers a Fathom rules button, not to members (Story 13.16)', () => {
    withCapabilities({ can_manage: false, can_review: true })
    const { unmount } = renderProjectDetail()
    expect(screen.getByRole('button', { name: /Fathom rules/ })).toBeInTheDocument()
    unmount()
    withCapabilities({ can_manage: false, can_review: false })
    renderProjectDetail()
    expect(screen.queryByRole('button', { name: /Fathom rules/ })).not.toBeInTheDocument()
  })

  it('admins get Edit, not the separate Fathom rules button (Story 13.16)', () => {
    withCapabilities({ can_manage: true, can_review: true })
    renderProjectDetail()
    expect(screen.queryByRole('button', { name: /Fathom rules/ })).not.toBeInTheDocument()
  })
})
