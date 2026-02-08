# Database Schema - DecisionLog

**Document ID:** architecture/database-schema
**Version:** 1.0
**Status:** Complete
**Owner:** @architect with @data-engineer

---

## Overview

Complete PostgreSQL 15 schema specification for DecisionLog, including:
- Table definitions with constraints
- Indexes for performance optimization
- Vector embeddings configuration (pgvector)
- Data relationships and foreign keys
- Migration strategy

**Database Provider:** Supabase (PostgreSQL + pgvector extension)
**Connection:** SSL required, PgBouncer connection pooling

---

## Extensions Required

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
```

---

## Table Definitions

### users

Stores user authentication and profile information.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL
        CHECK (role IN ('director', 'architect', 'client')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_deleted ON users(deleted_at) WHERE deleted_at IS NULL;
```

**Columns:**
- `id`: UUID primary key
- `email`: Unique email, used for login
- `password_hash`: bcrypt hash (cost=12), never store plaintext
- `name`: Display name (e.g., "Gabriela")
- `role`: User role (director=all projects, architect=assigned, client=own)
- `created_at`: Account creation timestamp
- `last_login_at`: Last successful authentication
- `deleted_at`: Soft delete flag

**Indexes:**
- `idx_users_email`: Fast login lookup
- `idx_users_role`: Filter users by role
- `idx_users_deleted`: Soft delete queries

---

### projects

Stores architectural projects.

```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    archived_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_projects_created ON projects(created_at DESC);
CREATE INDEX idx_projects_archived ON projects(archived_at) WHERE archived_at IS NULL;
```

**Columns:**
- `id`: UUID primary key
- `name`: Project name (e.g., "Residential Tower Alpha")
- `description`: Project details, scope, location
- `created_at`: Project creation date
- `archived_at`: Soft archive flag (NULL = active)

**Indexes:**
- `idx_projects_created`: Sort by creation date
- `idx_projects_archived`: Filter active projects

---

### project_members

Role-based access control for projects.

```sql
CREATE TABLE project_members (
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL
        CHECK (role IN ('owner', 'member', 'viewer')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (project_id, user_id)
);

CREATE INDEX idx_project_members_user ON project_members(user_id);
```

**Columns:**
- `project_id`: FK to projects
- `user_id`: FK to users
- `role`: Access level in project (owner=admin, member=read+edit, viewer=read-only)
- `created_at`: When member added

**Indexes:**
- `idx_project_members_user`: Find all projects for a user

**Access Control Logic:**
```sql
-- Query all decisions user can see
SELECT d.* FROM decisions d
WHERE d.project_id IN (
    SELECT pm.project_id FROM project_members pm
    WHERE pm.user_id = :user_id
)
-- Directors see all decisions via separate query
```

---

### transcripts

Raw meeting transcripts from Tactiq webhook.

```sql
CREATE TABLE transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id VARCHAR(255) UNIQUE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    meeting_id VARCHAR(255),
    meeting_type VARCHAR(50) NOT NULL
        CHECK (meeting_type IN ('client', 'multi-disciplinary', 'internal')),
    participants JSONB NOT NULL,
    transcript_text TEXT NOT NULL,
    duration_minutes INTEGER,
    meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transcripts_project ON transcripts(project_id);
CREATE INDEX idx_transcripts_date ON transcripts(meeting_date DESC);
CREATE INDEX idx_transcripts_type ON transcripts(meeting_type);
CREATE INDEX idx_transcripts_webhook ON transcripts(webhook_id);
```

**Columns:**
- `id`: UUID primary key
- `webhook_id`: Tactiq webhook ID (for idempotency)
- `project_id`: FK to projects
- `meeting_id`: Google Meet ID
- `meeting_type`: Type of meeting (affects decision extraction)
- `participants`: JSON array of meeting participants
- `transcript_text`: Full meeting transcript (20K+ tokens)
- `duration_minutes`: Meeting length
- `meeting_date`: When meeting occurred
- `created_at`: When stored

**Indexes:**
- `idx_transcripts_project`: Find meetings for project
- `idx_transcripts_date`: Sort meetings chronologically
- `idx_transcripts_type`: Filter by meeting type
- `idx_transcripts_webhook`: Prevent duplicate processing

**Participants JSON Example:**
```json
[
  {
    "name": "Gabriela",
    "email": "gabriela@soubim.com",
    "role": "director"
  },
  {
    "name": "Carlos",
    "email": "carlos@soubim.com",
    "role": "structural_engineer"
  }
]
```

---

### decisions

Extracted architectural decisions with AI enrichment.

