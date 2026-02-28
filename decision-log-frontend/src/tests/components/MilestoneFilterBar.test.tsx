import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MilestoneFilterBar } from '../../components/molecules/MilestoneFilterBar'

describe('MilestoneFilterBar', () => {
  const mockOnToggleSource = vi.fn()
  const mockOnToggleItemType = vi.fn()
  const mockOnClearAll = vi.fn()

  const defaultProps = {
    sourceFilters: [] as string[],
    itemTypeFilters: [] as string[],
    onToggleSource: mockOnToggleSource,
    onToggleItemType: mockOnToggleItemType,
    onClearAll: mockOnClearAll,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all 4 source type chips', () => {
    render(<MilestoneFilterBar {...defaultProps} />)
    expect(screen.getByTestId('source-chip-meeting')).toBeInTheDocument()
    expect(screen.getByTestId('source-chip-email')).toBeInTheDocument()
    expect(screen.getByTestId('source-chip-document')).toBeInTheDocument()
    expect(screen.getByTestId('source-chip-manual_input')).toBeInTheDocument()
  })

  it('renders all 5 item type chips', () => {
    render(<MilestoneFilterBar {...defaultProps} />)
    expect(screen.getByTestId('type-chip-decision')).toBeInTheDocument()
    expect(screen.getByTestId('type-chip-topic')).toBeInTheDocument()
    expect(screen.getByTestId('type-chip-action_item')).toBeInTheDocument()
    expect(screen.getByTestId('type-chip-idea')).toBeInTheDocument()
    expect(screen.getByTestId('type-chip-information')).toBeInTheDocument()
  })

  it('renders chip labels correctly', () => {
    render(<MilestoneFilterBar {...defaultProps} />)
    expect(screen.getByText('Meeting')).toBeInTheDocument()
    expect(screen.getByText('Email')).toBeInTheDocument()
    expect(screen.getByText('Document')).toBeInTheDocument()
    expect(screen.getByText('Manual')).toBeInTheDocument()
    expect(screen.getByText('Decision')).toBeInTheDocument()
    expect(screen.getByText('Topic')).toBeInTheDocument()
    expect(screen.getByText('Action Item')).toBeInTheDocument()
    expect(screen.getByText('Idea')).toBeInTheDocument()
    expect(screen.getByText('Info')).toBeInTheDocument()
  })

  it('calls onToggleSource when a source chip is clicked', async () => {
    const user = userEvent.setup()
    render(<MilestoneFilterBar {...defaultProps} />)
    await user.click(screen.getByTestId('source-chip-meeting'))
    expect(mockOnToggleSource).toHaveBeenCalledWith('meeting')
  })

  it('calls onToggleItemType when an item type chip is clicked', async () => {
    const user = userEvent.setup()
    render(<MilestoneFilterBar {...defaultProps} />)
    await user.click(screen.getByTestId('type-chip-decision'))
    expect(mockOnToggleItemType).toHaveBeenCalledWith('decision')
  })

  it('applies active color classes to active source chips', () => {
    render(
      <MilestoneFilterBar
        {...defaultProps}
        sourceFilters={['meeting']}
      />
    )
    const meetingChip = screen.getByTestId('source-chip-meeting')
    expect(meetingChip.className).toContain('bg-indigo-100')
    expect(meetingChip.className).toContain('text-indigo-700')
  })

  it('applies active color classes to active item type chips', () => {
    render(
      <MilestoneFilterBar
        {...defaultProps}
        itemTypeFilters={['decision']}
      />
    )
    const decisionChip = screen.getByTestId('type-chip-decision')
    expect(decisionChip.className).toContain('bg-green-100')
    expect(decisionChip.className).toContain('text-green-700')
  })

  it('applies inactive gray classes to inactive chips', () => {
    render(<MilestoneFilterBar {...defaultProps} />)
    const meetingChip = screen.getByTestId('source-chip-meeting')
    expect(meetingChip.className).toContain('bg-gray-100')
    expect(meetingChip.className).toContain('text-gray-600')
  })

  it('sets aria-pressed=true on active chips', () => {
    render(
      <MilestoneFilterBar
        {...defaultProps}
        sourceFilters={['email']}
        itemTypeFilters={['idea']}
      />
    )
    expect(screen.getByTestId('source-chip-email')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('type-chip-idea')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('source-chip-meeting')).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByTestId('type-chip-decision')).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows active count badge with correct number when filters active', () => {
    render(
      <MilestoneFilterBar
        {...defaultProps}
        sourceFilters={['meeting', 'email']}
        itemTypeFilters={['decision']}
      />
    )
    const badge = screen.getByTestId('active-count-badge')
    expect(badge).toBeInTheDocument()
    expect(badge.textContent).toBe('3')
  })

  it('hides active count badge when no filters active', () => {
    render(<MilestoneFilterBar {...defaultProps} />)
    expect(screen.queryByTestId('active-count-badge')).not.toBeInTheDocument()
  })

  it('shows clear filters button when filters are active', () => {
    render(
      <MilestoneFilterBar
        {...defaultProps}
        sourceFilters={['meeting']}
      />
    )
    expect(screen.getByTestId('clear-filters-button')).toBeInTheDocument()
  })

  it('hides clear filters button when no filters active', () => {
    render(<MilestoneFilterBar {...defaultProps} />)
    expect(screen.queryByTestId('clear-filters-button')).not.toBeInTheDocument()
  })

  it('calls onClearAll when clear filters button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <MilestoneFilterBar
        {...defaultProps}
        sourceFilters={['meeting']}
      />
    )
    await user.click(screen.getByTestId('clear-filters-button'))
    expect(mockOnClearAll).toHaveBeenCalledTimes(1)
  })

  it('applies correct active class for each source type', () => {
    render(
      <MilestoneFilterBar
        {...defaultProps}
        sourceFilters={['meeting', 'email', 'document', 'manual_input']}
      />
    )
    expect(screen.getByTestId('source-chip-meeting').className).toContain('bg-indigo-100')
    expect(screen.getByTestId('source-chip-email').className).toContain('bg-sky-100')
    expect(screen.getByTestId('source-chip-document').className).toContain('bg-orange-100')
    expect(screen.getByTestId('source-chip-manual_input').className).toContain('bg-gray-200')
  })

  it('applies correct active class for each item type', () => {
    render(
      <MilestoneFilterBar
        {...defaultProps}
        itemTypeFilters={['decision', 'topic', 'action_item', 'idea', 'information']}
      />
    )
    expect(screen.getByTestId('type-chip-decision').className).toContain('bg-green-100')
    expect(screen.getByTestId('type-chip-topic').className).toContain('bg-amber-100')
    expect(screen.getByTestId('type-chip-action_item').className).toContain('bg-blue-100')
    expect(screen.getByTestId('type-chip-idea').className).toContain('bg-purple-100')
    expect(screen.getByTestId('type-chip-information').className).toContain('bg-slate-100')
  })
})
