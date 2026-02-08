# Epic 1: Decision Capture & Extraction Pipeline - User Stories

**Epic ID:** E1
**Priority:** 🔴 CRITICAL
**Duration:** Weeks 1-4
**Team:** Backend

---

## Story 1.1: Tactiq Webhook Endpoint Setup

**User Story:**
> As a system integrator, I want to receive meeting transcripts from Tactiq via webhook so that decisions are automatically captured from Google Meet calls.

**Story Points:** 5
**Assigned to:** @dev (Backend)
**Duration:** 3-4 days

### Acceptance Criteria

- [ ] POST `/api/webhooks/transcript` endpoint created
- [ ] Validates Tactiq webhook signature (if provided)
- [ ] Parses webhook payload: meeting_id, participants, transcript, timestamps
- [ ] Stores raw transcript in `transcripts` table
- [ ] Webhook returns 200 OK with id: `{ id, status: "received" }`
- [ ] Idempotency: webhook_id prevents duplicate processing
- [ ] Error handling: gracefully logs failed webhooks
- [ ] Handles payloads up to 10MB (4-hour calls)
- [ ] Concurrent webhooks supported (50+/day)
- [ ] Timeout: 30 seconds

### Technical Details

**Endpoint:**
```
POST /api/webhooks/transcript
Headers: X-Webhook-Signature: sha256=...
Body: {
  webhook_id: string (unique),
  meeting_id: string,
  participants: [{ name, email }],
  transcript: string (full text),
  duration: "HH:MM:SS",
  created_at: timestamp
}
Response: { id, status, message }
```

**Database:**
```sql
transcripts table:
- id (UUID, PK)
- webhook_id (string, unique, idempotency key)
- meeting_id (string, from Tactiq)
- participants (JSON)
- transcript_text (text)
- duration (string)
- created_at (timestamp)
- processed_at (timestamp, nullable)
```

### Testing

- [ ] Unit test: Webhook parsing
- [ ] Unit test: Idempotency check
- [ ] Integration test: Transcript storage
- [ ] Manual test: Send real Tactiq webhook
- [ ] Load test: 50+ concurrent webhooks

---

## Story 1.2: Transcript Storage Schema

**User Story:**
> As a data engineer, I want a PostgreSQL schema for transcripts so that all meeting data is persisted.

**Story Points:** 3
**Assigned to:** @dev (Database)
**Duration:** 1-2 days

### Acceptance Criteria

- [ ] `transcripts` table created with all required fields
- [ ] Foreign key: project_id (reference to projects)
- [ ] Unique constraint: webhook_id
- [ ] Indexes: project_id, created_at, webhook_id
- [ ] Default timestamps: created_at, updated_at
- [ ] Soft delete: deleted_at (nullable)
- [ ] Backup configured (daily snapshots)

### Database Schema

```sql
CREATE TABLE transcripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id VARCHAR(255) UNIQUE NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id),
  meeting_id VARCHAR(255) NOT NULL,
  participants JSONB,
  transcript_text TEXT NOT NULL,
  duration VARCHAR(12),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_transcripts_project_id ON transcripts(project_id);
CREATE INDEX idx_transcripts_created_at ON transcripts(created_at);
CREATE INDEX idx_transcripts_webhook_id ON transcripts(webhook_id);
```

### Testing

- [ ] Schema creation succeeds
- [ ] Constraints enforced (unique, FK)
- [ ] Indexes created
- [ ] Sample data inserted successfully

---

## Story 1.3: LLM Extraction Service Setup

**User Story:**
> As a backend engineer, I want Claude to analyze transcripts and extract architectural decisions so that decisions are automatically documented.

**Story Points:** 8
**Assigned to:** @dev (Backend/LLM)
**Duration:** 5-7 days

### Acceptance Criteria

- [ ] Claude integration via Anthropic SDK
- [ ] Extraction prompt engineered for architecture domain
- [ ] Handles full transcript context (<20K tokens)
- [ ] Extracts: statement, who, when, why, discipline, impacts, consensus, causation
- [ ] Handles edge cases: no decisions, unclear consensus, multi-discipline
- [ ] Async processing: APScheduler triggers extraction <1 min after webhook
- [ ] Extraction succeeds for 100% of test transcripts
- [ ] Cost tracking: <$0.10 per meeting
- [ ] Error logging: Failed extractions logged + retried

