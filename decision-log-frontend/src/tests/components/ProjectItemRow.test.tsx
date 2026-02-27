import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectItemRow } from '../../components/molecules/ProjectItemRow'
import type { ProjectItem } from '../../types/projectItem'

function makeItem(overrides: Partial<ProjectItem> = {}): ProjectItem {
  return {
    id: 'item-001',
    project_id: 'proj-1',
    statement: 'Use double-height glazing on south facade',
    who: 'Carlos',
    item_type: 'decision',
    source_type: 'meeting',
    affected_disciplines: ['architecture', 'structural'],
    is_milestone: false,
    is_done: false,
    created_at: '2026-02-08T10:00:00Z',
    ...overrides,
  }
}

describe('ProjectItemRow', () => {
  const mockOnClick = vi.fn()
  const mockOnToggleMilestone = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders item type badge, statement, who, and date', () => {
    render(<ProjectItemRow item={makeItem()} onClick={mockOnClick} />)
    // Statement text
    expect(screen.getByText('Use double-height glazing on south facade')).toBeInTheDocument()
    // Who text
    expect(screen.getByText('Carlos')).toBeInTheDocument()
    // Date (short format: "Feb 8")
    expect(screen.getByText('Feb 8')).toBeInTheDocument()
    // ItemTypeBadge renders with title attribute
    expect(screen.getByTitle('Decision')).toBeInTheDocument()
  })

  it('renders discipline circles', () => {
    render(<ProjectItemRow item={makeItem()} onClick={mockOnClick} />)
    // DisciplineCircle renders with aria-label for each discipline
    expect(screen.getByLabelText('architecture')).toBeInTheDocument()
    expect(screen.getByLabelText('structural')).toBeInTheDocument()
  })

  it('triggers onClick on click', async () => {
    const user = userEvent.setup()
    render(<ProjectItemRow item={makeItem()} onClick={mockOnClick} />)

    const row = screen.getByRole('button', { name: /decision: Use double-height glazing/ })
    await user.click(row)
    expect(mockOnClick).toHaveBeenCalledWith('item-001')
  })

  it('triggers onClick on Enter key', async () => {
    const user = userEvent.setup()
    render(<ProjectItemRow item={makeItem()} onClick={mockOnClick} />)

    const row = screen.getByRole('button', { name: /decision: Use double-height glazing/ })
    row.focus()
    await user.keyboard('{Enter}')
    expect(mockOnClick).toHaveBeenCalledWith('item-001')
  })

  it('does not show milestone star when isAdmin is false', () => {
    render(<ProjectItemRow item={makeItem()} onClick={mockOnClick} />)
    expect(screen.queryByLabelText('Mark as milestone')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Remove milestone')).not.toBeInTheDocument()
  })

  it('shows milestone star when isAdmin is true', () => {
    render(
      <ProjectItemRow
        item={makeItem()}
        onClick={mockOnClick}
        onToggleMilestone={mockOnToggleMilestone}
        isAdmin={true}
      />
    )
    expect(screen.getByLabelText('Mark as milestone')).toBeInTheDocument()
  })

  it('shows filled star when item is a milestone', () => {
    render(
      <ProjectItemRow
        item={makeItem({ is_milestone: true })}
        onClick={mockOnClick}
        onToggleMilestone={mockOnToggleMilestone}
        isAdmin={true}
      />
    )
    expect(screen.getByLabelText('Remove milestone')).toBeInTheDocument()
  })

  it('calls onToggleMilestone when star is clicked without triggering row onClick', async () => {
    const user = userEvent.setup()
    render(
      <ProjectItemRow
        item={makeItem()}
        onClick={mockOnClick}
        onToggleMilestone={mockOnToggleMilestone}
        isAdmin={true}
      />
    )

    const star = screen.getByLabelText('Mark as milestone')
    await user.click(star)
    expect(mockOnToggleMilestone).toHaveBeenCalledWith('item-001')
    // Should not trigger row onClick due to stopPropagation
    expect(mockOnClick).not.toHaveBeenCalled()
  })

  it('has correct aria-label', () => {
    render(<ProjectItemRow item={makeItem()} onClick={mockOnClick} />)
    const row = screen.getByRole('button')
    expect(row).toHaveAttribute('aria-label', 'decision: Use double-height glazing on south facade')
  })
})
