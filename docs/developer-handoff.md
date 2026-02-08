# Developer Handoff: Epic 3 Implementation Guide

**Date:** February 8, 2026
**For:** Development Team (Frontend & Backend Engineers)
**Epic:** 3 - Dashboard UI & API Development
**Tech Stack:** React 18 + TypeScript + FastAPI + PostgreSQL + pgvector

---

## Quick Start Guide

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.10+ with pip
- Docker (for PostgreSQL + pgvector)
- Git
- VS Code with TypeScript/Python extensions (recommended)

### Initial Setup

#### Frontend Setup (5 minutes)
```bash
cd frontend
npm install
npm run dev  # Start development server at http://localhost:5173
```

#### Backend Setup (10 minutes)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
docker-compose up -d  # Start PostgreSQL + pgvector
python -m alembic upgrade head  # Run migrations
uvicorn app.main:app --reload  # Start at http://localhost:8000
```

#### Verify Setup
```bash
# Frontend
curl http://localhost:5173  # Should load React app

# Backend
curl http://localhost:8000/api/health  # Should return {"status": "ok"}
```

---

## Architecture Overview

### Frontend Architecture (React 18)

```
src/
├── components/           # Shadcn/ui based components
│   ├── atoms/           # Buttons, Badges, Labels
│   ├── molecules/       # Cards, Forms, Inputs with labels
│   └── organisms/       # Timeline, Modal, Sidebar
├── pages/               # Route components (Dashboard, ProjectDetail, etc.)
├── services/            # API client (Story 3.2)
├── stores/              # Zustand state management
│   ├── authStore.ts     # User authentication state
│   ├── filterStore.ts   # Filters & search state
│   └── projectStore.ts  # Projects & decisions data
├── hooks/               # Custom React hooks
├── utils/               # Helper functions (colors, dates, etc.)
├── types/               # TypeScript interfaces
└── main.tsx            # App entry point
```

### Backend Architecture (FastAPI)

```
app/
├── api/                 # API endpoints (Story 3.9)
│   ├── endpoints/
│   │   ├── decisions.py       # GET /api/projects/{id}/decisions
│   │   ├── decision_detail.py # GET /api/decisions/{id}
│   │   └── digest.py          # GET /api/projects/{id}/digest
│   └── router.py               # API routes registration
├── services/            # Business logic
│   ├── decision_service.py     # Decision queries, filtering
│   ├── digest_service.py       # Digest generation
│   └── similarity_service.py   # Vector search
├── models/              # SQLAlchemy ORM models
│   ├── user.py
│   ├── project.py
│   ├── decision.py
│   └── meeting.py
├── schemas/             # Pydantic request/response models
│   ├── decision.py
│   └── digest.py
├── auth/                # JWT authentication (Story 3.3)
│   ├── jwt_handler.py
│   └── oauth2.py
├── db/                  # Database configuration
│   └── session.py
├── config.py            # Environment configuration
└── main.py              # FastAPI app initialization
```

### Data Flow

```
Frontend Request
    ↓
React Component (e.g., ProjectsList)
    ↓
Zustand Store (filterStore)
    ↓
API Service (api.client.ts)
    ↓
Backend API Endpoint
    ↓
Service Layer (business logic)
    ↓
SQLAlchemy ORM Models
    ↓
PostgreSQL Database
    ↓
Response (JSON)
    ↓
Frontend Store update
    ↓
Component re-render
```

---

## Critical Implementation Patterns

### 1. Frontend: Shadcn/ui Component Usage

All UI components should use Shadcn/ui. This ensures consistency and accessibility.

```typescript
// Good ✅
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function ProjectCard({ project }) {
  return (
    <Card className="hover:shadow-lg transition">
      <CardHeader>
        <CardTitle>{project.name}</CardTitle>
      </CardHeader>
      <CardContent>
        {project.description}
      </CardContent>
    </Card>
  )
}

// Bad ❌
export function ProjectCard({ project }) {
  return (
    <div className="border p-4">
      <h2>{project.name}</h2>
      <p>{project.description}</p>
    </div>
  )
}
```

### 2. Frontend: Atomic Design Structure

Components follow Atomic Design hierarchy:

```
atoms/         # Single responsibility (Button, Badge)
molecules/     # Combination of atoms (Card, InputField)
organisms/     # Complex combinations (Timeline, Modal)
templates/     # Layout structure
pages/         # Full screens (route components)
```

Example: **DecisionCard** (molecule)
```typescript
// atoms/
export const DisciplineBadge = ({ discipline }) => (
  <Badge className={`bg-discipline-${discipline}/10 text-discipline-${discipline}`}>
    {discipline}
  </Badge>
)

