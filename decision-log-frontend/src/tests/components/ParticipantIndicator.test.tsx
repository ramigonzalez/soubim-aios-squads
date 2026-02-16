import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ParticipantIndicator } from '../../components/atoms/ParticipantIndicator'

describe('ParticipantIndicator', () => {
  const mockParticipants = [
    { name: 'Carlos', role: 'Structural Engineer' },
    { name: 'Gabriela', role: 'Project Director' },
    { name: 'André', role: 'MEP Engineer' },
  ]

  it('renders participant count', () => {
    render(<ParticipantIndicator participants={mockParticipants} />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('has accessible aria-label with count', () => {
    render(<ParticipantIndicator participants={mockParticipants} />)
    expect(screen.getByLabelText('3 participants')).toBeInTheDocument()
  })

  it('renders tooltip with participant names and roles', () => {
    render(<ParticipantIndicator participants={mockParticipants} />)
    expect(screen.getByText('Participants')).toBeInTheDocument()
    expect(screen.getByText('Carlos')).toBeInTheDocument()
    expect(screen.getByText('Structural Engineer')).toBeInTheDocument()
    expect(screen.getByText('Gabriela')).toBeInTheDocument()
    expect(screen.getByText('Project Director')).toBeInTheDocument()
  })

  it('renders nothing when participants array is empty', () => {
    const { container } = render(<ParticipantIndicator participants={[]} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders count of 1 for single participant', () => {
    render(<ParticipantIndicator participants={[{ name: 'Carlos', role: 'Engineer' }]} />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })
})
