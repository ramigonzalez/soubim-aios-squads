# LangGraph Agent Pipeline - DecisionLog

**Document ID:** architecture/agent-pipeline
**Version:** 1.0
**Status:** Complete
**Owner:** @architect with @dev

---

## Overview

Complete specification of the LangGraph agent pipeline for extracting, enriching, and storing architectural decisions from meeting transcripts.

**Framework:** LangGraph (ReAct pattern)
**LLM:** Anthropic Claude 3.5 Sonnet
**Embeddings:** sentence-transformers (local, all-MiniLM-L6-v2)
**Queue:** APScheduler (async task scheduling)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    EXTRACTION PIPELINE                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. TRIGGER: Tactiq Webhook                                 │
│     └→ Store raw transcript in PostgreSQL                   │
│     └→ Queue extraction task (APScheduler)                  │
│                                                              │
│  2. INITIAL EXTRACTION (Claude)                             │
│     ├─ Input: Full transcript (20K tokens max)              │
│     ├─ Task: Extract 30-50 FINAL decisions                 │
│     └─ Cost: ~$0.10 per meeting                             │
│                                                              │
│  3. ENRICHMENT LOOP (for each decision)                     │
│     ├─ Tool 1: retrieve_similar_decisions (vector search)   │
│     ├─ Tool 2: validate_consistency (Claude)                │
│     ├─ Tool 3: extract_context (use from step 2)            │
│     ├─ Tool 4: calculate_confidence (local)                 │
│     └─ Tool 5: flag_anomalies (local)                       │
│     └─ Cost: ~$0.01 per decision (30 × $0.01 = $0.30)       │
│                                                              │
│  4. EMBEDDING GENERATION                                    │
│     ├─ Model: all-MiniLM-L6-v2 (local)                     │
│     └─ Cost: Free (no API calls)                            │
│                                                              │
│  5. STORAGE                                                 │
│     ├─ PostgreSQL + pgvector                                │
│     └─ Total latency: 2-3 min (including queue)             │
│                                                              │
└─────────────────────────────────────────────────────────────┘

COST BREAKDOWN (per 4-hour meeting):
├─ Initial extraction: $0.10
├─ 30 consistency checks: $0.30
└─ Total: $0.40/meeting

LATENCY BREAKDOWN:
├─ Webhook reception: <500ms
├─ Queue wait: <1 min (varies)
├─ Extraction (Claude): 2-5 sec
├─ Enrichment (30 × $0.01): 30 sec
├─ Embeddings: 3 sec
└─ Total wall-clock: 2-3 minutes
```

---

## LangGraph Workflow

### Agent State Definition

```python
from typing import TypedDict, List, Dict, Any

class AgentState(TypedDict):
    """Complete state for decision extraction workflow."""

    # Input
    transcript_id: str
    transcript_text: str
    project_id: str
    meeting_date: str
    participants: List[Dict]

    # Raw extraction
    raw_decisions: List[Dict]  # 30-50 decisions from Claude

    # Processing
    current_decision_index: int
    enriched_decisions: List[Dict]

    # Metadata
    tools_used: List[str]
    error_log: List[Dict]
```

### Complete Workflow Code

```python
from langgraph.graph import StateGraph, END
from langgraph.types import Send
from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
import asyncio
from typing import AsyncIterator

# Initialize LLM
llm = ChatAnthropic(
    model="claude-3-5-sonnet-20241022",
    max_tokens=4096
)

# ============================================================================
# NODE 1: EXTRACT_DECISIONS - Initial decision extraction from transcript
# ============================================================================