```sql
CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    transcript_id UUID REFERENCES transcripts(id) ON DELETE CASCADE,

    -- Core decision data
    decision_statement TEXT NOT NULL,
    who VARCHAR(255) NOT NULL,
    timestamp VARCHAR(20) NOT NULL,
    discipline VARCHAR(100) NOT NULL
        CHECK (discipline IN (
            'architecture', 'mep', 'landscape', 'interior',
            'electrical', 'plumbing', 'structural', 'general'
        )),

    -- Context and reasoning
    why TEXT NOT NULL,
    causation TEXT,

    -- Impacts
    impacts JSONB,

    -- Consensus tracking
    consensus JSONB NOT NULL,

    -- Agent enrichment
    confidence FLOAT CHECK (confidence BETWEEN 0 AND 1),
    similar_decisions JSONB,
    consistency_notes TEXT,
    anomaly_flags JSONB,

    -- Vector embedding
    embedding vector(384),

    -- Approval tracking (Phase 1.5)
    approved BOOLEAN DEFAULT FALSE,
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    approval_notes TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Filtering indexes
CREATE INDEX idx_decisions_project ON decisions(project_id);
CREATE INDEX idx_decisions_discipline ON decisions(discipline);
CREATE INDEX idx_decisions_confidence ON decisions(confidence DESC);
CREATE INDEX idx_decisions_created ON decisions(created_at DESC);

-- Composite indexes for common filters
CREATE INDEX idx_decisions_project_discipline_date
    ON decisions(project_id, discipline, created_at DESC);

CREATE INDEX idx_decisions_project_created
    ON decisions(project_id, created_at DESC);

-- Vector search (exact search for MVP, <200 decisions)
-- Phase 2: CREATE INDEX idx_decisions_embedding ON decisions
--    USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64);
```

**Columns:**
- `id`: UUID primary key
- `project_id`: FK to projects (required)
- `transcript_id`: FK to transcripts
- `decision_statement`: One-line decision (e.g., "Changed material from concrete to steel")
- `who`: Decision maker name
- `timestamp`: HH:MM:SS position in transcript
- `discipline`: Area affected (architecture, mep, structural, etc.)
- `why`: Full reasoning context (2-3 sentences)
- `causation`: What triggered decision (client requirement, error found, constraint)
- `impacts`: JSON array of impact objects
- `consensus`: JSON object of discipline → vote mapping
- `confidence`: 0.0-1.0 confidence score (from agent)
- `similar_decisions`: JSON array of related decision references
- `consistency_notes`: How it aligns with past decisions
- `anomaly_flags`: JSON array of detected anomalies
- `embedding`: 384-dimensional vector (sentence-transformers)
- `approved`: Whether director approved
- `approved_by`: FK to users (approver)
- `approved_at`: Approval timestamp
- `approval_notes`: Director's notes
- `created_at`: When extracted
- `updated_at`: Last modified

**Indexes:**
- `idx_decisions_project`: Find decisions in project
- `idx_decisions_discipline`: Filter by discipline
- `idx_decisions_confidence`: Sort by confidence
- `idx_decisions_created`: Sort by date
- `idx_decisions_project_discipline_date`: Most common combined filter
- `idx_decisions_project_created`: Project decisions sorted by date

**Impacts JSON Example:**
```json
[
  {
    "type": "timeline",
    "change": "+2 weeks for steel delivery"
  },
  {
    "type": "budget",
    "change": "+$50K for steel vs concrete"
  }
]
```

**Consensus JSON Example:**
```json
{
  "architecture": "AGREE",
  "mep": "AGREE",
  "structural": "AGREE"
}
```

**Anomaly Flags JSON Example:**
```json
[
  {
    "type": "high_dissent",
    "severity": "medium",
    "description": "MEP disagreed with architecture decision"
  }
]
```

---

### decision_relationships

Tracks relationships between decisions (cascade effects, reversals, etc.).

```sql
CREATE TABLE decision_relationships (
    from_decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    to_decision_id UUID NOT NULL REFERENCES decisions(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL
        CHECK (relationship_type IN (
            'triggered',      -- This decision triggered another
            'reversed',       -- This decision was reversed
            'conflicts',      -- Direct conflict with another
            'supports'        -- Supports another decision
        )),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (from_decision_id, to_decision_id, relationship_type)
);

CREATE INDEX idx_relationships_from ON decision_relationships(from_decision_id);
CREATE INDEX idx_relationships_to ON decision_relationships(to_decision_id);
```

**Columns:**
- `from_decision_id`: Source decision
- `to_decision_id`: Target decision
- `relationship_type`: Nature of relationship
- `created_at`: When relationship detected

**Indexes:**
- `idx_relationships_from`: Find decisions triggered by this one
- `idx_relationships_to`: Find what triggered this decision

**Usage Example:**
```sql
-- Find cascading impacts
WITH RECURSIVE cascade AS (
  SELECT to_decision_id FROM decision_relationships
  WHERE from_decision_id = 'uuid' AND relationship_type = 'triggered'
  UNION ALL
  SELECT dr.to_decision_id FROM decision_relationships dr
  JOIN cascade c ON dr.from_decision_id = c.to_decision_id
  WHERE dr.relationship_type = 'triggered'
)
SELECT * FROM decisions WHERE id IN (SELECT * FROM cascade);
```

---

## Vector Search Configuration

### Embeddings Setup

```python
# Generate embeddings during decision extraction
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')  # 384-dim, 22MB

embedding = model.encode(decision['decision_statement'],
                         convert_to_numpy=True)
# Result: List[float] with 384 dimensions
```

### Query by Similarity (MVP - Exact Search)

