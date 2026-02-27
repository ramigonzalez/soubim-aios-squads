import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SourceGroupAccordion } from '../../components/molecules/SourceGroupAccordion'
import type { ProjectItem, SourceType } from '../../types/projectItem'

function makeItem(overrides: Partial<ProjectItem> = {}): ProjectItem {
  return {
    id: `item-${Math.random().toString(36).slice(2, 8)}`,
    project_id: 'proj-1',
    statement: 'Test item statement',
    who: 'Carlos',
    item_type: 'decision',
    source_type: 'meeting',
    affected_disciplines: ['architecture'],
    is_milestone: false,
    is_done: false,
    transcript_id: 'tr-001',
    meeting_title: 'Design Review',
    created_at: '2026-02-08T10:00:00Z',
    ...overrides,
  }
}

function makeSource(type: SourceType = 'meeting') {
  return {
    id: 'src-001',
    title: 'Design Coordination Meeting',
    type,
  }
}

describe('SourceGroupAccordion', () => {
  const mockOnItemClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders source icon and title', () => {
    render(
      <SourceGroupAccordion
        source={makeSource()}
        items={[makeItem()]}
        onItemClick={mockOnItemClick}
      />
    )
    expect(screen.getByText('Design Coordination Meeting')).toBeInTheDocument()
    // SourceIcon renders with title for the source type
    expect(screen.getByTitle('Meeting')).toBeInTheDocument()
  })

  it('shows item count', () => {
    const items = [makeItem({ id: 'a' }), makeItem({ id: 'b' }), makeItem({ id: 'c' })]
    render(
      <SourceGroupAccordion
        source={makeSource()}
        items={items}
        onItemClick={mockOnItemClick}
      />
    )
    expect(screen.getByText('3 items')).toBeInTheDocument()
  })

  it('shows singular "1 item" for single item', () => {
    render(
      <SourceGroupAccordion
        source={makeSource()}
        items={[makeItem()]}
        onItemClick={mockOnItemClick}
      />
    )
    expect(screen.getByText('1 item')).toBeInTheDocument()
  })

  it('is expanded by default when items count is <= 5', () => {
    const items = Array.from({ length: 3 }, (_, i) =>
      makeItem({ id: `item-${i}`, statement: `Statement ${i}` })
    )
    render(
      <SourceGroupAccordion
        source={makeSource()}
        items={items}
        onItemClick={mockOnItemClick}
      />
    )
    // Items should be visible
    expect(screen.getByText('Statement 0')).toBeInTheDocument()
    expect(screen.getByText('Statement 1')).toBeInTheDocument()
    expect(screen.getByText('Statement 2')).toBeInTheDocument()
  })

  it('is collapsed by default when items count is > 5', () => {
    const items = Array.from({ length: 7 }, (_, i) =>
      makeItem({ id: `item-${i}`, statement: `Statement ${i}` })
    )
    render(
      <SourceGroupAccordion
        source={makeSource()}
        items={items}
        onItemClick={mockOnItemClick}
      />
    )
    // Items should not be visible
    expect(screen.queryByText('Statement 0')).not.toBeInTheDocument()
  })

  it('toggles expand/collapse on header click', async () => {
    const user = userEvent.setup()
    const items = Array.from({ length: 7 }, (_, i) =>
      makeItem({ id: `item-${i}`, statement: `Item ${i}` })
    )
    render(
      <SourceGroupAccordion
        source={makeSource()}
        items={items}
        onItemClick={mockOnItemClick}
      />
    )

    // Initially collapsed
    expect(screen.queryByText('Item 0')).not.toBeInTheDocument()

    // Click to expand
    const header = screen.getByRole('button', { name: /Source: Design Coordination Meeting/ })
    await user.click(header)
    expect(screen.getByText('Item 0')).toBeInTheDocument()

    // Click to collapse
    await user.click(header)
    expect(screen.queryByText('Item 0')).not.toBeInTheDocument()
  })

  it('toggles on Enter key', async () => {
    const user = userEvent.setup()
    const items = Array.from({ length: 7 }, (_, i) =>
      makeItem({ id: `item-${i}`, statement: `Item ${i}` })
    )
    render(
      <SourceGroupAccordion
        source={makeSource()}
        items={items}
        onItemClick={mockOnItemClick}
      />
    )

    const header = screen.getByRole('button', { name: /Source: Design Coordination Meeting/ })
    header.focus()
    await user.keyboard('{Enter}')
    expect(screen.getByText('Item 0')).toBeInTheDocument()
  })

  it('toggles on Space key', async () => {
    const user = userEvent.setup()
    const items = Array.from({ length: 7 }, (_, i) =>
      makeItem({ id: `item-${i}`, statement: `Item ${i}` })
    )
    render(
      <SourceGroupAccordion
        source={makeSource()}
        items={items}
        onItemClick={mockOnItemClick}
      />
    )

    const header = screen.getByRole('button', { name: /Source: Design Coordination Meeting/ })
    header.focus()
    await user.keyboard(' ')
    expect(screen.getByText('Item 0')).toBeInTheDocument()
  })

  it('has correct left border color for meeting source', () => {
    const { container } = render(
      <SourceGroupAccordion
        source={makeSource('meeting')}
        items={[makeItem()]}
        onItemClick={mockOnItemClick}
      />
    )
    const region = container.querySelector('[role="region"]')
    expect(region?.className).toContain('border-l-indigo-400')
  })

  it('has correct left border color for email source', () => {
    const { container } = render(
      <SourceGroupAccordion
        source={makeSource('email')}
        items={[makeItem({ source_type: 'email' })]}
        onItemClick={mockOnItemClick}
      />
    )
    const region = container.querySelector('[role="region"]')
    expect(region?.className).toContain('border-l-sky-400')
  })

  it('has correct left border color for document source', () => {
    const { container } = render(
      <SourceGroupAccordion
        source={makeSource('document')}
        items={[makeItem({ source_type: 'document' })]}
        onItemClick={mockOnItemClick}
      />
    )
    const region = container.querySelector('[role="region"]')
    expect(region?.className).toContain('border-l-orange-400')
  })

  it('has ARIA attributes for accordion', () => {
    render(
      <SourceGroupAccordion
        source={makeSource()}
        items={[makeItem()]}
        onItemClick={mockOnItemClick}
      />
    )
    const header = screen.getByRole('button', { name: /Source: Design Coordination Meeting/ })
    expect(header).toHaveAttribute('aria-expanded', 'true')
    expect(header).toHaveAttribute('aria-controls', 'source-src-001-items')
  })

  it('has region role with accessible label', () => {
    render(
      <SourceGroupAccordion
        source={makeSource()}
        items={[makeItem(), makeItem({ id: 'item-2' })]}
        onItemClick={mockOnItemClick}
      />
    )
    expect(screen.getByRole('region', { name: /Design Coordination Meeting, 2 items/ })).toBeInTheDocument()
  })
})
