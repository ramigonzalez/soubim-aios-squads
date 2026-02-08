# Epic 3: Dashboard & Visualization - User Stories

**Epic ID:** E3
**Priority:** 🔴 CRITICAL (MVP core value)
**Duration:** Weeks 4-7 (Parallel with E1/E2)
**Team:** Frontend + Backend API

---

## Story 3.1: Frontend Project Setup

**User Story:**
> As a frontend engineer, I want a React + TypeScript project scaffolded so that I can build the decision dashboard.

**Story Points:** 5
**Assigned to:** @dev (Frontend)
**Duration:** 2-3 days

### Acceptance Criteria

- [ ] React 18 + TypeScript project created via Vite
- [ ] Project structure organized (components, pages, hooks, services, store)
- [ ] Build process working (`npm run dev`, `npm run build`)
- [ ] Type checking enabled (`npm run typecheck`)
- [ ] Linting enabled (`npm run lint`)
- [ ] React Query installed and configured
- [ ] Zustand store set up
- [ ] Tailwind CSS + Shadcn/ui integrated
- [ ] Router setup (React Router v6)

### Project Structure

```
decision-log-frontend/
├── src/
│   ├── components/        # Reusable components
│   │   ├── Timeline.tsx
│   │   ├── Filters.tsx
│   │   ├── DecisionCard.tsx
│   │   └── DrillDown.tsx
│   ├── pages/             # Page components
│   │   ├── Projects.tsx
│   │   ├── ProjectDetail.tsx
│   │   └── Login.tsx
│   ├── hooks/             # Custom hooks
│   │   ├── useDecisions.ts
│   │   ├── useProjects.ts
│   │   └── useAuth.ts
│   ├── services/          # API service layer
│   │   └── api.ts
│   ├── store/             # Zustand state
│   │   └── store.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── .env.example
```

### Testing

- [ ] Project builds without errors
- [ ] Type checking passes
- [ ] Lint passes
- [ ] Dev server starts

---

## Story 3.2: API Service Layer

**User Story:**
> As a frontend developer, I want a centralized API service layer so that all backend calls are consistent and typed.

**Story Points:** 3
**Assigned to:** @dev (Frontend)
**Duration:** 1-2 days

### Acceptance Criteria

- [ ] Fetch wrapper with auth headers
- [ ] JWT token management (read from cookie)
- [ ] Error handling (401, 403, 500, etc.)
- [ ] Request/response types (TypeScript)
- [ ] Base URL configurable (dev/prod)
- [ ] Timeout handling (30s)

### API Service Implementation

```typescript
// src/services/api.ts
class ApiClient {
  private baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const token = this.getToken()
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options?.headers }
    })

    if (!response.ok) {
      if (response.status === 401) this.logout()
      throw new ApiError(response.status, response.statusText)
    }

    return response.json()
  }

  // Convenience methods
  get<T>(endpoint: string) { return this.request<T>(endpoint) }
  post<T>(endpoint: string, data: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST', body: JSON.stringify(data)
    })
  }
}

export const api = new ApiClient()
```

### Testing

- [ ] Unit test: Request construction
- [ ] Integration test: Real API call
- [ ] Error handling test

---

## Story 3.3: Authentication & Login

**User Story:**
> As a user, I want to log in with email/password so that I can access my projects.

**Story Points:** 5
**Assigned to:** @dev (Frontend)
**Duration:** 2-3 days

### Acceptance Criteria

- [ ] Login page (email, password inputs)
- [ ] POST /api/auth/login call
- [ ] JWT token stored in cookie
- [ ] Redirect to projects page on success
- [ ] Error message on failure
- [ ] Protected routes (redirect if no token)
- [ ] User context available globally
- [ ] Logout functionality
- [ ] Session timeout handling

### Login Page Component

```typescript
// src/pages/Login.tsx
function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await api.post('/auth/login', { email, password })
      // Token stored in HTTP-only cookie by backend
      navigate('/projects')
    } catch (err) {
      setError('Invalid credentials')
    }
  }

  return (
    <div className="login-form">
      <form onSubmit={handleLogin}>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        <button type="submit">Login</button>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  )
}
```

### Testing

- [ ] Unit test: Form validation
- [ ] Integration test: Login flow
- [ ] Error test: Invalid credentials

---

## Story 3.4: Projects List View

**User Story:**
> As Gabriela, I want to see all my projects so that I can select which one to view.

