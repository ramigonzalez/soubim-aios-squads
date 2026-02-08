# Epic 2: Vector Search & Intelligence - User Stories

**Epic ID:** E2
**Priority:** 🟠 HIGH
**Duration:** Weeks 3-5 (Parallel with E1)
**Team:** Backend

---

## Story 2.1: Sentence-Transformers Setup

**User Story:**
> As a backend engineer, I want to embed decision statements as vectors using sentence-transformers so that semantic search becomes possible.

**Story Points:** 5
**Assigned to:** @dev (Backend)
**Duration:** 2-3 days

### Acceptance Criteria

- [ ] sentence-transformers model installed (all-MiniLM-L6-v2)
- [ ] Model loads and generates embeddings
- [ ] Embedding latency: <100ms per decision
- [ ] Vector dimensions: 384 (correct for model)
- [ ] Batch embedding implemented (10+ decisions)
- [ ] Edge cases handled: Very long text, special characters
- [ ] Model size: ~22MB, MIT license
- [ ] Cost: $0 (local, free)

### Setup Code

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')

# Single embedding
text = decision.statement + " " + decision.why
embedding = model.encode(text)  # Returns 384-dim vector

# Batch embedding
texts = [d.statement + " " + d.why for d in decisions]
embeddings = model.encode(texts, batch_size=32)  # Faster
```

### Testing

- [ ] Model loads successfully
- [ ] Embedding shape correct (384 dimensions)
- [ ] Latency <100ms per decision
- [ ] Batch processing tested
- [ ] Handles Unicode/special characters

---

## Story 2.2: pgvector Extension Setup

**User Story:**
> As a database engineer, I want pgvector enabled in PostgreSQL so that vector similarity searches are possible.

**Story Points:** 3
**Assigned to:** @dev (Database)
**Duration:** 1-2 days

### Acceptance Criteria

- [ ] pgvector extension enabled on Supabase
- [ ] `embedding` column (vector, 384 dims) added to decisions table
- [ ] Cosine similarity index created
- [ ] Query performance tested
- [ ] Sample vector stored and queried successfully

### SQL Setup

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to decisions
ALTER TABLE decisions ADD COLUMN embedding vector(384);

-- Create index for similarity search
CREATE INDEX ON decisions USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

### Testing

- [ ] Extension enabled (no errors)
- [ ] Column created
- [ ] Index created
- [ ] Sample query: `SELECT * FROM decisions ORDER BY embedding <=> query_vector LIMIT 10`

---

## Story 2.3: Embedding Generation Pipeline

**User Story:**
> As a backend engineer, I want embeddings generated for all new decisions so that they're available for semantic search.

**Story Points:** 5
**Assigned to:** @dev (Backend)
**Duration:** 2-3 days

### Acceptance Criteria

- [ ] Embedding generated for each extracted decision
- [ ] Input: decision_statement + why + impacts (concatenated)
- [ ] Output: 384-dim vector stored in `decisions.embedding`
- [ ] Batch processing: Multiple decisions embedded efficiently
- [ ] Error handling: Graceful failure if embedding fails
- [ ] Stored in database after generation
- [ ] Performance: <100ms per decision

### Implementation

```python
def embed_decision(decision: Decision) -> List[float]:
    """Generate embedding for a decision."""
    text = f"{decision.statement} {decision.why} {' '.join(decision.impacts)}"
    embedding = model.encode(text)
    return embedding.tolist()

# Called after decision extraction
new_decision.embedding = embed_decision(new_decision)
db.session.add(new_decision)
db.session.commit()
```

### Testing

- [ ] Unit test: Embedding generation
- [ ] Integration test: Embeddings stored in DB
- [ ] Performance test: Batch process 100 decisions
- [ ] Quality test: Similar decisions have similar embeddings

---

## Story 2.4: Semantic Search API

**User Story:**
> As a frontend developer, I want a semantic search endpoint so that users can find decisions by meaning (not just keywords).

**Story Points:** 5
**Assigned to:** @dev (Backend API)
**Duration:** 2-3 days

### Acceptance Criteria

- [ ] Endpoint: `GET /api/projects/{id}/decisions/search`
- [ ] Query params: `?q=semantic_query&similarity_threshold=0.7&discipline=architecture`
- [ ] Returns: Similar decisions with similarity scores
- [ ] Pagination: limit, offset supported
- [ ] Performance: <500ms query
- [ ] Discipline filtering: Optional, filters results by discipline

### API Specification

```
GET /api/projects/{project_id}/decisions/search
Query Parameters:
  q (required): string - semantic search query
  similarity_threshold (optional): float - default 0.7
  discipline (optional): string - filter by discipline
  limit (optional): int - default 10, max 100
  offset (optional): int - default 0

Response:
{
  "query": "string",
  "results": [
    {
      "id": "UUID",
      "statement": "string",
      "similarity_score": 0.87,
      "discipline": "Architecture",
      "created_at": "2025-12-03",
      "timestamp": "14:30"
    }
  ],
  "total": 42,
  "limit": 10,
  "offset": 0
}
```

### Implementation

```python
@app.get("/api/projects/{project_id}/decisions/search")
async def search_decisions(
    project_id: str,
    q: str,
    similarity_threshold: float = 0.7,
    discipline: Optional[str] = None,
    limit: int = 10,
    offset: int = 0
):
    # Embed query
    query_embedding = model.encode(q)

    # Vector similarity search
    query = """
    SELECT id, statement, discipline, created_at, timestamp,
           1 - (embedding <=> %s) as similarity
    FROM decisions
    WHERE project_id = %s
    AND 1 - (embedding <=> %s) > %s
    """
    params = [query_embedding, project_id, query_embedding, similarity_threshold]

    if discipline:
        query += " AND discipline = %s"
        params.append(discipline)

    query += " ORDER BY similarity DESC LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    results = db.session.execute(query, params)
    return {"results": results, "total": count}
