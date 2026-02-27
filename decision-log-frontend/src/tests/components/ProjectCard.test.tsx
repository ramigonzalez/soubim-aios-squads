import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProjectCard } from '../../components/common/ProjectCard'

interface MockProject {
  id: string
  name: string
  description?: string
  project_type?: string | null
  current_stage?: { name: string } | null
  created_at: string
  member_count?: number
  item_count?: number
  decision_count?: number
}

describe('ProjectCard Component', () => {
  const mockProject: MockProject = {
    id: 'proj-123',
    name: 'Residential Tower',
    description: 'Modern 50-floor residential building in downtown',
    created_at: '2026-01-15T10:00:00Z',
    member_count: 8,
    item_count: 127,
    project_type: 'architecture_full',
    current_stage: { name: 'Estudo Preliminar' },
  }

  const mockOnClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders project name', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />)
    expect(screen.getByText('Residential Tower')).toBeInTheDocument()
  })

  it('renders project description', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />)
    expect(screen.getByText(/Modern 50-floor/)).toBeInTheDocument()
  })

  it('renders member count', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />)
    expect(screen.getByText('8 members')).toBeInTheDocument()
  })

  it('renders item count', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />)
    expect(screen.getByText('127 items')).toBeInTheDocument()
  })

  it('renders creation date formatted', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />)
    expect(screen.getByText(/Jan 15, 2026/)).toBeInTheDocument()
  })

  it('handles missing description', () => {
    const projectNoDesc: MockProject = { ...mockProject, description: undefined }
    render(<ProjectCard project={projectNoDesc} onClick={mockOnClick} />)
    expect(screen.getByText('No description')).toBeInTheDocument()
  })

  it('handles zero member count', () => {
    const projectNoMembers: MockProject = { ...mockProject, member_count: 0 }
    render(<ProjectCard project={projectNoMembers} onClick={mockOnClick} />)
    expect(screen.getByText('0 members')).toBeInTheDocument()
  })

  it('handles singular "member" vs plural', () => {
    const projectOneMemeber: MockProject = { ...mockProject, member_count: 1 }
    const { rerender } = render(
      <ProjectCard project={projectOneMemeber} onClick={mockOnClick} />
    )
    expect(screen.getByText('1 member')).toBeInTheDocument()

    const projectMultiple: MockProject = { ...mockProject, member_count: 2 }
    rerender(<ProjectCard project={projectMultiple} onClick={mockOnClick} />)
    expect(screen.getByText('2 members')).toBeInTheDocument()
  })

  it('handles singular "item" vs plural', () => {
    const projectOneItem: MockProject = { ...mockProject, item_count: 1 }
    const { rerender } = render(
      <ProjectCard project={projectOneItem} onClick={mockOnClick} />
    )
    expect(screen.getByText('1 item')).toBeInTheDocument()

    const projectMultiple: MockProject = { ...mockProject, item_count: 2 }
    rerender(<ProjectCard project={projectMultiple} onClick={mockOnClick} />)
    expect(screen.getByText('2 items')).toBeInTheDocument()
  })

  it('falls back to decision_count when item_count not present', () => {
    const v1Project: MockProject = { ...mockProject, item_count: undefined, decision_count: 50 }
    render(<ProjectCard project={v1Project} onClick={mockOnClick} />)
    expect(screen.getByText('50 items')).toBeInTheDocument()
  })

  it('renders StagePill when current_stage exists', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />)
    expect(screen.getByText('Estudo Preliminar')).toBeInTheDocument()
  })

  it('renders "No stages" when current_stage is null', () => {
    const noStageProject: MockProject = { ...mockProject, current_stage: null }
    render(<ProjectCard project={noStageProject} onClick={mockOnClick} />)
    expect(screen.getByText('No stages')).toBeInTheDocument()
  })

  it('renders project_type label', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />)
    expect(screen.getByText('architecture full')).toBeInTheDocument()
  })

  it('calls onClick handler on click', async () => {
    const user = userEvent.setup()
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />)

    const card = screen.getByText('Residential Tower').closest('div')
    await user.click(card!)

    expect(mockOnClick).toHaveBeenCalledWith('proj-123')
    expect(mockOnClick).toHaveBeenCalledTimes(1)
  })

  it('calls onClick handler on keyboard Enter', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <ProjectCard project={mockProject} onClick={mockOnClick} />
    )

    const button = container.querySelector('[role="button"]')
    if (button) {
      button.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      )
    }

    expect(mockOnClick).toHaveBeenCalledWith('proj-123')
  })

  it('calls onClick handler on keyboard Space', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <ProjectCard project={mockProject} onClick={mockOnClick} />
    )

    const button = container.querySelector('[role="button"]')
    if (button) {
      button.dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true })
      )
    }

    expect(mockOnClick).toHaveBeenCalledWith('proj-123')
  })

  it('has proper accessibility attributes', () => {
    const { container } = render(
      <ProjectCard project={mockProject} onClick={mockOnClick} />
    )
    const card = container.querySelector('[role="button"]')
    expect(card).toHaveAttribute('tabindex', '0')
  })

  it('has hover effect via classes', () => {
    const { container } = render(
      <ProjectCard project={mockProject} onClick={mockOnClick} />
    )
    const card = container.querySelector('[role="button"]')
    expect(card?.className).toContain('hover:shadow-lg')
    expect(card?.className).toContain('hover:scale-105')
  })

  it('renders "View Details" CTA', () => {
    render(<ProjectCard project={mockProject} onClick={mockOnClick} />)
    expect(screen.getByText('View Details →')).toBeInTheDocument()
  })

  it('truncates long project names', () => {
    const longNameProject: Project = {
      ...mockProject,
      name: 'This is a very long project name that should be truncated because it is too long to display in one line',
    }
    const { container } = render(
      <ProjectCard project={longNameProject} onClick={mockOnClick} />
    )
    const title = container.querySelector('h2')
    expect(title?.className).toContain('truncate')
  })

  it('clamps description to 2 lines', () => {
    const longDescProject: Project = {
      ...mockProject,
      description:
        'This is a very long description that spans multiple lines and should be clamped to exactly two lines to maintain the card layout and appearance.',
    }
    const { container } = render(
      <ProjectCard project={longDescProject} onClick={mockOnClick} />
    )
    const desc = container.querySelector('p')
    expect(desc?.className).toContain('line-clamp-2')
  })

  it('displays correct icons', () => {
    const { container } = render(
      <ProjectCard project={mockProject} onClick={mockOnClick} />
    )
    // Check for SVG elements (icons from lucide-react)
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThanOrEqual(3) // Users, FileText, Calendar
  })
})
