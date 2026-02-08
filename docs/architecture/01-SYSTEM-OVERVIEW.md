# DecisionLog Full-Stack Architecture

**Document Version:** 1.0
**Created:** 2026-02-07
**Owner:** @architect (Aria)
**Status:** Design Phase (Ready for Implementation)
**Audience:** Development Team (@dev), DevOps (@devops), Product Owner (@po)

---

## Executive Summary

DecisionLog is a decision-centric documentation system that captures architectural project decisions from Google Meet transcripts, analyzes them with AI, and surfaces them through a project timeline dashboard.

**Key Architectural Decisions:**

- **Repository Strategy:** Two separate repositories (backend + frontend) for independent deployment
- **Backend:** Python 3.11 + FastAPI + SQLAlchemy
- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Database:** PostgreSQL + pgvector (Supabase)
- **Agent Framework:** LangGraph + Anthropic Claude SDK
- **Embeddings:** sentence-transformers (local, free)
- **Infrastructure:** Railway/Render (backend), Vercel (frontend), Supabase (database)
- **Cost:** ~$25-35/month MVP budget
- **Timeline:** 6-8 weeks to production launch

---

## System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER (Vercel)                       │
├──────────────────────────────────────────────────────────────────┤
│                   React 18 + TypeScript Frontend                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ • Timeline Dashboard (decisions by meeting)               │    │
│  │ • Filters (discipline, date, meeting type, consensus)    │    │
│  │ • Decision Drill-Down (full context + transcript)        │    │
│  │ • Gabriela's Executive Digest (catch-up summary)         │    │
│  └──────────────────────────────────────────────────────────┘    │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTPS REST API
                             │ JWT Authorization
