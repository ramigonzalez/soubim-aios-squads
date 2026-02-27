/**
 * Tests for useMilestones hook types (Story 5.3).
 */
import { describe, it, expect } from 'vitest'
import type { ProjectItem, ProjectItemsResponse } from '../../types/projectItem'

describe('Milestone types', () => {
  it('should create a milestone item', () => {
    const milestone: ProjectItem = {
      id: 'milestone-1',
      project_id: 'project-1',
      statement: 'Changed from concrete to steel structure',
      who: 'Carlos',
      item_type: 'decision',
      source_type: 'meeting',
      affected_disciplines: ['structural', 'architecture'],
      is_milestone: true,
      is_done: false,
      confidence: 0.92,
      created_at: '2026-02-01T14:00:00Z',
    }

    expect(milestone.is_milestone).toBe(true)
    expect(milestone.item_type).toBe('decision')
  })

  it('should distinguish milestone from non-milestone', () => {
    const items: ProjectItem[] = [
      {
        id: '1',
        project_id: 'p1',
        statement: 'Milestone decision',
        who: 'A',
        item_type: 'decision',
        source_type: 'meeting',
        affected_disciplines: ['structural'],
        is_milestone: true,
        is_done: false,
        created_at: '2026-01-01',
      },
      {
        id: '2',
        project_id: 'p1',
        statement: 'Regular idea',
        who: 'B',
        item_type: 'idea',
        source_type: 'manual_input',
        affected_disciplines: ['architecture'],
        is_milestone: false,
        is_done: false,
        created_at: '2026-01-02',
      },
    ]

    const milestones = items.filter((i) => i.is_milestone)
    expect(milestones).toHaveLength(1)
    expect(milestones[0].statement).toBe('Milestone decision')
  })

  it('should have correct milestones response shape', () => {
    const response: ProjectItemsResponse = {
      items: [
        {
          id: '1',
          project_id: 'p1',
          statement: 'Key milestone',
          who: 'Carlos',
          item_type: 'decision',
          source_type: 'meeting',
          affected_disciplines: ['structural'],
          is_milestone: true,
          is_done: false,
          created_at: '2026-01-01',
        },
      ],
      total: 1,
      limit: 50,
      offset: 0,
    }

    expect(response.total).toBe(1)
    expect(response.items[0].is_milestone).toBe(true)
  })
})