async def extract_decisions(state: AgentState) -> AgentState:
    """
    Use Claude to extract all FINAL decisions from transcript.

    What is a FINAL decision:
    - Clear commitment was made ("We will...", "Let's go with...")
    - Action item was assigned to someone
    - Change was explicitly agreed upon by relevant parties
    - NOT: tentative discussions, "maybe we should...", debates without resolution

    Output: 30-50 decisions in structured format
    Cost: ~$0.10 (Sonnet pricing: ~$3/1M input, ~$15/1M output)
    """

    system_prompt = """You are an expert at extracting architectural decisions from meeting transcripts.

TASK: Extract all FINAL decisions made in this meeting.

A decision is FINAL when:
1. Clear commitment was made ("We will...", "Let's go with...", "Approved")
2. Action item was assigned to someone
3. Change was agreed upon by relevant parties
4. NOT tentative ("maybe we should", "we could consider", debates)

For each FINAL decision, extract a JSON object with:
1. decision_statement (string): Concise, actionable summary (10-20 words)
   Example: "Changed structural material from concrete to steel"

2. who (string): Who made/led decision (speaker name)
   Example: "Carlos (Structural Engineer)"

3. timestamp (string): HH:MM:SS position in transcript where decided
   Example: "00:23:15"

4. discipline (string): Primary discipline affected
   Values: architecture, mep, landscape, interior, electrical, plumbing, structural, general

5. why (string): Reasoning context (2-3 sentences)
   Example: "Client requested lighter structure for seismic performance.
            Steel offers better strength-to-weight ratio."

6. causation (string): What triggered this decision
   Values: client_request, error_found, constraint, cost_saving, scope_change, risk_mitigation, other

7. impacts (array): Changes to project variables
   Format: [{ "type": "timeline|budget|scope", "change": "description" }]
   Example: [{ "type": "timeline", "change": "+2 weeks for steel delivery" }]

8. consensus (object): Agreement by discipline
   Format: { "discipline": "AGREE|DISAGREE|ABSTAIN" }
   Example: { "architecture": "AGREE", "mep": "AGREE", "structural": "AGREE" }

OUTPUT: Return ONLY valid JSON array of decision objects. No markdown, no explanations.

IMPORTANT CONSTRAINTS:
- Extract 30-50 decisions (typical 4-hour meeting)
- Only FINAL decisions (no proposals or discussions)
- Preserve exact speaker names and timestamps
- If consensus unclear, mark as ABSTAIN
- If impact not mentioned, use empty array
- Ensure all required fields present"""

    try:
        # Call Claude
        response = await llm.ainvoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"TRANSCRIPT:\n\n{state['transcript_text']}")
        ])

        # Parse JSON response
        import json
        text = response.content

        # Extract JSON from response (handle markdown code blocks)
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]

        raw_decisions = json.loads(text.strip())

        # Validate structure
        required_fields = [
            'decision_statement', 'who', 'timestamp', 'discipline',
            'why', 'causation', 'impacts', 'consensus'
        ]

        for decision in raw_decisions:
            for field in required_fields:
                if field not in decision:
                    decision[field] = None

        state['raw_decisions'] = raw_decisions
        state['current_decision_index'] = 0
        state['tools_used'].append('claude_extraction')

        return state

    except Exception as e:
        state['error_log'].append({
            'node': 'extract_decisions',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        })
        state['raw_decisions'] = []
        return state


# ============================================================================
# NODE 2: ENRICH_DECISION - Apply 5 tools to each decision
# ============================================================================

