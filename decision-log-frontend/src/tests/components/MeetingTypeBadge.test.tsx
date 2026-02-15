import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MeetingTypeBadge } from '../../components/atoms/MeetingTypeBadge'

describe('MeetingTypeBadge', () => {
  it('renders Client Meeting with rose colors', () => {
    render(<MeetingTypeBadge type="Client Meeting" />)
    const badge = screen.getByText('Client Meeting')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-rose-50')
    expect(badge.className).toContain('text-rose-700')
  })

  it('renders Coordination with teal colors', () => {
    render(<MeetingTypeBadge type="Coordination" />)
    const badge = screen.getByText('Coordination')
    expect(badge.className).toContain('bg-teal-50')
    expect(badge.className).toContain('text-teal-700')
  })

  it('renders Design Review with amber colors', () => {
    render(<MeetingTypeBadge type="Design Review" />)
    const badge = screen.getByText('Design Review')
    expect(badge.className).toContain('bg-amber-50')
    expect(badge.className).toContain('text-amber-700')
  })

  it('renders Internal Review with blue colors', () => {
    render(<MeetingTypeBadge type="Internal Review" />)
    const badge = screen.getByText('Internal Review')
    expect(badge.className).toContain('bg-blue-50')
    expect(badge.className).toContain('text-blue-700')
  })

  it('renders unknown type with gray fallback', () => {
    render(<MeetingTypeBadge type="Custom Type" />)
    const badge = screen.getByText('Custom Type')
    expect(badge.className).toContain('bg-gray-50')
    expect(badge.className).toContain('text-gray-600')
  })

  it('renders nothing when type is null', () => {
    const { container } = render(<MeetingTypeBadge type={null} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when type is undefined', () => {
    const { container } = render(<MeetingTypeBadge />)
    expect(container.innerHTML).toBe('')
  })
})
