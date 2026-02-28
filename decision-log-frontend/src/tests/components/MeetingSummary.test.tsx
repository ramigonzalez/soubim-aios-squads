import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MeetingSummary } from '../../components/molecules/MeetingSummary'

describe('MeetingSummary', () => {
  const summaryText = 'The team discussed foundation specifications and agreed to proceed with option B.'

  it('renders summary text when expanded', () => {
    render(<MeetingSummary summary={summaryText} isExpanded={true} />)
    expect(screen.getByText(summaryText)).toBeInTheDocument()
  })

  it('returns null when collapsed', () => {
    const { container } = render(<MeetingSummary summary={summaryText} isExpanded={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders text with italic styling', () => {
    render(<MeetingSummary summary={summaryText} isExpanded={true} />)
    const paragraph = screen.getByText(summaryText)
    expect(paragraph.tagName).toBe('P')
    expect(paragraph.className).toContain('italic')
  })

  it('has blue-50/50 background styling', () => {
    render(<MeetingSummary summary={summaryText} isExpanded={true} />)
    const container = screen.getByText(summaryText).parentElement
    expect(container?.className).toContain('bg-blue-50/50')
  })

  it('has border-b border-blue-100 styling', () => {
    render(<MeetingSummary summary={summaryText} isExpanded={true} />)
    const container = screen.getByText(summaryText).parentElement
    expect(container?.className).toContain('border-b')
    expect(container?.className).toContain('border-blue-100')
  })

  it('has text-sm text-gray-700 styling on text', () => {
    render(<MeetingSummary summary={summaryText} isExpanded={true} />)
    const paragraph = screen.getByText(summaryText)
    expect(paragraph.className).toContain('text-sm')
    expect(paragraph.className).toContain('text-gray-700')
  })

  it('has transition-all duration-200 on container', () => {
    render(<MeetingSummary summary={summaryText} isExpanded={true} />)
    const container = screen.getByText(summaryText).parentElement
    expect(container?.className).toContain('transition-all')
    expect(container?.className).toContain('duration-200')
  })
})