### Extraction Prompt Structure

```
System Prompt:
You are an expert at extracting architectural decisions from meeting transcripts.
Extract ALL FINAL decisions (not tentative or suggestions).

For each decision, provide:
1. Decision statement (brief, specific)
2. Who decided (speaker name)
3. When (timestamp HH:MM:SS)
4. Why (reasoning from context)
5. Discipline (Architecture|MEP|Landscape|Interior|Electrical|Plumbing)
6. Impacts (scope/timeline/budget changes)
7. Consensus (AGREE|DISAGREE|ABSTAIN by discipline)
8. Causation (what triggered: client_request|technical_constraint|error_found|etc)

Respond in valid JSON: [{ statement, who, when, why, discipline, impacts, consensus, causation }]

User Prompt:
Analyze this transcript and extract all FINAL decisions:
[FULL TRANSCRIPT TEXT]
```

### Testing

- [ ] Unit test: Prompt generation
- [ ] Integration test: Claude API call
- [ ] Manual audit: Sample 30 decisions, validate accuracy
- [ ] Performance: <2 min extraction per meeting
- [ ] Cost validation: <$0.10 per meeting

### Pydantic Model

```python
class Decision(BaseModel):
    statement: str
    who: str
    timestamp: str  # HH:MM:SS
    discipline: Literal["Architecture", "MEP", "Landscape", "Interior", "Electrical", "Plumbing"]
    why: str
    impacts: List[Dict[str, str]]
    consensus: Dict[str, Literal["AGREE", "DISAGREE", "ABSTAIN"]]
    causation: str
```

---

## Story 1.4: Decision Storage Schema

**User Story:**
> As a data engineer, I want a PostgreSQL schema for decisions so that extracted decisions are persisted with full metadata.

**Story Points:** 5
**Assigned to:** @dev (Database)
**Duration:** 2-3 days

### Acceptance Criteria

- [ ] `decisions` table created with all fields from PRD
- [ ] Includes enrichment fields (confidence, consistency, anomalies)
- [ ] Vector column for embeddings (pgvector, prepared for E2)
- [ ] Foreign keys: project_id, transcript_id, meeting_id
- [ ] Indexes: project_id, created_at, discipline
- [ ] Soft delete: deleted_at
- [ ] Audit fields: created_by, updated_by

### Database Schema

```sql
CREATE TABLE decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id),
  transcript_id UUID NOT NULL REFERENCES transcripts(id),
  meeting_id UUID,
  decision_statement TEXT NOT NULL,
  who VARCHAR(255),
  timestamp VARCHAR(12),
  discipline VARCHAR(50),
  why TEXT,
  impacts JSONB,
  consensus JSONB,
  causation VARCHAR(255),
  confidence FLOAT DEFAULT 0.0,
  confidence_breakdown JSONB,
  anomaly_flags JSONB,
  similar_decisions_ids JSONB,
  consistency_score FLOAT,
  consistency_notes TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by VARCHAR(255),
  deleted_at TIMESTAMP,
  embedding vector(384)
);

CREATE INDEX idx_decisions_project_id ON decisions(project_id);
CREATE INDEX idx_decisions_created_at ON decisions(created_at);
CREATE INDEX idx_decisions_discipline ON decisions(discipline);
```

### Testing

- [ ] Schema creation succeeds
- [ ] All constraints enforced
- [ ] Sample decisions inserted
- [ ] Vector column ready (E2 will populate)

---

## Story 1.5: Agent Tools - Similar Decisions Retriever

**User Story:**
> As a system, I want to find past decisions related to the current decision so that we can validate consistency with historical patterns.

**Story Points:** 5
**Assigned to:** @dev (Backend/Agent)
**Duration:** 2-3 days

### Acceptance Criteria

- [ ] Tool: `retrieve_similar_decisions(decision_statement, project_id)`
- [ ] Queries decisions in SAME project only
- [ ] Returns 3-5 most similar decisions
- [ ] Stores similarity scores
- [ ] Cost: ~$0 (local vector search, depends on E2)
- [ ] Latency: <500ms
- [ ] Handles case: No similar decisions (returns empty list)