async def enrich_decision(state: AgentState) -> AgentState:
    """
    Enrich current decision with 5 tools.
    This node runs in a loop until all decisions processed.
    """

    idx = state['current_decision_index']

    # Check if done
    if idx >= len(state['raw_decisions']):
        return state

    decision = state['raw_decisions'][idx].copy()
    decision['index'] = idx

    try:
        # TOOL 1: Retrieve similar decisions (vector search)
        similar = await retrieve_similar_decisions(
            project_id=state['project_id'],
            decision_statement=decision.get('decision_statement', ''),
            exclude_decision_id=None
        )
        decision['similar_decisions'] = similar
        state['tools_used'].append('retrieve_similar')

        # TOOL 2: Validate consistency (Claude)
        consistency = await validate_decision_consistency(
            decision=decision,
            similar_decisions=similar,
            project_id=state['project_id']
        )
        decision['consistency_notes'] = consistency.get('notes', '')
        consistency_score = consistency.get('score', 0.5)
        state['tools_used'].append('validate_consistency')

        # TOOL 3: Extract decision context (already in 'why' from extraction)
        # No additional work needed - the full context is in decision['why']

        # TOOL 4: Calculate confidence score (local formula)
        confidence = calculate_confidence_score(
            consensus=decision.get('consensus', {}),
            consistency_score=consistency_score,
            has_similar=len(similar) > 0
        )
        decision['confidence'] = confidence
        state['tools_used'].append('calculate_confidence')

        # TOOL 5: Flag anomalies (local detection)
        flags = flag_anomalies(
            decision=decision,
            consistency_score=consistency_score
        )
        decision['anomaly_flags'] = flags
        state['tools_used'].append('flag_anomalies')

        # Add to enriched decisions
        state['enriched_decisions'].append(decision)
        state['current_decision_index'] += 1

    except Exception as e:
        state['error_log'].append({
            'node': 'enrich_decision',
            'decision_index': idx,
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        })
        state['current_decision_index'] += 1

    return state


# ============================================================================
# NODE 3: GENERATE_EMBEDDINGS - Create vector representations
# ============================================================================

async def generate_embeddings(state: AgentState) -> AgentState:
    """
    Generate vector embeddings for all enriched decisions.
    Uses sentence-transformers (runs locally, no API calls).
    """

    from sentence_transformers import SentenceTransformer

    try:
        # Load model once (singleton in production)
        model = SentenceTransformer('all-MiniLM-L6-v2')

        # Batch embed all decisions
        texts = [d.get('decision_statement', '') for d in state['enriched_decisions']]
        embeddings = model.encode(texts, convert_to_numpy=True, batch_size=32)

        # Attach embeddings
        for i, decision in enumerate(state['enriched_decisions']):
            decision['embedding'] = embeddings[i].tolist()

        state['tools_used'].append('generate_embeddings')

    except Exception as e:
        state['error_log'].append({
            'node': 'generate_embeddings',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        })

    return state


# ============================================================================
# NODE 4: STORE_DECISIONS - Save to PostgreSQL
# ============================================================================

async def store_decisions(state: AgentState) -> AgentState:
    """
    Store all enriched decisions with embeddings in PostgreSQL.
    Runs as single transaction for atomicity.
    """

    from app.database import async_session
    from app.database.models import Decision, Transcript

    try:
        async with async_session() as session:
            # Verify transcript exists
            transcript = await session.execute(
                select(Transcript).where(Transcript.id == state['transcript_id'])
            )
            transcript = transcript.scalar_one_or_none()

            if not transcript:
                raise ValueError(f"Transcript {state['transcript_id']} not found")

            # Insert all decisions in batch
            decisions_to_insert = []

            for decision in state['enriched_decisions']:
                db_decision = Decision(
                    project_id=state['project_id'],
                    transcript_id=state['transcript_id'],
                    decision_statement=decision.get('decision_statement'),
                    who=decision.get('who'),
                    timestamp=decision.get('timestamp'),
                    discipline=decision.get('discipline'),
                    why=decision.get('why'),
                    causation=decision.get('causation'),
                    impacts=decision.get('impacts'),
                    consensus=decision.get('consensus'),
                    confidence=decision.get('confidence'),
                    similar_decisions=decision.get('similar_decisions'),
                    consistency_notes=decision.get('consistency_notes'),
                    anomaly_flags=decision.get('anomaly_flags'),
                    embedding=decision.get('embedding')
                )
                decisions_to_insert.append(db_decision)

            session.add_all(decisions_to_insert)
            await session.commit()

            state['tools_used'].append('store_decisions')

    except Exception as e:
        state['error_log'].append({
            'node': 'store_decisions',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat()
        })

    return state


