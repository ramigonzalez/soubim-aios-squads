import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MilestoneStarToggle } from '../../components/molecules/MilestoneStarToggle'

describe('MilestoneStarToggle', () => {
  const mockOnToggle = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders filled star when isMilestone=true', () => {
    render(<MilestoneStarToggle isMilestone={true} onToggle={mockOnToggle} />)
    const button = screen.getByRole('button', { name: 'Remove milestone' })
    expect(button).toBeInTheDocument()
    // Filled star has fill-current class
    const svg = button.querySelector('svg')
    expect(svg).toHaveClass('fill-current')
    // Button should have yellow text
    expect(button.className).toContain('text-yellow-500')
  })

  it('renders outline star when isMilestone=false', () => {
    render(<MilestoneStarToggle isMilestone={false} onToggle={mockOnToggle} />)
    const button = screen.getByRole('button', { name: 'Mark as milestone' })
    expect(button).toBeInTheDocument()
    // Outline star should NOT have fill-current class
    const svg = button.querySelector('svg')
    expect(svg).not.toHaveClass('fill-current')
    // Button should have gray text
    expect(button.className).toContain('text-gray-300')
  })

  it('fires onToggle when clicked', async () => {
    const user = userEvent.setup()
    render(<MilestoneStarToggle isMilestone={false} onToggle={mockOnToggle} />)
    const button = screen.getByRole('button', { name: 'Mark as milestone' })
    await user.click(button)
    expect(mockOnToggle).toHaveBeenCalledTimes(1)
  })

  it('fires onToggle on keyboard Enter', async () => {
    const user = userEvent.setup()
    render(<MilestoneStarToggle isMilestone={false} onToggle={mockOnToggle} />)
    const button = screen.getByRole('button', { name: 'Mark as milestone' })
    button.focus()
    await user.keyboard('{Enter}')
    expect(mockOnToggle).toHaveBeenCalledTimes(1)
  })

  it('fires onToggle on keyboard Space', async () => {
    const user = userEvent.setup()
    render(<MilestoneStarToggle isMilestone={false} onToggle={mockOnToggle} />)
    const button = screen.getByRole('button', { name: 'Mark as milestone' })
    button.focus()
    await user.keyboard(' ')
    expect(mockOnToggle).toHaveBeenCalledTimes(1)
  })

  it('applies opacity-0 and group-hover:opacity-100 classes when showOnHoverOnly=true and not a milestone', () => {
    render(
      <MilestoneStarToggle
        isMilestone={false}
        onToggle={mockOnToggle}
        showOnHoverOnly={true}
      />
    )
    const button = screen.getByRole('button', { name: 'Mark as milestone' })
    expect(button.className).toContain('opacity-0')
    expect(button.className).toContain('group-hover:opacity-100')
  })

  it('does NOT apply opacity-0 when showOnHoverOnly=true but isMilestone=true', () => {
    render(
      <MilestoneStarToggle
        isMilestone={true}
        onToggle={mockOnToggle}
        showOnHoverOnly={true}
      />
    )
    const button = screen.getByRole('button', { name: 'Remove milestone' })
    expect(button.className).not.toContain('opacity-0')
  })

  it('does NOT apply opacity-0 when showOnHoverOnly=false', () => {
    render(
      <MilestoneStarToggle
        isMilestone={false}
        onToggle={mockOnToggle}
        showOnHoverOnly={false}
      />
    )
    const button = screen.getByRole('button', { name: 'Mark as milestone' })
    expect(button.className).not.toContain('opacity-0')
  })

  it('has aria-label "Remove milestone" when isMilestone=true', () => {
    render(<MilestoneStarToggle isMilestone={true} onToggle={mockOnToggle} />)
    expect(screen.getByLabelText('Remove milestone')).toBeInTheDocument()
  })

  it('has aria-label "Mark as milestone" when isMilestone=false', () => {
    render(<MilestoneStarToggle isMilestone={false} onToggle={mockOnToggle} />)
    expect(screen.getByLabelText('Mark as milestone')).toBeInTheDocument()
  })

  it('uses w-4 h-4 icon size for size="sm"', () => {
    render(<MilestoneStarToggle isMilestone={false} onToggle={mockOnToggle} size="sm" />)
    const svg = screen.getByRole('button').querySelector('svg')
    expect(svg).toHaveClass('w-4', 'h-4')
  })

  it('uses w-5 h-5 icon size for size="md"', () => {
    render(<MilestoneStarToggle isMilestone={false} onToggle={mockOnToggle} size="md" />)
    const svg = screen.getByRole('button').querySelector('svg')
    expect(svg).toHaveClass('w-5', 'h-5')
  })

  it('stops event propagation on click', async () => {
    const parentClickHandler = vi.fn()
    const user = userEvent.setup()

    render(
      <div onClick={parentClickHandler}>
        <MilestoneStarToggle isMilestone={false} onToggle={mockOnToggle} />
      </div>
    )

    const button = screen.getByRole('button', { name: 'Mark as milestone' })
    await user.click(button)
    expect(mockOnToggle).toHaveBeenCalledTimes(1)
    expect(parentClickHandler).not.toHaveBeenCalled()
  })
})
