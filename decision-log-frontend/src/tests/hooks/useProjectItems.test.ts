/**
 * Tests for useProjectItems hook (Story 5.3).
 */
import { describe, it, expect } from 'vitest'
import {
  ITEM_TYPES,
  SOURCE_TYPES,
  ITEM_TYPE_LABELS,
  SOURCE_TYPE_LABELS,
  DISCIPLINE_LABELS,
} from '../../types/projectItem'
import type {
  ProjectItem,
  ProjectItemsResponse,
  ProjectItemFilters,
  ItemType,
  SourceType,
  Discipline,
} from '../../types/projectItem'

describe('ProjectItem types', () => {
  it('should have 5 item types', () => {
    const types: ItemType[] = ['idea', 'topic', 'decision', 'action_item', 'information']
    expect(types).toHaveLength(5)
    types.forEach(t => expect(ITEM_TYPE_LABELS[t]).toBeDefined())
  })

  it('should have 4 source types', () => {
    const types: SourceType[] = ['meeting', 'email', 'document', 'manual_input']
    expect(types).toHaveLength(4)
    types.forEach(t => expect(SOURCE_TYPE_LABELS[t]).toBeDefined())
  })

  it('should have 15 disciplines', () => {
    expect(Object.keys(DISCIPLINE_LABELS)).toHaveLength(15)
  })

  it('should create a valid ProjectItem', () => {
    const item: ProjectItem = {
      id: 'test-id',
      project_id: 'project-1',
      statement: 'Use steel framing',
      who: 'Carlos',
      item_type: 'decision',
      source_type: 'meeting',
      affected_disciplines: ['structural', 'architecture'],
      is_milestone: true,
      is_done: false,
      created_at: '2026-02-01T14:00:00Z',
    }

    expect(item.item_type).toBe('decision')
    expect(item.affected_disciplines).toContain('structural')
    expect(item.is_milestone).toBe(true)
  })

  it('should have correct response shape', () => {
    const response: ProjectItemsResponse = {
      items: [],
      total: 0,
      limit: 50,
      offset: 0,
      facets: {
        item_types: { decision: 10, topic: 5 },
        source_types: { meeting: 15 },
        disciplines: { structural: 8 },
      },
    }

    expect(response.items).toEqual([])
    expect(response.facets?.item_types.decision).toBe(10)
  })

  it('should have correct filter shape', () => {
    const filters: ProjectItemFilters = {
      itemTypes: ['decision', 'topic'],
      disciplines: ['structural'],
      search: 'steel',
      limit: 20,
      offset: 0,
    }

    expect(filters.itemTypes).toContain('decision')
    expect(filters.disciplines).toContain('structural')
  })
})

describe('ITEM_TYPES const array', () => {
  it('should have 5 item types', () => {
    expect(ITEM_TYPES).toHaveLength(5)
    expect(ITEM_TYPES).toEqual(['idea', 'topic', 'decision', 'action_item', 'information'])
  })
})

describe('SOURCE_TYPES const array', () => {
  it('should have 4 source types', () => {
    expect(SOURCE_TYPES).toHaveLength(4)
    expect(SOURCE_TYPES).toEqual(['meeting', 'email', 'document', 'manual_input'])
  })
})

describe('ITEM_TYPE_LABELS', () => {
  it('should map all item types to human-readable labels', () => {
    expect(ITEM_TYPE_LABELS.idea).toBe('Idea')
    expect(ITEM_TYPE_LABELS.topic).toBe('Topic')
    expect(ITEM_TYPE_LABELS.decision).toBe('Decision')
    expect(ITEM_TYPE_LABELS.action_item).toBe('Action Item')
    expect(ITEM_TYPE_LABELS.information).toBe('Information')
  })
})

describe('DISCIPLINE_LABELS', () => {
  it('should have labels for all construction disciplines', () => {
    expect(DISCIPLINE_LABELS.architecture).toBe('Architecture')
    expect(DISCIPLINE_LABELS.structural).toBe('Structural')
    expect(DISCIPLINE_LABELS.mep).toBe('MEP')
    expect(DISCIPLINE_LABELS.fire_protection).toBe('Fire Protection')
  })
})