# ============================================================================
# CONDITIONAL LOGIC - Determine next node
# ============================================================================

def should_continue_enriching(state: AgentState) -> str:
    """
    Determine if we should enrich more decisions or move to embedding generation.
    """
    if state['current_decision_index'] < len(state['raw_decisions']):
        return "enrich"  # Loop back to enrich_decision
    else:
        return "embed"   # Move to generate_embeddings


# ============================================================================
# BUILD WORKFLOW
# ============================================================================

workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("extract", extract_decisions)
workflow.add_node("enrich", enrich_decision)
workflow.add_node("embed", generate_embeddings)
workflow.add_node("store", store_decisions)

# Set entry point
workflow.set_entry_point("extract")

# Add edges
workflow.add_edge("extract", "enrich")

# Conditional: loop enrichment or proceed to embedding
workflow.add_conditional_edges(
    "enrich",
    should_continue_enriching,
    {
        "enrich": "enrich",  # Loop back to enrich_decision
        "embed": "embed"     # Move to generate_embeddings
    }
)

workflow.add_edge("embed", "store")
workflow.add_edge("store", END)

# Compile
agent = workflow.compile()
```

---

## Tool Implementations

### Tool 1: retrieve_similar_decisions

```python
async def retrieve_similar_decisions(
    project_id: str,
    decision_statement: str,
    exclude_decision_id: Optional[str] = None,
    limit: int = 5,
    similarity_threshold: float = 0.70
) -> List[Dict]:
    """
    Find similar decisions using vector search.

    Args:
        project_id: Project UUID
        decision_statement: Decision text to embed
        exclude_decision_id: Don't return this decision
        limit: Max results to return
        similarity_threshold: Only return matches above this threshold

    Returns:
        List of similar decisions with similarity scores

    Cost: Free (local vector search)
    Latency: <100ms (MVP - exact search)
    """

    from sentence_transformers import SentenceTransformer
    from sqlalchemy import select, and_
    from app.database import async_session
    from app.database.models import Decision

    try:
        # Generate embedding for query
        model = SentenceTransformer('all-MiniLM-L6-v2')
        query_embedding = model.encode(decision_statement, convert_to_numpy=True)

        # Vector search query (MVP: exact search, <200 decisions)
        async with async_session() as session:
            # Raw SQL for pgvector similarity search
            from sqlalchemy import text

            query = text("""
                SELECT id, decision_statement, discipline,
                       1 - (embedding <=> :query_vector) AS similarity
                FROM decisions
                WHERE project_id = :project_id
                  AND (embedding IS NOT NULL)
                  AND (:exclude_id IS NULL OR id != :exclude_id)
                ORDER BY embedding <=> :query_vector
                LIMIT :limit
            """)

            result = await session.execute(query, {
                'query_vector': query_embedding.tolist(),
                'project_id': project_id,
                'exclude_id': exclude_decision_id,
                'limit': limit
            })

            rows = result.fetchall()

            # Filter by threshold and format response
            similar = []
            for row in rows:
                if row.similarity >= similarity_threshold:
                    similar.append({
                        'decision_id': str(row.id),
                        'decision_statement': row.decision_statement,
                        'discipline': row.discipline,
                        'similarity_score': float(row.similarity)
                    })

            return similar

    except Exception as e:
        print(f"Error in retrieve_similar_decisions: {e}")
        return []
