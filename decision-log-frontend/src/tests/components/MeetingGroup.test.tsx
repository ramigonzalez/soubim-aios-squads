import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MeetingGroup, MeetingGroupData } from '../../components/molecules/MeetingGroup'
import { ProjectItem } from '../../types/projectItem'

function makeItem(overrides: Partial<ProjectItem> = {}): ProjectItem {
  return {
    id: `dec-${Math.random().toString(36).slice(2, 8)}`,
    project_id: 'proj-001',
    statement: 'Test decision statement',
    who: 'Carlos',
    timestamp: '00:05:32',
    item_type: 'decision',
    source_type: 'meeting',
    affected_disciplines: ['structural'],
    is_milestone: false,
    is_done: false,
    transcript_id: 'tr-001',
    meeting_title: 'Structural Design Review',
    meeting_type: 'Design Review',
    meeting_date: '2026-02-06T09:00:00Z',
    why: 'Test reason',
    confidence: 0.9,
    created_at: '2026-02-06T09:05:32Z',
    ...overrides,
  }
}

function makeMeeting(decisionCount: number, overrides: Partial<MeetingGroupData> = {}): MeetingGroupData {
  return {
    meetingTitle: 'Structural Design Review',
    meetingType: 'Design Review',
    meetingDate: '2026-02-06T09:00:00Z',
    transcriptId: 'tr-001',
    participants: [
      { name: 'Carlos', role: 'Structural Engineer' },
      { name: 'Gabriela', role: 'Project Director' },
    ],
    decisions: Array.from({ length: decisionCount }, (_, i) =>
      makeItem({ id: `dec-${i}`, statement: `Decision ${i + 1}` }),
    ),
    ...overrides,
  }
}

