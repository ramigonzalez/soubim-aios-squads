# Frontend Architecture - DecisionLog

**Document ID:** architecture/frontend-architecture
**Version:** 1.0
**Status:** Complete
**Owner:** @architect with @ux-design-expert

---

## Overview

Complete specification of the React 18 + TypeScript frontend for DecisionLog, including:
- Component architecture and hierarchy
- State management strategy (React Query + Zustand)
- Data fetching and caching
- User flows and interactions
- Performance optimization

**Technology Stack:**
- React 18.2
- TypeScript 5.3
- Vite (build tool, <500ms dev rebuild)
- React Router 6 (navigation)
- React Query 3.39 (server state)
- Zustand 4.4 (client state)
- Tailwind CSS 3.3 (styling)
- Recharts 2.10 (charts/metrics)
- Shadcn/ui (component library)

---

## Page Structure & Routes

```
/login
  └── Login.tsx - Authentication page

/projects
  └── Projects.tsx - Project list + create

/projects/:project_id
  └── ProjectDetail.tsx
      ├── Navigation (breadcrumb, back button)
      ├── Filters (discipline, date, meeting type)
      ├── Timeline (decisions grouped by meeting)
      │   └── DecisionCard × N
      ├── DrillDownModal (conditional)
      │   ├── TranscriptExcerpt
      │   └── SimilarDecisions
      └── ExecutiveDigest (if role=director)
          ├── Summary metrics
          ├── Highlights
          └── Anomalies

/404
  └── NotFound.tsx
```

---

## Component Architecture

### Component Hierarchy

```
<App>
└── <Router>
    ├── <ProtectedRoute>
    │   └── <ProjectDetail>
    │       ├── <Navigation />
    │       ├── <FilterPanel>
    │       │   ├── <DisciplineFilter />
    │       │   ├── <DateRangeFilter />
    │       │   ├── <MeetingTypeFilter />
    │       │   └── <SearchInput />
    │       ├── <Timeline>
    │       │   └── <MeetingGroup> × N
    │       │       └── <DecisionCard> × N
    │       │           └── <ConsensusIndicators />
    │       ├── <DrillDownModal>
    │       │   ├── <TranscriptExcerpt />
    │       │   ├── <SimilarDecisions />
    │       │   └── <MetadataSection />
    │       └── <ExecutiveDigest> (conditional)
    │           ├── <SummaryMetrics />
    │           ├── <HighlightsList />
    │           └── <AnomaliesList />
    └── <Login />
```

---

## Detailed Component Specifications

### Pages

#### Login.tsx

```typescript
/**
 * Authentication page
 * - Email/password form
 * - Error messaging
 * - Redirect to projects on success
 */

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      navigate('/projects');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h1>DecisionLog</h1>
        <form onSubmit={handleSubmit}>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <Alert variant="destructive">{error}</Alert>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

#### Projects.tsx

```typescript
/**
 * Projects listing page
 * - Display all accessible projects
 * - Quick stats (decision count, last activity)
 * - Click to navigate to project detail
 */