### Tool Signature

```python
def retrieve_similar_decisions(
    decision_statement: str,
    discipline: str,
    project_id: str,
    limit: int = 5
) -> List[Dict]:
    """
    Query past decisions in project by similarity.

    Returns:
    [
        {
            "id": "decision_id",
            "statement": "...",
            "similarity_score": 0.87,
            "timestamp": "2025-12-03"
        }
    ]
    """
```

### Testing

- [ ] Unit test: Query construction
- [ ] Integration test: Vector search (after E2)
- [ ] Test edge cases: Empty results, single result
- [ ] Performance: <500ms query

---

## Story 1.6: Agent Tools - Consistency Validator

**User Story:**
> As a system, I want to validate if a decision aligns with or contradicts past decisions so that we can flag inconsistencies.

**Story Points:** 5
**Assigned to:** @dev (Backend/Agent)
**Duration:** 2-3 days

### Acceptance Criteria

- [ ] Tool: `validate_decision_consistency(current_decision, similar_decisions)`
- [ ] Uses Claude to analyze alignment
- [ ] Returns consistency_score (0-1) + notes
- [ ] Cost: ~$0.01 per decision
- [ ] Handles cases: Aligned, contradicts, neutral
- [ ] Stores results in decision record

### Tool Signature

```python
def validate_decision_consistency(
    current_decision: Decision,
    similar_decisions: List[Decision]
) -> Dict:
    """
    Validate alignment with past decisions.

    Returns:
    {
        "consistency_score": 0.87,
        "alignment": "aligned|contradicts|neutral",
        "notes": "Aligns with Dec 3 decision (same material rationale)"
    }
    """
```

### Testing

- [ ] Unit test: Claude prompt generation
- [ ] Integration test: Claude API call
- [ ] Manual validation: Consistency score matches human judgment

---

## Story 1.7: Agent Tools - Confidence Scorer

**User Story:**
> As a system, I want to calculate confidence in decisions based on consensus, consistency, and historical support so that Gabriela can identify uncertain decisions.

**Story Points:** 3
**Assigned to:** @dev (Backend/Agent)
**Duration:** 1-2 days

### Acceptance Criteria

- [ ] Tool: `calculate_confidence_score(decision, consistency_score, consensus_level)`
- [ ] Calculates: base (consensus) × multipliers (consistency + historical)
- [ ] Returns score 0-1
- [ ] Cost: <1ms (local computation)
- [ ] Formula: base_score × consistency_mult × historical_mult

### Scoring Formula

```
base_score = 1.0 if AGREE else 0.7 if ABSTAIN else 0.4 if DISAGREE
consistency_mult = 1.2 if aligned else 0.8 if contradicts else 1.0
historical_mult = 1.1 if similar_exists else 1.0
confidence_score = base_score × consistency_mult × historical_mult
(clamped to 0-1)
```

### Testing

- [ ] Unit test: Scoring calculations
- [ ] Test edge cases: No consensus, no history
- [ ] Validation: Scores correlate with reversal rates (Phase 2)

---

## Story 1.8: Agent Tools - Anomaly Flagger

**User Story:**
> As a system, I want to detect concerning decision patterns (high dissent, reversals, cascades) so that Gabriela can review risky decisions.

**Story Points:** 5
**Assigned to:** @dev (Backend/Agent)
**Duration:** 2-3 days

### Acceptance Criteria

- [ ] Tool: `flag_anomalies(decision, past_decisions, consensus)`
- [ ] Detects: high dissent, reversal patterns, broad cascades, unusual actor
- [ ] Returns array of flags: `[{type, severity}]`
- [ ] Severity levels: low, medium, high
- [ ] Cost: <1ms (local computation)
- [ ] Stores flags in decision record

### Anomaly Types

```python
class AnomalyFlag(BaseModel):
    type: Literal[
        "high_dissent",      # One+ disciplines disagree
        "reversal_pattern",  # Similar decision reversed before
        "broad_cascade",     # Affects 3+ disciplines
        "unusual_actor"      # Person outside their discipline
    ]
    severity: Literal["low", "medium", "high"]
    notes: str
```

### Testing