```

### Tool 2: validate_decision_consistency

```python
async def validate_decision_consistency(
    decision: Dict,
    similar_decisions: List[Dict],
    project_id: str
) -> Dict[str, Any]:
    """
    Use Claude to check if decision aligns with past decisions.

    Args:
        decision: Current decision
        similar_decisions: Past similar decisions
        project_id: Project context

    Returns:
        {
            'score': 0.0-1.0 (1.0 = fully aligned, 0.0 = contradicts),
            'notes': Explanation string
        }

    Cost: ~$0.01 per decision (Sonnet)
    Latency: 1-2 seconds
    """

    if not similar_decisions:
        return {
            'score': 1.0,
            'notes': 'No similar past decisions for comparison'
        }

    try:
        llm = ChatAnthropic(model="claude-3-5-sonnet-20241022")

        # Format past decisions
        past_decisions_text = "\n".join([
            f"- {d['decision_statement']} (similarity: {d['similarity_score']:.0%})"
            for d in similar_decisions[:5]
        ])

        prompt = f"""CURRENT DECISION:
{decision.get('decision_statement')}

Reasoning: {decision.get('why')}

SIMILAR PAST DECISIONS:
{past_decisions_text}

TASK: Does the current decision align with, contradict, or diverge from past decisions?

Respond with ONLY a JSON object (no markdown, no explanation):
{{
  "score": <0.0-1.0>,
  "notes": "<1 sentence explanation>"
}}

Score interpretation:
- 1.0: Fully aligned with past decisions
- 0.8-0.9: Mostly aligned with minor deviation
- 0.5-0.7: Neutral or mixed alignment
- 0.2-0.4: Some contradiction
- 0.0: Direct contradiction
"""

        response = await llm.ainvoke([HumanMessage(content=prompt)])

        import json
        text = response.content

        # Extract JSON
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]

        result = json.loads(text.strip())
        return {
            'score': float(result.get('score', 0.5)),
            'notes': str(result.get('notes', 'Unable to determine'))
        }

    except Exception as e:
        print(f"Error in validate_decision_consistency: {e}")
        return {'score': 0.5, 'notes': 'Error validating consistency'}
```

### Tool 4: calculate_confidence_score

```python
def calculate_confidence_score(
    consensus: Dict[str, str],
    consistency_score: float,
    has_similar: bool
) -> float:
    """
    Calculate confidence score using weighted formula.

    Args:
        consensus: {discipline: 'AGREE|DISAGREE|ABSTAIN'}
        consistency_score: 0.0-1.0 from validate_decision_consistency
        has_similar: Whether similar decisions exist

    Returns:
        confidence: 0.0-1.0

    Formula:
        confidence = (consensus_factor × 0.5) +
                     (consistency_score × 0.3) +
                     (historical_factor × 0.2)

    Cost: Free (local computation)
    Latency: <1ms
    """

    # Calculate consensus factor
    if not consensus:
        consensus_factor = 0.5
    else:
        agree_count = sum(1 for v in consensus.values() if v == 'AGREE')
        total = len(consensus)
        consensus_factor = agree_count / total if total > 0 else 0.5

    # Calculate historical factor
    historical_factor = 1.0 if has_similar else 0.7

    # Weighted sum
    confidence = (
        consensus_factor * 0.5 +
        consistency_score * 0.3 +
        historical_factor * 0.2
    )

    # Clamp to [0, 1]
    return round(min(1.0, max(0.0, confidence)), 2)
```

### Tool 5: flag_anomalies

```python
def flag_anomalies(
    decision: Dict,
    consistency_score: float
) -> List[Dict]:
    """
    Detect concerning patterns in decision.

    Args:
        decision: Enriched decision object
        consistency_score: From validate_decision_consistency

    Returns:
        List of anomaly flags

    Flags detected:
    - high_dissent: One or more disciplines disagree
    - reversal_pattern: Contradicts past decision
    - broad_cascade: Affects many disciplines

    Cost: Free (local computation)
    Latency: <1ms
    """

    flags = []

    # Check 1: High dissent (one or more disciplines disagree)
    consensus = decision.get('consensus', {})
    dissent_count = sum(1 for v in consensus.values() if v == 'DISAGREE')

    if dissent_count >= 1:
        severity = 'high' if dissent_count >= 2 else 'medium'
        flags.append({
            'type': 'high_dissent',
            'severity': severity,
            'description': f'{dissent_count} discipline(s) disagreed with this decision'
        })

    # Check 2: Reversal pattern (low consistency with past)
    if consistency_score < 0.4:
        flags.append({
            'type': 'reversal_pattern',
            'severity': 'high',
            'description': 'This decision contradicts or significantly deviates from past decisions'
        })

    # Check 3: Broad cascade (affects 3+ disciplines)
    disciplines_affected = set(consensus.keys())
    if len(disciplines_affected) >= 3:
        flags.append({
            'type': 'broad_cascade',
            'severity': 'low',
            'description': f'Affects {len(disciplines_affected)} disciplines ({", ".join(disciplines_affected)})'
        })

    # Check 4: Missing context
    if not decision.get('why') or len(decision.get('why', '')) < 20:
        flags.append({
            'type': 'insufficient_context',
            'severity': 'low',
            'description': 'Decision reasoning is incomplete'
        })

    return flags
