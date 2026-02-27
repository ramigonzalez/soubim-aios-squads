import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ItemTypeBadge } from '../../components/atoms/ItemTypeBadge'
import type { ItemType } from '../../types/projectItem'

const ALL_TYPES: ItemType[] = ['decision', 'topic', 'action_item', 'idea', 'information']

describe('ItemTypeBadge', () => {
  it.each(ALL_TYPES)('renders badge for type: %s', (type) => {
    const { container } = render(<ItemTypeBadge type={type} showLabel />)
    // Each type renders an icon and has a title
    expect(container.querySelector('svg')).toBeInTheDocument()
    expect(container.querySelector('[title]')).toBeInTheDocument()
  })

  it('shows label when showLabel is true', () => {
    render(<ItemTypeBadge type="decision" showLabel />)
    expect(screen.getByText('Decision')).toBeInTheDocument()
  })

  it('hides label by default', () => {
    render(<ItemTypeBadge type="decision" />)
    expect(screen.queryByText('Decision')).not.toBeInTheDocument()
  })

  it('has title attribute for accessibility', () => {
    render(<ItemTypeBadge type="action_item" />)
    expect(screen.getByTitle('Action Item')).toBeInTheDocument()
  })

  it('renders icon as aria-hidden', () => {
    const { container } = render(<ItemTypeBadge type="idea" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('applies custom className', () => {
    const { container } = render(<ItemTypeBadge type="topic" className="mt-2" />)
    expect(container.firstChild).toHaveClass('mt-2')
  })
})
