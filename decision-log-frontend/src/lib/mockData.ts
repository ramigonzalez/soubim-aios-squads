import { Project, Decision } from '../types'

// Mock Projects Data
export const mockProjects: Project[] = [
  {
    id: 'proj-001',
    name: 'Downtown Tower Renovation',
    description: 'Major renovation of 42-story downtown office tower with MEP upgrades',
    created_at: '2025-01-15T10:30:00Z',
    member_count: 12,
    decision_count: 47,
    latest_decision: '2025-02-07T14:20:00Z',
  },
  {
    id: 'proj-002',
    name: 'Parkside Residential Complex',
    description: 'New 250-unit residential development with integrated landscape design',
    created_at: '2024-12-20T09:15:00Z',
    member_count: 8,
    decision_count: 31,
    latest_decision: '2025-02-06T11:45:00Z',
  },
  {
    id: 'proj-003',
    name: 'Sustainable Research Campus',
    description: 'Green-certified research facility with cutting-edge MEP systems',
    created_at: '2024-11-10T16:00:00Z',
    member_count: 15,
    decision_count: 52,
    latest_decision: '2025-02-08T10:30:00Z',
  },
  {
    id: 'proj-004',
    name: 'Heritage District Restoration',
    description: 'Sensitive restoration of historic buildings in downtown district',
    created_at: '2025-01-05T13:45:00Z',
    member_count: 6,
    decision_count: 28,
    latest_decision: '2025-02-05T15:10:00Z',
  },
  {
    id: 'proj-005',
    name: 'Airport Terminal Expansion',
    description: 'New terminal facility with advanced structural systems',
    created_at: '2024-10-22T08:20:00Z',
    member_count: 20,
    decision_count: 89,
    latest_decision: '2025-02-08T09:00:00Z',
  },
  {
    id: 'proj-006',
    name: 'Tech Campus Phase 2',
    description: 'Expansion of tech campus with flexible office spaces',
    created_at: '2024-09-30T14:30:00Z',
    member_count: 10,
    decision_count: 35,
    latest_decision: '2025-02-04T16:45:00Z',
  },
]

// Mock Decisions Data
export const mockDecisions: Decision[] = [
  {
    id: 'dec-001',
    decision_statement: 'Use reinforced concrete for structural frame',
    who: 'John Smith',
    timestamp: '2025-02-08T10:30:00Z',
    discipline: 'structural',
    meeting_type: 'Design Review',
    meeting_date: '2025-02-08T09:00:00Z',
    why: 'Provides best balance of strength, cost, and constructability',
    causation: 'Based on preliminary load analysis and site conditions',
    impacts: [
      { type: 'timeline', change: '+2 weeks for formwork design' },
      { type: 'budget', change: '+$50K material costs' },
    ],
    consensus: 'AGREE',
    confidence: 0.95,
    anomaly_flags: [],
    created_at: '2025-02-08T10:35:00Z',
  },
  {
    id: 'dec-002',
    decision_statement: 'Implement VRF HVAC system instead of chiller',
    who: 'Sarah Johnson',
    timestamp: '2025-02-07T14:20:00Z',
    discipline: 'mep',
    meeting_type: 'MEP Coordination',
    meeting_date: '2025-02-07T13:00:00Z',
    why: 'Better energy efficiency and flexibility for mixed-use spaces',
    causation: 'Energy analysis showed 25% efficiency improvement',
    impacts: [
      { type: 'budget', change: '+$150K capital, -$80K annual operating' },
      { type: 'timeline', change: '-1 week installation time' },
    ],
    consensus: 'MIXED',
    confidence: 0.78,
    anomaly_flags: [
      { type: 'dissent', severity: 'medium', description: 'Mechanical engineer concerned about maintenance accessibility' },
    ],
    created_at: '2025-02-07T14:25:00Z',
  },
  {
    id: 'dec-003',
    decision_statement: 'Preserve existing trees on site',
    who: 'Emma Davis',
    timestamp: '2025-02-06T11:45:00Z',
    discipline: 'landscape',
    meeting_type: 'Site Planning',
    meeting_date: '2025-02-06T10:00:00Z',
    why: 'Environmental benefits and community stakeholder requirement',
    causation: 'Community feedback and environmental assessment',
    impacts: [
      { type: 'scope', change: 'Revise grading plan for 3 trees' },
      { type: 'timeline', change: '+3 days for survey and protection measures' },
    ],
    consensus: 'AGREE',
    confidence: 0.92,
    anomaly_flags: [],
    created_at: '2025-02-06T11:50:00Z',
  },
]

// Mock Digest Data
export const mockDigest = {
  total_decisions: 47,
  meetings_count: 12,
  consensus_percentage: 78,
  high_impact_count: 3,
  highlights: [
    {
      category: 'structural',
      title: 'Foundation system confirmed',
      description: 'Decided on reinforced concrete pile foundation system',
      impact_level: 'high',
      date: '2025-02-08T10:30:00Z',
    },
    {
      category: 'mep',
      title: 'HVAC strategy finalized',
      description: 'VRF system approved with energy analysis showing 25% savings',
      impact_level: 'high',
      date: '2025-02-07T14:20:00Z',
    },
    {
      category: 'landscape',
      title: 'Tree preservation plan approved',
      description: 'Site plan updated to preserve 3 existing oak trees',
      impact_level: 'medium',
      date: '2025-02-06T11:45:00Z',
    },
  ],
  stats: {
    by_discipline: {
      structural: 15,
      mep: 18,
      landscape: 9,
      architecture: 5,
    },
    by_consensus: {
      agree: 37,
      mixed: 8,
      dissent: 2,
    },
  },
}

/**
 * Mock API responses for development
 * Replace with real API calls in Story 3.2
 */
export const mockApi = {
  getProjects: async (): Promise<Project[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockProjects), 800)
    })
  },

  getProject: async (id: string): Promise<Project | null> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const project = mockProjects.find(p => p.id === id)
        resolve(project || null)
      }, 300)
    })
  },

  getDecisions: async (
    projectId: string,
    filters?: {
      discipline?: string
      meeting_type?: string
      date_from?: string
      date_to?: string
      search?: string
    }
  ): Promise<Decision[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        let results = mockDecisions
        if (filters?.discipline) {
          results = results.filter(d => d.discipline === filters.discipline)
        }
        if (filters?.search) {
          const search = filters.search.toLowerCase()
          results = results.filter(d =>
            d.decision_statement.toLowerCase().includes(search) ||
            d.who.toLowerCase().includes(search)
          )
        }
        resolve(results)
      }, 500)
    })
  },

  getDecision: async (id: string): Promise<Decision | null> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const decision = mockDecisions.find(d => d.id === id)
        resolve(decision || null)
      }, 300)
    })
  },

  getDigest: async (projectId: string, dateFrom?: string, dateTo?: string) => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockDigest), 600)
    })
  },

  login: async (email: string, password: string) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          token: 'mock-jwt-token-' + Date.now(),
          user: {
            id: 'user-001',
            email,
            name: 'Gabriela Santos',
            role: 'director',
          },
        })
      }, 1000)
    })
  },
}