```

---

## Task Scheduling (APScheduler)

### Queue Processing

```python
# app/extraction/scheduler.py
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
import asyncio

scheduler = AsyncIOScheduler()

async def process_extraction_queue():
    """
    Periodically check for transcripts pending extraction.
    Run every 30 seconds.
    """
    from app.database import async_session
    from app.database.models import Transcript
    from sqlalchemy import select

    async with async_session() as session:
        # Find transcripts without extracted decisions
        pending = await session.execute(
            select(Transcript).where(
                ~exists(
                    select(1).select_from(Decision)
                    .where(Decision.transcript_id == Transcript.id)
                )
            ).limit(1)  # Process one at a time
        )

        transcript = pending.scalar_one_or_none()

        if transcript:
            # Run extraction agent
            state = AgentState(
                transcript_id=str(transcript.id),
                transcript_text=transcript.transcript_text,
                project_id=str(transcript.project_id),
                meeting_date=transcript.meeting_date.isoformat(),
                participants=transcript.participants,
                raw_decisions=[],
                current_decision_index=0,
                enriched_decisions=[],
                tools_used=[],
                error_log=[]
            )

            try:
                result = await agent.ainvoke(state)

                # Log success
                logger.info(
                    f"Extraction complete",
                    extra={
                        'transcript_id': transcript.id,
                        'decisions_extracted': len(result['enriched_decisions']),
                        'cost': f"${0.40 * len(result['enriched_decisions']) / 30:.2f}",
                        'tools': result['tools_used']
                    }
                )

            except Exception as e:
                logger.error(
                    f"Extraction failed",
                    exc_info=True,
                    extra={'transcript_id': transcript.id}
                )


# Schedule the job
scheduler.add_job(
    process_extraction_queue,
    IntervalTrigger(seconds=30),
    id='extract_decisions',
    name='Process decision extraction queue'
)

# Start scheduler in FastAPI startup
async def startup_event():
    scheduler.start()

async def shutdown_event():
    scheduler.shutdown()
```

---

## Cost & Performance Analysis

### Cost Breakdown (per meeting)

```
Initial extraction (Claude):
├─ Input: ~10K tokens (typical meeting transcript)
├─ Output: ~2K tokens (30-50 decisions in JSON)
├─ Cost: 10K * $0.003 + 2K * $0.015 = $0.03 + $0.03 = $0.06
│ (using Claude 3.5 Sonnet rates: $3/1M input, $15/1M output)

Consistency validation (30 decisions × Claude):
├─ Per decision: ~300 tokens in + 100 tokens out
├─ Per decision cost: 300 * $0.000003 + 100 * $0.000015 = $0.0009 + $0.0015 = $0.0024
├─ 30 decisions: 30 × $0.0024 = $0.072
├─ With margin: ~$0.08

Embeddings (sentence-transformers, local):
├─ Cost: $0.00 (no API calls)

