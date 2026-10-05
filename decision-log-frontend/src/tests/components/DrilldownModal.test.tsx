import { describe, it, expect, vi, afterEach } from 'vitest'
import { render as rtlRender, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { DrilldownModal } from '../../components/organisms/DrilldownModal'
import type { ProjectItem } from '../../types/projectItem'
import i18n from '../../i18n'

// The modal's done-checkbox uses a React Query mutation; rendering doesn't need a real client.
vi.mock('../../hooks/useProjectItemMutation', () => ({
  useToggleDone: () => ({ mutate: vi.fn(), isLoading: false }),
}))

// Meeting viewer links (Story 7.13) need a router around the component
const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: MemoryRouter })

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

describe('DrilldownModal — title, description and transcript excerpt (Story 7.12)', () => {
  it('shows the short title in the header and the full statement as description', () => {
    render(<DrilldownModal decision={makeItem({ title: 'Paginação por ambiente' })} onClose={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Paginação por ambiente')
    expect(screen.getByText('Description')).toBeInTheDocument()
    expect(screen.getByText('Paginação de pisos por ambiente')).toBeInTheDocument()
  })

  it('falls back to the statement as header without a description card', () => {
    render(<DrilldownModal decision={makeItem()} onClose={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Paginação de pisos por ambiente')
    expect(screen.queryByText('Description')).not.toBeInTheDocument()
  })

  it('renders each excerpt turn with time and speaker in the Transcript tab', async () => {
    const excerpt = '33:40 - Debora Rezende Gagliotti: Nos ambientes integrados é contínuo.\n1:02:10 - ⚠️ Camila / Erica [mixed voices]: Com soleira.'
    render(<DrilldownModal decision={makeItem({ source_excerpt: excerpt })} onClose={vi.fn()} />)
    await userEvent.setup().click(screen.getByText('Transcript'))

    expect(screen.getByText('33:40')).toBeInTheDocument()
    // name appears twice: the modal's "who" line and the excerpt turn
    expect(screen.getAllByText('Debora Rezende Gagliotti')).toHaveLength(2)
    expect(screen.getByText('Nos ambientes integrados é contínuo.')).toBeInTheDocument()
    expect(screen.getByText('1:02:10')).toBeInTheDocument()
    expect(screen.getByText('⚠️ Camila / Erica [mixed voices]')).toBeInTheDocument()
  })

  it('says so when the item has no excerpt', async () => {
    render(<DrilldownModal decision={makeItem()} onClose={vi.fn()} />)
    await userEvent.setup().click(screen.getByText('Transcript'))
    expect(screen.getByText('No transcript excerpt for this item.')).toBeInTheDocument()
  })
})

describe('DrilldownModal — meeting viewer links (Story 7.13)', () => {
  const source = { id: 'src-1', title: 'D/SEASON Quinzenal', type: 'meeting' as const, occurred_at: '2026-09-04T00:00:00' }

  it('links the recording timestamp to the meeting viewer at that second', () => {
    render(<DrilldownModal decision={makeItem({ source })} onClose={vi.fn()} />)
    expect(screen.getByRole('link', { name: /00:33:40\s*in recording/ })).toHaveAttribute('href', '/meetings/src-1?t=2020')
  })

  it('offers "Open in meeting" in the Transcript tab', async () => {
    render(<DrilldownModal decision={makeItem({ source })} onClose={vi.fn()} />)
    await userEvent.setup().click(screen.getByText('Transcript'))
    expect(screen.getByRole('link', { name: 'Open in meeting' })).toHaveAttribute('href', '/meetings/src-1?t=2020')
  })

  it('shows the timestamp as plain text for items without a V2 source', () => {
    render(<DrilldownModal decision={makeItem()} onClose={vi.fn()} />)
    expect(screen.getByText('00:33:40')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /in recording/ })).not.toBeInTheDocument()
  })
})

describe('DrilldownModal — Portuguese (Story 11.1)', () => {
  afterEach(() => i18n.changeLanguage('en'))

  it('renders labels, consensus disciplines and stance in Portuguese', async () => {
    await i18n.changeLanguage('pt-BR')
    const item = makeItem({
      why: 'Evitar recortes na porta',
      consensus: { client: { status: 'AGREE', notes: null }, architecture: { status: 'AGREE', notes: null } },
      source: { id: 'src-1', title: 'Quinzenal', type: 'meeting', occurred_at: '2026-09-04T00:00:00' },
    })
    render(<DrilldownModal decision={item} onClose={vi.fn()} />)

    expect(screen.getByText('Justificativa')).toBeInTheDocument()
    expect(screen.getByText('Visão geral')).toBeInTheDocument()
    expect(screen.getByText('4 de set. de 2026')).toBeInTheDocument()
    expect(screen.getAllByText('Cliente').length).toBeGreaterThan(0)
    expect(screen.queryByText('Client')).not.toBeInTheDocument()
    expect(screen.getAllByText('Concorda').length).toBe(2)
  })
})
