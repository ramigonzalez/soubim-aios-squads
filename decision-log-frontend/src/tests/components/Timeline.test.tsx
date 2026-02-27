import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Timeline } from '../../components/organisms/Timeline'
import type { ProjectItem } from '../../types/projectItem'

function makeItem(overrides: Partial<ProjectItem> = {}): ProjectItem {
  return {
    id: `item-${Math.random().toString(36).slice(2, 8)}`,
    project_id: 'proj-1',
    statement: 'Test item statement',
    who: 'Carlos',
    item_type: 'decision',
    source_type: 'meeting',
    affected_disciplines: ['architecture'],
    is_milestone: false,
    is_done: false,
    transcript_id: 'tr-001',
    meeting_title: 'Design Review',
    meeting_date: '2026-02-08T10:00:00Z',
    created_at: '2026-02-08T10:00:00Z',
    ...overrides,
  }
}

describe('Timeline — Dense Rows Layout', () => {
  const mockOnSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- Loading / Empty / Error States ---

  it('renders skeleton when loading', () => {
    const { container } = render(
      <Timeline
        decisions={[]}
        onSelectDecision={mockOnSelect}
        groupBy="date"
        isLoading={true}
      />
    )
    expect(container.querySelector('[data-testid="timeline-skeleton"]')).toBeInTheDocument()
  })

  it('renders empty state when no items', () => {
    render(
      <Timeline
        decisions={[]}
        onSelectDecision={mockOnSelect}
        groupBy="date"
      />
    )
    expect(screen.getByText('No project items yet')).toBeInTheDocument()
  })

  it('renders error state with retry', async () => {
    const mockRetry = vi.fn()
    render(
      <Timeline
        decisions={[]}
        onSelectDecision={mockOnSelect}
        groupBy="date"
        error={new Error('Network failure')}
        onRetry={mockRetry}
      />
    )
    expect(screen.getByText('Failed to load items')).toBeInTheDocument()
    expect(screen.getByText('Network failure')).toBeInTheDocument()

    const retryBtn = screen.getByText('Retry')
    await userEvent.setup().click(retryBtn)
    expect(mockRetry).toHaveBeenCalled()
  })

  // --- Dense Rows rendering ---

  it('renders UPPERCASE date headers', () => {
    const items = [
      makeItem({ id: 'a', meeting_date: '2026-02-08T10:00:00Z' }),
    ]
    render(
      <Timeline
        decisions={items}
        onSelectDecision={mockOnSelect}
        groupBy="date"
      />
    )
    // formatDenseDate("2026-02-08") => "FEB 8, 2026"
    expect(screen.getByText('FEB 8, 2026')).toBeInTheDocument()
  })

  it('renders item count next to date header', () => {
    // Use 2 different transcripts with different item counts so we can distinguish header vs source count
    const items = [
      makeItem({ id: 'a', meeting_date: '2026-02-08T10:00:00Z', transcript_id: 'tr-x1', meeting_title: 'Meeting X' }),
      makeItem({ id: 'b', meeting_date: '2026-02-08T11:00:00Z', transcript_id: 'tr-x2', meeting_title: 'Meeting Y' }),
    ]
    render(
      <Timeline
        decisions={items}
        onSelectDecision={mockOnSelect}
        groupBy="date"
      />
    )
    // Date header shows total "2 items", each source shows "1 item"
    // The date header's item count badge
    const dateHeader = screen.getByRole('heading', { level: 2 })
    expect(dateHeader.parentElement?.textContent).toContain('2 items')
  })

  it('groups items by date then by source (transcript_id)', () => {
    const items = [
      makeItem({ id: 'a', transcript_id: 'tr-001', meeting_title: 'Morning Standup', meeting_date: '2026-02-08T09:00:00Z', statement: 'Item from standup' }),
      makeItem({ id: 'b', transcript_id: 'tr-002', meeting_title: 'Design Review', meeting_date: '2026-02-08T14:00:00Z', statement: 'Item from review' }),
      makeItem({ id: 'c', transcript_id: 'tr-001', meeting_title: 'Morning Standup', meeting_date: '2026-02-08T09:00:00Z', statement: 'Another standup item' }),
    ]
    render(
      <Timeline
        decisions={items}
        onSelectDecision={mockOnSelect}
        groupBy="date"
      />
    )
    // Should have both source group titles
    expect(screen.getByText('Morning Standup')).toBeInTheDocument()
    expect(screen.getByText('Design Review')).toBeInTheDocument()
    // All items visible since <=5 per group
    expect(screen.getByText('Item from standup')).toBeInTheDocument()
    expect(screen.getByText('Item from review')).toBeInTheDocument()
    expect(screen.getByText('Another standup item')).toBeInTheDocument()
  })

  it('renders manual input items without source group wrapper', () => {
    const items = [
      makeItem({
        id: 'manual-1',
        source_type: 'manual_input',
        transcript_id: undefined,
        meeting_title: undefined,
        statement: 'Manually entered item',
        meeting_date: '2026-02-08T10:00:00Z',
      }),
      makeItem({
        id: 'meeting-1',
        transcript_id: 'tr-001',
        meeting_title: 'Design Review',
        statement: 'Meeting item',
        meeting_date: '2026-02-08T10:00:00Z',
      }),
    ]
    render(
      <Timeline
        decisions={items}
        onSelectDecision={mockOnSelect}
        groupBy="date"
      />
    )
    // Manual item renders as standalone row
    expect(screen.getByText('Manually entered item')).toBeInTheDocument()
    // Meeting item wrapped in source group
    expect(screen.getByText('Design Review')).toBeInTheDocument()
    expect(screen.getByText('Meeting item')).toBeInTheDocument()
  })

  it('source groups are collapsible', async () => {
    const user = userEvent.setup()
    const items = Array.from({ length: 7 }, (_, i) =>
      makeItem({
        id: `item-${i}`,
        transcript_id: 'tr-001',
        meeting_title: 'Big Meeting',
        statement: `Decision ${i}`,
        meeting_date: '2026-02-08T10:00:00Z',
      })
    )
    render(
      <Timeline
        decisions={items}
        onSelectDecision={mockOnSelect}
        groupBy="date"
      />
    )

    // >5 items => collapsed by default
    expect(screen.queryByText('Decision 0')).not.toBeInTheDocument()

    // Click to expand
    const header = screen.getByRole('button', { name: /Source: Big Meeting/ })
    await user.click(header)
    expect(screen.getByText('Decision 0')).toBeInTheDocument()
  })

  it('sorts dates descending (newest first)', () => {
    const items = [
      makeItem({ id: 'old', meeting_date: '2026-02-05T10:00:00Z', statement: 'Old item' }),
      makeItem({ id: 'new', meeting_date: '2026-02-10T10:00:00Z', statement: 'New item' }),
    ]
    render(
      <Timeline
        decisions={items}
        onSelectDecision={mockOnSelect}
        groupBy="date"
      />
    )

    const headings = screen.getAllByRole('heading', { level: 2 })
    // First heading should be the newer date
    expect(headings[0]).toHaveTextContent('FEB 10, 2026')
    expect(headings[1]).toHaveTextContent('FEB 5, 2026')
  })

  it('calls onSelectDecision when an item row is clicked', async () => {
    const user = userEvent.setup()
    const items = [
      makeItem({ id: 'item-click', statement: 'Clickable item', meeting_date: '2026-02-08T10:00:00Z' }),
    ]
    render(
      <Timeline
        decisions={items}
        onSelectDecision={mockOnSelect}
        groupBy="date"
      />
    )
    const row = screen.getByText('Clickable item')
    await user.click(row)
    expect(mockOnSelect).toHaveBeenCalledWith('item-click')
  })

  // --- Discipline groupBy mode ---

  it('groups by discipline when groupBy is "discipline"', () => {
    const items = [
      makeItem({ id: 'a', affected_disciplines: ['architecture'], statement: 'Arch item' }),
      makeItem({ id: 'b', affected_disciplines: ['structural'], statement: 'Struct item' }),
    ]
    render(
      <Timeline
        decisions={items}
        onSelectDecision={mockOnSelect}
        groupBy="discipline"
      />
    )
    expect(screen.getByText('Architecture')).toBeInTheDocument()
    expect(screen.getByText('Structural')).toBeInTheDocument()
  })

  it('date headers have sticky positioning class', () => {
    const items = [makeItem({ id: 'a' })]
    const { container } = render(
      <Timeline
        decisions={items}
        onSelectDecision={mockOnSelect}
        groupBy="date"
      />
    )
    const stickyHeaders = container.querySelectorAll('.sticky')
    expect(stickyHeaders.length).toBeGreaterThan(0)
  })
})