**Story Points:** 5
**Assigned to:** @dev (Frontend)
**Duration:** 2-3 days

### Acceptance Criteria

- [ ] Fetch projects from `/api/projects`
- [ ] Display projects in grid/list
- [ ] Show: name, team, decision count, last decision date
- [ ] Click project → navigate to timeline
- [ ] Empty state (no projects)
- [ ] Loading state
- [ ] Responsive design

### Projects Component

```typescript
// src/pages/Projects.tsx
function ProjectsPage() {
  const { data: projects, isLoading } = useQuery('projects', () =>
    api.get('/projects')
  )

  if (isLoading) return <LoadingSpinner />

  return (
    <div className="projects-grid">
      {projects?.map(project => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}
```

### Testing

- [ ] Unit test: Component rendering
- [ ] Integration test: Fetch projects
- [ ] Empty state test
- [ ] Navigation test

---

## Story 3.5: Decision Timeline Component

**User Story:**
> As an architect, I want to see a chronological timeline of all project decisions so that I can understand what was decided and when.

**Story Points:** 8
**Assigned to:** @dev (Frontend)
**Duration:** 3-4 days

### Acceptance Criteria

- [ ] Fetch decisions from `/api/projects/{id}/decisions`
- [ ] Display chronologically (oldest → newest)
- [ ] Group by meeting (meeting headers)
- [ ] Meeting type badges (Client, Multi-disc, Internal)
- [ ] Decision cards show: statement, who, when, discipline, consensus
- [ ] Discipline colors: Architecture=Blue, MEP=Orange, etc.
- [ ] Consensus indicator (green=agree, yellow=mixed, red=dissent)
- [ ] Impact level badge (High/Medium/Low)
- [ ] Virtual scrolling (for 200+ decisions)
- [ ] Click decision → drill-down opens
- [ ] Performance: <2 second load

### Timeline Component

```typescript
// src/components/Timeline.tsx
function Timeline({ projectId }: Props) {
  const { data: decisions, isLoading } = useQuery(
    ['decisions', projectId],
    () => api.get(`/projects/${projectId}/decisions`)
  )

  const grouped = groupBy(decisions, 'meeting_id')

  return (
    <div className="timeline">
      {Object.entries(grouped).map(([meetingId, items]) => (
        <MeetingGroup key={meetingId} meeting={items[0].meeting} decisions={items} />
      ))}
    </div>
  )
}

function DecisionCard({ decision }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div
        className="decision-card"
        onClick={() => setIsOpen(true)}
      >
        <span className={`discipline-badge ${decision.discipline}`}>
          {decision.discipline}
        </span>
        <p className="statement">{decision.statement}</p>
        <span className="who">{decision.who}</span>
        <span className={`consensus ${decision.consensus.overall}`}>
          {decision.consensus.overall}
        </span>
      </div>
      {isOpen && <DrillDownModal decision={decision} onClose={() => setIsOpen(false)} />}
    </>
  )
}
```

### Testing

- [ ] Unit test: Component rendering
- [ ] Integration test: Fetch decisions
- [ ] Virtual scrolling test: 200+ decisions
- [ ] Performance test: <2 second load
- [ ] Click drill-down test

---

## Story 3.6: Filters & Search Sidebar

**User Story:**
> As an architect, I want to filter decisions by date, discipline, and impact so that I can find relevant context quickly.

**Story Points:** 8
**Assigned to:** @dev (Frontend)
**Duration:** 3-4 days

### Acceptance Criteria

- [ ] Date range picker (from/to)
- [ ] Discipline multi-select (checkboxes)
- [ ] Meeting type multi-select
- [ ] Impact level multi-select
- [ ] Consensus multi-select
- [ ] Free-text search input
- [ ] Combined filtering (all work together)
- [ ] Active filter indicators
- [ ] Clear filters button
- [ ] Performance: <200ms per filter change

### Filters Component

