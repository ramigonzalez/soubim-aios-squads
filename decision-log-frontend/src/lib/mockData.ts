import { Project } from '../types/project'
import { Decision } from '../types/decision'

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

// Mock Decisions Data - Comprehensive dataset for Timeline testing
export const mockDecisions: Decision[] = [
  // Project 001 - Downtown Tower Renovation
  // Meeting: Structural Design Review (transcript: tr-struct-001) — 7 decisions (tests >5 collapse)
  {
    id: 'dec-001',
    decision_statement: 'Use reinforced concrete for structural frame',
    who: 'John Smith',
    timestamp: '2025-02-08T10:30:00Z',
    discipline: 'structural',
    transcript_id: 'tr-struct-001',
    meeting_title: 'Structural Design Review',
    meeting_type: 'Design Review',
    meeting_date: '2025-02-08T09:00:00Z',
    meeting_participants: [
      { name: 'John Smith', role: 'Structural Engineer' },
      { name: 'Emma Davis', role: 'Architect' },
      { name: 'Carlos Mendez', role: 'MEP Engineer' },
      { name: 'Sarah Johnson', role: 'Plumbing Engineer' },
      { name: 'Michael Torres', role: 'Electrical Engineer' },
      { name: 'Lisa Park', role: 'Landscape Architect' },
    ],
    why: 'Provides best balance of strength, cost, and constructability',
    causation: 'Based on preliminary load analysis and site conditions',
    impacts: [
      { type: 'high', change: '+2 weeks for formwork design' },
      { type: 'budget', change: '+$50K material costs' },
    ],
    consensus: { engineer: 'AGREE', architect: 'AGREE', client: 'AGREE' },
    confidence: 0.95,
    anomaly_flags: [],
    created_at: '2025-02-08T10:35:00Z',
  },
  {
    id: 'dec-001b',
    decision_statement: 'Use post-tensioned slabs to reduce floor thickness by 2 inches',
    who: 'John Smith',
    timestamp: '2025-02-08T10:50:00Z',
    discipline: 'structural',
    transcript_id: 'tr-struct-001',
    meeting_title: 'Structural Design Review',
    meeting_type: 'Design Review',
    meeting_date: '2025-02-08T09:00:00Z',
    meeting_participants: [
      { name: 'John Smith', role: 'Structural Engineer' },
      { name: 'Emma Davis', role: 'Architect' },
      { name: 'Carlos Mendez', role: 'MEP Engineer' },
      { name: 'Sarah Johnson', role: 'Plumbing Engineer' },
      { name: 'Michael Torres', role: 'Electrical Engineer' },
      { name: 'Lisa Park', role: 'Landscape Architect' },
    ],
    why: 'Height restriction from zoning requires optimized structure',
    impacts: [
      { type: 'high', change: '+$450K for post-tensioning system' },
      { type: 'medium', change: 'Specialized contractor required' },
    ],
    consensus: { engineer: 'AGREE', contractor: 'MIXED', client: 'AGREE' },
    confidence: 0.85,
    anomaly_flags: [],
    created_at: '2025-02-08T10:55:00Z',
  },
  {
    id: 'dec-001c',
    decision_statement: 'Adopt seismic isolation bearings for ground floor columns',
    who: 'John Smith',
    timestamp: '2025-02-08T11:05:00Z',
    discipline: 'structural',
    transcript_id: 'tr-struct-001',
    meeting_title: 'Structural Design Review',
    meeting_type: 'Design Review',
    meeting_date: '2025-02-08T09:00:00Z',
    meeting_participants: [
      { name: 'John Smith', role: 'Structural Engineer' },
      { name: 'Emma Davis', role: 'Architect' },
      { name: 'Carlos Mendez', role: 'MEP Engineer' },
      { name: 'Sarah Johnson', role: 'Plumbing Engineer' },
      { name: 'Michael Torres', role: 'Electrical Engineer' },
      { name: 'Lisa Park', role: 'Landscape Architect' },
    ],
    why: 'Seismic zone 3 classification requires enhanced protection',
    impacts: [
      { type: 'high', change: '+$800K for isolation system' },
    ],
    consensus: { engineer: 'STRONGLY_AGREE', architect: 'AGREE', client: 'AGREE' },
    confidence: 0.91,
    anomaly_flags: [],
    created_at: '2025-02-08T11:10:00Z',
  },
  {
    id: 'dec-001d',
    decision_statement: 'Use BIM Level 3 coordination for all structural connections',
    who: 'Emma Davis',
    timestamp: '2025-02-08T11:20:00Z',
    discipline: 'architecture',
    transcript_id: 'tr-struct-001',
    meeting_title: 'Structural Design Review',
    meeting_type: 'Design Review',
    meeting_date: '2025-02-08T09:00:00Z',
    meeting_participants: [
      { name: 'John Smith', role: 'Structural Engineer' },
      { name: 'Emma Davis', role: 'Architect' },
      { name: 'Carlos Mendez', role: 'MEP Engineer' },
      { name: 'Sarah Johnson', role: 'Plumbing Engineer' },
      { name: 'Michael Torres', role: 'Electrical Engineer' },
      { name: 'Lisa Park', role: 'Landscape Architect' },
    ],
    why: 'Reduces RFIs by 60% during construction phase',
    impacts: [
      { type: 'medium', change: '-3 weeks from reduced RFI turnaround' },
    ],
    consensus: { architect: 'STRONGLY_AGREE', engineer: 'AGREE', contractor: 'AGREE' },
    confidence: 0.88,
    anomaly_flags: [],
    created_at: '2025-02-08T11:25:00Z',
  },
  {
    id: 'dec-001e',
    decision_statement: 'Specify grade 60 rebar for all structural elements',
    who: 'John Smith',
    timestamp: '2025-02-08T11:35:00Z',
    discipline: 'structural',
    transcript_id: 'tr-struct-001',
    meeting_title: 'Structural Design Review',
    meeting_type: 'Design Review',
    meeting_date: '2025-02-08T09:00:00Z',
    meeting_participants: [
      { name: 'John Smith', role: 'Structural Engineer' },
      { name: 'Emma Davis', role: 'Architect' },
      { name: 'Carlos Mendez', role: 'MEP Engineer' },
      { name: 'Sarah Johnson', role: 'Plumbing Engineer' },
      { name: 'Michael Torres', role: 'Electrical Engineer' },
      { name: 'Lisa Park', role: 'Landscape Architect' },
    ],
    why: 'Higher grade reduces rebar quantity by 15% while maintaining safety factor',
    impacts: [
      { type: 'medium', change: '-$120K net material savings' },
    ],
    consensus: { engineer: 'AGREE', contractor: 'AGREE' },
    confidence: 0.93,
    anomaly_flags: [],
    created_at: '2025-02-08T11:40:00Z',
  },
  {
    id: 'dec-001f',
    decision_statement: 'Add transfer beams at level 5 for retail podium layout',
    who: 'John Smith',
    timestamp: '2025-02-08T11:50:00Z',
    discipline: 'structural',
    transcript_id: 'tr-struct-001',
    meeting_title: 'Structural Design Review',
    meeting_type: 'Design Review',
    meeting_date: '2025-02-08T09:00:00Z',
    meeting_participants: [
      { name: 'John Smith', role: 'Structural Engineer' },
      { name: 'Emma Davis', role: 'Architect' },
      { name: 'Carlos Mendez', role: 'MEP Engineer' },
      { name: 'Sarah Johnson', role: 'Plumbing Engineer' },
      { name: 'Michael Torres', role: 'Electrical Engineer' },
      { name: 'Lisa Park', role: 'Landscape Architect' },
    ],
    why: 'Retail tenant requires column-free spans of 12m on lower floors',
    impacts: [
      { type: 'high', change: '+$350K for heavy transfer beams' },
      { type: 'medium', change: '+1 week for specialized formwork' },
    ],
    consensus: { engineer: 'AGREE', architect: 'STRONGLY_AGREE', client: 'AGREE' },
    confidence: 0.87,
    anomaly_flags: [],
    created_at: '2025-02-08T11:55:00Z',
  },
  // Meeting: MEP Coordination (transcript: tr-mep-001)
  {
    id: 'dec-002',
    decision_statement: 'Implement VRF HVAC system instead of chiller',
    who: 'Sarah Johnson',
    timestamp: '2025-02-07T14:20:00Z',
    discipline: 'mep',
    transcript_id: 'tr-mep-001',
    meeting_title: 'MEP Coordination',
    meeting_type: 'Coordination',
    meeting_date: '2025-02-07T13:00:00Z',
    meeting_participants: [
      { name: 'Sarah Johnson', role: 'MEP Engineer' },
      { name: 'Carlos Mendez', role: 'Plumbing Engineer' },
      { name: 'Michael Torres', role: 'Electrical Engineer' },
      { name: 'Emma Davis', role: 'Project Director' },
    ],
    why: 'Better energy efficiency and flexibility for mixed-use spaces',
    causation: 'Energy analysis showed 25% efficiency improvement',
    impacts: [
      { type: 'high', change: '+$150K capital, -$80K annual operating' },
      { type: 'medium', change: '-1 week installation time' },
    ],
    consensus: { engineer: 'MIXED', architect: 'AGREE', client: 'AGREE' },
    confidence: 0.78,
    anomaly_flags: [
      { type: 'dissent', severity: 'medium', description: 'Mechanical engineer concerned about maintenance accessibility' },
    ],
    created_at: '2025-02-07T14:25:00Z',
  },
  {
    id: 'dec-002b',
    decision_statement: 'Implement rainwater harvesting system for irrigation',
    who: 'Sarah Johnson',
    timestamp: '2025-02-07T14:50:00Z',
    discipline: 'plumbing',
    transcript_id: 'tr-mep-001',
    meeting_title: 'MEP Coordination',
    meeting_type: 'Coordination',
    meeting_date: '2025-02-07T13:00:00Z',
    meeting_participants: [
      { name: 'Sarah Johnson', role: 'MEP Engineer' },
      { name: 'Carlos Mendez', role: 'Plumbing Engineer' },
      { name: 'Michael Torres', role: 'Electrical Engineer' },
      { name: 'Emma Davis', role: 'Project Director' },
    ],
    why: 'Reduces potable water consumption by 40% and earns LEED points',
    causation: 'Sustainability goals and local water conservation incentives',
    impacts: [
      { type: 'medium', change: '+$95K for collection and filtration system' },
    ],
    consensus: { plumbing: 'AGREE', landscape: 'AGREE', client: 'AGREE' },
    confidence: 0.92,
    anomaly_flags: [],
    created_at: '2025-02-07T14:55:00Z',
  },
  // Meeting: Site Planning Workshop (transcript: tr-site-001)
  {
    id: 'dec-003',
    decision_statement: 'Preserve existing trees on site',
    who: 'Emma Davis',
    timestamp: '2025-02-06T11:45:00Z',
    discipline: 'landscape',
    transcript_id: 'tr-site-001',
    meeting_title: 'Site Planning Workshop',
    meeting_type: 'Design Review',
    meeting_date: '2025-02-06T10:00:00Z',
    meeting_participants: [
      { name: 'Emma Davis', role: 'Landscape Architect' },
      { name: 'John Smith', role: 'Structural Engineer' },
    ],
    why: 'Environmental benefits and community stakeholder requirement',
    causation: 'Community feedback and environmental assessment',
    impacts: [
      { type: 'medium', change: 'Revise grading plan for 3 trees' },
      { type: 'low', change: '+3 days for survey and protection measures' },
    ],
    consensus: { landscape: 'AGREE', civil: 'AGREE', architect: 'AGREE' },
    confidence: 0.92,
    anomaly_flags: [],
    created_at: '2025-02-06T11:50:00Z',
  },
  // Meeting: Architecture Design Review (transcript: tr-arch-001)
  {
    id: 'dec-004',
    decision_statement: 'Increase floor-to-floor height to 14 feet',
    who: 'John Smith',
    timestamp: '2025-02-05T15:30:00Z',
    discipline: 'architecture',
    transcript_id: 'tr-arch-001',
    meeting_title: 'Architecture Design Review',
    meeting_type: 'Design Review',
    meeting_date: '2025-02-05T14:00:00Z',
    meeting_participants: [
      { name: 'John Smith', role: 'Architect' },
      { name: 'Emma Davis', role: 'Project Director' },
    ],
    why: 'Provides flexibility for future tenant improvements and better ceiling clearance',
    causation: 'Client requested more flexible space for high-end office tenants',
    impacts: [
      { type: 'high', change: '+$2.5M construction cost' },
      { type: 'medium', change: '+6 weeks to overall schedule' },
    ],
    consensus: { architect: 'AGREE', client: 'AGREE', engineer: 'DISAGREE' },
    confidence: 0.65,
    anomaly_flags: [
      { type: 'dissent', severity: 'high', description: 'Structural engineer flagged significant cost and schedule impact' },
    ],
    created_at: '2025-02-05T15:35:00Z',
  },
  // Meeting: Client Alignment - Electrical (transcript: tr-client-001)
  {
    id: 'dec-005',
    decision_statement: 'Use dual electrical service with backup generator',
    who: 'Carlos Mendez',
    timestamp: '2025-02-04T10:15:00Z',
    discipline: 'electrical',
    transcript_id: 'tr-client-001',
    meeting_title: 'Client Alignment - Electrical',
    meeting_type: 'Client Meeting',
    meeting_date: '2025-02-04T09:00:00Z',
    meeting_participants: [
      { name: 'Carlos Mendez', role: 'Electrical Engineer' },
      { name: 'Michael Torres', role: 'MEP Engineer' },
      { name: 'Emma Davis', role: 'Project Director' },
    ],
    why: 'Critical for data center tenants requiring 99.99% uptime',
    causation: 'Pre-leasing agreement with tech company requires redundancy',
    impacts: [
      { type: 'high', change: '+$500K for generator and switchgear' },
      { type: 'medium', change: 'Additional roof penetrations for exhaust' },
    ],
    consensus: { electrical: 'AGREE', mep: 'AGREE', client: 'AGREE' },
    confidence: 0.98,
    anomaly_flags: [],
    created_at: '2025-02-04T10:20:00Z',
  },
  // Meeting: Envelope Performance Review (transcript: tr-envelope-001)
  {
    id: 'dec-006',
    decision_statement: 'Specify low-E glazing on all exterior windows',
    who: 'Emma Davis',
    timestamp: '2025-02-03T13:20:00Z',
    discipline: 'architecture',
    transcript_id: 'tr-envelope-001',
    meeting_title: 'Envelope Performance Review',
    meeting_type: 'Internal Review',
    meeting_date: '2025-02-03T13:00:00Z',
    meeting_participants: [
      { name: 'Emma Davis', role: 'Architect' },
      { name: 'Sarah Johnson', role: 'Sustainability Engineer' },
    ],
    why: 'Reduces solar heat gain and improves energy performance by 18%',
    causation: 'Required to meet LEED Gold certification target',
    impacts: [
      { type: 'medium', change: '+$120K glazing cost premium' },
      { type: 'low', change: 'No schedule impact' },
    ],
    consensus: { architect: 'AGREE', sustainability: 'AGREE', client: 'AGREE' },
    confidence: 0.88,
    anomaly_flags: [],
    created_at: '2025-02-03T13:25:00Z',
  },
  // Meeting: EV Infrastructure Coordination (transcript: tr-ev-001)
  {
    id: 'dec-007',
    decision_statement: 'Redesign parking layout to accommodate EV charging stations',
    who: 'Michael Torres',
    timestamp: '2025-02-02T16:45:00Z',
    discipline: 'electrical',
    transcript_id: 'tr-ev-001',
    meeting_title: 'EV Infrastructure Coordination',
    meeting_type: 'Coordination',
    meeting_date: '2025-02-02T15:00:00Z',
    meeting_participants: [
      { name: 'Michael Torres', role: 'Electrical Engineer' },
      { name: 'John Smith', role: 'Architect' },
    ],
    why: 'City code now requires 20% of parking spaces to be EV-ready',
    causation: 'Updated building code effective January 2025',
    impacts: [
      { type: 'medium', change: '+$180K for electrical infrastructure' },
      { type: 'low', change: 'Parking layout revisions' },
    ],
    consensus: { electrical: 'AGREE', civil: 'AGREE', architect: 'MIXED' },
    confidence: 0.82,
    anomaly_flags: [],
    created_at: '2025-02-02T16:50:00Z',
  },
  // Orphan decision — no transcript_id (tests "Other Decisions" grouping)
  {
    id: 'dec-008',
    decision_statement: 'Switch from gypsum board to metal panel ceiling in lobby',
    who: 'John Smith',
    timestamp: '2025-02-01T11:30:00Z',
    discipline: 'architecture',
    meeting_title: 'Lobby Design Review',
    meeting_type: 'Design Review',
    meeting_date: '2025-02-01T10:00:00Z',
    why: 'Better acoustic performance and modern aesthetic requested by client',
    causation: 'Client feedback from design presentation',
    impacts: [
      { type: 'medium', change: '+$85K material cost' },
      { type: 'low', change: '+1 week for specialty fabrication' },
    ],
    consensus: { architect: 'AGREE', client: 'AGREE', contractor: 'MIXED' },
    confidence: 0.75,
    anomaly_flags: [],
    created_at: '2025-02-01T11:35:00Z',
  },
  // Meeting: Landscape Design Review (transcript: tr-landscape-001)
  {
    id: 'dec-009',
    decision_statement: 'Install green roof on podium level',
    who: 'Emma Davis',
    timestamp: '2025-01-31T14:00:00Z',
    discipline: 'landscape',
    transcript_id: 'tr-landscape-001',
    meeting_title: 'Landscape Design Review',
    meeting_type: 'Design Review',
    meeting_date: '2025-01-31T13:00:00Z',
    meeting_participants: [
      { name: 'Emma Davis', role: 'Landscape Architect' },
      { name: 'John Smith', role: 'Structural Engineer' },
      { name: 'Lisa Park', role: 'Project Director' },
    ],
    why: 'Provides amenity space for residents and stormwater management',
    causation: 'LEED requirement and resident amenity strategy',
    impacts: [
      { type: 'high', change: '+$350K for waterproofing and planting' },
      { type: 'medium', change: 'Additional structural loading analysis' },
    ],
    consensus: { landscape: 'AGREE', structural: 'AGREE', client: 'AGREE' },
    confidence: 0.90,
    anomaly_flags: [],
    created_at: '2025-01-31T14:05:00Z',
  },
  // Meeting: Structural Optimization Review (transcript: tr-struct-opt-001)
  {
    id: 'dec-010',
    decision_statement: 'Use post-tensioned concrete slabs instead of conventional',
    who: 'John Smith',
    timestamp: '2025-01-30T09:30:00Z',
    discipline: 'structural',
    transcript_id: 'tr-struct-opt-001',
    meeting_title: 'Structural Optimization Review',
    meeting_type: 'Internal Review',
    meeting_date: '2025-01-30T09:00:00Z',
    meeting_participants: [
      { name: 'John Smith', role: 'Structural Engineer' },
    ],
    why: 'Reduces slab thickness by 2 inches, saving on overall building height',
    causation: 'Height restriction from zoning requires optimized structure',
    impacts: [
      { type: 'high', change: '+$450K for post-tensioning system' },
      { type: 'medium', change: 'Specialized contractor required' },
    ],
    consensus: { structural: 'AGREE', contractor: 'MIXED', client: 'AGREE' },
    confidence: 0.85,
    anomaly_flags: [],
    created_at: '2025-01-30T09:35:00Z',
  },
  // Meeting: MEP Coordination - Sustainability (transcript: tr-mep-sust-001)
  {
    id: 'dec-011',
    decision_statement: 'Implement rainwater harvesting system for irrigation',
    who: 'Sarah Johnson',
    timestamp: '2025-01-29T15:45:00Z',
    discipline: 'plumbing',
    transcript_id: 'tr-mep-sust-001',
    meeting_title: 'MEP Coordination - Sustainability',
    meeting_type: 'Coordination',
    meeting_date: '2025-01-29T14:00:00Z',
    meeting_participants: [
      { name: 'Sarah Johnson', role: 'MEP Engineer' },
      { name: 'Lisa Park', role: 'Landscape Architect' },
    ],
    why: 'Reduces potable water consumption by 40% and earns LEED points',
    causation: 'Sustainability goals and local water conservation incentives',
    impacts: [
      { type: 'medium', change: '+$95K for collection and filtration system' },
      { type: 'low', change: 'Roof coordination for collection points' },
    ],
    consensus: { plumbing: 'AGREE', landscape: 'AGREE', client: 'AGREE' },
    confidence: 0.92,
    anomaly_flags: [],
    created_at: '2025-01-29T15:50:00Z',
  },
  // Meeting: Client Alignment - Acoustics (transcript: tr-client-acoust-001)
  {
    id: 'dec-012',
    decision_statement: 'Add acoustic insulation to party walls between units',
    who: 'Carlos Mendez',
    timestamp: '2025-01-28T11:15:00Z',
    discipline: 'architecture',
    transcript_id: 'tr-client-acoust-001',
    meeting_title: 'Client Alignment - Acoustics',
    meeting_type: 'Client Meeting',
    meeting_date: '2025-01-28T10:00:00Z',
    meeting_participants: [
      { name: 'Carlos Mendez', role: 'Architect' },
      { name: 'Emma Davis', role: 'Project Director' },
    ],
    why: 'Exceeds code requirements to provide luxury-level sound isolation',
    causation: 'Market positioning as premium residential product',
    impacts: [
      { type: 'medium', change: '+$125K for enhanced insulation' },
      { type: 'low', change: 'Minor wall thickness increase' },
    ],
    consensus: { architect: 'AGREE', client: 'AGREE', acoustical: 'AGREE' },
    confidence: 0.95,
    anomaly_flags: [],
    created_at: '2025-01-28T11:20:00Z',
  },
  // Meeting: Facade Design Review (transcript: tr-facade-001)
  {
    id: 'dec-013',
    decision_statement: 'Defer facade mock-up to DD phase completion',
    who: 'Emma Davis',
    timestamp: '2025-01-27T13:30:00Z',
    discipline: 'architecture',
    transcript_id: 'tr-facade-001',
    meeting_title: 'Facade Design Review',
    meeting_type: 'Design Review',
    meeting_date: '2025-01-27T13:00:00Z',
    meeting_participants: [
      { name: 'Emma Davis', role: 'Architect' },
    ],
    why: 'Allows more time for value engineering and material selection',
    causation: 'Budget pressure requires exploring alternative facade systems',
    impacts: [
      { type: 'high', change: '+8 weeks to construction start' },
      { type: 'medium', change: 'Risk of schedule compression later' },
    ],
    consensus: { architect: 'MIXED', client: 'DISAGREE', contractor: 'AGREE' },
    confidence: 0.58,
    anomaly_flags: [
      { type: 'dissent', severity: 'high', description: 'Client concerned about schedule impact and testing delays' },
      { type: 'risk', severity: 'medium', description: 'May compress CD phase if mock-up requires changes' },
    ],
    created_at: '2025-01-27T13:35:00Z',
  },
  // Meeting: Electrical Systems Review (transcript: tr-elec-001)
  {
    id: 'dec-014',
    decision_statement: 'Install occupancy sensors in all office spaces',
    who: 'Michael Torres',
    timestamp: '2025-01-26T10:00:00Z',
    discipline: 'electrical',
    transcript_id: 'tr-elec-001',
    meeting_title: 'Electrical Systems Review',
    meeting_type: 'Internal Review',
    meeting_date: '2025-01-26T09:00:00Z',
    meeting_participants: [
      { name: 'Michael Torres', role: 'Electrical Engineer' },
    ],
    why: 'Energy savings projected at $25K annually with 3-year payback',
    causation: 'Energy efficiency analysis and LEED automation requirements',
    impacts: [
      { type: 'low', change: '+$45K for sensor network' },
      { type: 'low', change: 'Integration with BMS system' },
    ],
    consensus: { electrical: 'AGREE', mep: 'AGREE', client: 'AGREE' },
    confidence: 0.94,
    anomaly_flags: [],
    created_at: '2025-01-26T10:05:00Z',
  },
  // Meeting: Fire Protection Coordination (transcript: tr-fire-001)
  {
    id: 'dec-015',
    decision_statement: 'Upgrade fire suppression to ESFR sprinkler system',
    who: 'Sarah Johnson',
    timestamp: '2025-01-25T14:45:00Z',
    discipline: 'plumbing',
    transcript_id: 'tr-fire-001',
    meeting_title: 'Fire Protection Coordination',
    meeting_type: 'Coordination',
    meeting_date: '2025-01-25T14:00:00Z',
    meeting_participants: [
      { name: 'Sarah Johnson', role: 'Plumbing Engineer' },
      { name: 'Michael Torres', role: 'MEP Engineer' },
    ],
    why: 'Eliminates need for in-rack sprinklers, reducing warehouse costs',
    causation: 'Value engineering study for warehouse tenant space',
    impacts: [
      { type: 'medium', change: '+$220K for upgraded sprinkler system' },
      { type: 'medium', change: '-$180K saved on in-rack system' },
    ],
    consensus: { plumbing: 'AGREE', fire_protection: 'AGREE', tenant: 'AGREE' },
    confidence: 0.87,
    anomaly_flags: [],
    created_at: '2025-01-25T14:50:00Z',
  },
]