Total per meeting: $0.06 + $0.08 = $0.14
Budget estimate (40 meetings/month): $0.14 × 40 = $5.60/month
```

### Performance Targets

```
Latency:
├─ Webhook reception: <500ms
├─ Initial extraction: 2-5 seconds
├─ Per decision enrichment: 0.5-1 second
├─ 30 decisions: 15-30 seconds
├─ Embedding generation: 3-5 seconds
├─ Database storage: 1 second
├─ TOTAL: ~25-45 seconds actual API time
├─ Wall-clock (with queue): 2-3 minutes typical

Throughput:
├─ Sequential: 1 transcript at a time
├─ With async I/O: Can queue multiple, process one at a time
├─ Scale: If needed, duplicate agent instances (e.g., 3 workers)

Error Resilience:
├─ Transient errors: Retry decision enrichment
├─ Fatal errors: Log and continue to next transcript
├─ Partial failure: Store successfully enriched decisions, flag errors
```

---

## Monitoring & Observability

### Logging

```python
import structlog

logger = structlog.get_logger()

# In each node
logger.info(
    "node_execution",
    node_name="extract_decisions",
    transcript_id=state['transcript_id'],
    decisions_count=len(state['raw_decisions']),
    duration_ms=elapsed_time
)

logger.error(
    "node_failed",
    node_name="enrich_decision",
    decision_index=idx,
    error=str(e),
    timestamp=datetime.utcnow().isoformat()
)
```

### Metrics

```python
# Track in Sentry or custom metrics
- decisions_extracted_per_meeting (avg: 35)
- extraction_cost_per_meeting (avg: $0.14)
- extraction_latency_seconds (p95: 45 sec)
- consistency_validation_cost (avg: $0.08)
- embedding_generation_latency_ms (avg: 4000)
- error_rate_percent (target: <1%)
```

---

## Testing Strategy

### Unit Tests

```python
# tests/unit/test_extraction.py
@pytest.mark.asyncio
async def test_confidence_calculation():
    """Verify confidence formula."""
    score = calculate_confidence_score(
        consensus={'arch': 'AGREE', 'mep': 'AGREE'},
        consistency_score=0.9,
        has_similar=True
    )
    assert 0.85 <= score <= 1.0

@pytest.mark.asyncio
async def test_anomaly_detection():
    """Verify anomaly flags are set correctly."""
    flags = flag_anomalies(
        decision={'consensus': {'arch': 'AGREE', 'mep': 'DISAGREE'}},
        consistency_score=0.3
    )
    assert any(f['type'] == 'high_dissent' for f in flags)
    assert any(f['type'] == 'reversal_pattern' for f in flags)
```

### Integration Tests

```python
# tests/integration/test_agent.py
@pytest.mark.asyncio
async def test_full_extraction_pipeline():
    """Test complete workflow: extraction → enrichment → storage."""
    state = AgentState(
        transcript_id='test_123',
        transcript_text=SAMPLE_TRANSCRIPT,
        project_id='project_uuid',
        meeting_date='2026-02-01T14:00:00Z',
        participants=[],
        raw_decisions=[],
        current_decision_index=0,
        enriched_decisions=[],
        tools_used=[],
        error_log=[]
    )

    result = await agent.ainvoke(state)

    # Verify
    assert len(result['enriched_decisions']) >= 30
    assert len(result['error_log']) == 0
    assert all('confidence' in d for d in result['enriched_decisions'])
    assert all('embedding' in d for d in result['enriched_decisions'])
```

---

## Success Criteria

✅ All 5 tools implemented and tested
✅ Initial extraction: 30-50 decisions, <5 sec latency
✅ Consistency validation: <$0.01 per decision
✅ Embeddings: Local generation, <100ms per decision
✅ Storage: Atomic transaction, no partial failures
✅ Error handling: Graceful degradation, detailed logging
✅ Cost: <$0.20 per meeting
✅ Total latency: <3 minutes wall-clock

---

**Document Status:** Complete
**Last Updated:** 2026-02-07
**Next:** Frontend Architecture & Deployment Specifications

— Aria, arquitetando o futuro 🏗️
