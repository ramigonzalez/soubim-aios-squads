/**
 * Tests for SharedMilestoneTimeline page (Story 8.4).
 *
 * Covers: rendering from public data, "Shared view" badge,
 * no admin controls, expired token error state.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { SharedMilestoneTimeline } from '../../pages/SharedMilestoneTimeline'

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockUseSharedTimeline = vi.fn()

vi.mock('../../hooks/useSharedLinks', () => ({
  useSharedTimeline: (token: string) => mockUseSharedTimeline(token),
}))

// Mock MilestoneTimeline — the real component uses internal hooks (useStages, useMilestones)
// which aren't set up in the shared context. Render milestone data directly for testing.
vi.mock('../../components/organisms/MilestoneTimeline', () => ({
  MilestoneTimeline: ({ milestones, readOnly }: any) => (
    <nav aria-label="Milestone Timeline">
      {milestones?.map((m: any) => (
        <div key={m.id} data-testid={`milestone-${m.id}`}>
          <span>{m.statement}</span>
          <span>{m.discipline}</span>
          <span>{m.who}</span>
        </div>
      ))}
      {readOnly && <span data-testid="readonly-mode" />}
    </nav>
  ),
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

function renderSharedTimeline(token: string = 'test-token-123') {
  const queryClient = createQueryClient()

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/shared/milestones/${token}`]}>
        <Routes>
          <Route path="/shared/milestones/:token" element={<SharedMilestoneTimeline />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

// ─── Test Data ───────────────────────────────────────────────────────────────

const mockTimelineData = {
  project: {
    id: 'project-1',
    name: 'Riverfront Plaza',
    description: 'Commercial mixed-use development',
  },
  milestones: [
    {
      id: 'ms-1',
      statement: 'Foundation design approved',
      discipline: 'structural',
      who: 'Carlos',
      timestamp: '00:05:00',
      created_at: '2026-01-15T10:00:00Z',
      is_done: true,
      affected_disciplines: ['structural', 'civil'],
    },
    {
      id: 'ms-2',
      statement: 'HVAC routing finalized',
      discipline: 'mep',
      who: 'Andre',
      timestamp: '00:12:00',
      created_at: '2026-02-01T14:00:00Z',
      is_done: false,
      affected_disciplines: ['mep'],
    },
  ],
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SharedMilestoneTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders timeline from public data', () => {
    mockUseSharedTimeline.mockReturnValue({
      data: mockTimelineData,
      isLoading: false,
      error: null,
    })

    renderSharedTimeline()

    expect(screen.getByText('Riverfront Plaza')).toBeInTheDocument()
    expect(screen.getByText('Foundation design approved')).toBeInTheDocument()
    expect(screen.getByText('HVAC routing finalized')).toBeInTheDocument()
  })

  it('shows "Shared view" badge', () => {
    mockUseSharedTimeline.mockReturnValue({
      data: mockTimelineData,
      isLoading: false,
      error: null,
    })

    renderSharedTimeline()
    expect(screen.getByText('Shared view')).toBeInTheDocument()
  })

  it('shows project description', () => {
    mockUseSharedTimeline.mockReturnValue({
      data: mockTimelineData,
      isLoading: false,
      error: null,
    })

    renderSharedTimeline()
    expect(screen.getByText('Commercial mixed-use development')).toBeInTheDocument()
  })

  it('shows milestone count', () => {
    mockUseSharedTimeline.mockReturnValue({
      data: mockTimelineData,
      isLoading: false,
      error: null,
    })

    renderSharedTimeline()
    expect(screen.getByText('2 milestones')).toBeInTheDocument()
  })

  it('no admin controls visible (no toggle buttons)', () => {
    mockUseSharedTimeline.mockReturnValue({
      data: mockTimelineData,
      isLoading: false,
      error: null,
    })

    renderSharedTimeline()

    // No "Complete" or "Reopen" buttons should be visible in readOnly mode
    expect(screen.queryByText('Complete')).not.toBeInTheDocument()
    expect(screen.queryByText('Reopen')).not.toBeInTheDocument()
  })

  it('does not render navigation bar', () => {
    mockUseSharedTimeline.mockReturnValue({
      data: mockTimelineData,
      isLoading: false,
      error: null,
    })

    const { container } = renderSharedTimeline()

    // No NavBar or top-level nav (besides the timeline's own nav)
    const navElements = container.querySelectorAll('nav')
    // The only nav should be the Milestone Timeline itself
    navElements.forEach(nav => {
      expect(nav.getAttribute('aria-label')).toBe('Milestone Timeline')
    })
  })

  it('expired/revoked token shows error state', () => {
    mockUseSharedTimeline.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Not found'),
    })

    renderSharedTimeline()
    expect(screen.getByText('This link has expired or been revoked')).toBeInTheDocument()
  })

  it('shows loading state while fetching', () => {
    mockUseSharedTimeline.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    })

    renderSharedTimeline()
    expect(screen.getByText('Loading shared timeline...')).toBeInTheDocument()
  })

  it('shows footer with DecisionLog branding', () => {
    mockUseSharedTimeline.mockReturnValue({
      data: mockTimelineData,
      isLoading: false,
      error: null,
    })

    renderSharedTimeline()
    expect(screen.getByText('Powered by DecisionLog')).toBeInTheDocument()
  })

  it('displays discipline badges for milestones', () => {
    mockUseSharedTimeline.mockReturnValue({
      data: mockTimelineData,
      isLoading: false,
      error: null,
    })

    renderSharedTimeline()
    expect(screen.getByText('structural')).toBeInTheDocument()
    expect(screen.getByText('mep')).toBeInTheDocument()
  })

  it('displays milestone authors', () => {
    mockUseSharedTimeline.mockReturnValue({
      data: mockTimelineData,
      isLoading: false,
      error: null,
    })

    renderSharedTimeline()
    expect(screen.getByText('Carlos')).toBeInTheDocument()
    expect(screen.getByText('Andre')).toBeInTheDocument()
  })
})
