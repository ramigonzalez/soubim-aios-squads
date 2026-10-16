import type { ProjectItem } from '../../types/projectItem'

export const STAGES = [
  { id: 'ep', name: 'Estudo Preliminar', start: '2026-01-15T00:00:00', end: '2026-02-15T00:00:00' },
  { id: 'ap', name: 'Anteprojeto', start: '2026-02-16T00:00:00', end: '2026-03-31T00:00:00' },
  { id: 'pl', name: 'Projeto Legal', start: '2026-04-01T00:00:00', end: '2026-05-15T00:00:00' },
]

export const TODAY = new Date(2026, 2, 3, 12, 0)

let n = 0
export function item(overrides: Partial<ProjectItem> = {}): ProjectItem {
  n += 1
  return {
    id: `i${n}`,
    project_id: 'p1',
    statement: `Item ${n}`,
    title: null,
    who: 'Carlos',
    timestamp: '00:05:32',
    item_type: 'decision',
    source_type: 'meeting',
    affected_disciplines: ['structural'],
    is_milestone: false,
    is_done: false,
    created_at: '2026-02-06T10:00:00',
    source: { id: 's1', title: 'Revisão do projeto estrutural', type: 'meeting', occurred_at: '2026-02-06T10:00:00' },
    review_status: 'approved',
    ...overrides,
  } as ProjectItem
}

export const PROJECT = {
  id: 'p1',
  name: 'Residential Tower Alpha',
  description: 'Torre residencial',
  stages: STAGES,
  counts: { items: 4, milestones: 2, meetings: 1 },
  can_manage: true,
  can_review: true,
  access_level: 'admin',
  members: [],
  created_at: '2026-01-01',
}