```typescript
// src/components/Filters.tsx
function Filters({ projectId }: Props) {
  const [filters, setFilters] = useState({
    fromDate: null,
    toDate: null,
    disciplines: [],
    meetingTypes: [],
    impacts: [],
    consensus: [],
    search: ''
  })

  const handleFilterChange = (newFilters: Partial<Filters>) => {
    const updated = { ...filters, ...newFilters }
    setFilters(updated)

    // Fetch with new filters
    const query = new URLSearchParams()
    if (updated.fromDate) query.append('from_date', updated.fromDate)
    if (updated.disciplines.length) query.append('discipline', updated.disciplines.join(','))
    // ... etc

    refetch(`/projects/${projectId}/decisions?${query}`)
  }

  return (
    <aside className="filters-sidebar">
      <DateRangePicker onChange={d => handleFilterChange({ ...d })} />
      <CheckboxGroup
        label="Discipline"
        options={DISCIPLINES}
        onChange={d => handleFilterChange({ disciplines: d })}
      />
      {/* ... other filters ... */}
      <button onClick={() => setFilters(DEFAULT_FILTERS)}>Clear Filters</button>
    </aside>
  )
}
```

### Testing

- [ ] Unit test: Filter state management
- [ ] Integration test: Filter API calls
- [ ] Combined filtering test
- [ ] Performance test: <200ms per change
- [ ] Clear filters test

---

## Story 3.7: Decision Drill-Down Modal

**User Story:**
> As an architect, I want to click a decision and see full context (transcript, similar decisions, consistency notes) so that I understand the reasoning deeply.

**Story Points:** 8
**Assigned to:** @dev (Frontend)
**Duration:** 3-4 days

### Acceptance Criteria

- [ ] Modal opens on decision click
- [ ] Show: statement, who, when, why, impacts, consensus, confidence
- [ ] Transcript excerpt (5-10 min context)
- [ ] Similar past decisions (3-5 with scores)
- [ ] Consistency notes
- [ ] Anomaly flags (if any)
- [ ] Link to full transcript (open in new tab)
- [ ] Navigation: Previous/next decision
- [ ] Close: Button + Escape key
- [ ] Responsive (full screen on mobile)

### Drill-Down Component

```typescript
// src/components/DrillDown.tsx
function DrillDownModal({ decision, onClose }: Props) {
  const { data: detail } = useQuery(
    ['decision', decision.id],
    () => api.get(`/decisions/${decision.id}`)
  )

  if (!detail) return <LoadingSpinner />

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="close" onClick={onClose}>✕</button>

        <h2>{detail.statement}</h2>
        <p className="metadata">By {detail.who} on {detail.timestamp}</p>

        <section className="transcript-excerpt">
          <h3>Transcript Context</h3>
          <TranscriptExcerpt text={detail.transcript_excerpt} highlight={detail.timestamp} />
        </section>

        <section className="similar-decisions">
          <h3>Similar Past Decisions</h3>
          {detail.similar_decisions?.map(d => (
            <SimilarDecisionCard key={d.id} decision={d} score={d.similarity_score} />
          ))}
        </section>

        <section className="consistency">
          <h3>Consistency Notes</h3>
          <p>{detail.consistency_notes}</p>
        </section>

        {detail.anomaly_flags?.length > 0 && (
          <section className="anomalies">
            <h3>⚠️ Flagged Issues</h3>
            {detail.anomaly_flags.map(flag => (
              <AnomalyFlag key={flag.type} flag={flag} />
            ))}
          </section>
        )}
      </div>
    </div>
  )
}
```

### Testing

- [ ] Unit test: Modal rendering
- [ ] Integration test: Fetch decision detail
- [ ] Transcript display test
- [ ] Similar decisions test
- [ ] Close button test
- [ ] Keyboard escape test

---

## Story 3.8: Gabriela's Executive Digest View

**User Story:**
> As Gabriela, I want a one-page executive summary of what happened while I was away so that I can catch up in <30 minutes.

**Story Points:** 5
**Assigned to:** @dev (Frontend)
**Duration:** 2-3 days

### Acceptance Criteria

- [ ] Endpoint: `/api/projects/{id}/digest`
- [ ] Header: "While you were gone: Dec 15-20"
- [ ] Quick stats: Decisions, meetings, consensus %
- [ ] Categories: Structural, cost, timeline, risk flags
- [ ] Each major decision: Statement, who, impact, consensus
- [ ] Links to timeline for details
- [ ] Printable layout (<2 pages)
- [ ] Weekly auto-generation (optional Phase 1.5)

### Digest Component