export default function Projects() {
  const { data: projects, isLoading, error } = useProjects();
  const { user } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert error={error} />;

  return (
    <div className="projects-container">
      <header>
        <h1>Projects</h1>
        {user?.role === 'director' && (
          <Button onClick={() => setShowCreateModal(true)}>
            + New Project
          </Button>
        )}
      </header>

      <div className="projects-grid">
        {projects?.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onClick={() => navigate(`/projects/${project.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({ project, onClick }: ProjectCardProps) {
  return (
    <Card onClick={onClick} className="cursor-pointer hover:shadow-lg">
      <CardHeader>
        <h3>{project.name}</h3>
        <p className="text-sm text-gray-500">{project.description}</p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-xs text-gray-500">Decisions</span>
            <p className="text-2xl font-bold">{project.decision_count}</p>
          </div>
          <div>
            <span className="text-xs text-gray-500">Members</span>
            <p className="text-2xl font-bold">{project.member_count}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <span className="text-xs text-gray-400">
          Updated {formatDate(project.latest_decision)}
        </span>
      </CardFooter>
    </Card>
  );
}
```

#### ProjectDetail.tsx

```typescript
/**
 * Main project page with timeline, filters, and drill-down modal
 */

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project } = useProject(projectId!);
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);

  const filters = useFilterStore();
  const {
    data: decisionsData,
    isLoading,
    error
  } = useDecisions(projectId!, {
    discipline: filters.discipline,
    meetingType: filters.meetingType,
    dateFrom: filters.dateRange.from,
    dateTo: filters.dateRange.to,
    search: filters.searchQuery,
    limit: 50,
    offset: 0
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorAlert error={error} />;

  return (
    <div className="project-detail">
      <Navigation projectName={project?.name} />

      <div className="content-grid">
        <aside className="filters-sidebar">
          <FilterPanel />
        </aside>

        <main className="timeline-main">
          <Timeline
            decisions={decisionsData?.decisions || []}
            onDecisionClick={setSelectedDecisionId}
          />
        </main>

        {project?.user?.role === 'director' && (
          <aside className="digest-sidebar">
            <ExecutiveDigest projectId={projectId!} />
          </aside>
        )}
      </div>

      {selectedDecisionId && (
        <DrillDownModal
          decisionId={selectedDecisionId}
          onClose={() => setSelectedDecisionId(null)}
        />
      )}
    </div>
  );
}
```

### Timeline Components

#### Timeline.tsx

```typescript
/**
 * Timeline view showing decisions grouped by meeting
 * - Group decisions by transcript/meeting
 * - Virtual scrolling for 100+ decisions
 * - Meeting headers with metadata
 */

interface TimelineProps {
  decisions: Decision[];
  onDecisionClick: (decision: Decision) => void;
}

export function Timeline({ decisions, onDecisionClick }: TimelineProps) {
  const { useVirtualizer } = useMemo(
    () => require('@tanstack/react-virtual'),
    []
  );

  // Group decisions by meeting
  const groupedByMeeting = useMemo(() => {
    const groups = new Map<string, Decision[]>();
    decisions.forEach((d) => {
      const key = d.transcript_id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(d);
    });
    return Array.from(groups.entries());
  }, [decisions]);

  const parentRef = React.useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: groupedByMeeting.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 400, // Approx height of meeting group
    overscan: 5 // Render 5 items outside viewport
  });

  return (
    <div ref={parentRef} className="timeline-scroll">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative'
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const [transcriptId, meetingDecisions] = groupedByMeeting[
            virtualItem.index
          ];
          return (
            <div
              key={transcriptId}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`
              }}
            >
              <MeetingGroup
                transcriptId={transcriptId}
                decisions={meetingDecisions}
                onDecisionClick={onDecisionClick}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

#### DecisionCard.tsx

```typescript
/**
 * Individual decision card with consensus, impacts, flags
 */

interface DecisionCardProps {
  decision: Decision;
  onClick: () => void;
}

export function DecisionCard({ decision, onClick }: DecisionCardProps) {
  return (
    <Card
      className={cn(
        'decision-card cursor-pointer hover:shadow-md transition-shadow',
        getConsensusColor(decision.consensus)
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <Badge variant={getDisciplineBadge(decision.discipline)}>
            {decision.discipline}
          </Badge>
          <span className="text-xs text-gray-500">{decision.timestamp}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Decision statement */}
        <p className="text-sm font-semibold leading-snug">
          {decision.decision_statement}
        </p>

        {/* Speaker attribution */}
        <p className="text-xs text-gray-600">— {decision.who}</p>

        {/* Consensus indicators */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(decision.consensus).map(([discipline, vote]) => (
            <ConsensusIndicator
              key={discipline}
              discipline={discipline}
              vote={vote}
            />
          ))}
        </div>

        {/* Impacts */}
        {decision.impacts && decision.impacts.length > 0 && (
          <div className="space-y-1 border-t pt-2">
            {decision.impacts.map((impact, idx) => (
              <div key={idx} className="text-xs text-gray-700">
                <span className="font-semibold">{impact.type}:</span> {impact.change}
              </div>
            ))}
          </div>
        )}

        {/* Anomaly flags */}
        {decision.anomaly_flags && decision.anomaly_flags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {decision.anomaly_flags.map((flag, idx) => (
              <AnomalyBadge key={idx} flag={flag} />
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 text-xs text-gray-500">
        <div className="flex items-center justify-between w-full">
          <span>Confidence: {(decision.confidence * 100).toFixed(0)}%</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </CardFooter>
    </Card>
  );
}

function ConsensusIndicator({
  discipline,
  vote
}: {
  discipline: string;
  vote: string;
}) {
  const colors = {
    AGREE: 'bg-green-100 text-green-800',
    DISAGREE: 'bg-red-100 text-red-800',
    ABSTAIN: 'bg-gray-100 text-gray-800'
  };

  const icons = {
    AGREE: <Check className="w-3 h-3" />,
    DISAGREE: <X className="w-3 h-3" />,
    ABSTAIN: <Minus className="w-3 h-3" />
  };

  return (
    <div className={cn('inline-flex items-center gap-1 px-2 py-1 rounded text-xs', colors[vote as keyof typeof colors])}>
      {icons[vote as keyof typeof icons]}
      {discipline}
    </div>
  );
}
```

#### DrillDownModal.tsx

```typescript
/**
 * Full decision details modal
 * - Complete decision information
 * - Transcript excerpt (5-10 min around decision)
 * - Similar past decisions
 * - Consistency analysis
 */

interface DrillDownModalProps {
  decisionId: string;
  onClose: () => void;
}

export function DrillDownModal({ decisionId, onClose }: DrillDownModalProps) {
  const { data: decision, isLoading } = useDecisionDetail(decisionId);

  if (isLoading) return <LoadingSpinner />;
  if (!decision) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {decision.decision_statement}
          </DialogTitle>
          <DialogDescription>
            By {decision.who} at {decision.timestamp}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="transcript">Transcript</TabsTrigger>
            <TabsTrigger value="similar">Similar Decisions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Section title="Context">
              <p className="text-sm">{decision.why}</p>
              {decision.causation && (
                <div className="mt-2 text-sm">
                  <span className="font-semibold">Triggered by:</span> {decision.causation}
                </div>
              )}
            </Section>

            <Section title="Impacts">
              {decision.impacts?.map((impact, idx) => (
                <div key={idx} className="text-sm">
                  <span className="font-semibold">{impact.type}:</span> {impact.change}
                </div>
              ))}
            </Section>

            <Section title="Consensus">
              <div className="flex flex-wrap gap-2">
                {Object.entries(decision.consensus).map(([disc, vote]) => (
                  <ConsensusIndicator
                    key={disc}
                    discipline={disc}
                    vote={vote}
                  />
                ))}
              </div>
            </Section>

            <Section title="Analysis">
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-semibold">Confidence:</span> {(decision.confidence * 100).toFixed(0)}%
                </div>
                <div>
                  <span className="font-semibold">Consistency:</span> {decision.consistency_notes}
                </div>
              </div>
            </Section>

            {decision.anomaly_flags?.length > 0 && (
              <Section title="Anomalies">
                {decision.anomaly_flags.map((flag, idx) => (
                  <Alert key={idx} variant="warning">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{flag.type}</AlertTitle>
                    <AlertDescription>{flag.description}</AlertDescription>
                  </Alert>
                ))}
              </Section>
            )}
          </TabsContent>

          <TabsContent value="transcript">
            <TranscriptExcerpt excerpt={decision.transcript_excerpt} />
          </TabsContent>

          <TabsContent value="similar">
            <SimilarDecisions decisions={decision.similar_decisions} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

### Filter Components

#### FilterPanel.tsx

```typescript
/**
 * Sidebar filter controls
 * - Discipline filter (multi-select)
 * - Date range picker
 * - Meeting type filter
 * - Search input (with debouncing)
 */

export function FilterPanel() {
  const {
    discipline,
    meetingType,
    dateRange,
    searchQuery,
    setDiscipline,
    setMeetingType,
    setDateRange,
    setSearchQuery,
    clearFilters
  } = useFilterStore();

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  return (
    <div className="space-y-4 p-4">
      <h3 className="font-semibold">Filters</h3>

      {/* Discipline */}
      <div>
        <label className="text-sm font-medium">Discipline</label>
        <Select value={discipline || ''} onValueChange={setDiscipline}>
          <SelectTrigger>
            <SelectValue placeholder="All disciplines" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            {DISCIPLINES.map((d) => (
              <SelectItem key={d} value={d}>
                {capitalize(d)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Meeting Type */}
      <div>
        <label className="text-sm font-medium">Meeting Type</label>
        <Select value={meetingType || ''} onValueChange={setMeetingType}>
          <SelectTrigger>
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All</SelectItem>
            {MEETING_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {capitalize(t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date Range */}
      <div>
        <label className="text-sm font-medium">Date Range</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={dateRange.from?.toISOString().split('T')[0] || ''}
            onChange={(e) =>
              setDateRange({
                ...dateRange,
                from: e.target.value ? new Date(e.target.value) : null
              })
            }
            className="text-sm"
          />
          <input
            type="date"
            value={dateRange.to?.toISOString().split('T')[0] || ''}
            onChange={(e) =>
              setDateRange({
                ...dateRange,
                to: e.target.value ? new Date(e.target.value) : null
              })
            }
            className="text-sm"
          />
        </div>
      </div>

      {/* Search */}
      <div>
        <label className="text-sm font-medium">Search</label>
        <Input
          type="search"
          placeholder="Search decisions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-sm"
        />
      </div>

      {/* Clear button */}
      <Button
        variant="outline"
        size="sm"
        onClick={clearFilters}
        className="w-full"
      >
        Clear Filters
      </Button>
    </div>
  );
}
```

### Executive Digest (Gabriela's view)

#### ExecutiveDigest.tsx

```typescript
/**
 * Summary dashboard for directors
 * - Key metrics
 * - Highlights (high-impact decisions, anomalies)
 * - Trend analysis
 */

export function ExecutiveDigest({ projectId }: { projectId: string }) {
  const dateFrom = new Date();
  dateFrom.setDate(dateFrom.getDate() - 30); // Last 30 days

  const dateTo = new Date();

  const { data: digest } = useDigest(projectId, {
    dateFrom: dateFrom.toISOString().split('T')[0],
    dateTo: dateTo.toISOString().split('T')[0]
  });

  if (!digest) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-semibold">Executive Digest</h3>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 gap-2">
        <MetricCard
          label="Total Decisions"
          value={digest.summary.total_decisions}
        />
        <MetricCard
          label="High Impact"
          value={digest.summary.high_impact_decisions}
        />
      </div>

      {/* By discipline */}
      <div>
        <h4 className="text-xs font-semibold mb-2">By Discipline</h4>
        {Object.entries(digest.summary.by_discipline).map(([disc, count]) => (
          <div key={disc} className="flex justify-between text-xs py-1">
            <span>{capitalize(disc)}</span>
            <span className="font-semibold">{count}</span>
          </div>
        ))}
      </div>

      {/* Highlights */}
      {digest.highlights.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold mb-2">Highlights</h4>
          <div className="space-y-2">
            {digest.highlights.map((h, idx) => (
              <div key={idx} className="text-xs bg-blue-50 p-2 rounded">
                <p className="font-semibold">{h.title}</p>
                <p className="text-gray-600">{h.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Anomalies */}
      {digest.anomalies.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold mb-2 text-red-600">Anomalies</h4>
          <div className="space-y-2">
            {digest.anomalies.map((a, idx) => (
              <div
                key={idx}
                className="text-xs bg-red-50 p-2 rounded border-l-2 border-red-400"
              >
                <p className="font-semibold">{a.flag}</p>
                <p className="text-gray-600">{a.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## State Management

### Zustand Store (Client State)

```typescript
// src/store/filterStore.ts
import { create } from 'zustand';

interface FilterState {
  discipline: string | null;
  meetingType: string | null;
  dateRange: { from: Date | null; to: Date | null };
  searchQuery: string;

  setDiscipline: (discipline: string | null) => void;
  setMeetingType: (type: string | null) => void;
  setDateRange: (range: { from: Date | null; to: Date | null }) => void;
  setSearchQuery: (query: string) => void;
  clearFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  discipline: null,
  meetingType: null,
  dateRange: { from: null, to: null },
  searchQuery: '',

  setDiscipline: (discipline) => set({ discipline }),
  setMeetingType: (meetingType) => set({ meetingType }),
  setDateRange: (dateRange) => set({ dateRange }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  clearFilters: () =>
    set({
      discipline: null,
      meetingType: null,
      dateRange: { from: null, to: null },
      searchQuery: ''
    })
}));
```

### React Query Hooks

```typescript
// src/hooks/useDecisions.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

interface DecisionFilters {
  discipline?: string | null;
  meetingType?: string | null;
  dateFrom?: Date | null;
  dateTo?: Date | null;
  search?: string;
  confidence_min?: number;
  limit?: number;
  offset?: number;
}

export function useDecisions(
  projectId: string,
  filters: DecisionFilters
) {
  return useQuery({
    queryKey: ['decisions', projectId, filters],
    queryFn: () => api.getDecisions(projectId, filters),
    staleTime: 5 * 60 * 1000, // 5 min cache
    cacheTime: 10 * 60 * 1000, // 10 min retention
  });
}

export function useDecisionDetail(decisionId: string) {
  return useQuery({
    queryKey: ['decision', decisionId],
    queryFn: () => api.getDecision(decisionId),
    staleTime: Infinity // Don't refetch, stable data
  });
}

export function useDigest(
  projectId: string,
  dateRange: { dateFrom: string; dateTo: string }
) {
  return useQuery({
    queryKey: ['digest', projectId, dateRange],
    queryFn: () => api.getDigest(projectId, dateRange),
    staleTime: 30 * 60 * 1000 // 30 min cache
  });
}
```

---

## API Service Layer

```typescript
// src/services/api.ts
import axios from 'axios';
import { useAuth } from '@/hooks/useAuth';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://api.decisionlog.io/api'
});

// Add JWT to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  getDecisions: (projectId: string, filters: DecisionFilters) =>
    api.get(`/projects/${projectId}/decisions`, { params: filters })
      .then((r) => r.data),

  getDecision: (decisionId: string) =>
    api.get(`/decisions/${decisionId}`)
      .then((r) => r.data),

  getDigest: (projectId: string, dateRange: any) =>
    api.get(`/projects/${projectId}/digest`, { params: dateRange })
      .then((r) => r.data)
};
```

---

## Performance Optimization

### Code Splitting

```typescript
// src/router.tsx
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'));
const ExecutiveDigest = lazy(() => import('@/components/ExecutiveDigest'));

export const routes = [
  {
    path: '/projects/:id',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <ProjectDetail />
      </Suspense>
    )
  }
];
```

### Memoization

```typescript
// Prevent unnecessary re-renders
export const DecisionCard = memo(function DecisionCard(props: DecisionCardProps) {
  return (/* ... */);
}, (prev, next) => {
  // Custom comparison logic
  return prev.decision.id === next.decision.id;
});
```

### React Query Cache

```typescript
// Prefetch data before navigation
const queryClient = useQueryClient();

const handleProjectClick = (projectId: string) => {
  queryClient.prefetchQuery({
    queryKey: ['decisions', projectId, defaultFilters],
    queryFn: () => api.getDecisions(projectId, defaultFilters)
  });
  navigate(`/projects/${projectId}`);
};
```

---

## Testing

### Component Tests (Vitest + RTL)

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { DecisionCard } from '@/components/DecisionCard';

describe('DecisionCard', () => {
  it('displays decision and who', () => {
    const decision = {
      id: '1',
      decision_statement: 'Change material',
      who: 'Carlos',
      discipline: 'structural',
      consensus: { structural: 'AGREE' }
    };

    render(
      <DecisionCard decision={decision} onClick={vi.fn()} />
    );

    expect(screen.getByText('Change material')).toBeInTheDocument();
    expect(screen.getByText('Carlos')).toBeInTheDocument();
  });
});
```

---

## Success Criteria

✅ All pages render and route correctly
✅ Decisions display with filters working (5+ disciplines)
✅ Drill-down modal shows transcript + similar decisions
✅ Timeline virtual scrolls 100+ decisions smoothly
✅ Filter state persists during session
✅ Executive digest renders with >5 highlights
✅ Dashboard loads in <2 seconds
✅ Mobile responsive (375px width minimum)
✅ Accessibility: WCAG 2.1 AA compliance

---

**Document Status:** Complete
**Last Updated:** 2026-02-07
**Next:** Deployment & Security Specifications

— Aria, arquitetando o futuro 🏗️