// molecules/
export const DecisionCard = ({ decision }) => (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <CardTitle>{decision.statement}</CardTitle>
        <DisciplineBadge discipline={decision.discipline} />
      </div>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-gray-600">{decision.rationale}</p>
    </CardContent>
  </Card>
)

// organisms/
export const Timeline = ({ decisions }) => (
  <div className="space-y-4">
    {decisions.map(d => <DecisionCard key={d.id} decision={d} />)}
  </div>
)
```

### 3. Frontend: Zustand Store Pattern

State management follows a consistent Zustand pattern:

```typescript
// stores/filterStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FilterState {
  // State
  disciplines: string[]
  meetingTypes: string[]
  dateFrom: Date | null
  dateTo: Date | null
  searchQuery: string

  // Actions
  setDisciplines: (disciplines: string[]) => void
  setMeetingTypes: (types: string[]) => void
  setDateRange: (from: Date, to: Date) => void
  setSearchQuery: (query: string) => void
  reset: () => void
}

export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({
      disciplines: [],
      meetingTypes: [],
      dateFrom: null,
      dateTo: null,
      searchQuery: '',

      setDisciplines: (disciplines) => set({ disciplines }),
      setMeetingTypes: (meetingTypes) => set({ meetingTypes }),
      setDateRange: (dateFrom, dateTo) => set({ dateFrom, dateTo }),
      setSearchQuery: (searchQuery) => set({ searchQuery }),
      reset: () => set({
        disciplines: [],
        meetingTypes: [],
        dateFrom: null,
        dateTo: null,
        searchQuery: '',
      }),
    }),
    { name: 'filter-storage' }
  )
)

// Usage in component
function FilterSidebar() {
  const { disciplines, setDisciplines } = useFilterStore()

  return (
    <div>
      {DISCIPLINES.map(d => (
        <Checkbox
          key={d}
          checked={disciplines.includes(d)}
          onCheckedChange={(checked) => {
            if (checked) {
              setDisciplines([...disciplines, d])
            } else {
              setDisciplines(disciplines.filter(x => x !== d))
            }
          }}
        />
      ))}
    </div>
  )
}
```

### 4. Frontend: API Service Pattern

The API service (Story 3.2) is the only place making HTTP requests:

```typescript
// services/apiClient.ts
import axios, { AxiosInstance } from 'axios'

class ApiClient {
  private client: AxiosInstance

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      withCredentials: true, // Include HTTP-only cookies
    })

    // Request interceptor
    this.client.interceptors.request.use((config) => {
      // Token already in cookie, no need to add header
      return config
    })

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          window.location.href = '/login'
        }
        throw error
      }
    )
  }

  // Project endpoints
  getProjects() {
    return this.client.get('/api/projects')
  }

  // Decision endpoints
  getDecisions(projectId: string, filters: DecisionFilters) {
    return this.client.get(`/api/projects/${projectId}/decisions`, { params: filters })
  }

  getDecision(decisionId: string) {
    return this.client.get(`/api/decisions/${decisionId}`)
  }

  // Digest endpoint
  getDigest(projectId: string, dateFrom: string, dateTo: string) {
    return this.client.get(`/api/projects/${projectId}/digest`, {
      params: { date_from: dateFrom, date_to: dateTo }
    })
  }
}

export const api = new ApiClient(import.meta.env.VITE_API_URL)
```

### 5. Backend: FastAPI Endpoint Pattern

All endpoints follow a consistent pattern:

```python
# app/api/endpoints/decisions.py
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.auth.oauth2 import get_current_user
from app.services.decision_service import DecisionService
from app.schemas.decision import DecisionResponse, DecisionListResponse

router = APIRouter(prefix="/api/projects/{project_id}/decisions", tags=["decisions"])