describe('MeetingGroup', () => {
  const mockOnSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders meeting title and type badge', () => {
    render(<MeetingGroup meeting={makeMeeting(2)} onSelectDecision={mockOnSelect} />)
    expect(screen.getByText('Structural Design Review')).toBeInTheDocument()
    expect(screen.getByText('Design Review')).toBeInTheDocument()
  })

  it('renders decision count', () => {
    render(<MeetingGroup meeting={makeMeeting(3)} onSelectDecision={mockOnSelect} />)
    expect(screen.getByText('3 decisions')).toBeInTheDocument()
  })

  it('renders singular "decision" for single decision', () => {
    render(<MeetingGroup meeting={makeMeeting(1)} onSelectDecision={mockOnSelect} />)
    expect(screen.getByText('1 decision')).toBeInTheDocument()
  })

  it('shows decisions expanded when <=5', () => {
    render(<MeetingGroup meeting={makeMeeting(3)} onSelectDecision={mockOnSelect} />)
    expect(screen.getByText('Decision 1')).toBeInTheDocument()
    expect(screen.getByText('Decision 2')).toBeInTheDocument()
    expect(screen.getByText('Decision 3')).toBeInTheDocument()
  })

  it('shows decisions collapsed when >5', () => {
    render(<MeetingGroup meeting={makeMeeting(7)} onSelectDecision={mockOnSelect} />)
    expect(screen.queryByText('Decision 1')).not.toBeInTheDocument()
  })

  it('toggles expand/collapse on header click', async () => {
    const user = userEvent.setup()
    render(<MeetingGroup meeting={makeMeeting(7)} onSelectDecision={mockOnSelect} />)

    // Initially collapsed
    expect(screen.queryByText('Decision 1')).not.toBeInTheDocument()

    // Click to expand
    const header = screen.getByRole('button', { name: /Meeting: Structural Design Review/ })
    await user.click(header)
    expect(screen.getByText('Decision 1')).toBeInTheDocument()

    // Click to collapse
    await user.click(header)
    expect(screen.queryByText('Decision 1')).not.toBeInTheDocument()
  })

  it('toggles on Enter key', async () => {
    const user = userEvent.setup()
    render(<MeetingGroup meeting={makeMeeting(7)} onSelectDecision={mockOnSelect} />)

    const header = screen.getByRole('button', { name: /Meeting: Structural Design Review/ })
    header.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByText('Decision 1')).toBeInTheDocument()
  })

  it('toggles on Space key', async () => {
    const user = userEvent.setup()
    render(<MeetingGroup meeting={makeMeeting(7)} onSelectDecision={mockOnSelect} />)

    const header = screen.getByRole('button', { name: /Meeting: Structural Design Review/ })
    header.focus()
    await user.keyboard(' ')
    expect(screen.getByText('Decision 1')).toBeInTheDocument()
  })

  it('renders discipline badges from participants', () => {
    render(<MeetingGroup meeting={makeMeeting(2)} onSelectDecision={mockOnSelect} />)
    // "Struct" appears in header (from participants) and in each DecisionRow
    expect(screen.getAllByText('Struct').length).toBeGreaterThanOrEqual(1)
    // "Arch" from Project Director role mapping
    expect(screen.getAllByText('Arch').length).toBeGreaterThanOrEqual(1)
  })

  it('shows "+N more" pill when >4 disciplines', () => {
    const meeting = makeMeeting(2, {
      participants: [
        { name: 'A', role: 'Structural Engineer' },
        { name: 'B', role: 'MEP Engineer' },
        { name: 'C', role: 'Architect' },
        { name: 'D', role: 'Plumbing Engineer' },
        { name: 'E', role: 'Electrical Engineer' },
        { name: 'F', role: 'Landscape Architect' },
      ],
    })
    render(<MeetingGroup meeting={meeting} onSelectDecision={mockOnSelect} />)
    expect(screen.getByText('+3 more')).toBeInTheDocument()
  })

  it('renders orphan meeting with italic title and no badge', () => {
    const orphanMeeting = makeMeeting(2, {
      meetingTitle: 'Other Decisions',
      transcriptId: undefined,
      meetingType: undefined,
      participants: [],
    })
    render(<MeetingGroup meeting={orphanMeeting} onSelectDecision={mockOnSelect} />)
    const title = screen.getByText('Other Decisions')
    expect(title.className).toContain('italic')
    expect(screen.queryByText('Design Review')).not.toBeInTheDocument()
  })

  it('has proper ARIA attributes for accordion', () => {
    render(<MeetingGroup meeting={makeMeeting(3)} onSelectDecision={mockOnSelect} />)
    const header = screen.getByRole('button', { name: /Meeting: Structural Design Review/ })
    expect(header).toHaveAttribute('aria-expanded', 'true')
    expect(header).toHaveAttribute('aria-controls', 'meeting-tr-001-decisions')
    // Full screen reader label includes type, participants, decisions, state
    expect(header.getAttribute('aria-label')).toContain('Design Review')
    expect(header.getAttribute('aria-label')).toContain('2 participants')
    expect(header.getAttribute('aria-label')).toContain('3 decisions')
    expect(header.getAttribute('aria-label')).toContain('expanded')
  })

  it('has region role with accessible label', () => {
    render(<MeetingGroup meeting={makeMeeting(3)} onSelectDecision={mockOnSelect} />)
    expect(screen.getByRole('region', { name: /Structural Design Review, 3 decisions/ })).toBeInTheDocument()
  })

  it('renders no meeting type badge when meetingType is missing', () => {
    const meeting = makeMeeting(2, { meetingType: undefined })
    const { container } = render(<MeetingGroup meeting={meeting} onSelectDecision={mockOnSelect} />)
    // Should not have any badge pill with rounded-full class from MeetingTypeBadge
    const badges = container.querySelectorAll('.rounded-full')
    // Only discipline badges have rounded class, no meeting type badge
    expect(screen.queryByText('Design Review')).not.toBeInTheDocument()
  })

  it('uses neutral gray border for all meetings', () => {
    const meetings = [
      makeMeeting(2, { meetingType: 'Client Meeting' }),
      makeMeeting(2, { meetingType: 'Design Review' }),
      makeMeeting(2, { meetingType: 'Unknown Type' }),
      makeMeeting(2, { meetingTitle: 'Other Decisions', transcriptId: undefined, meetingType: undefined, participants: [] }),
    ]
    meetings.forEach((meeting) => {
      const { container } = render(
        <MeetingGroup meeting={meeting} onSelectDecision={mockOnSelect} />
      )
      const region = container.querySelector('[role="region"]')
      expect(region?.className).toContain('border-l-gray-300')
    })
  })
})