- [ ] Unit test: Anomaly detection logic
- [ ] Manual validation: 80%+ catch rate on concerning patterns
- [ ] Test edge cases: No past decisions, all-agree consensus

---

## Story 1.9: LangGraph Agent Orchestration

**User Story:**
> As a backend engineer, I want an agent loop that runs all 5 enrichment tools on each decision so that decisions are fully enriched with context, consistency, and risk data.

**Story Points:** 8
**Assigned to:** @dev (Backend/Agent)
**Duration:** 5-7 days

### Acceptance Criteria

- [ ] LangGraph agent state management
- [ ] Agent invokes tools in sequence:
  1. retrieve_similar_decisions
  2. validate_decision_consistency
  3. extract_decision_context (already done)
  4. calculate_confidence_score
  5. flag_anomalies
- [ ] All results stored in decision record
- [ ] Agent loop completes <15 seconds per decision
- [ ] Error handling: Graceful failure (skip tool, continue)
- [ ] No infinite loops or cascading calls
- [ ] Logging: Each tool call + result logged

### Agent Workflow

```
Input: Extracted decision
  ↓
Tool 1: Retrieve similar decisions
  ↓
Tool 2: Validate consistency
  ↓
Tool 3: Extract context (cached)
  ↓
Tool 4: Calculate confidence
  ↓
Tool 5: Flag anomalies
  ↓
Output: Enriched decision (store in DB)
```

### Testing

- [ ] Unit test: Each tool invocation
- [ ] Integration test: Full agent loop
- [ ] Performance test: <15 seconds per decision
- [ ] Error test: Tool failure handling
- [ ] Manual validation: Results correct and stored

---

## Story 1.10: Extraction Pipeline Scheduler

**User Story:**
> As a system, I want extraction to run automatically <1 min after webhook so that decisions are available on the dashboard quickly.

**Story Points:** 3
**Assigned to:** @dev (Backend)
**Duration:** 1-2 days

### Acceptance Criteria

- [ ] APScheduler background job configured
- [ ] Triggers extraction <1 min after webhook
- [ ] Processes queued transcripts in batch
- [ ] Handles concurrent extractions (10+ parallel)
- [ ] Retry logic: Exponential backoff on failure
- [ ] Monitoring: Job success/failure logged
- [ ] Graceful shutdown: In-flight jobs complete

### Testing

- [ ] Unit test: Job scheduling
- [ ] Integration test: End-to-end extraction pipeline
- [ ] Load test: 10+ concurrent extractions
- [ ] Failure test: Retry on API error

---

## Story 1.11: Error Handling & Logging

**User Story:**
> As an operator, I want comprehensive error logging so that I can debug extraction failures and monitor system health.

**Story Points:** 3
**Assigned to:** @dev (Backend)
**Duration:** 1-2 days

### Acceptance Criteria

- [ ] Structured logging (JSON format)
- [ ] Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
- [ ] Webhook errors logged with request/response
- [ ] Extraction errors logged with transcript ID + error details
- [ ] Agent errors logged with decision ID + tool failure
- [ ] Sentry integration (optional, error tracking)
- [ ] Logs queryable: Timestamp, component, error type
- [ ] PII redaction: No passwords, tokens, sensitive data in logs

### Logging Strategy

```python
logger.info("webhook_received", extra={
    "webhook_id": webhook_id,
    "meeting_id": meeting_id,
    "transcript_size": len(transcript)
})

logger.error("extraction_failed", extra={
    "transcript_id": transcript_id,
    "error": str(e),
    "retry_attempt": attempt
})
```

### Testing

- [ ] Unit test: Logger initialization
- [ ] Integration test: Log output format
- [ ] Manual validation: Logs queryable and actionable

---

## Epic 1 Summary

**Total Stories:** 11
**Total Points:** 56
**Duration:** 4 weeks
**Team:** Backend (2-3 developers)

### Dependencies
- E1 must complete before E3 dashboard (no data to show)
- E2 (vector search) can start parallel in Week 3
- E4 (auth) can start parallel in Week 5

### Deliverables
✅ Tactiq webhook integration
✅ LLM extraction pipeline
✅ Agent enrichment (5 tools)
✅ PostgreSQL storage
✅ Decision relationships queryable
✅ Error handling + logging