// Mock Digest Data
export const mockDigest = {
  total_decisions: 20,
  meetings_count: 12,
  consensus_percentage: 73,
  high_impact_count: 6,
  highlights: [
    {
      category: 'structural',
      title: 'Reinforced concrete frame confirmed',
      description: 'Provides best balance of strength, cost, and constructability',
      impact_level: 'high' as const,
      date: '2025-02-08T10:30:00Z',
    },
    {
      category: 'mep',
      title: 'VRF HVAC system approved',
      description: 'Energy analysis showed 25% efficiency improvement over chiller system',
      impact_level: 'high' as const,
      date: '2025-02-07T14:20:00Z',
    },
    {
      category: 'architecture',
      title: 'Floor height increased to 14 feet',
      description: 'Major cost impact but provides tenant flexibility - structural engineer dissented',
      impact_level: 'high' as const,
      date: '2025-02-05T15:30:00Z',
    },
    {
      category: 'landscape',
      title: 'Green roof on podium approved',
      description: 'Provides amenity space and stormwater management for LEED certification',
      impact_level: 'high' as const,
      date: '2025-01-31T14:00:00Z',
    },
    {
      category: 'architecture',
      title: 'Facade mock-up deferred',
      description: 'Client concerned about 8-week schedule impact - high risk flagged',
      impact_level: 'high' as const,
      date: '2025-01-27T13:30:00Z',
    },
  ],
  stats: {
    by_discipline: {
      structural: 2,
      mep: 1,
      landscape: 2,
      architecture: 5,
      electrical: 3,
      plumbing: 2,
    },
    by_consensus: {
      agree: 11,
      mixed: 3,
      dissent: 1,
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
    _projectId: string,
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
        let results = [...mockDecisions] // Return all mock decisions for any project

        if (filters?.discipline) {
          results = results.filter(d => d.discipline === filters.discipline)
        }
        if (filters?.meeting_type) {
          results = results.filter(d => d.meeting_type === filters.meeting_type)
        }
        if (filters?.search) {
          const search = filters.search.toLowerCase()
          results = results.filter(d =>
            d.decision_statement.toLowerCase().includes(search) ||
            d.who.toLowerCase().includes(search) ||
            d.why.toLowerCase().includes(search)
          )
        }
        if (filters?.date_from) {
          results = results.filter(d => d.timestamp >= filters.date_from!)
        }
        if (filters?.date_to) {
          results = results.filter(d => d.timestamp <= filters.date_to!)
        }

        // Sort by timestamp descending (newest first)
        results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

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

  getDigest: async (_projectId: string, _dateFrom?: string, _dateTo?: string) => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockDigest), 600)
    })
  },

  login: async (email: string, _password: string) => {
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