```

### Testing

- [ ] Unit test: Query embedding
- [ ] Integration test: Vector search query
- [ ] Performance test: <500ms for 1000 decisions
- [ ] Manual test: Search "decisions affecting MEP" → get relevant results
- [ ] Discipline filtering test

---

## Story 2.5: Discipline Assignment & Tagging

**User Story:**
> As an LLM system, I want to automatically assign discipline to each decision so that discipline filtering works correctly.

**Story Points:** 3
**Assigned to:** @dev (Backend/LLM)
**Duration:** 1-2 days

### Acceptance Criteria

- [ ] Discipline inferred from decision content during extraction
- [ ] Values: Architecture, MEP, Landscape, Interior, Electrical, Plumbing
- [ ] Multi-discipline decisions: Assign primary discipline
- [ ] Manual audit: 90%+ accuracy
- [ ] Stored in `decisions.discipline` field
- [ ] Enum enforced (no invalid values)

### Extraction Enhancement

Modify extraction prompt to include discipline inference:

```
For each decision, also determine primary discipline:
- Architecture: Building layout, structural, material choices, design decisions
- MEP: HVAC, plumbing, electrical systems, mechanical systems
- Landscape: Site design, outdoor elements, landscaping decisions
- Interior: Interior finishes, layout, interior design decisions
- Electrical: Electrical systems, power, lighting
- Plumbing: Plumbing systems, water, drainage

Respond with discipline field in JSON.
```

### Testing

- [ ] Unit test: Discipline extraction
- [ ] Manual audit: 30 decisions, validate accuracy
- [ ] Edge case: Multi-discipline decision (assign primary)
- [ ] Database validation: Only valid disciplines stored

---

## Story 2.6: Vector Quality Validation

**User Story:**
> As a QA engineer, I want to validate that embeddings are generating quality vectors so that semantic search returns relevant results.

**Story Points:** 5
**Assigned to:** @dev (QA)
**Duration:** 2-3 days

### Acceptance Criteria

- [ ] Manual validation: Similar decisions have similar embeddings
- [ ] Cosine similarity threshold test: 0.7+ for related decisions
- [ ] Validation script: Compare embedding distances
- [ ] Report: 90%+ of similar decisions found correctly
- [ ] Edge case: Unrelated decisions have low similarity
- [ ] Performance: Query <500ms for 1000 decisions

### Validation Script

```python
# Test known similar decisions
d1 = get_decision("foundation_depth_change")  # Dec 18
d2 = get_decision("foundation_reinforcement")  # Dec 3

# Calculate similarity
from sklearn.metrics.pairwise import cosine_similarity
similarity = cosine_similarity([d1.embedding], [d2.embedding])[0][0]
assert similarity > 0.7  # Should be similar

# Test unrelated decisions
d3 = get_decision("interior_color_scheme")
similarity = cosine_similarity([d1.embedding], [d3.embedding])[0][0]
assert similarity < 0.5  # Should not be similar
```

### Testing

- [ ] Unit test: Similarity calculations
- [ ] Integration test: Multiple decision pairs
- [ ] Manual validation: Review top 20 similar results

---

## Story 2.7: Search Performance Optimization

**User Story:**
> As a backend engineer, I want vector search optimized for performance so that semantic search stays <500ms even with thousands of decisions.

**Story Points:** 5
**Assigned to:** @dev (Backend)
**Duration:** 2-3 days

### Acceptance Criteria

- [ ] Query <500ms for 1000 decisions
- [ ] Index strategy: IVFFLAT (cosine distance)
- [ ] Index parameters tuned (lists=100 for MVP)
- [ ] Query caching (optional): Cache popular searches
- [ ] Load test: 100+ concurrent searches
- [ ] Monitoring: Query time metrics logged

### Index Parameters

```sql
-- IVFFLAT index (good balance for MVP)
CREATE INDEX ON decisions USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- For Phase 2, can upgrade to HNSW if needed:
-- CREATE INDEX ON decisions USING hnsw (embedding vector_cosine_ops)
-- WITH (m = 16, ef_construction = 64);
```

### Performance Baseline

- [ ] <500ms for 1000 decisions
- [ ] <1s for 10,000 decisions (Phase 2)
- [ ] Concurrent query handling: 100+ req/min

---

## Epic 2 Summary

**Total Stories:** 7
**Total Points:** 31
**Duration:** 3 weeks (Weeks 3-5, parallel with E1)
**Team:** Backend (1 developer)

### Dependencies
- Depends on E1 extraction (needs decisions to embed)
- Can start Week 3 (as soon as decisions table has data)
- Needed before E3 dashboard (for semantic search)

### Deliverables
✅ sentence-transformers embeddings
✅ pgvector storage
✅ Semantic search API
✅ Discipline filtering
✅ Vector quality validated
✅ <500ms query performance
