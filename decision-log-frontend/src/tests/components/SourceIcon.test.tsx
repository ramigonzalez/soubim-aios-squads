import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SourceIcon } from '../../components/atoms/SourceIcon'
import type { SourceType } from '../../types/projectItem'

const ALL_SOURCES: SourceType[] = ['meeting', 'email', 'document', 'manual_input']

describe('SourceIcon', () => {
  it.each(ALL_SOURCES)('renders icon for source type: %s', (type) => {
    const { container } = render(<SourceIcon type={type} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('shows label when showLabel is true', () => {
    render(<SourceIcon type="meeting" showLabel />)
    expect(screen.getByText('Meeting')).toBeInTheDocument()
  })

  it('renders sm size by default', () => {
    const { container } = render(<SourceIcon type="email" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveClass('w-3.5', 'h-3.5')
  })

  it('renders md size when specified', () => {
    const { container } = render(<SourceIcon type="email" size="md" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveClass('w-4', 'h-4')
  })

  it('has title attribute', () => {
    render(<SourceIcon type="document" />)
    expect(screen.getByTitle('Document')).toBeInTheDocument()
  })
})