┌────────────────────────────▼─────────────────────────────────────┐
│                   API GATEWAY (Railway/Render)                    │
├──────────────────────────────────────────────────────────────────┤
│                   FastAPI Backend (Python 3.11)                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │ Routes:                                                   │    │
│  │ • /api/auth/*          Authentication (JWT)              │    │
│  │ • /api/projects/*      Project CRUD                      │    │
│  │ • /api/decisions/*     Decision queries + filters        │    │
│  │ • /api/digest/*        Executive summaries               │    │
│  │ • /webhooks/transcript Tactiq webhook receiver           │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────┬──────────────────────────┬───────────────────────────────┘
       │                          │
       │ SQLAlchemy ORM           │ APScheduler Queue
       │ Async Operations         │ LangGraph Agent
       │                          │
┌──────▼────────────────┐  ┌──────▼──────────────────────────────┐
│   DATA LAYER          │  │   EXTRACTION PIPELINE                │
│   (Supabase)          │  │   (Decision Intelligence)            │
├───────────────────────┤  ├──────────────────────────────────────┤
│ PostgreSQL 15 + pgvec │  │ 1. Claude Extraction                 │
│                       │  │    (Full transcript → 30-50 decisions)│
│ Tables:               │  │    Cost: ~$0.10/meeting              │
│ • users               │  │                                      │
│ • projects            │  │ 2. Agent Tools (5 tools)             │
│ • project_members     │  │    • retrieve_similar_decisions      │
│ • transcripts         │  │    • validate_consistency            │
│ • decisions           │  │    • extract_context                 │
│ • decision_relations  │◄─┤    • calculate_confidence            │
│                       │  │    • flag_anomalies                  │
│ Indexes:              │  │                                      │
│ • By project_id       │  │ 3. Vector Embeddings                 │
│ • By discipline       │  │    (sentence-transformers, local)    │
│ • By created_at       │  │    Cost: Free, latency <100ms        │
│ • By confidence       │  │                                      │
│                       │  │ 4. Store & Relate                    │
│ Vector Search:        │  │    (PostgreSQL + pgvector)           │
│ • 384-dim embeddings  │  │    Latency: <2 min total             │
│ • Cosine similarity   │  │                                      │
│ • Exact search (MVP)  │  └──────────┬──────────────────────────┘
└───────────────────────┘             │
                    ▲                  │ Decisions + Embeddings
                    └──────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                              │
├──────────────────────────────────────────────────────────────────┤
│ • Tactiq (https://tactiq.io)                                     │
│   - Captures Google Meet transcripts                             │
│   - Webhook delivery: POST /webhooks/transcript                  │
│                                                                  │
│ • Anthropic Claude API                                           │
│   - Model: Claude 3.5 Sonnet                                     │
│   - Direct SDK (not LangChain abstraction)                       │
│   - Budget: ~$15/month                                           │
│                                                                  │
│ • Sentry (Error Tracking)                                        │
│   - Backend + Frontend errors                                    │
│   - Cost: Free tier (5K errors/month)                            │
└──────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Capture Phase

**Trigger:** Google Meet ends → Tactiq captures transcript

```
Google Meet (4 hours)
        ↓
Tactiq processes transcript + extracts metadata
        ↓
Webhook: POST /api/webhooks/transcript
        ↓
Backend stores raw transcript
Response: 202 Accepted (async processing)
```

**Payload Example:**

```json
{
  "webhook_id": "tactiq_12345",
  "meeting_id": "google_meet_abc",
  "project_id": "soubim_tower_alpha",
  "meeting_type": "multi-disciplinary",
  "participants": [
    {"name": "Gabriela", "email": "g@soubim.com", "role": "director"},
    {"name": "Carlos", "email": "c@mep.com", "role": "mep_engineer"}
  ],
  "transcript": "FULL MEETING TRANSCRIPT TEXT (20K tokens)...",
  "duration_minutes": 240,
  "meeting_date": "2026-02-01T14:00:00Z"
}
```

### 2. Extraction Phase (LangGraph Agent)

**Trigger:** APScheduler queues extraction task

**Step 1: Initial Extraction (Claude)**

```
Input: Full transcript text
LLM: Claude 3.5 Sonnet

System Prompt:
"Extract all FINAL decisions from this architectural meeting.
A decision is FINAL when: clear commitment made, action assigned,
change agreed upon by relevant parties.

For each decision extract:
1. statement (concise)
2. who (speaker)
3. timestamp (HH:MM:SS)
4. discipline (architecture, mep, etc.)
5. why (reasoning context)
6. causation (what triggered)
7. impacts (timeline/budget/scope changes)
8. consensus (AGREE/DISAGREE/ABSTAIN by discipline)"

Output: JSON array of 30-50 decisions
Cost: ~$0.10 per meeting
Latency: ~2-5 seconds
```

**Step 2: Enrich Each Decision (Agent Tools Loop)**

For each raw decision:

```
Tool 1: retrieve_similar_decisions
├── Vector search in pgvector
├── WHERE project_id = SAME_PROJECT_ID
├── LIMIT 5 past decisions
└── Cost: <0.001 (local search)

Tool 2: validate_decision_consistency
├── Claude analyzes: Does it align with past decisions?
├── Returns: consistency_score (0.0-1.0)
└── Cost: ~$0.01 per decision

Tool 3: extract_decision_context
├── Already completed in Step 1 (full transcript context)
└── Cost: Included in Step 1

Tool 4: calculate_confidence_score
├── Formula: (consensus * 0.5) + (consistency * 0.3) + (historical * 0.2)
├── Returns: confidence (0.0-1.0)
└── Cost: <0.001 (local computation)

Tool 5: flag_anomalies
├── Detect: High dissent, reversal patterns, broad cascades
├── Returns: Array of flags for review
└── Cost: <0.001 (local computation)
```

**Step 3: Generate Embeddings**

```
For each decision:
  embedding = sentence_transformers.encode(decision_statement)
  # 384-dimensional vector
  # Model: all-MiniLM-L6-v2 (22MB, MIT license)
  # Latency: <100ms per decision
  # Cost: Free (local, no API calls)
```

**Step 4: Store in PostgreSQL**

```
INSERT INTO decisions (
  project_id, transcript_id,
  decision_statement, who, timestamp, discipline,
  why, causation, impacts, consensus,
  confidence, similar_decisions, consistency_notes, anomaly_flags,
  embedding,
  created_at
) VALUES (...)

Total latency for 4-hour meeting:
  Initial extraction: 2-5 seconds
  + Enrich 30 decisions: 30 × (0.001 + 0.01 + 0.001 + 0.001) ≈ 330ms
  + Embeddings: 30 × 0.1 ≈ 3 seconds
  + Storage: ~1 second
  ────────────────────────────
  Total: ~6-9 seconds actual API time
  Wall-clock time: <2 minutes (includes queueing)

Cost per meeting (4 hours):
  Initial extraction: $0.10
  + 30 validations × $0.01: $0.30
  ─────────────────────────
  Total: ~$0.40 per meeting
```

### 3. Query Phase (Frontend)

**User requests decisions:**

```
GET /api/projects/{project_id}/decisions
  ?discipline=architecture
  &meeting_type=multi-disciplinary
  &date_from=2026-01-01
  &confidence_min=0.8
```

**Database query:**

```sql
SELECT id, decision_statement, who, timestamp, discipline,
       why, causation, impacts, consensus, confidence,
       anomaly_flags, created_at
FROM decisions
WHERE project_id = 'uuid'
  AND discipline = 'architecture'
  AND meeting_type = 'multi-disciplinary'
  AND created_at >= '2026-01-01'
  AND confidence >= 0.8
ORDER BY created_at DESC
LIMIT 50 OFFSET 0;

-- Latency: <50ms (indexed query)
```

**Frontend rendering:**

```
React component receives 50 decisions
├── Group by transcript (meeting)
├── Render as timeline cards
├── React Query caches result (5 min stale time)
└── Total UI latency: <1 second
```

### 4. Drill-Down Phase

**User clicks decision:**

```
GET /api/decisions/{decision_id}

Response includes:
├── Full decision details
├── 5-10 minute transcript excerpt (around timestamp)
├── Similar past decisions (with similarity scores)
├── Consistency notes
├── Meeting context (date, participants, type)
└── Latency: <1 second
```

---

## Repository Structure

### Backend Repository (`decision-log-backend`)

```
decision-log-backend/
├── app/
│   ├── main.py                     # FastAPI app initialization
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── auth.py             # POST /auth/login, /logout
│   │   │   ├── projects.py         # GET /projects, /projects/{id}
│   │   │   ├── decisions.py        # GET /decisions (with filters)
│   │   │   ├── digest.py           # GET /digest (Gabriela summary)
│   │   │   └── webhooks.py         # POST /webhooks/transcript
│   │   │
│   │   ├── models/
│   │   │   ├── auth.py             # LoginRequest, TokenResponse
│   │   │   ├── decision.py         # DecisionResponse
│   │   │   ├── project.py          # ProjectResponse
│   │   │   └── webhook.py          # WebhookPayload
│   │   │
│   │   └── middleware/
│   │       ├── auth.py             # JWT validation
│   │       ├── cors.py             # CORS policy
│   │       └── logging.py          # Structured logging
│   │
│   ├── database/
│   │   ├── models.py               # SQLAlchemy ORM (User, Project, Decision)
│   │   ├── session.py              # DB connection + pooling
│   │   ├── crud.py                 # CRUD operations
│   │   └── migrations/             # Alembic (auto-managed)
│   │
│   ├── services/
│   │   ├── auth_service.py         # User auth + JWT
│   │   ├── project_service.py      # Project queries
│   │   ├── decision_service.py     # Decision queries + filters
│   │   └── digest_service.py       # Generate digest summary
│   │
│   ├── extraction/
│   │   ├── agent.py                # LangGraph workflow
│   │   ├── llm.py                  # Claude API calls (Anthropic SDK)
│   │   ├── embeddings.py           # sentence-transformers setup
│   │   ├── tools/
│   │   │   ├── retrieve.py         # retrieve_similar_decisions tool
│   │   │   ├── validate.py         # validate_consistency tool
│   │   │   ├── confidence.py       # calculate_confidence_score tool
│   │   │   └── anomalies.py        # flag_anomalies tool
│   │   └── scheduler.py            # APScheduler task queue
│   │
│   ├── config.py                   # Settings (Pydantic BaseSettings)
│   │
│   └── utils/
│       ├── security.py             # Password hashing, JWT generation
│       ├── logger.py               # Structured logging
│       └── constants.py            # Enums, constants
│
├── requirements.txt                # Python dependencies
│   # Key packages:
│   # fastapi==0.104.1
│   # sqlalchemy==2.0.23
│   # pydantic==2.5.0
│   # anthropic==0.7.0
│   # langgraph==0.0.15
│   # langchain==0.1.0
│   # sentence-transformers==2.2.2
│   # psycopg==3.1.12 (PostgreSQL driver)
│   # aiosched==1.0.0 (APScheduler)
│   # pydantic-settings==2.0.3
│   # pytest==7.4.3
│
├── alembic.ini                     # Database migration config
├── .env.example
├── .gitignore
├── tests/
│   ├── conftest.py                 # Pytest fixtures
│   ├── unit/                       # Unit tests
│   │   ├── test_auth.py
│   │   ├── test_extraction.py
│   │   └── test_tools.py
│   ├── integration/                # Integration tests
│   │   ├── test_api.py
│   │   └── test_webhook.py
│   └── e2e/                        # E2E tests
│       └── test_workflow.py
│
├── README.md                       # Setup instructions
└── pyproject.toml                  # Build configuration

Total Backend Lines of Code (MVP):
├── routes + middleware: ~800 lines
├── services: ~1200 lines
├── database + ORM: ~600 lines
├── extraction pipeline: ~1500 lines
├── tests: ~1000 lines
└── Total: ~5100 lines Python
```

### Frontend Repository (`decision-log-frontend`)

```
decision-log-frontend/
├── src/
│   ├── components/
│   │   ├── timeline/
│   │   │   ├── Timeline.tsx        # Main timeline view
│   │   │   ├── MeetingGroup.tsx    # Decisions grouped by meeting
│   │   │   ├── DecisionCard.tsx    # Individual decision card
│   │   │   └── Consensus.tsx       # Consensus indicator
│   │   │
│   │   ├── filters/
│   │   │   ├── Filters.tsx         # Filter panel
│   │   │   ├── DisciplineFilter.tsx
│   │   │   ├── DateRangeFilter.tsx
│   │   │   └── MeetingTypeFilter.tsx
│   │   │
│   │   ├── drill-down/
│   │   │   ├── DrillDownModal.tsx  # Decision detail modal
│   │   │   ├── TranscriptExcerpt.tsx
│   │   │   ├── SimilarDecisions.tsx
│   │   │   └── MetadataSection.tsx
│   │   │
│   │   ├── digest/
│   │   │   ├── ExecutiveDigest.tsx # Gabriela's summary
│   │   │   ├── DigestCard.tsx
│   │   │   └── DigestMetrics.tsx
│   │   │
│   │   └── common/
│   │       ├── Navigation.tsx
│   │       ├── LoadingSpinner.tsx
│   │       └── ErrorBoundary.tsx
│   │
│   ├── pages/
│   │   ├── Login.tsx               # Authentication page
│   │   ├── Projects.tsx            # Project list
│   │   ├── ProjectDetail.tsx       # Timeline + filters
│   │   └── NotFound.tsx
│   │
│   ├── hooks/
│   │   ├── useDecisions.ts         # React Query hooks
│   │   ├── useFilters.ts           # Filter state
│   │   ├── useAuth.ts              # Auth context
│   │   └── useDebounce.ts          # Debouncing utility
│   │
│   ├── services/
│   │   ├── api.ts                  # Axios + interceptors
│   │   ├── auth.ts                 # Auth service
│   │   └── decision.ts             # Decision API calls
│   │
│   ├── store/
│   │   └── filterStore.ts          # Zustand (client state)
│   │
│   ├── types/
│   │   ├── decision.ts
│   │   ├── project.ts
│   │   ├── auth.ts
│   │   └── api.ts
│   │
│   ├── App.tsx                     # Root component
│   ├── main.tsx                    # Entry point
│   └── router.tsx                  # React Router config
│
├── public/
│   └── favicon.svg
│
├── package.json
│   # Key dependencies:
│   # react==18.2.0
│   # typescript==5.3.3
│   # react-query==3.39.3
│   # zustand==4.4.1
│   # react-router-dom==6.20.0
│   # axios==1.6.2
│   # recharts==2.10.3
│   # @tanstack/react-table==8.13.0
│   # @radix-ui/ui (shadcn/ui deps)
│   # tailwindcss==3.3.6
│   # vitest==1.0.4
│   # @testing-library/react==14.1.2
│
├── vite.config.ts
├── vitest.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── .env.example
├── .gitignore
├── README.md
└── tests/
    ├── components/
    ├── hooks/
    └── integration/

Total Frontend Lines of Code (MVP):
├── components: ~2500 lines TSX
├── hooks + services: ~800 lines TS
├── pages: ~600 lines TS
├── tests: ~1000 lines
└── Total: ~4900 lines TypeScript
```

---

## Database Schema

### Tables

#### `users`

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,  -- bcrypt($12)
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,  -- 'director', 'architect', 'client'
    created_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,

    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
);
```

#### `projects`

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    archived_at TIMESTAMP,

    INDEX idx_projects_created (created_at),
    INDEX idx_projects_archived (archived_at)
);
```

#### `project_members`

```sql
CREATE TABLE project_members (
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,  -- 'owner', 'member', 'viewer'
    created_at TIMESTAMP DEFAULT NOW(),

    PRIMARY KEY (project_id, user_id),
    INDEX idx_project_members_user (user_id)
);
```

#### `transcripts`

```sql
CREATE TABLE transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id VARCHAR(255) UNIQUE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    meeting_id VARCHAR(255),
    meeting_type VARCHAR(50),  -- 'client', 'multi-disciplinary', 'internal'
    participants JSONB NOT NULL,  -- [{ name, email, role }]
    transcript_text TEXT NOT NULL,
    duration_minutes INTEGER,
    meeting_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_transcripts_project (project_id),
    INDEX idx_transcripts_date (meeting_date),
    INDEX idx_transcripts_type (meeting_type)
);
```

#### `decisions`

```sql
CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    transcript_id UUID REFERENCES transcripts(id) ON DELETE CASCADE,

    -- Core decision data
    decision_statement TEXT NOT NULL,
    who VARCHAR(255) NOT NULL,
    timestamp VARCHAR(20) NOT NULL,  -- HH:MM:SS
    discipline VARCHAR(100) NOT NULL,

    -- Context & reasoning
    why TEXT NOT NULL,
    causation TEXT,

    -- Impacts & consensus
    impacts JSONB,  -- [{ type: 'timeline|budget|scope', change: '...' }]
    consensus JSONB NOT NULL,  -- { discipline: 'AGREE|DISAGREE|ABSTAIN' }

    -- Agent enrichment
    confidence FLOAT CHECK (confidence BETWEEN 0 AND 1),
    similar_decisions JSONB,  -- [{ decision_id, similarity }]
    consistency_notes TEXT,
    anomaly_flags JSONB,  -- [{ type, severity, description }]

    -- Vector embedding (pgvector)
    embedding vector(384),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Indexes for filtering
    INDEX idx_decisions_project (project_id),
    INDEX idx_decisions_discipline (discipline),
    INDEX idx_decisions_confidence (confidence),
    INDEX idx_decisions_created (created_at DESC),
    INDEX idx_decisions_composite (project_id, discipline, created_at DESC)
);
```

#### `decision_relationships`

```sql
CREATE TABLE decision_relationships (
    from_decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE,
    to_decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50),  -- 'triggered', 'reversed', 'conflicts', 'supports'
    created_at TIMESTAMP DEFAULT NOW(),

    PRIMARY KEY (from_decision_id, to_decision_id, relationship_type),
    INDEX idx_relationships_from (from_decision_id),
    INDEX idx_relationships_to (to_decision_id)
);
```

### Vector Search

```sql
-- For MVP (exact search, <200 decisions):
SELECT id, decision_statement,
       1 - (embedding <=> query_vector) AS similarity
FROM decisions
WHERE project_id = $1
ORDER BY embedding <=> query_vector
LIMIT 5;
-- Latency: <100ms

-- For Phase 2 (HNSW index, >1000 decisions):
CREATE INDEX idx_decisions_embedding ON decisions
USING hnsw (embedding vector_cosine_ops)
WITH (m=16, ef_construction=64);
```

---

## API Specification

### Authentication

**POST /api/auth/login**

```json
Request:
{
  "email": "gabriela@soubim.com",
  "password": "..."
}

Response: 200 OK
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "gabriela@soubim.com",
    "name": "Gabriela",
    "role": "director"
  }
}

Error: 401 Unauthorized
{
  "error": "authentication_failed",
  "detail": "Invalid email or password"
}
```

**GET /api/auth/me**

```
Headers: Authorization: Bearer <token>

Response: 200 OK
{
  "id": "uuid",
  "email": "gabriela@soubim.com",
  "name": "Gabriela",
  "role": "director"
}

Error: 401 Unauthorized
```

### Projects

**GET /api/projects**

```
Headers: Authorization: Bearer <token>

Response: 200 OK
{
  "projects": [
    {
      "id": "uuid",
      "name": "Residential Tower Alpha",
      "description": "50-floor residential tower",
      "created_at": "2026-01-15T10:00:00Z",
      "member_count": 8,
      "decision_count": 127
    }
  ]
}
```

**GET /api/projects/{project_id}**

```
Response: 200 OK
{
  "id": "uuid",
  "name": "Residential Tower Alpha",
  "members": [...],
  "stats": {
    "total_decisions": 127,
    "decisions_last_week": 12,
    "disciplines": { "architecture": 45, "mep": 32, "landscape": 18 }
  }
}
```

### Decisions

**GET /api/projects/{project_id}/decisions**

```
Query Parameters:
  ?discipline=architecture&date_from=2026-01-01&confidence_min=0.8&limit=50

Response: 200 OK
{
  "decisions": [
    {
      "id": "uuid",
      "decision_statement": "Changed structural material from concrete to steel",
      "who": "Carlos (Structural Engineer)",
      "timestamp": "00:23:15",
      "discipline": "structural",
      "consensus": {
        "architecture": "AGREE",
        "mep": "AGREE"
      },
      "impacts": [
        {"type": "timeline", "change": "+2 weeks"}
      ],
      "confidence": 0.92,
      "anomaly_flags": [],
      "created_at": "2026-02-01T14:45:00Z"
    }
  ],
  "total": 127,
  "limit": 50,
  "offset": 0
}
```

**GET /api/decisions/{decision_id}**

```
Response: 200 OK
{
  "id": "uuid",
  "decision_statement": "...",
  "why": "Full context reasoning...",
  "similar_decisions": [
    {
      "decision_id": "uuid2",
      "similarity_score": 0.87,
      "decision_statement": "Previous evaluation"
    }
  ],
  "transcript_excerpt": {
    "text": "5-10 minute excerpt...",
    "start": "00:18:15",
    "end": "00:28:15"
  },
  "confidence": 0.92,
  "consistency_notes": "Aligns with past decisions",
  "anomaly_flags": []
}
```

### Digest

**GET /api/projects/{project_id}/digest**

```
Query Parameters:
  ?date_from=2026-01-01&date_to=2026-02-07

Response: 200 OK
{
  "project": { "id": "uuid", "name": "Residential Tower Alpha" },
  "period": { "from": "2026-01-01", "to": "2026-02-07" },
  "summary": {
    "total_decisions": 42,
    "by_discipline": { "architecture": 15, "mep": 12 },
    "high_impact_decisions": 5
  },
  "highlights": [
    {
      "type": "structural_change",
      "count": 3,
      "description": "3 structural material changes",
      "decision_ids": ["uuid1", "uuid2", "uuid3"]
    }
  ],
  "anomalies": [
    {
      "decision_id": "uuid5",
      "flag": "high_dissent",
      "description": "MEP disagreed with architecture"
    }
  ]
}
```

### Webhooks

**POST /api/webhooks/transcript**

```
Headers: X-Tactiq-Signature: <HMAC-SHA256>

Request (from Tactiq):
{
  "webhook_id": "tactiq_123",
  "project_id": "uuid",
  "transcript": "Full meeting transcript...",
  "participants": [...],
  "meeting_date": "2026-02-01T14:00:00Z"
}

Response: 202 Accepted
{
  "status": "queued",
  "transcript_id": "uuid",
  "message": "Processing extraction task"
}
```

---

## LangGraph Agent Pipeline

### Agent State

```python
class AgentState(TypedDict):
    transcript_id: str
    transcript_text: str
    project_id: str
    raw_decisions: List[Dict]
    enriched_decisions: List[Dict]
    current_decision_index: int
```

### Workflow Steps

```
1. extract_decisions()
   Input: Full transcript (20K tokens)
   Output: 30-50 raw decisions
   Cost: ~$0.10

2. For each decision: enrich_decision()
   ├── Tool 1: retrieve_similar_decisions (vector search)
   ├── Tool 2: validate_decision_consistency (Claude)
   ├── Tool 3: extract_decision_context (already done)
   ├── Tool 4: calculate_confidence_score (local)
   └── Tool 5: flag_anomalies (local)
   Total cost: ~$0.30 (30 × $0.01)

3. store_decisions()
   Input: Enriched decisions + embeddings
   Output: Stored in PostgreSQL
   Latency: <1 second

Total per meeting (~4 hours):
├── Cost: $0.10 + $0.30 = $0.40
├── Latency: 2-3 min wall-clock
└── API time: ~6-9 seconds
```

### Cost Analysis

```
Meetings per month: 40 (2 per day × 20 working days)
Cost per meeting: $0.40 (extraction + validation)
Total monthly: 40 × $0.40 = $16/month

Budget: $100/month
Utilization: 16% (plenty of headroom)
```

---

## Frontend Component Architecture

### Component Hierarchy

```
<App>
└── <Router>
    ├── <Login />
    ├── <Projects />
    └── <ProjectDetail>
        ├── <Navigation />
        ├── <Filters />
        │   ├── <DisciplineFilter />
        │   ├── <DateRangeFilter />
        │   └── <MeetingTypeFilter />
        ├── <Timeline>
        │   └── <DecisionCard> (×50 paginated)
        ├── <DrillDownModal> (conditional)
        │   ├── <TranscriptExcerpt />
        │   └── <SimilarDecisions />
        └── <ExecutiveDigest> (if role='director')
```

### State Management

**Server State (React Query):**

```typescript
const decisions = useQuery({
  queryKey: ['decisions', projectId, filters],
  queryFn: () => api.getDecisions(projectId, filters),
  staleTime: 5 * 60 * 1000  // 5 min cache
});
```

**Client State (Zustand):**

```typescript
const filterStore = create<FilterStore>(set => ({
  discipline: null,
  meetingType: null,
  dateRange: { from: null, to: null },
  searchQuery: '',
  setDiscipline: (d) => set({ discipline: d }),
  // ...
}));
```

---

## Deployment Architecture

### Hosting Providers

| Component | Provider | Cost | Notes |
|-----------|----------|------|-------|
| Backend | Railway/Render | $10-20/mo | Python FastAPI, auto-scaling |
| Frontend | Vercel | Free | React, auto-deploy on push |
| Database | Supabase | Free tier | PostgreSQL + pgvector |
| Error Tracking | Sentry | Free tier | 5K errors/month |
| Domain | Namecheap | $12/year | Optional for MVP |

### Infrastructure Diagram

```
GitHub Repository
├── Backend (decision-log-backend)
│   └── Push main → GitHub Actions
│       ├── Run tests (pytest)
│       ├── Run linting (ruff)
│       └── Deploy to Railway/Render
│
└── Frontend (decision-log-frontend)
    └── Push main → Vercel
        ├── Build (npm run build)
        └── Deploy to global CDN

Supabase Project
├── PostgreSQL database (auto-backup)
├── pgvector extension enabled
└── Connection pooling (PgBouncer)

Monitoring
├── Sentry (error tracking)
├── Railway metrics (CPU, memory, latency)
└── Application logs (structured JSON)
```

### Environment Variables

```bash
# Backend
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
TACTIQ_WEBHOOK_SECRET=whsec_...
JWT_SECRET_KEY=<random-256-bit>
SENTRY_DSN=https://...@sentry.io
ENVIRONMENT=production

# Frontend
VITE_API_BASE_URL=https://api.decisionlog.io
VITE_SENTRY_DSN=https://...@sentry.io
```

---

## Security Architecture

### Authentication

```
User login
  ↓
POST /api/auth/login
  ↓
Validate email + bcrypt password
  ↓
Generate JWT (HS256, 7 day expiration)
  ↓
Return token to frontend
  ↓
Frontend stores in Zustand + localStorage
  ↓
All API requests: Authorization: Bearer <token>
  ↓
Backend middleware validates JWT
```

### Authorization (RBAC)

```
director   → View all projects, all decisions
architect  → View assigned projects only
client     → View own project meetings only (Phase 2)

Query protection:
WHERE project_id IN (
  SELECT project_id FROM project_members
  WHERE user_id = current_user_id
)
```

### Data Protection

```
✅ TLS 1.3 everywhere (HTTPS only)
✅ Passwords: bcrypt (cost=12)
✅ JWTs: HS256 (256-bit key)
✅ Database: SSL connection required
✅ Secrets: Environment variables only
✅ CORS: Frontend domain only
✅ Rate limiting: 100 req/min per IP
✅ SQL injection: SQLAlchemy ORM protection
✅ XSS: React auto-escaping
✅ Webhook signature: HMAC-SHA256 verification
```

---

## Performance Targets

| Metric | Target | Implementation |
|--------|--------|-----------------|
| API latency (p95) | <200ms | Database indexes, connection pooling |
| Dashboard load | <2s | React Query caching, code splitting |
| Vector search | <100ms | Exact search (MVP), HNSW (Phase 2) |
| Decision drill-down | <1s | Query optimization, pagination |
| Webhook processing | <500ms | Async queue + immediate response |
| Monthly uptime | 99%+ | Managed services, monitoring |

---

## Testing Strategy

### Unit Tests

```python
# tests/unit/test_extraction.py
def test_confidence_score_calculation():
    """Verify confidence calculation formula."""
    score = calculate_confidence_score(
        consensus={'arch': 'AGREE', 'mep': 'AGREE'},
        consistency_score=0.9,
        has_similar=True
    )
    assert score >= 0.85

def test_anomaly_flagging():
    """Verify high dissent is flagged."""
    flags = flag_anomalies({
        'consensus': {'arch': 'AGREE', 'mep': 'DISAGREE'}
    }, 0.5)
    assert any(f['type'] == 'high_dissent' for f in flags)
```

### Integration Tests

```python
# tests/integration/test_api.py
@pytest.mark.asyncio
async def test_webhook_to_decisions_flow():
    """Test: webhook → extraction → storage."""
    # Post webhook
    resp = await client.post("/webhooks/transcript", json={...})
    assert resp.status_code == 202

    # Wait for async processing
    await asyncio.sleep(5)

    # Verify decisions stored
    decisions = await db.query(Decision).all()
    assert len(decisions) > 0
```

### E2E Tests

```typescript
// tests/e2e/timeline.spec.ts
test('user can view and filter decisions', async ({ page }) => {
  await page.goto('/projects/uuid');

  // Should see 50+ decisions
  const cards = await page.locator('.decision-card').all();
  expect(cards.length).toBeGreaterThan(50);

  // Filter by discipline
  await page.click('text=Discipline');
  await page.click('text=Architecture');

  // Only architecture decisions shown
  for (const card of cards) {
    expect(await card.locator('.badge').textContent()).toContain('architecture');
  }
});
```

---

## Implementation Timeline

```
Week 1-2:   Backend foundation + database schema
Week 2-3:   LLM extraction pipeline
Week 3-4:   Agent tools + vector search
Week 4-5:   Frontend dashboard
Week 5-6:   Testing + optimization
Week 6-8:   User testing + launch
```

---

## Success Criteria

✅ Gabriela can catch up on one project in <30 minutes
✅ 95%+ decision extraction accuracy
✅ Dashboard loads in <2 seconds
✅ Team adopts system (8+ of 9 architects, 3+ uses/week)
✅ <4 hour latency: meeting → decision in system
✅ Operating cost <$35/month
✅ Zero critical bugs at launch

---

**Document Status:** Complete and ready for implementation
**Next Steps:** @dev begins backend foundation (Week 1)
**Owner:** @architect (Aria) with collaboration from @data-engineer, @devops

— Aria, arquitetando o futuro 🏗️
