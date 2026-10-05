import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DrilldownModal } from '../../components/organisms/DrilldownModal'
import type { ProjectItem } from '../../types/projectItem'

// The modal's done-checkbox uses a React Query mutation; rendering doesn't need a real client.
vi.mock('../../hooks/useProjectItemMutation', () => ({
  useToggleDone: () => ({ mutate: vi.fn(), isLoading: false }),
}))

function makeItem(overrides: Partial<ProjectItem> = {}): ProjectItem {
  return {
    id: 'item-1',
    project_id: 'proj-1',
    statement: 'Paginação de pisos por ambiente',
    who: 'Debora Rezende Gagliotti',
    item_type: 'decision',
    source_type: 'meeting',
    affected_disciplines: ['architecture'],
    is_milestone: false,
    is_done: false,
    timestamp: '00:33:40',
    created_at: '2026-10-04T14:55:00Z',
    ...overrides,
  }
}

describe('DrilldownModal — meeting date and title', () => {
  it('shows the meeting date and title of the V2 source, not the import time', () => {
    const item = makeItem({
      source: { id: 'src-1', title: 'D/SEASON Quinzenal', type: 'meeting', occurred_at: '2026-09-04T00:00:00' },
    })
    render(<DrilldownModal decision={item} onClose={vi.fn()} />)

    expect(screen.getByText('D/SEASON Quinzenal')).toBeInTheDocument()
    expect(screen.getByText('Sep 4, 2026')).toBeInTheDocument()
    expect(screen.queryByText(/Oct 4, 2026/)).not.toBeInTheDocument()
  })

  it('prefers the legacy transcript meeting date when present', () => {
    render(<DrilldownModal decision={makeItem({ meeting_date: '2026-02-08T10:00:00Z' })} onClose={vi.fn()} />)
    expect(screen.getByText('Feb 8, 2026')).toBeInTheDocument()
  })

  it('falls back to creation date and time for items without a meeting', () => {
    render(<DrilldownModal decision={makeItem({ source_type: 'manual_input' })} onClose={vi.fn()} />)
    expect(screen.getByText(/Oct 4, 2026/)).toBeInTheDocument()
  })
})