@router.get("", response_model=DecisionListResponse)
async def list_decisions(
    project_id: str,
    # Filters
    discipline: Optional[str] = Query(None),
    meeting_type: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    # Pagination
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    # Auth
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List decisions with filters and pagination"""
    try:
        service = DecisionService(db)

        # Check authorization
        if not service.user_has_project_access(current_user.id, project_id):
            raise HTTPException(status_code=403, detail="Access denied")

        # Build filters
        filters = {
            "project_id": project_id,
            "discipline": discipline,
            "meeting_type": meeting_type,
            "date_from": date_from,
            "date_to": date_to,
            "search": search,
        }

        # Get decisions
        decisions, total = service.get_decisions(filters, skip, limit)

        return DecisionListResponse(
            decisions=[DecisionResponse.from_orm(d) for d in decisions],
            total=total,
            skip=skip,
            limit=limit,
        )
    except Exception as e:
        logger.error(f"Error listing decisions: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch decisions")
```

### 6. Backend: JWT Token Management Pattern

Tokens stored in HTTP-only cookies for security:

```python
# app/auth/jwt_handler.py
from datetime import datetime, timedelta
from jose import JWTError, jwt
from fastapi import HTTPException, status

class JWTHandler:
    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 30

    def create_access_token(self, data: dict) -> str:
        """Create JWT token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(
            minutes=self.access_token_expire_minutes
        )
        to_encode.update({"exp": expire})

        encoded_jwt = jwt.encode(
            to_encode,
            self.secret_key,
            algorithm=self.algorithm
        )
        return encoded_jwt

    def verify_token(self, token: str) -> dict:
        """Verify and decode JWT"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            user_id: str = payload.get("sub")
            if user_id is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token"
                )
            return payload
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )

# app/auth/oauth2.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials

security = HTTPBearer()
jwt_handler = JWTHandler(SECRET_KEY)

async def get_current_user(
    credentials: HTTPAuthCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    """Dependency to get current authenticated user"""
    token = credentials.credentials
    payload = jwt_handler.verify_token(token)
    user_id = payload.get("sub")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user
```

### 7. Database: pgvector for Similarity Search

Vector search for finding similar decisions (Story 3.5, 3.7):

```python
# app/models/decision.py
from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, String, Float, Text, LargeBinary

class Decision(Base):
    __tablename__ = "decisions"

    id = Column(String, primary_key=True)
    project_id = Column(String, ForeignKey("projects.id"))
    statement = Column(String, index=True)
    embedding = Column(Vector(1536))  # OpenAI embeddings dimension
    # ... other fields

# app/services/similarity_service.py
from sqlalchemy.orm import Session
from app.models.decision import Decision

class SimilarityService:
    def __init__(self, db: Session):
        self.db = db

    def find_similar_decisions(
        self,
        decision_id: str,
        project_id: str,
        limit: int = 5
    ) -> List[Dict]:
        """Find similar decisions using pgvector"""
        decision = self.db.query(Decision).filter(
            Decision.id == decision_id
        ).first()

        if not decision or not decision.embedding:
            return []

        # Cosine similarity search
        similar = self.db.query(Decision).filter(
            Decision.project_id == project_id,
            Decision.id != decision_id
        ).order_by(
            Decision.embedding.cosine_distance(decision.embedding)
        ).limit(limit).all()

        return [
            {
                "decision_id": d.id,
                "statement": d.statement,
                "similarity_score": 1 - (
                    decision.embedding.cosine_distance(d.embedding)
                )
            }
            for d in similar
        ]
```

---

## Common Integration Points

### Frontend ↔ Backend Integration

#### 1. Authentication Flow
```
User enters credentials
  ↓
POST /api/login (Story 3.3)
  ↓
Backend creates JWT token, sets HTTP-only cookie
  ↓
Frontend receives success response, stores in Zustand
  ↓
All subsequent requests include cookie (automatic)
  ↓
Protected routes check token validity
```

#### 2. Decision Timeline (Story 3.5) ↔ API (Story 3.9)
```
User opens project detail
  ↓
Frontend calls GET /api/projects/{id}/decisions
  ↓
Backend applies filters (discipline, date_from, date_to, search)
  ↓
Frontend renders Timeline with DecisionCards
  ↓
User clicks decision card
  ↓
GET /api/decisions/{id} for full detail
  ↓
Modal displays transcript, similar decisions (vector search)
```

#### 3. Filters/Search (Story 3.6) ↔ API (Story 3.9)
```
User checks "Architecture" discipline filter
  ↓
Zustand filterStore updates
  ↓
useEffect triggers API call with filters
  ↓
GET /api/projects/{id}/decisions?discipline=architecture&search=...
  ↓
Frontend Timeline re-renders with filtered data
  ↓
URL updates for shareable filtered views
```

#### 4. Digest View (Story 3.8) ↔ Digest API (Story 3.9)
```
User selects date range (Last 7 days)
  ↓
Frontend calls GET /api/projects/{id}/digest?date_from=X&date_to=Y
  ↓
Backend aggregates stats (total decisions, consensus %, etc.)
  ↓
Backend categorizes highlights (structural, cost, timeline, risk)
  ↓
Frontend displays stat cards + highlight categories
  ↓
Print layout optimized for 1-2 pages
```

---

## Error Handling Strategy

### Frontend Error Handling

```typescript
// Generic try-catch pattern
async function fetchDecisions() {
  try {
    setLoading(true)
    setError(null)

    const response = await api.getDecisions(projectId, filters)
    setDecisions(response)
  } catch (error) {
    // User-friendly error message
    if (error.response?.status === 403) {
      setError("You don't have permission to view this project")
    } else if (error.response?.status === 401) {
      // Auto-redirect to login handled by API service
      setError("Your session expired. Please login again.")
    } else {
      setError("Failed to load decisions. Please try again.")
    }
    logger.error("Error fetching decisions:", error)
  } finally {
    setLoading(false)
  }
}

// Always show loading state to user
function DecisionsList() {
  const [decisions, setDecisions] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return <Skeleton className="h-64" />
  if (error) return <Alert variant="destructive">{error}</Alert>

  return <Timeline decisions={decisions} />
}
```

### Backend Error Handling

```python
# Consistent error response format
from fastapi import HTTPException

# Bad - vague error ❌
raise HTTPException(status_code=400, detail="Bad request")

# Good - specific error ✅
raise HTTPException(
    status_code=403,
    detail="You don't have permission to access this project"
)

# Very good - include user context ✅
logger.error(f"User {user_id} attempted unauthorized access to project {project_id}")
raise HTTPException(
    status_code=403,
    detail="You don't have permission to access this project. Contact project owner."
)
```

---

## Performance Optimization Checklist

### Frontend
- [ ] Code splitting with React.lazy() for route components
- [ ] Image optimization (WebP format, responsive sizes)
- [ ] Debounce search input (300ms per Story 3.6)
- [ ] Virtualization for long lists (react-window)
- [ ] Memoize expensive computations (useMemo, useCallback)
- [ ] Lazy load filters sidebar (story 3.6)
- [ ] Monitor Core Web Vitals (Lighthouse)

### Backend
- [ ] Database indexes on frequently queried columns
  - decision.discipline
  - decision.project_id
  - decision.created_at
  - meeting.meeting_type
- [ ] Query optimization (select only needed fields)
- [ ] Pagination (Story 3.9: max 100 per page)
- [ ] Redis caching for facet calculations (optional)
- [ ] Response compression (gzip)

### API Performance Targets (Story 3.9)
- `GET /api/projects/{id}/decisions`: < 200ms
- `GET /api/decisions/{id}`: < 300ms
- `GET /api/projects/{id}/digest`: < 500ms

**Monitoring:** Add timing logs to services
```python
import time
from functools import wraps

def log_timing(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        elapsed = time.time() - start
        logger.info(f"{func.__name__} took {elapsed:.2f}s")
        return result
    return wrapper

@log_timing
def get_decisions(self, filters, skip, limit):
    # ... implementation
    pass
```

---

## Testing Strategies

### Frontend Testing Example

```typescript
// components/__tests__/DecisionCard.test.tsx
import { render, screen } from '@testing-library/react'
import { DecisionCard } from '../DecisionCard'

describe('DecisionCard', () => {
  it('renders decision statement', () => {
    const decision = {
      id: '1',
      statement: 'Use PostgreSQL',
      discipline: 'architecture',
      rationale: 'Proven reliability'
    }

    render(<DecisionCard decision={decision} />)

    expect(screen.getByText('Use PostgreSQL')).toBeInTheDocument()
    expect(screen.getByText('architecture')).toBeInTheDocument()
  })

  it('displays discipline badge with correct color', () => {
    const decision = {
      id: '1',
      statement: 'Use PostgreSQL',
      discipline: 'architecture',
    }

    render(<DecisionCard decision={decision} />)

    const badge = screen.getByText('architecture')
    expect(badge).toHaveClass('text-discipline-architecture')
  })

  it('accessibility: has proper semantic structure', () => {
    const decision = { /* ... */ }
    const { container } = render(<DecisionCard decision={decision} />)

    // Check for semantic elements
    expect(container.querySelector('h3')).toBeInTheDocument() // Title
    expect(container.querySelector('p')).toBeInTheDocument() // Content
  })
})
```

### Backend Testing Example

```python
# tests/api/test_decisions.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def auth_headers(test_user, test_token):
    return {"Authorization": f"Bearer {test_token}"}

def test_list_decisions_success(auth_headers, test_project):
    response = client.get(
        f"/api/projects/{test_project.id}/decisions",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "decisions" in data
    assert "total" in data
    assert "skip" in data
    assert "limit" in data

def test_list_decisions_with_discipline_filter(auth_headers, test_project):
    response = client.get(
        f"/api/projects/{test_project.id}/decisions?discipline=architecture",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    # Verify all decisions have matching discipline
    assert all(d["discipline"] == "architecture" for d in data["decisions"])

def test_list_decisions_unauthorized(test_project):
    """User without access should get 403"""
    response = client.get(f"/api/projects/{test_project.id}/decisions")
    assert response.status_code == 401

def test_list_decisions_performance(auth_headers, test_project, benchmark):
    """Verify endpoint meets <200ms performance target"""
    def fetch():
        return client.get(
            f"/api/projects/{test_project.id}/decisions",
            headers=auth_headers
        )

    result = benchmark(fetch)
    assert result.status_code == 200
    # If using pytest-benchmark, it will fail if >200ms
```

---

## Debugging Tips & Common Gotchas

### Frontend Debugging

**Issue:** Token expires mid-session
```typescript
// Solution: Check API service interceptor for 401 handling
// Auto-redirect to login when token expires
this.client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login'
    }
    throw error
  }
)
```

**Issue:** Filters not persisting after page reload
```typescript
// Solution: Ensure Zustand store has persist middleware
export const useFilterStore = create<FilterState>()(
  persist(
    (set) => ({ /* ... */ }),
    { name: 'filter-storage' }  // This key enables localStorage
  )
)
```

**Issue:** Colors not applying to discipline badges
```typescript
// Problem ❌ - Tailwind doesn't purge custom colors
<div className={`bg-discipline-${discipline}`}>

// Solution ✅ - Use explicit color mapping
const colorMap = {
  architecture: 'bg-discipline-mep',
  engineering: 'bg-discipline-eng',
  // ...
}
<div className={colorMap[discipline]}>
```

### Backend Debugging

**Issue:** pgvector similarity search returns no results
```python
# Check if embeddings exist
SELECT COUNT(*) FROM decisions WHERE embedding IS NOT NULL;

# Check if vector column is properly indexed
CREATE INDEX decisions_embedding_idx ON decisions USING ivfflat (embedding vector_cosine_ops);
```

**Issue:** JWT token validation failing
```python
# Debug token generation
token = jwt_handler.create_access_token({"sub": user_id})
print(f"Generated token: {token}")

# Debug token verification
payload = jwt_handler.verify_token(token)
print(f"Token payload: {payload}")
```

**Issue:** API returning 500 instead of helpful 400 error
```python
# Always catch and log specific errors
try:
    # validation
except ValueError as e:
    logger.error(f"Validation error: {e}")
    raise HTTPException(status_code=400, detail=f"Invalid input: {str(e)}")
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    raise HTTPException(status_code=500, detail="Internal server error")
```

---

## Environment Configuration

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:8000
VITE_JWT_TOKEN_NAME=access_token
VITE_ENV=development
```

### Backend (.env)
```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/synkra_aios
DATABASE_ECHO=true  # Log SQL queries

# JWT
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Environment
ENVIRONMENT=development
LOG_LEVEL=debug
```

---

## Story-Specific Implementation Notes

### Story 3.1: Frontend Project Setup
- Install exact versions listed (Vite 5, React 18, TypeScript 5.3+)
- Configure Tailwind with custom color extension for discipline colors
- Setup path aliases (@/components, @/pages, etc.)
- Install Shadcn/ui components (only install as needed, don't pre-install all)

### Story 3.2: API Service Layer
- Create a single axios instance exported as `api`
- All HTTP requests must go through this service
- Token management is automatic (stored in HTTP-only cookie)
- Error responses must be user-friendly, not cryptic codes

### Story 3.3: Authentication & Login
- Password input must show visibility toggle (critical for mobile UX)
- Store user session in Zustand with localStorage persistence
- ProtectedRoute component should redirect to /login if no valid token
- Logout must clear all stored data and remove cookies

### Story 3.4: Projects List
- Use Shadcn/ui Card component
- Responsive: 1 column (mobile < 768px), 2 columns (768-1024px), 3 columns (≥1024px)
- Touch targets must be ≥44px for mobile accessibility
- Project cards should link to detailed view

### Story 3.5: Decision Timeline
- Use Atomic Design: Timeline organism → MeetingGroup molecule → DecisionCard molecule
- Color system: bg-discipline-{name}/10 for background, text-discipline-{name} for text
- Render multiple meetings, each with multiple decisions grouped chronologically
- Clicking a decision should open drill-down modal (Story 3.7)

### Story 3.6: Filters & Search
- Zustand store should persist to localStorage
- Debounce search input by 300ms to reduce API calls
- Multi-select checkboxes for discipline, meeting_type
- Date range picker with preset options (Last 7/30/90 days)
- URL parameters should reflect current filters for shareable views

### Story 3.7: Drill-down Modal
- 3 tabs: Overview (decision + rationale), Transcript (highlighted), Similar (vector search results)
- Transcript highlighting: amber background (bg-amber-100) with left border
- Modal should be full-screen on mobile, centered max-width-900px on desktop
- Similar decisions section shows other related decisions from the project

### Story 3.8: Executive Digest
- 4 stat cards (total decisions, meetings, consensus %, high-impact)
- 4 highlight categories (structural, cost impacts, timeline, risk flags)
- Date range selector with quick presets
- Print-friendly layout (< 2 pages A4)

### Story 3.9: API Endpoints
- GET /api/projects/{id}/decisions: Filter by discipline, meeting_type, date_range, search
- GET /api/decisions/{id}: Full detail with transcript, similar decisions, consistency notes
- GET /api/projects/{id}/digest: Stats + categorized highlights with date filtering
- All endpoints require authentication (JWT token)
- Response times: <200ms (list), <300ms (detail), <500ms (digest)

### Story 3.10: Styling & Responsive
- Mobile-first: start with mobile styles, use media queries for larger screens
- Breakpoints: 375px (mobile), 768px (tablet), 1024px (desktop)
- Responsive padding: px-4 (mobile) → px-6 (tablet) → px-8 (desktop)
- Color palette includes all disciplines + consensus/impact colors
- Print CSS: Hide navigation, optimize spacing for A4/Letter paper

---

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing (npm test + pytest)
- [ ] No console errors (npm run lint)
- [ ] TypeScript strict mode passing (npm run typecheck)
- [ ] Performance targets met (lighthouse 90+)
- [ ] Accessibility audit passed (WCAG 2.1 AA)
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] API responses match Story 3.9 spec
- [ ] JWT token refresh logic tested
- [ ] Vector search tested with sample data
- [ ] Print layout tested (Story 3.8)

### Deployment
- [ ] Database migrations run (alembic upgrade head)
- [ ] Backend deployed + health check passed
- [ ] Frontend build optimized (npm run build)
- [ ] Frontend deployed to CDN/static hosting
- [ ] API endpoints accessible from frontend domain
- [ ] CORS headers configured correctly
- [ ] Rate limiting enabled on auth endpoints
- [ ] Monitoring and logging configured

### Post-Deployment
- [ ] Verify login flow works
- [ ] Test decision timeline displays correctly
- [ ] Verify filters work across all combinations
- [ ] Test digest generation with real data
- [ ] Monitor API response times
- [ ] Check error logs for issues
- [ ] Get stakeholder sign-off

---

## Quick Reference

### Common Commands

**Frontend**
```bash
npm run dev      # Start dev server
npm test         # Run tests
npm run lint     # Check code style
npm run typecheck # TypeScript checking
npm run build    # Production build
```

**Backend**
```bash
python -m pytest                    # Run tests
python -m black .                   # Format code
python -m flake8 .                  # Lint code
alembic revision --autogenerate     # Create migration
alembic upgrade head                # Run migration
uvicorn app.main:app --reload       # Start dev server
```

**Database**
```bash
psql postgresql://user:pass@localhost:5432/synkra_aios
\dt  # List tables
\d decisions  # Describe table
\i schema.sql  # Import schema
```

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-08 | Dev Team | Initial creation |

**Next Review:** End of Week 1 (after foundation setup)
**Maintainer:** Development Team Lead

---

*This handoff document is a living resource. Update it as you encounter new patterns, debugging tips, or gotchas during implementation.*