```typescript
// src/components/Digest.tsx
function DigestView({ projectId }: Props) {
  const [fromDate, setFromDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  )

  const { data: digest } = useQuery(
    ['digest', projectId, fromDate],
    () => api.get(`/projects/${projectId}/digest?from_date=${fromDate}`)
  )

  if (!digest) return <LoadingSpinner />

  return (
    <div className="digest-container printable">
      <h1>DecisionLog Digest: {digest.project_name}</h1>
      <p className="period">
        Summary: {fromDate} to {new Date()}
      </p>

      <QuickStats stats={digest.summary} />

      <section className="categories">
        <StructuralChanges decisions={digest.structural_changes} />
        <CostImpacts impacts={digest.cost_impacts} />
        <TimelineShifts shifts={digest.timeline_shifts} />
      </section>

      {digest.risk_flags?.length > 0 && (
        <section className="risk-flags">
          <h2>⚠️ Decisions Needing Review</h2>
          {digest.risk_flags.map(flag => (
            <RiskFlag key={flag.id} flag={flag} />
          ))}
        </section>
      )}
    </div>
  )
}
```

### Testing

- [ ] Unit test: Digest rendering
- [ ] Integration test: Fetch digest
- [ ] Print layout test
- [ ] Date range selection test

---

## Story 3.9: API Endpoints - Timeline & Digest

**User Story:**
> As a backend engineer, I want timeline and digest API endpoints so that the frontend can fetch decisions and summaries.

**Story Points:** 8
**Assigned to:** @dev (Backend API)
**Duration:** 3-4 days

### Acceptance Criteria

- [ ] Endpoint: `GET /api/projects/{id}/decisions` (with filters)
- [ ] Endpoint: `GET /api/projects/{id}/decisions/{id}` (drill-down)
- [ ] Endpoint: `GET /api/projects/{id}/digest` (summary)
- [ ] Filtering: date, discipline, meeting_type, impact, consensus, search
- [ ] Pagination: limit, offset
- [ ] Performance: <200ms per endpoint
- [ ] Error handling: 404, 403, 500

### API Endpoints

```python
# Backend API endpoints

@app.get("/api/projects/{project_id}/decisions")
async def list_decisions(
    project_id: str,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None,
    discipline: Optional[str] = None,
    meeting_type: Optional[str] = None,
    impact: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    """List decisions with filters and pagination."""

@app.get("/api/projects/{project_id}/decisions/{decision_id}")
async def get_decision_detail(project_id: str, decision_id: str):
    """Get full decision context with transcript excerpt and similar decisions."""

@app.get("/api/projects/{project_id}/digest")
async def get_project_digest(
    project_id: str,
    from_date: date,
    to_date: Optional[date] = None
):
    """Get executive summary of decisions in date range."""
```

### Testing

- [ ] Unit test: Query construction
- [ ] Integration test: API responses
- [ ] Filter test: Each filter type
- [ ] Pagination test
- [ ] Performance test: <200ms

---

## Story 3.10: Styling & Responsive Design

**User Story:**
> As a UX engineer, I want the dashboard styled and responsive so that it works on desktop, tablet, and mobile.

**Story Points:** 5
**Assigned to:** @dev (Frontend)
**Duration:** 2-3 days

### Acceptance Criteria

- [ ] Tailwind CSS styling applied
- [ ] Responsive breakpoints: Desktop (1024px+), Tablet (768-1023px), Mobile (<768px)
- [ ] Color palette: Discipline colors (#3B82F6, #F97316, etc.)
- [ ] Status colors: Green (high agreement), Yellow (mixed), Red (dissent)
- [ ] Accessibility: WCAG 2.1 AA (color contrast, keyboard nav, etc.)
- [ ] Dark mode support (optional Phase 1.5)

### Responsive Strategy

```css
/* Tailwind responsive classes */
md:grid-cols-2  /* 2 columns on tablet */
lg:grid-cols-3  /* 3 columns on desktop */
hidden md:block  /* Hide on mobile, show on tablet+ */
```

### Testing

- [ ] Desktop view test (1024px+)
- [ ] Tablet view test (768px)
- [ ] Mobile view test (<768px)
- [ ] Color contrast test (WCAG AA)
- [ ] Keyboard navigation test

---

## Epic 3 Summary

**Total Stories:** 10
**Total Points:** 63
**Duration:** 4 weeks (Weeks 4-7, parallel with E1/E2)
**Team:** Frontend (2 developers) + Backend API (1 developer)

### Dependencies
- Depends on E1 (needs decisions data from API)
- Can start Week 4 (API ready)
- Needed before launch (primary user interface)

### Deliverables
✅ Complete React frontend
✅ Timeline dashboard
✅ Filters & search
✅ Drill-down modal
✅ Executive digest
✅ Responsive design
✅ <2 second load time
✅ API endpoints