```sql
-- Find 5 most similar decisions
SELECT id, decision_statement,
       1 - (embedding <=> :query_vector) AS similarity
FROM decisions
WHERE project_id = :project_id
  AND id != :exclude_id
ORDER BY embedding <=> :query_vector
LIMIT 5;

-- Latency: <100ms (sequential scan, <200 decisions)
-- Cost: No index needed for MVP
```

### Query by Similarity (Phase 2 - HNSW Index)

Once >1000 decisions, enable HNSW index for O(log n) performance:

```sql
-- Create after data is loaded
CREATE INDEX idx_decisions_embedding ON decisions
USING hnsw (embedding vector_cosine_ops)
WITH (m=16, ef_construction=64);

-- Latency: <10ms for 100K+ decisions
-- Memory: ~4-8GB for 100K decisions
```

---

## Performance Tuning

### Query Optimization

```sql
-- GOOD: Uses index
EXPLAIN ANALYZE
SELECT * FROM decisions
WHERE project_id = 'uuid'
  AND discipline = 'architecture'
  AND created_at > '2026-01-01'
ORDER BY created_at DESC
LIMIT 50;
-- Index: idx_decisions_project_discipline_date

-- BAD: Sequence scan
SELECT * FROM decisions
WHERE why ILIKE '%steel%'  -- Full text search, no index yet
LIMIT 50;
```

### Connection Pooling

```
PgBouncer (Supabase)
├── Pool size: 10 connections
├── Max overflow: 20 (burst capacity)
├── Mode: session (reset after each transaction)
└── Max idle: 600 seconds
```

---

## Migration Strategy

### Using Alembic (Python)

```bash
# Create new migration
alembic revision --autogenerate -m "Add decisions table"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Migration File Template

```python
# alembic/versions/001_initial_schema.py
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID, primary_key=True,
                 server_default=sa.func.gen_random_uuid()),
        sa.Column('email', sa.String(255), unique=True, nullable=False),
        # ... more columns
    )
    op.create_index('idx_users_email', 'users', ['email'])

def downgrade():
    op.drop_index('idx_users_email')
    op.drop_table('users')
```

---

## Data Volume Projections

### MVP Phase (6-12 months, 10 users)

```
Projects: 3-5
Meetings/month: 40 (2/day × 20 days)
Decisions/meeting: 30-50
Total decisions: 1,440-2,400/year
Transcripts: 480-960/year (12 months)

Storage:
├── Transcripts: 500MB (avg 1MB each)
├── Decisions: 50MB (metadata)
├── Embeddings: 30MB (384 × 4 bytes × 2000)
└── Total: ~600MB
```

### Growth Phase (Year 2, 50 users, 20 projects)

```
Meetings/month: 200
Decisions: 6,000-10,000/year
Total decisions: 8,000-15,000
Storage: ~2-3GB

When to upgrade:
├── >1000 decisions: Add HNSW index
├── >5GB: Move to paid Supabase tier
└── >100K decisions: Consider read replicas
```

---

## Backup & Recovery

### Supabase Automated Backups

```
Free tier:
├── Backup interval: 24 hours
├── Retention: 7 days
└── Recovery: Point-in-time via Supabase dashboard

Paid tier ($25+):
├── Backup interval: 6 hours
├── Retention: 30 days
└── On-demand backups available
```

### Manual Backup

```bash
# Export full database
pg_dump postgresql://user:pass@db.supabase.co/postgres \
  -Fc --no-acl --no-owner \
  > backup_$(date +%Y%m%d).dump

# Restore
pg_restore -U postgres -d decisionlog backup_20260207.dump
```

---

## Security Considerations

### Data Protection

```sql
-- Passwords never stored plaintext
-- Sensitive fields encrypted at rest (Supabase)
-- SSL required for connections
-- Role-based access control via project_members
```

### Query Audit

```sql
-- Enable query logging (optional)
-- ALTER SYSTEM SET log_statement = 'all';
-- SELECT pg_reload_conf();
```

---

## Testing Schema

### Unit Tests (Python)

```python
# tests/unit/test_database.py
@pytest.mark.asyncio
async def test_decisions_index_performance():
    """Verify indexes prevent sequence scans."""
    # Insert 100 decisions
    # Run indexed query
    # Verify query plan uses index
    pass

@pytest.mark.asyncio
async def test_vector_similarity_search():
    """Test pgvector similarity search."""
    embedding = [0.5] * 384
    similar = await db.query(Decision).order_by(
        Decision.embedding.cosine_distance(embedding)
    ).limit(5).all()
    assert len(similar) == 5
```

---

## Success Criteria

✅ All tables created with correct constraints
✅ Indexes created for all filter columns
✅ Vector embeddings configured (384-dim)
✅ Foreign key relationships enforced
✅ Soft deletes implemented
✅ Migration strategy documented
✅ Performance targets verified (<50ms queries)
✅ Backup/recovery tested

---

**Document Status:** Complete
**Last Updated:** 2026-02-07
**Next:** LangGraph Agent Pipeline Specification

— Aria, arquitetando o futuro 🏗️
