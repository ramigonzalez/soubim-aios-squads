import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemReviewPanel } from '../../components/organisms/ItemReviewPanel'
import { ProjectItemRow } from '../../components/molecules/ProjectItemRow'
import { SourceGroupAccordion } from '../../components/molecules/SourceGroupAccordion'
import type { ProjectItem } from '../../types/projectItem'

const review = vi.fn()
const edit = vi.fn()
const restore = vi.fn()
const bulk = vi.fn()

vi.mock('../../hooks/useItemReview', () => ({
  useReviewItem: () => ({ mutate: review, isLoading: false, isError: false }),
  useEditReviewedItem: () => ({ mutate: edit, isLoading: false, isError: false }),
  useRestoreOriginal: () => ({ mutate: restore, isLoading: false, isError: false }),
  useBulkReview: () => ({ mutate: bulk, isLoading: false, isError: false }),
}))

vi.mock('../../hooks/useProjectItemMutation', () => ({
  useToggleDone: () => ({ mutate: vi.fn(), isLoading: false }),
  useToggleMilestone: () => ({ mutate: vi.fn(), isLoading: false }),
}))

function makeItem(overrides: Partial<ProjectItem> = {}): ProjectItem {
  return {
    id: 'item-1',
    project_id: 'proj-1',
    statement: 'Use steel',
    why: 'Faster',
    who: 'Ana',
    item_type: 'decision',
    source_type: 'meeting',
    affected_disciplines: ['architecture'],
    is_milestone: false,
    is_done: false,
    created_at: '2026-02-08T10:00:00Z',
    review_status: 'pending',
    ...overrides,
  }
}

describe('Item review (Story 12.6)', () => {
  beforeEach(() => {
    review.mockReset()
    edit.mockReset()
    restore.mockReset()
    bulk.mockReset()
  })

  describe('badges on the item row', () => {
    it('shows "Pending" for a pending item', () => {
      render(<ProjectItemRow item={makeItem()} onClick={vi.fn()} />)
      expect(screen.getByTestId('review-status-badge')).toHaveTextContent('Pending')
    })

    it('shows "Rejected" and "Edited"', () => {
      render(<ProjectItemRow item={makeItem({ review_status: 'rejected', is_edited: true })} onClick={vi.fn()} />)
      expect(screen.getByTestId('review-status-badge')).toHaveTextContent('Rejected')
      expect(screen.getByTestId('edited-badge')).toBeInTheDocument()
    })

    it('shows nothing for an approved item that was never edited', () => {
      render(<ProjectItemRow item={makeItem({ review_status: 'approved' })} onClick={vi.fn()} />)
      expect(screen.queryByTestId('review-status-badge')).not.toBeInTheDocument()
      expect(screen.queryByTestId('edited-badge')).not.toBeInTheDocument()
    })
  })

  describe('ItemReviewPanel', () => {
    it('a reviewer approves, rejects', async () => {
      render(<ItemReviewPanel item={makeItem()} canReview />)
      await userEvent.click(screen.getByRole('button', { name: 'Approve' }))
      expect(review).toHaveBeenCalledWith({ itemId: 'item-1', status: 'approved' })
      await userEvent.click(screen.getByRole('button', { name: 'Reject' }))
      expect(review).toHaveBeenCalledWith({ itemId: 'item-1', status: 'rejected' })
    })

    it('a reviewer edits the item', async () => {
      render(<ItemReviewPanel item={makeItem({ title: 'T' })} canReview />)
      await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
      const statement = screen.getByLabelText('Statement')
      await userEvent.clear(statement)
      await userEvent.type(statement, 'Use concrete')
      await userEvent.click(screen.getByRole('button', { name: 'Save and approve' }))
      expect(edit).toHaveBeenCalledTimes(1)
      expect(edit.mock.calls[0][0]).toMatchObject({
        itemId: 'item-1',
        edits: { statement: 'Use concrete', title: 'T', why: 'Faster', owner: null, due_date: null },
      })
    })

    it('shows the AI original and restores it', async () => {
      const item = makeItem({
        review_status: 'approved',
        is_edited: true,
        statement: 'Use concrete',
        original: { statement: 'Use steel', why: 'Faster' },
      })
      render(<ItemReviewPanel item={item} canReview />)
      expect(screen.queryByTestId('item-original')).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Show AI original' }))
      expect(screen.getByTestId('item-original')).toHaveTextContent('Use steel')
      await userEvent.click(screen.getByRole('button', { name: /Restore original/ }))
      expect(restore).toHaveBeenCalledWith({ itemId: 'item-1' })
    })

    it('without review rights it only offers reading the original', async () => {
      const item = makeItem({ review_status: 'approved', is_edited: true, original: { statement: 'Use steel' } })
      render(<ItemReviewPanel item={item} canReview={false} />)
      expect(screen.queryByRole('button', { name: 'Approve' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Restore original/ })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Show AI original' })).toBeInTheDocument()
    })

    it('renders nothing for a non-reviewer when there is no original', () => {
      const { container } = render(<ItemReviewPanel item={makeItem()} canReview={false} />)
      expect(container).toBeEmptyDOMElement()
    })
  })

  describe('approve pending of a meeting', () => {
    const source = { id: 'src-1', title: 'Weekly', type: 'meeting' as const }
    const items = [makeItem({ id: 'a' }), makeItem({ id: 'b' }), makeItem({ id: 'c', review_status: 'approved' })]

    it('a reviewer approves the pending items of the meeting', async () => {
      render(<SourceGroupAccordion source={source} items={items} onItemClick={vi.fn()} canReview />)
      await userEvent.click(screen.getByRole('button', { name: /Approve the 2 pending items of Weekly/ }))
      expect(bulk).toHaveBeenCalledWith({ sourceId: 'src-1', status: 'approved' })
    })

    it('is hidden for non-reviewers and when nothing is pending', () => {
      const { rerender } = render(<SourceGroupAccordion source={source} items={items} onItemClick={vi.fn()} />)
      expect(screen.queryByRole('button', { name: /pending items of Weekly/ })).not.toBeInTheDocument()
      rerender(<SourceGroupAccordion source={source} items={[items[2]]} onItemClick={vi.fn()} canReview />)
      expect(screen.queryByRole('button', { name: /pending items of Weekly/ })).not.toBeInTheDocument()
    })
  })
})
