import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterBar } from '../../components/organisms/FilterBar'
import { useFilterStore } from '../../store/filterStore'
import type { ProjectItem } from '../../types/projectItem'

// Mock the filter store
vi.mock('../../store/filterStore', () => ({
  useFilterStore: vi.fn(),
}))

// Mock react-datepicker
vi.mock('react-datepicker', () => ({
  __esModule: true,
  default: () => <input data-testid="mock-datepicker" />,
}))

// Mock useDebounce to return value immediately
vi.mock('../../hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}))

function makeItem(overrides: Partial<ProjectItem> = {}): ProjectItem {
  return {
    id: `item-${Math.random().toString(36).slice(2, 8)}`,
    project_id: 'proj-1',
    statement: 'Test statement',
    who: 'Alice',
    item_type: 'decision',
    source_type: 'meeting',
    affected_disciplines: ['architecture'],
    is_milestone: false,
    is_done: false,
    created_at: '2026-02-20T10:00:00Z',
    ...overrides,
  }
}

const mockToggleSourceType = vi.fn()
const mockToggleItemType = vi.fn()
const mockReset = vi.fn()

function setupMockStore(overrides: Record<string, unknown> = {}) {
  const store = {
    disciplines: [],
    decisionMakers: [],
    meetingTypes: [],
    dateFrom: null,
    dateTo: null,
    searchQuery: '',
    sourceTypes: [],
    itemTypes: [],
    toggleDiscipline: vi.fn(),
    toggleDecisionMaker: vi.fn(),
    toggleMeetingType: vi.fn(),
    toggleSourceType: mockToggleSourceType,
    toggleItemType: mockToggleItemType,
    clearDisciplines: vi.fn(),
    clearDecisionMakers: vi.fn(),
    clearMeetingTypes: vi.fn(),
    clearSourceTypes: vi.fn(),
    clearItemTypes: vi.fn(),
    setDateRange: vi.fn(),
    setSearchQuery: vi.fn(),
    reset: mockReset,
    ...overrides,
  }
  vi.mocked(useFilterStore).mockReturnValue(store as ReturnType<typeof useFilterStore>)
  return store
}

describe('FilterBar Source/Type Chips (Story 9.4)', () => {
  const decisions: ProjectItem[] = [
    makeItem({ id: '1', source_type: 'meeting', item_type: 'decision' }),
    makeItem({ id: '2', source_type: 'meeting', item_type: 'topic' }),
    makeItem({ id: '3', source_type: 'email', item_type: 'decision' }),
    makeItem({ id: '4', source_type: 'email', item_type: 'action_item' }),
    makeItem({ id: '5', source_type: 'document', item_type: 'idea' }),
    makeItem({ id: '6', source_type: 'manual_input', item_type: 'information' }),
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    setupMockStore()
  })

  describe('Source type chips', () => {
    it('renders all 4 source type chip buttons', () => {
      render(<FilterBar decisions={decisions} groupBy="date" onGroupByChange={vi.fn()} />)
      expect(screen.getByRole('button', { name: /Filter by Meeting source/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Filter by Email source/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Filter by Document source/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Filter by Manual source/ })).toBeInTheDocument()
    })

    it('shows correct counts per source type', () => {
      render(<FilterBar decisions={decisions} groupBy="date" onGroupByChange={vi.fn()} />)
      const sourceGroup = screen.getByRole('group', { name: /Source type filters/ })
      // Meeting: 2, Email: 2, Document: 1, Manual: 1
      const buttons = within(sourceGroup).getAllByRole('button')
      expect(buttons[0]).toHaveTextContent('Meeting')
      expect(buttons[0]).toHaveTextContent('2')
      expect(buttons[1]).toHaveTextContent('Email')
      expect(buttons[1]).toHaveTextContent('2')
      expect(buttons[2]).toHaveTextContent('Document')
      expect(buttons[2]).toHaveTextContent('1')
      expect(buttons[3]).toHaveTextContent('Manual')
      expect(buttons[3]).toHaveTextContent('1')
    })

    it('calls toggleSourceType when a source chip is clicked', async () => {
      const user = userEvent.setup()
      render(<FilterBar decisions={decisions} groupBy="date" onGroupByChange={vi.fn()} />)
      await user.click(screen.getByRole('button', { name: /Filter by Meeting source/ }))
      expect(mockToggleSourceType).toHaveBeenCalledWith('meeting')
    })

    it('shows active styling when source type is selected', () => {
      setupMockStore({ sourceTypes: ['meeting'] })
      render(<FilterBar decisions={decisions} groupBy="date" onGroupByChange={vi.fn()} />)
      const meetingBtn = screen.getByRole('button', { name: /Filter by Meeting source/ })
      expect(meetingBtn.className).toContain('bg-indigo-100')
      expect(meetingBtn.className).toContain('text-indigo-700')
    })

    it('shows inactive styling when source type is not selected', () => {
      render(<FilterBar decisions={decisions} groupBy="date" onGroupByChange={vi.fn()} />)
      const meetingBtn = screen.getByRole('button', { name: /Filter by Meeting source/ })
      expect(meetingBtn.className).toContain('bg-gray-100')
      expect(meetingBtn.className).toContain('text-gray-600')
    })

    it('has aria-pressed attribute reflecting active state', () => {
      setupMockStore({ sourceTypes: ['email'] })
      render(<FilterBar decisions={decisions} groupBy="date" onGroupByChange={vi.fn()} />)
      expect(screen.getByRole('button', { name: /Filter by Email source/ })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: /Filter by Meeting source/ })).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('Item type chips', () => {
    it('renders all 5 item type chip buttons', () => {
      render(<FilterBar decisions={decisions} groupBy="date" onGroupByChange={vi.fn()} />)
      expect(screen.getByRole('button', { name: /Filter by Decision type/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Filter by Topic type/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Filter by Action type/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Filter by Idea type/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Filter by Info type/ })).toBeInTheDocument()
    })

    it('shows correct counts per item type', () => {
      render(<FilterBar decisions={decisions} groupBy="date" onGroupByChange={vi.fn()} />)
      const typeGroup = screen.getByRole('group', { name: /Item type filters/ })
      const buttons = within(typeGroup).getAllByRole('button')
      // decision: 2, topic: 1, action_item: 1, idea: 1, information: 1
      expect(buttons[0]).toHaveTextContent('Decision')
      expect(buttons[0]).toHaveTextContent('2')
      expect(buttons[1]).toHaveTextContent('Topic')
      expect(buttons[1]).toHaveTextContent('1')
      expect(buttons[2]).toHaveTextContent('Action')
      expect(buttons[2]).toHaveTextContent('1')
      expect(buttons[3]).toHaveTextContent('Idea')
      expect(buttons[3]).toHaveTextContent('1')
      expect(buttons[4]).toHaveTextContent('Info')
      expect(buttons[4]).toHaveTextContent('1')
    })

    it('calls toggleItemType when an item type chip is clicked', async () => {
      const user = userEvent.setup()
      render(<FilterBar decisions={decisions} groupBy="date" onGroupByChange={vi.fn()} />)
      await user.click(screen.getByRole('button', { name: /Filter by Decision type/ }))
      expect(mockToggleItemType).toHaveBeenCalledWith('decision')
    })

    it('shows active styling when item type is selected', () => {
      setupMockStore({ itemTypes: ['decision'] })
      render(<FilterBar decisions={decisions} groupBy="date" onGroupByChange={vi.fn()} />)
      const decisionBtn = screen.getByRole('button', { name: /Filter by Decision type/ })
      expect(decisionBtn.className).toContain('bg-green-100')
      expect(decisionBtn.className).toContain('text-green-700')
    })
  })

  describe('Active filter count and Clear All', () => {
    it('includes source and item types in active filter count', () => {
      setupMockStore({ sourceTypes: ['meeting', 'email'], itemTypes: ['decision'] })
      render(<FilterBar decisions={decisions} groupBy="date" onGroupByChange={vi.fn()} />)
      // 2 sourceTypes + 1 itemType = 3 active
      expect(screen.getByRole('button', { name: /Clear all filters/ })).toHaveTextContent('Clear (3)')
    })

    it('reset clears all filter dimensions including source/item types', async () => {
      const user = userEvent.setup()
      setupMockStore({ sourceTypes: ['meeting'], itemTypes: ['decision'] })
      render(<FilterBar decisions={decisions} groupBy="date" onGroupByChange={vi.fn()} />)
      await user.click(screen.getByRole('button', { name: /Clear all filters/ }))
      expect(mockReset).toHaveBeenCalled()
    })
  })

  describe('Active chips for source and item types', () => {
    it('renders source type removable chips in active chips area', () => {
      setupMockStore({ sourceTypes: ['meeting'] })
      render(<FilterBar decisions={decisions} groupBy="date" onGroupByChange={vi.fn()} />)
      expect(screen.getByRole('button', { name: /Remove Meeting source filter/ })).toBeInTheDocument()
    })

    it('renders item type removable chips in active chips area', () => {
      setupMockStore({ itemTypes: ['idea'] })
      render(<FilterBar decisions={decisions} groupBy="date" onGroupByChange={vi.fn()} />)
      expect(screen.getByRole('button', { name: /Remove Idea type filter/ })).toBeInTheDocument()
    })

    it('calls toggleSourceType when removing a source chip', async () => {
      const user = userEvent.setup()
      setupMockStore({ sourceTypes: ['email'] })
      render(<FilterBar decisions={decisions} groupBy="date" onGroupByChange={vi.fn()} />)
      await user.click(screen.getByRole('button', { name: /Remove Email source filter/ }))
      expect(mockToggleSourceType).toHaveBeenCalledWith('email')
    })

    it('calls toggleItemType when removing an item type chip', async () => {
      const user = userEvent.setup()
      setupMockStore({ itemTypes: ['topic'] })
      render(<FilterBar decisions={decisions} groupBy="date" onGroupByChange={vi.fn()} />)
      await user.click(screen.getByRole('button', { name: /Remove Topic type filter/ }))
      expect(mockToggleItemType).toHaveBeenCalledWith('topic')
    })
  })

  describe('Zero count display', () => {
    it('shows 0 count for source types with no items', () => {
      const onlyMeetings = [makeItem({ source_type: 'meeting' })]
      render(<FilterBar decisions={onlyMeetings} groupBy="date" onGroupByChange={vi.fn()} />)
      const sourceGroup = screen.getByRole('group', { name: /Source type filters/ })
      const emailBtn = within(sourceGroup).getByRole('button', { name: /Filter by Email source/ })
      expect(emailBtn).toHaveTextContent('0')
    })
  })
})
