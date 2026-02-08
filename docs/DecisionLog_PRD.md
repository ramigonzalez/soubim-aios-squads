# DecisionLog: Product Requirements Document (PRD)

**Document Version:** 1.0
**Date Created:** 2026-02-07
**Status:** Ready for Development
**Product Owner:** Morgan (PM)
**For:** souBIM Architecture Company

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [User Personas & Workflows](#user-personas--workflows)
3. [Feature Specifications](#feature-specifications)
4. [Data Model (High-Level)](#data-model-high-level)
5. [API Specification (Overview)](#api-specification-overview)
6. [UI/UX Specification](#uiux-specification)
7. [Prioritization & Phasing](#prioritization--phasing)
8. [Success Metrics & Acceptance Criteria](#success-metrics--acceptance-criteria)
9. [Dependencies & Risks](#dependencies--risks)
10. [Glossary & Terminology](#glossary--terminology)

---

## EXECUTIVE SUMMARY

### Product Vision

**DecisionLog** is a decision-centric documentation system that captures architectural project decisions from Google Meet calls, structures them with complete attribution (WHO, WHEN, WHAT CHANGED, CONSENSUS, DISCIPLINE IMPACT), and visualizes them through a project timeline dashboard.

This enables:
- **Team autonomy:** Trained leads make decisions confidently, knowing they're documented and Gabriela can review asynchronously
- **Leadership transition:** Gabriela moves from operational decisions to sales focus; reviews project decisions via digest/dashboard
- **Knowledge preservation:** Project history is self-documenting; new hires onboard by reading timeline
- **Client transparency:** Decisions visible with rationale (future phase)

### Core Problem (from Brief)

souBIM loses institutional knowledge during leadership transitions. Daily decisions (material changes, structural revisions, budget impacts, timeline shifts) happen in meetings but are never documented systematically. When Gabriela is absent, no one knows the project's decision evolution.

### MVP Success Definition

- ✅ Gabriela catches up on 3 months of project decisions in **<30 minutes** via dashboard
- ✅ Team has **confidence decisions are documented and attributed** correctly
- ✅ **95%+** of real project decisions are captured and surfaced
- ✅ Semantic search finds **discipline-relevant decisions** without explicit tagging
- ✅ **Zero friction in meetings** (Tactiq runs invisibly, webhooks deliver automatically)

### Target Users (Phase 1)

- **Gabriela** (1 user) - Architecture Director, async oversight, maternity leave coverage
- **Architects** (9 users) - 3 groups of 3, autonomous decision-making, project context
- **Total MVP:** 10 users

---

## USER PERSONAS & WORKFLOWS

### Persona 1: Gabriela (Architecture Director)

**Demographics & Role:**
- Title: Architecture Director
- Oversees: All souBIM projects (Type A contractor + Type B lead)
- Frequency: 3-5x/week (async review, not daily attendance)
- Background: 15+ years architecture, growing business, transitioning to sales

**Pain Points:**
- Can't catch up on 2-3 months of decisions while on maternity leave
- Loses visibility into what changed, who decided, and why
- Currently bottleneck for all architectural decisions
- Exhausted, wants to focus on business development

**Goals:**
1. Stay informed on all architectural decisions across projects without attending every meeting
2. Review decisions asynchronously in <30 min per project
3. Delegate architectural decisions to trained team leads with confidence
4. Access decision history during maternity leave (catch-up digest)

**Success Metrics (Personal):**
- Reviews decisions with <10 min catch-up per project/week
- Understands 95% of decisions without needing to drill down
- Time freed up: 15+ hours/week reclaimed for sales activities
- Team makes 85%+ of decisions independently

**Workflows:**

**Workflow 1: Weekly Project Catch-Up**
1. Log into DecisionLog dashboard
2. Navigate to "Projects" view
3. Select active project (e.g., "Downtown Commercial Retrofit")
4. See executive digest: "While you were gone: 3 structural changes, 1 MEP impact (+2 weeks timeline), 2 client scope changes"
5. Links to detailed timeline for deep dives
6. Approval/flag decisions if needed
7. Mark as reviewed

**Time:** ~5-10 min per project, 3-5 projects = 15-50 min total

---

**Workflow 2: Decision Review During Absence**
1. Receives notification: "New decisions documented for Downtown Project"
2. Opens DecisionLog on phone/laptop
3. Scans digest: "3 decisions made yesterday"
4. Drills down on any flagged decisions (high impact, low consensus)
5. Approves or flags for team review upon return
6. Knows team is documenting everything; trusts the system

**Time:** ~15 min per day during maternity leave

---

**Workflow 3: Team Training via Decision Timeline**
1. Sees new architect needs onboarding
2. Says: "Read the Downtown Project timeline from January onwards"
3. New architect reads 30+ decisions in context
4. Understands: what changed, why, who decided, what cascades
5. Can make similar decisions with confidence

**Time:** Saves Gabriela 2-3 hours of mentoring per onboard

---

**What She'll Use:**
- ✅ Executive digest per project (weekly or on-demand)
- ✅ Full decision timeline with drill-down to transcript
- ✅ All souBIM projects (Type A & B) in one view
- ✅ Filters by date, decision type, impact level
- ✅ Flagged decisions (high impact, low consensus)
- ✅ PDF export (decision log for client handoff)
- ❌ Real-time notifications (async only)
- ❌ Decision creation (team creates, she reviews)

---

### Persona 2: Senior Architect (Representative of 9-person team)

**Demographics & Role:**
- Title: Senior Architect or Junior Architect
- Reporting to: Gabriela
- Frequency: Daily during meetings + post-meeting review
- Background: 5-15 years experience, varying levels of autonomy
- Team composition: 3 groups × 3 architects (3 leads, 6 mid-level)

**Pain Points:**
- Lack confidence making decisions without Gabriela present
- Don't understand full context of past decisions
- Decisions from other disciplines (MEP, Landscape) impact architecture but aren't documented
- When Gabriela is away, team feels disempowered and frozen
- Fear of making wrong decisions that will be reversed

**Goals:**
1. Make architectural decisions with confidence during meetings
2. Understand why past decisions were made (project context)
3. See how external disciplines' decisions affect architecture
4. Know Gabriela will review and support their decisions
5. Onboard faster by reading decision timeline

**Success Metrics (Personal):**
- Makes architectural decisions independently (85%+ without Gabriela)
- Confident in decisions made during Gabriela's absence (8/10+ confidence)
- Decision turnaround time: <4 hours (vs. current 2-3 days waiting for Gabriela)
- Understands 90%+ of cross-discipline impacts affecting their work

**Workflows:**

**Workflow 1: Before Meeting (Context Building)**
1. Knows meeting scheduled for "Downtown Project - MEP coordination call"
2. Opens DecisionLog, filters to "Downtown Project, last 30 days"
3. Sees 15 recent architectural decisions
4. Reads 2-3 key decisions to understand context
5. Notes current state: "Last decision: switched to steel frame on Dec 15, affects MEP routing"
6. Enters meeting prepared

**Time:** 5-10 min before important meetings

---

**Workflow 2: After Meeting (Decision Documentation)**
1. Meeting ends, team discusses: "We're changing foundation depth from 2m to 2.5m"
2. One architect summarizes: "Decision: Foundation depth adjustment (2m → 2.5m) due to soil report findings, impacts timeline (+1 week), affects MEP basement layout"
3. System auto-extracts this via transcript analysis
4. Team sees decision documented within 30 min
5. Decision shows: statement, who (who spoke), why, impacts, consensus
6. Gabriela will review asynchronously

**Time:** Automatic extraction, <30 min after meeting

---

**Workflow 3: Cross-Discipline Impact Understanding**
1. Architect working on structural layout
2. Filters: "Show me MEP decisions affecting my discipline"
3. Sees: "MEP team moved chiller location (Dec 20)" with impact notes
4. Understands: "This shifts our structural column layout by 2m"
5. Can coordinate proactively instead of discovering conflicts later

**Time:** 10 min per day to stay aligned

---

**Workflow 4: Gabriela's Absence Coverage**
1. Gabriela is on maternity leave
2. Major structural decision needed: "Change from wood to steel frame"
3. Architect leads decision in meeting
4. Documents it: Decision statement, reasoning, impacts
5. System extracts and stores it
6. Team confidence: "Gabriela will see this and support us when she returns"
7. Knows she can review decision asynchronously; doesn't have to wait for approval

**Time:** Decision making in meeting, automatic documentation

---

**What They'll Use:**
- ✅ Full project timeline (architectural decisions + external discipline impacts)
- ✅ Decision drill-down to see full context and transcript
- ✅ Filters by date, decision type, discipline
- ✅ Consensus tracking (who agreed/disagreed)
- ✅ Cross-discipline impact view
- ✅ Search by keyword or discipline
- ✅ View who made each decision (attribution)
- ❌ Executive digest (too high-level for daily work)
- ❌ Approval workflows (Gabriela approves, not peers)
- ❌ Create decisions manually (auto-extracted from transcript)

---

### User Access Control (MVP Phase 1)

| Permission | Gabriela | Architects | Future: Clients |
|---|---|---|---|
| **View all projects** | ✅ | Own projects only | Own project only |
| **View all decisions** | ✅ | Own projects | Own meetings only |
| **Create decisions** | ✅ (approve) | ✅ (via transcript) | ❌ |
| **Edit decisions** | ✅ | ✅ (own projects) | ❌ |
| **Approve decisions** | ✅ | ❌ | ❌ |
| **Export timeline** | ✅ | ✅ | ⚠️ Phase 2 |
| **View digest** | ✅ | ❌ | ❌ |

---

## FEATURE SPECIFICATIONS

### Feature 1: Decision Capture via Tactiq Webhooks

**User Story:**
> As a souBIM architect, I want project decisions documented automatically from Google Meet calls so that I don't have to manually log them and risk losing context.

**Purpose:**
Enable zero-friction capture of meeting transcripts via Tactiq webhooks. Decisions are extracted from complete transcript context, not real-time stream.

**Requirements:**

**Must Have (CRITICAL):**
- ✅ Integrate with Tactiq webhook endpoint (`POST /webhooks/transcript`)
- ✅ Receive: meeting_id, participants list, full transcript text, timestamps, meeting metadata
- ✅ Store raw transcript in database (PostgreSQL)
- ✅ Support Google Meet only (MVP scope)
- ✅ Handle 4+ hour calls without data loss
- ✅ Webhook payload validation (verify Tactiq sender)
- ✅ Graceful error handling (webhook retries, idempotency)

**Should Have:**
- ⚠️ Webhook success/failure logging for monitoring
- ⚠️ Manual transcript upload fallback (if Tactiq fails)

**Nice to Have:**
- ❌ Zoom/Teams support (Phase 3)
- ❌ Real-time transcript streaming (Phase 3)

**Technical Details:**
- Webhook endpoint: `POST /webhooks/transcript`
- Payload size: Max 10MB (4-hour call ≈ 100KB)
- Timeout: 30 seconds
- Retry logic: Exponential backoff (3 attempts)
- Idempotency: Use `webhook_id` as key to prevent duplicates

**Acceptance Criteria:**
- [ ] Webhook receives Tactiq transcript within 5 min of meeting end
- [ ] Transcript stored in `transcripts` table with full metadata
- [ ] Duplicate prevention (idempotent via webhook_id)
- [ ] Error logs for failed deliveries
- [ ] Graceful handling of missing participant info
- [ ] System processes 50+ concurrent webhooks/day

**Data Stored:**
```
transcripts table:
├── id (UUID)
├── webhook_id (unique, idempotency key)
├── meeting_id (from Tactiq)
├── participants [{ name, email (optional) }]
├── transcript_text (full meeting transcript)
├── transcript_duration (HH:MM:SS)
├── created_at (when webhook delivered)
└── processed_at (when decision extraction completed)
```

---

### Feature 2: Decision Extraction (LLM-Powered)

**User Story:**
> As a product owner, I want decisions automatically extracted from transcripts with full attribution (who, when, why, impact) so that they're structured and queryable.

**Purpose:**
Analyze complete meeting transcript via Claude to extract architectural decisions, structured with metadata.

**Requirements:**

**Must Have (CRITICAL):**
- ✅ Claude analyzes full transcript (context-aware, not windowed)
- ✅ Extracts ALL FINAL DECISIONS (not tentative, not suggestions)
- ✅ For each decision, extract:
  - Decision statement (what was decided, e.g., "Changed structural material from concrete to steel")
  - Who (speaker name from Tactiq metadata)
  - When (timestamp HH:MM:SS in transcript)
  - Why (reasoning, context from discussion)
  - Discipline (Architecture, MEP, Landscape, etc., inferred from decision content)
  - Impacts (scope/timeline/budget effects mentioned in meeting)
  - Consensus (AGREE/DISAGREE/ABSTAIN by discipline, inferred from tone)
  - Causation (what triggered this decision: client request, technical constraint, error found, etc.)

- ✅ Confidence scoring (0-1 range)
- ✅ Handle edge cases:
  - No decisions in meeting (silent failure, don't create empty)
  - Unclear consensus (mark as ABSTAIN or MIXED)
  - Multi-disciplinary meetings (extract per discipline)

**Should Have:**
- ⚠️ Handle Portuguese transcripts (major client base)
- ⚠️ Duplicate decision detection (same decision extracted twice)

**Nice to Have:**
- ❌ Real-time extraction (Phase 3)
- ❌ Decision templates/standardization (Phase 2)

**Technical Details:**
- LLM: Claude 3.5 Sonnet (accuracy > cost)
- Prompt engineering: System prompt + user prompt for extraction
- Token budget: ~20K tokens per 4-hour meeting
- Cost: ~$0.10 per meeting (Sonnet pricing)
- Async processing: APScheduler triggers extraction <1 min after webhook

**Prompt Structure (High-Level):**
```
System: You are an expert at extracting architectural decisions from meeting transcripts.

User: Analyze this transcript and extract all FINAL decisions made.
For each decision, provide:
1. Decision statement
2. Who decided (by speaker name)
3. When (timestamp in format HH:MM:SS)
4. Why (reasoning from context)
5. Which discipline made it
6. Impact on scope/timeline/budget (if mentioned)
7. Consensus level (AGREE/DISAGREE/ABSTAIN)
8. What triggered this decision

Respond in JSON format: [{ statement, who, when, why, discipline, impacts, consensus, causation }]

Transcript:
[FULL TRANSCRIPT TEXT]
```

**Acceptance Criteria:**
- [ ] 95%+ recall: Of 30 decisions in test transcript, extracts 28+
- [ ] <5% false positives: No "hallucinated" decisions
- [ ] Accuracy on consensus detection: 90%+ match vs. human judgment
- [ ] Accuracy on timestamp extraction: ±30 seconds
- [ ] Handles 50+ decisions per meeting (edge case)
- [ ] Processes meeting <2 min after webhook (before user sees dashboard)
- [ ] Graceful handling if LLM fails (log error, retry next hour)

**Data Stored:**
```
decisions table (initial):
├── id (UUID)
├── project_id (FK)
├── transcript_id (FK)
├── decision_statement (text)
├── who (speaker name)
├── timestamp (HH:MM:SS)
├── discipline (Architecture|MEP|Landscape|Interior|Electrical|Plumbing)
├── why (reasoning, text)
├── impacts [{ type: 'timeline'|'scope'|'budget', change: 'description' }]
├── consensus { discipline: 'AGREE'|'DISAGREE'|'ABSTAIN' }
├── causation (what triggered: 'client_request'|'technical_constraint'|'error_found'|'etc')
├── confidence (float 0-1)
├── created_at
└── updated_at
```

---

### Feature 3: Agent-Based Decision Enrichment (LangGraph + Tools)

**User Story:**
> As a system architect, I want decisions enriched with context validation and anomaly detection so that Gabriela can spot concerning patterns and team can learn from history.

**Purpose:**
For each decision extracted, use LangGraph agent with 5 tools to:
1. Retrieve similar past decisions (project context)
2. Validate consistency with past decisions
3. Extract full decision context
4. Calculate confidence scores
5. Flag anomalies (high dissent, reversals, cascades)

**Requirements:**

**Must Have (CRITICAL):**

**Tool 1: retrieve_similar_decisions()**
- Search for past decisions in SAME PROJECT ONLY
- Query: Vector similarity search (cosine distance)
- Scope: Last 6 months, same project_id
- Return: 3-5 most similar decisions with scores
- Cost: ~$0 (local vector search)
- Impact: Helps team see precedent, validates approach

---

**Tool 2: validate_decision_consistency()**
- Input: Current decision + 3-5 similar past decisions
- Task: Claude analyzes alignment
- Output: Consistency score (0-1) + notes
- Example: "This decision ALIGNS with decision from Dec 3 (same material choice rationale)"
- Cost: ~$0.01 per decision (Claude call)
- Impact: Flags contradictions (red flag)

---

**Tool 3: extract_decision_context()**
- Input: Decision timestamp + full transcript
- Task: Extract 5-10 min context window around timestamp
- Output: Reasoning summary (why this decision makes sense)
- Cost: Included in initial extraction (no extra LLM call)
- Impact: Provides full context for drill-down view

---

**Tool 4: calculate_confidence_score()**
- Input: Consensus + Consistency + Historical support
- Calculation:
  - Base: Consensus level (AGREE=1.0, ABSTAIN=0.7, DISAGREE=0.4)
  - Multiplier: Consistency match (aligned=×1.2, contradicts=×0.8)
  - Multiplier: Historical support (similar exists=+0.1)
  - Final: 0-1 score
- Output: Confidence score + breakdown
- Cost: <1ms (local computation)
- Impact: Highlights uncertain decisions for review

---

**Tool 5: flag_anomalies()**
- Checks:
  - High dissent: One or more disciplines disagree
  - Reversal pattern: Similar decision was reversed before
  - Broad cascade: Affects 3+ disciplines
  - Unusual actor: Someone outside their discipline making decision
- Output: Array of flags with severity
- Cost: <1ms (local computation)
- Impact: Alerts Gabriela to review potentially risky decisions

---

**Agent Orchestration:**
- For each extracted decision, agent runs in sequence:
  1. Call Tool 1 (retrieve_similar)
  2. Call Tool 2 (validate_consistency)
  3. Call Tool 3 (extract_context) - already done, skip
  4. Call Tool 4 (calculate_confidence)
  5. Call Tool 5 (flag_anomalies)
- Store all results in decision record
- Total time: ~5-10 seconds per decision (parallel tools)

**Should Have:**
- ⚠️ Agent learning: Use tool results to improve future prompts
- ⚠️ Tool result caching (don't re-search same similar decisions)

**Nice to Have:**
- ❌ Custom ML for confidence (Phase 2, after 6+ months data)
- ❌ Predictive reversal flagging (Phase 2)

**Acceptance Criteria:**
- [ ] Tool 1: Retrieves similar decisions accurately (manual test)
- [ ] Tool 2: Consistency scoring aligns with human judgment (90%+)
- [ ] Tool 3: Context extraction captures full reasoning
- [ ] Tool 4: Confidence score correlates with actual reversal rates
- [ ] Tool 5: Anomaly flags catch concerning patterns (80%+ catch rate)
- [ ] Agent runs <15 seconds per decision (end-to-end)
- [ ] No infinite loops or tool cascades

**Data Stored:**
```
decisions table (enriched):
├── [all fields from Feature 2]
├── similar_decisions_ids [list of decision IDs]
├── consistency_score (float 0-1)
├── consistency_notes (text)
├── confidence_breakdown { consensus, consistency, historical }
├── confidence_score (float 0-1)
├── anomaly_flags [{ type: 'high_dissent'|'reversal'|'cascade'|'unusual_actor', severity: 'low'|'medium'|'high' }]
└── enriched_at (timestamp)
```

---

### Feature 4: Vector Embedding & Semantic Search (H3 - Discipline Filtering)

**User Story:**
> As an architect, I want to find decisions affecting my discipline using semantic search so that I can understand cross-discipline impacts without manual filtering.

**Purpose:**
Embed decision statements as vectors (sentence-transformers) for semantic similarity search. Enable "show me all decisions affecting MEP scope" without explicit tagging.

**Requirements:**

**Must Have (CRITICAL):**
- ✅ Embed decision statement + why + impacts using sentence-transformers
- ✅ Model: all-MiniLM-L6-v2 (22MB, 384-dim vectors, MIT license, free)
- ✅ Store embeddings in pgvector (PostgreSQL)
- ✅ Semantic search: "Show me all decisions affecting MEP scope"
- ✅ Discipline assignment (AI-assigned during extraction: Architecture, MEP, Landscape, Interior, Electrical, Plumbing)
- ✅ Query performance: <500ms even with 1000+ decisions
- ✅ Similarity threshold: Configurable (default: cosine distance > 0.7)

**Should Have:**
- ⚠️ Index optimization if >1000 decisions (HNSW in Phase 2)
- ⚠️ Embedding quality monitoring

**Nice to Have:**
- ❌ Fine-tuning on architecture domain (Phase 2, after 6 months data)
- ❌ H2/H1 evolution (metadata tags, then ML) (Phase 2+)

**Technical Details:**
- Embedding process:
  1. Decision statement + full why context concatenated
  2. sentence-transformers model generates 384-dim vector
  3. Stored in pgvector column
  4. Indexed for cosine similarity
- Query: `SELECT * FROM decisions WHERE embedding <=> query_vector < 0.3 ORDER BY similarity LIMIT 10`
- Latency: ~50-100ms per query (pgvector native)

**Acceptance Criteria:**
- [ ] Embeddings generated for all decisions
- [ ] Similarity search returns relevant decisions (manual validation)
- [ ] Query <500ms for 1000 decisions
- [ ] Discipline filtering works (e.g., "MEP" tagged correctly)
- [ ] Seed vector search with test queries (validate quality)
- [ ] Handle edge case: No results for rare query

**Data Stored:**
```
decisions table:
├── [all prior fields]
├── embedding (vector, 384 dimensions)
├── embedding_model ('all-MiniLM-L6-v2')
└── discipline_tagged (Architecture|MEP|Landscape|Interior|Electrical|Plumbing)
```

---

### Feature 5: Decision Storage & Relationships

**User Story:**
> As a product owner, I want decisions stored with relationships and metadata so that we can track cascading impacts and reversals over time.

**Purpose:**
Persistent storage of decisions with full metadata, relationships, and revision history. Enable timeline visualization and impact tracking.

**Requirements:**

**Must Have (CRITICAL):**
- ✅ PostgreSQL + pgvector for storage
- ✅ Decisions table with all fields from Features 2-4
- ✅ Decision relationships:
  - "Decision A triggered Decision B" (causal link)
  - "Decision X reversed Decision Y" (reversal)
  - "Decision M and N conflict" (contradiction)
- ✅ Reversal tracking: Track if decision was later changed
- ✅ Metadata:
  - Created timestamp (when extracted)
  - Updated timestamp (if edited by Gabriela)
  - Creator (AI or user)
  - Approval status (pending, approved, rejected)
- ✅ Soft delete support (keep history, hide from timeline)

**Should Have:**
- ⚠️ Audit trail (who changed what, when, why)
- ⚠️ Decision versioning (if Gabriela edits, keep prior version)

**Nice to Have:**
- ❌ Snapshot history (Phase 2)
- ❌ Decision lifecycle states (Phase 2)

**Technical Details:**
- Schema: decisions table with relationships table
- Relationships table: from_decision_id, to_decision_id, relationship_type
- Query: Find all decisions that triggered this one
- Index: On project_id, created_at for fast timeline queries

**Acceptance Criteria:**
- [ ] All decisions from Features 2-4 stored in database
- [ ] Relationships can be queried (decision cascades)
- [ ] Reversal tracking works (decision X marked as reversed)
- [ ] Soft delete doesn't break timeline view
- [ ] Query performance: Timeline view <200ms

**Data Schema:**
```
decisions:
├── id, project_id, transcript_id
├── decision_statement, who, timestamp, discipline
├── why, impacts, consensus, causation
├── confidence_score, anomaly_flags
├── similar_decisions_ids, consistency_score
├── embedding
├── status ('pending'|'approved'|'rejected')
├── created_at, updated_at, created_by
└── deleted_at (soft delete)

decision_relationships:
├── id
├── from_decision_id (FK)
├── to_decision_id (FK)
├── relationship_type ('triggered'|'reversed'|'conflicts')
├── created_at
└── explanation (text)

projects:
├── id
├── name
├── team_id
├── created_at
└── archived_at

meetings:
├── id
├── project_id (FK)
├── transcript_id (FK)
├── meeting_type ('client'|'multi_disc'|'internal')
├── date
└── decision_count
```

---

### Feature 6: Dashboard - Project Decision Timeline

**User Story:**
> As an architect, I want to see a chronological timeline of all project decisions so that I can understand project evolution and find relevant context quickly.

**Purpose:**
Visual timeline of decisions per project, ordered chronologically, with meeting type badges, discipline colors, and consensus indicators. Primary view for both Gabriela and architects.

**Requirements:**

**Must Have (CRITICAL):**
- ✅ Timeline view showing all decisions chronologically
- ✅ Grouping by meeting (show which meeting each decision came from)
- ✅ For each decision card, display:
  - Decision statement (truncated to 100 chars, full in hover)
  - Who (speaker name)
  - When (date + time)
  - Discipline (color-coded badge: Architecture=Blue, MEP=Orange, Landscape=Green, etc.)
  - Consensus indicator (high agreement=green checkmark, dissent=warning icon)
  - Impact level (small icon: High/Medium/Low)
- ✅ Meeting type badges (Client Meeting, Multi-disciplinary, Internal)
- ✅ Interactive timeline (click to expand, scroll to navigate)
- ✅ Performance: Load and render 200+ decisions in <2 seconds

**Should Have:**
- ⚠️ Sticky meeting headers (as user scrolls)
- ⚠️ Meeting duration indicator
- ⚠️ Participant list hover

**Nice to Have:**
- ❌ Animated timeline (Phase 2)
- ❌ 3D visualization (not applicable)

**Technical Details:**
- Frontend: React Timeline component
- Data: Fetch decisions for project, group by meeting_id
- Rendering: Virtual scrolling (only render visible items)
- Styling: Tailwind CSS + custom timeline CSS
- Colors: Architecture=#3B82F6, MEP=#F97316, Landscape=#22C55E, etc.

**Acceptance Criteria:**
- [ ] Timeline loads with all decisions for a project
- [ ] Decisions ordered chronologically (oldest → newest)
- [ ] Meeting headers group decisions correctly
- [ ] Discipline colors display correctly
- [ ] Consensus indicators accurate
- [ ] Timeline interactive (click, scroll, hover)
- [ ] <2 second load time for 200 decisions

**Wireframe Description:**

```
┌─────────────────────────────────────────────────────┐
│ DecisionLog: Downtown Commercial Retrofit Project   │
│ [Filters] [Export] [Digest]                         │
└─────────────────────────────────────────────────────┘

📅 Dec 20, 2025 — Client Meeting (10:00 AM)
  ├─ 🔷 Architecture: Changed structural material from concrete to steel
  │  WHO: Gabriela WHEN: 10:15 ✅ AGREE [HIGH IMPACT]
  │
  └─ 🟠 MEP: Adjusted HVAC routing due to structure change
     WHO: MEP Lead WHEN: 10:45 ✅ AGREE [MEDIUM]

📅 Dec 18, 2025 — Multi-Disciplinary Sync (2:00 PM)
  ├─ 🔷 Architecture: Foundation depth adjustment (2m → 2.5m)
  │  WHO: Lead Architect WHEN: 2:30 ⚠️ MIXED [HIGH IMPACT]
  │
  ├─ 🟢 Landscape: Retaining wall height increase needed
  │  WHO: Landscape Designer WHEN: 2:45 ✅ AGREE [HIGH]
  │
  └─ 🔵 Interior: Budget adjustment to match foundation change
     WHO: Gabriela WHEN: 3:15 ✅ AGREE [MEDIUM]

[Load More Decisions...]
```

---

### Feature 7: Decision Drill-Down

**User Story:**
> As an architect, I want to see the full context of a decision, including the transcript excerpt and who said what, so that I understand the reasoning deeply.

**Purpose:**
Modal/panel that shows:
- Full decision statement
- Who, when, why
- Impacts detailed
- 5-10 min transcript excerpt around decision timestamp
- Similar past decisions (for context)
- Consistency notes

**Requirements:**

**Must Have (CRITICAL):**
- ✅ Click decision card → open drill-down modal
- ✅ Show:
  - Full decision statement
  - Speaker name and their role
  - Timestamp (HH:MM:SS)
  - Full reasoning text (why)
  - Impacts (scope/timeline/budget, detailed)
  - Consensus by discipline
- ✅ Transcript excerpt: 5-10 min context window around timestamp
  - Show speaker names in colored text
  - Highlight decision moment
  - Show exact timestamps
- ✅ Link to full transcript (open in new tab)
- ✅ Similar past decisions (from Tool 1)
  - Show 3-5 similar decisions with scores
  - Link to each (navigate back in timeline)
- ✅ Consistency notes (from Tool 2)
  - "Aligns with Dec 3 decision" or "Contradicts Nov 15"

**Should Have:**
- ⚠️ Anomaly flags displayed prominently
- ⚠️ Confidence score explanation
- ⚠️ Copy decision to clipboard

**Nice to Have:**
- ❌ Share drill-down link (Phase 2)
- ❌ Comments/annotations (Phase 2)

**Technical Details:**
- Modal: React component, responsive (full screen on mobile)
- Transcript: Pre-formatted, speaker-colored text
- Data: Fetch decision + related decisions in single call

**Acceptance Criteria:**
- [ ] Drill-down opens on decision card click
- [ ] Transcript excerpt displays with correct timestamp
- [ ] Similar decisions show with similarity scores
- [ ] All fields populated correctly
- [ ] Links to full transcript work
- [ ] Modal closes without losing scroll position

**Wireframe Description:**

```
┌───────────────────────────────────────────────────────────┐
│ DECISION DETAIL: Foundation Depth Adjustment             │
│ ✖️ Close                                                   │
├───────────────────────────────────────────────────────────┤
│                                                           │
│ DECISION STATEMENT                                       │
│ Foundation depth adjustment (2m → 2.5m) due to soil     │
│ report findings; impacts timeline (+1 week), affects MEP │
│                                                           │
│ WHO: Lead Architect  WHEN: Dec 18, 2:30 PM             │
│ DISCIPLINE: Architecture  CONFIDENCE: 0.92 ✅            │
│                                                           │
│ CONSENSUS: Architecture ✅ AGREE | MEP ⚠️ MIXED |        │
│            Landscape ✅ AGREE                            │
│                                                           │
│ IMPACTS:                                                 │
│ • Timeline: +1 week construction delay                  │
│ • Scope: Foundation depth, structural reinforcement     │
│ • Budget: $50K additional materials                     │
│                                                           │
├───────────────────────────────────────────────────────────┤
│ REASONING (From transcript context):                     │
│ "Geotechnical report identified subsurface issues at    │
│ 2m depth. We need to go to 2.5m for proper bearing      │
│ capacity. Yes, it's a week delay, but it de-risks the   │
│ foundation. MEP needs to adjust basement layout..."      │
├───────────────────────────────────────────────────────────┤
│ TRANSCRIPT EXCERPT (2:15 PM - 2:45 PM):                 │
│                                                           │
│ 2:15 PM [Gabriela]: "Soil report came back. What's     │
│           the recommendation?"                           │
│ 2:16 PM [Geotechnical Consultant]: "At 2m, we hit      │
│           soft clay. Recommend 2.5m for safety."        │
│ 2:18 PM [Lead Architect]: "So we're changing foundation │
│           depth from 2m to 2.5m. Impacts?"              │
│ 2:20 PM [Gabriela]: "Timeline?"                         │
│ 2:21 PM [Lead Architect]: "Plus one week in              │
│           excavation. Doable."                          │
│ 2:30 PM [Gabriela]: ✓ DECISION RECORDED                 │
│           "Foundation depth 2.5m, approved."            │
│                                                           │
│ [View Full Transcript]                                   │
├───────────────────────────────────────────────────────────┤
│ SIMILAR PAST DECISIONS (Project History):                │
│ • Dec 3: Foundation reinforcement decision (94% similar) │
│ • Nov 15: Structural depth adjustment (87% similar)     │
│ • Oct 22: Material substitution (foundation) (81%)       │
│                                                           │
│ CONSISTENCY NOTES:                                       │
│ ✅ ALIGNS with Dec 3 decision (same risk mitigation     │
│    rationale). Team learned from that decision.         │
│                                                           │
│ ANOMALIES: None flagged                                  │
└───────────────────────────────────────────────────────────┘
```

---

### Feature 8: Gabriela's Executive Digest

**User Story:**
> As Gabriela (Director), I want a one-page executive summary per project showing what happened while I was away so that I can catch up in <30 minutes.

**Purpose:**
Weekly (or on-demand) digest showing:
- Summary of major decisions made
- Flagged decisions (high impact, low consensus)
- Team actions and ownership
- Timeline links for deep dives

**Requirements:**

**Must Have (CRITICAL):**
- ✅ One-page summary per project
- ✅ Header: "While you were gone: Dec 15-20"
- ✅ Summary categories:
  - Structural changes (e.g., "3 decisions")
  - Cost impacts (e.g., "+$50K budget")
  - Timeline shifts (e.g., "+1 week delay")
  - Scope changes (e.g., "2 client-requested additions")
  - Risk flags (e.g., "1 decision with dissent")
- ✅ For each major decision:
  - Statement (1-2 lines)
  - Who decided
  - Impact (timeline/budget/scope)
  - Consensus level
  - Link to full timeline for detail
- ✅ Quick stats:
  - Total decisions: X
  - Meeting count: Y
  - Consensus: Z% high agreement
- ✅ Action items (if any flagged decisions)
- ✅ Generated weekly (automated, or on-demand)

**Should Have:**
- ⚠️ Email delivery option (send digest weekly)
- ⚠️ Customizable time periods (weekly vs. daily vs. custom range)

**Nice to Have:**
- ❌ PDF export (Phase 1.5)
- ❌ Team-by-team summaries (Phase 2)

**Technical Details:**
- Generation: Scheduled job (weekly, e.g., every Monday 9 AM)
- Data: Query decisions for last 7 days, aggregate, summarize
- Rendering: React component, printable/email-friendly
- LLM: Claude generates narrative summary (optional enhancement)

**Acceptance Criteria:**
- [ ] Digest generates weekly automatically
- [ ] Summary captures all major decisions
- [ ] Impact summaries accurate (cost, timeline, scope)
- [ ] Flagged decisions highlighted
- [ ] Links to timeline work correctly
- [ ] <2 page length (1-page ideal)
- [ ] Gabriela reports <10 min read time

**Digest Template:**

```
═══════════════════════════════════════════════════════════════
                    DECISIONLOG DIGEST
                  Downtown Commercial Retrofit
              Summary: Dec 15-20, 2025 (6 days)
═══════════════════════════════════════════════════════════════

👋 HELLO GABRIELA! Here's what happened while you were away...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 QUICK STATS
  • Decisions made: 12
  • Meetings: 4 (2 Client, 2 Multi-disc)
  • Consensus quality: 92% high agreement ✅
  • Flagged decisions: 1 ⚠️

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏗️ STRUCTURAL CHANGES (3 decisions)
  ✓ Foundation depth: 2m → 2.5m (Dec 18)
    Impact: +1 week construction, +$50K cost
    Status: ✅ APPROVED (92% consensus)

  ✓ Steel frame substitution (Dec 19)
    Impact: +2 weeks fabrication, -$30K cost (material savings)
    Status: ✅ APPROVED (88% consensus)

  ✓ Column spacing adjustment (Dec 20)
    Impact: MEP routing affected, interior layout review needed
    Status: ✅ APPROVED (78% consensus) ⚠️ REVIEW

💰 COST IMPACTS
  • Net impact: +$20K (foundation $50K + steel -$30K)
  • All decisions within contingency budget ✅

⏱️ TIMELINE SHIFTS
  • Total: +1 week (foundation excavation)
  • All shifts communicated to client ✅
  • Project still on track for April completion ✅

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ DECISIONS NEEDING YOUR REVIEW (Flagged)
  1. Column spacing adjustment (Dec 20, 2:45 PM)
     • Decision: Reduce spacing from 6m to 5.5m
     • Consensus: 78% (Interior designer abstained)
     • Risk: May affect interior finish coordination
     • Your action: Review at your earliest convenience
     → [View Full Decision & Context]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 TEAM ACTIONS (What team leads did while you were away)
  ✓ Lead Architect made 8/12 decisions independently
  ✓ MEP lead coordinated on 3 decisions
  ✓ Gabriela was consulted on 1 (flagged decision)
  ✓ All client communications deferred (only team decisions)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 NEXT STEPS
  1. Review flagged decision (5 min) → [LINK]
  2. Review full timeline for any client communication needs
  3. Approve team's approach for column spacing
  4. Update client on cost/timeline changes

                    [View Full Timeline]

═══════════════════════════════════════════════════════════════
                   Generated: Dec 21, 2025 @ 9:00 AM
                  Questions? Ask your team lead.
═══════════════════════════════════════════════════════════════
```

---

### Feature 9: Filters & Exploration

**User Story:**
> As an architect, I want to filter decisions by date, discipline, and impact so that I can find relevant context quickly without scrolling through everything.

**Purpose:**
Interactive filters on timeline view to narrow down decisions by:
- Date range (e.g., "show me decisions from Dec 1-15")
- Discipline (Architecture, MEP, Landscape, etc.)
- Meeting type (Client, Multi-disc, Internal)
- Decision impact (High/Medium/Low)
- Consensus level (High agreement / Dissent flagged)
- Free-text search

**Requirements:**

**Must Have (CRITICAL):**
- ✅ Filter by date range (start date, end date picker)
- ✅ Filter by discipline (multi-select checkboxes)
- ✅ Filter by meeting type (multi-select)
- ✅ Filter by impact level (High/Medium/Low, multi-select)
- ✅ Filter by consensus (High/Mixed/Dissent, multi-select)
- ✅ Free-text search (keyword search across decision statement + reasoning)
- ✅ Combined filtering (all filters work together)
- ✅ Real-time results update (<200ms response)
- ✅ Active filter indicators (show what's filtered)
- ✅ Clear filters button (reset to default)

**Should Have:**
- ⚠️ Save filter presets (e.g., "My discipline only")
- ⚠️ Filter by confidence level (>0.8, >0.6, etc.)

**Nice to Have:**
- ❌ Advanced search syntax (Phase 2)
- ❌ Search saved queries (Phase 2)

**Technical Details:**
- Frontend: React filter component with checkboxes, date picker, text input
- Backend API: `/projects/{id}/decisions?filters=...` with query params
- Search: Full-text search on PostgreSQL (ILIKE for keyword)
- Vector search: Optional, for semantic "affects my discipline" search

**Acceptance Criteria:**
- [ ] Each filter type works independently
- [ ] Combined filters work (e.g., discipline + date range)
- [ ] Search returns relevant results (test with keywords)
- [ ] Filter UI intuitive and clear
- [ ] Performance: <200ms even with 1000 decisions
- [ ] Clear filters button resets all

**Filter UI Mockup:**

```
┌─────────────────────────────────────────┐
│ FILTERS                          [Reset] │
├─────────────────────────────────────────┤
│                                         │
│ 📅 DATE RANGE                           │
│  From: [Dec 1 ▼]  To: [Dec 31 ▼]       │
│                                         │
│ 🔷 DISCIPLINE (Multi-select)           │
│  ☑ Architecture                        │
│  ☑ MEP                                 │
│  ☐ Landscape                           │
│  ☐ Interior                            │
│  ☐ Electrical                          │
│  ☐ Plumbing                            │
│                                         │
│ 🏢 MEETING TYPE                         │
│  ☑ Client                              │
│  ☑ Multi-Disciplinary                  │
│  ☐ Internal                            │
│                                         │
│ 📊 IMPACT LEVEL                         │
│  ☑ High                                │
│  ☑ Medium                              │
│  ☑ Low                                 │
│                                         │
│ 🤝 CONSENSUS                            │
│  ☑ High Agreement                      │
│  ☑ Mixed                               │
│  ☑ Dissent (Flagged)                   │
│                                         │
│ 🔍 SEARCH                               │
│  [__________ "steel frame"] 🔍          │
│                                         │
└─────────────────────────────────────────┘

Showing 8 of 47 decisions
(Date: Dec 1-15 | Discipline: Architecture, MEP | Impact: High, Medium)
```

---

### Feature 10: Role-Based Access Control

**User Story:**
> As Gabriela, I want to control who sees which projects and decisions so that team members see only their projects and clients don't see internal discussions.

**Purpose:**
Enforce access control at project and decision level:
- Gabriela: View all projects, all decisions
- Architects: View assigned projects, all decisions within those projects
- Future clients: View client-meeting decisions only (Phase 2)

**Requirements:**

**Must Have (CRITICAL):**
- ✅ Authentication: Email/password login (basic, Phase 1)
- ✅ JWT tokens for session management
- ✅ HTTP-only cookies for token storage (secure)
- ✅ Access control at project level:
  - Gabriela: All projects
  - Architect: Assigned projects (FK to user_projects table)
- ✅ Access control at decision level:
  - Only decisions from assigned projects visible
  - Team members can't view other teams' projects
- ✅ Role-based permissions:
  - Gabriela (director): View all, edit all, approve all
  - Architect: View assigned, edit own projects, can't approve
  - (Phase 2) Client: View own project, client-meeting decisions only

**Should Have:**
- ⚠️ Session expiration (24 hours)
- ⚠️ Password reset flow

**Nice to Have:**
- ❌ OAuth integration (Google, GitHub) (Phase 2)
- ❌ SAML for enterprise (Phase 3)

**Technical Details:**
- Auth: JWT token, 24-hour expiration
- Password: Bcrypt hashing (no plaintext)
- Session: HTTP-only cookie + CSRF protection
- Middleware: Auth validation on all API endpoints

**Acceptance Criteria:**
- [ ] Login/logout works
- [ ] JWT token validated on API calls
- [ ] Gabriela sees all projects
- [ ] Architects see assigned projects only
- [ ] Session timeout after 24 hours
- [ ] Password secure (bcrypt)

**User Model:**
```
users:
├── id (UUID)
├── email (unique)
├── password_hash (bcrypt)
├── name
├── role ('director'|'architect'|'client')
├── created_at
└── last_login_at

user_projects (project assignment):
├── user_id (FK)
├── project_id (FK)
└── role_in_project ('lead'|'contributor'|'viewer')
```

---

## DATA MODEL (HIGH-LEVEL)

### Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────┐        ┌────────────┐
│   users     │         │   projects   │        │ transcripts│
├─────────────┤         ├──────────────┤        ├────────────┤
│ id (PK)     │────1:N──│ id (PK)      │───1:N──│ id (PK)    │
│ email       │         │ name         │        │ webhook_id │
│ name        │         │ team_id      │        │ meeting_id │
│ role        │         │ created_at   │        │ transcript │
│ created_at  │         │ archived_at  │        │ created_at │
└─────────────┘         └──────────────┘        └────────────┘
       │                       │                       │
       │                       │                       │
       │            ┌──────────┴────────────┐          │
       │            │                       │          │
       │        ┌─────────────┐      ┌────────────────────┐
       │        │  meetings   │      │   decisions        │
       └────────│ id (PK)     │      │ id (PK)            │
       (FK)    │ project_id  │1:N   │ project_id (FK)    │
                │ transcript_id(FK)  │ meeting_id (FK)    │
                │ meeting_type       │ transcript_id(FK)  │
                │ date              │ statement          │
                │ created_at        │ who                │
                └────────────┬───────│ timestamp          │
                             │       │ discipline         │
                             │       │ why                │
                             │       │ impacts            │
                             │       │ consensus          │
                             │       │ confidence         │
                             │       │ embedding (vector) │
                             │       │ anomaly_flags      │
                             │       │ status             │
                             │       │ created_at         │
                             │       │ updated_at         │
                             │       └────────────────────┘
                             │                │
                             │                │
                             │        ┌───────────────────┐
                             │        │decision_relations │
                             │        ├───────────────────┤
                             └────────│from_decision_id   │
                                      │to_decision_id     │
                                      │relationship_type  │
                                      │created_at         │
                                      └───────────────────┘
```

### Key Entities

**users**
- id: UUID
- email: string (unique)
- password_hash: string
- name: string
- role: enum (director, architect)
- created_at: timestamp
- last_login_at: timestamp

**projects**
- id: UUID
- name: string
- team_id: UUID (which architectural team)
- description: text (optional)
- created_at: timestamp
- archived_at: timestamp (soft delete)

**transcripts**
- id: UUID
- webhook_id: string (unique, idempotency)
- meeting_id: string (from Tactiq)
- participants: JSON [{ name, email }]
- transcript_text: text
- duration: string (HH:MM:SS)
- created_at: timestamp
- processed_at: timestamp

**decisions**
- id: UUID
- project_id: UUID (FK)
- meeting_id: UUID (FK)
- transcript_id: UUID (FK)
- decision_statement: text
- who: string (speaker name)
- timestamp: string (HH:MM:SS)
- discipline: enum
- why: text
- impacts: JSON [{ type, change }]
- consensus: JSON { discipline: AGREE|DISAGREE|ABSTAIN }
- causation: string
- confidence: float (0-1)
- confidence_breakdown: JSON
- anomaly_flags: JSON [{ type, severity }]
- embedding: vector (384-dim)
- similar_decisions_ids: JSON []
- consistency_score: float
- consistency_notes: text
- status: enum (pending, approved, rejected)
- created_at: timestamp
- updated_at: timestamp
- created_by: string (AI or user)
- deleted_at: timestamp (soft delete)

**meetings**
- id: UUID
- project_id: UUID (FK)
- transcript_id: UUID (FK)
- meeting_type: enum (client, multi_disc, internal)
- date: date
- decision_count: integer
- created_at: timestamp

**decision_relationships**
- id: UUID
- from_decision_id: UUID (FK)
- to_decision_id: UUID (FK)
- relationship_type: enum (triggered, reversed, conflicts)
- explanation: text (optional)
- created_at: timestamp

---

## API SPECIFICATION (OVERVIEW)

### Authentication

```
POST /api/auth/login
  Request: { email, password }
  Response: { access_token, token_type, expires_in }
  Cookie: Set-Cookie: access_token=...; HttpOnly; Secure; SameSite=Strict

GET /api/auth/me
  Headers: Authorization: Bearer {token}
  Response: { id, email, name, role }

POST /api/auth/logout
  Response: { message: "Logged out" }
```

---

### Projects API

```
GET /api/projects
  Query: ?archived=false
  Headers: Authorization: Bearer {token}
  Response: [
    {
      id, name, team_id, description,
      decision_count, meeting_count,
      created_at, archived_at
    }
  ]

GET /api/projects/{project_id}
  Response: { id, name, description, ... }

POST /api/projects
  (Gabriela only)
  Request: { name, team_id, description }
  Response: { id, name, ... }
```

---

### Decisions API

```
GET /api/projects/{project_id}/decisions
  Query: ?from_date=2025-12-01&to_date=2025-12-31
         &discipline=Architecture,MEP
         &meeting_type=client,multi_disc
         &impact_level=high,medium
         &consensus=high_agreement,mixed
         &search=keyword
  Response: [
    {
      id, statement, who, timestamp, discipline,
      consensus, confidence, impact_level,
      anomaly_flags, meeting_type, created_at
    }
  ]

GET /api/projects/{project_id}/decisions/{decision_id}
  Response: {
    id, statement, who, timestamp, discipline, why,
    impacts (detailed), consensus (per discipline),
    causation, confidence, confidence_breakdown,
    anomaly_flags, consistency_score, consistency_notes,
    similar_decisions [{ id, statement, score }],
    transcript_excerpt (5-10 min context),
    transcript_url (link to full),
    created_at, updated_at
  }

PATCH /api/projects/{project_id}/decisions/{decision_id}
  (Gabriela only - approve, reject, edit)
  Request: { status, note }
  Response: { id, ... updated fields ... }
```

---

### Digest API

```
GET /api/projects/{project_id}/digest
  Query: ?from_date=2025-12-15&to_date=2025-12-20
  Response: {
    project_id, period { from, to },
    summary { total_decisions, total_meetings, consensus_quality },
    categories {
      structural_changes: [{ decision_id, statement, impact }],
      cost_impacts: { total, changes: [...] },
      timeline_shifts: { total, changes: [...] },
      risk_flags: [{ decision_id, statement, risk }]
    },
    team_actions { ... },
    generated_at
  }
```

---

### Webhooks API

```
POST /api/webhooks/transcript
  (Tactiq sends transcript here)
  Headers: X-Webhook-Signature: sha256=...
  Request: {
    webhook_id, meeting_id, participants, transcript,
    duration, created_at
  }
  Response: { id, status: "received" }
  Processing: Async, extraction triggered <1 min
```

---

### Search API

```
GET /api/projects/{project_id}/decisions/search
  Query: ?q=steel+frame&discipline=architecture
         &similarity_threshold=0.7
  Response: [
    {
      id, statement, similarity_score, discipline,
      created_at
    }
  ]
```

---

## UI/UX SPECIFICATION

### Page 1: Projects List

**URL:** `/projects`

**Purpose:** Show all projects user has access to

**Layout:**
- Header: "DecisionLog - Projects"
- Sidebar: User profile, logout
- Main: Project cards in grid/list
- Each card shows:
  - Project name
  - Team assigned
  - Decision count
  - Last decision date
  - Click → go to project timeline

**States:**
- Empty state: "No projects yet"
- Gabriela sees all; architects see assigned only

---

### Page 2: Project Timeline (Main Dashboard)

**URL:** `/projects/{id}/timeline`

**Purpose:** Primary view - chronological decision timeline

**Layout:**
```
Header: Project name, filters, digest button, export button
Sidebar: Filters (date, discipline, type, impact, consensus, search)
Main: Timeline view
  - Meeting headers (date, type badge, participant count)
  - Decision cards (statement, who, consensus indicator)
  - Click card → drill-down modal
Scroll: Virtual scroll for 200+ decisions
```

**Components:**
- FilterPanel (left sidebar, 200px width, sticky)
- Timeline (main, 70% width)
  - TimelineGroup (per meeting)
    - DecisionCard (per decision)
- DigestButton (right side, fixed position)

**Interaction:**
- Change filters → re-fetch and re-render
- Scroll timeline → fetch more if needed
- Click decision → open drill-down modal (overlay)

---

### Page 3: Decision Drill-Down (Modal)

**URL:** (Modal overlay, no URL change)

**Purpose:** Show full decision context

**Layout:**
```
Modal (full screen on mobile, 90% width on desktop):
  Header: Close button, decision title
  Body:
    - Summary section (statement, who, when, discipline)
    - Details section (why, impacts, consensus)
    - Transcript excerpt (5-10 min)
    - Similar decisions (3-5 cards)
    - Consistency notes
    - Anomaly flags (if any)
  Footer: Link to full transcript, similar decisions navigation
```

**Interaction:**
- Close → back to timeline
- Click similar decision → navigate to that decision's drill-down
- Click transcript link → opens in new tab

---

### Page 4: Digest (Optional - Phase 1.5)

**URL:** `/projects/{id}/digest`

**Purpose:** Executive summary for Gabriela

**Layout:**
```
Header: Project name, period (Dec 15-20)
Body:
  - Quick stats (decisions, meetings, consensus %)
  - Summary by category (structural, cost, timeline, risks)
  - Flagged decisions (prominent warning)
  - Team actions summary
  - Links back to timeline
Footer: Generated timestamp, "View Full Timeline" button
```

**Print:** Optimized for printing/PDF

---

### Color Palette

- **Discipline Colors:**
  - Architecture: #3B82F6 (Blue)
  - MEP: #F97316 (Orange)
  - Landscape: #22C55E (Green)
  - Interior: #A855F7 (Purple)
  - Electrical: #FBBF24 (Amber)
  - Plumbing: #06B6D4 (Cyan)

- **Status Colors:**
  - High Consensus: #10B981 (Green checkmark)
  - Mixed: #F59E0B (Yellow warning)
  - Dissent: #EF4444 (Red flag)

- **Impact Colors:**
  - High Impact: #DC2626 (Dark red)
  - Medium Impact: #F59E0B (Orange)
  - Low Impact: #9CA3AF (Gray)

---

### Responsive Design

- **Desktop (1024px+):** Sidebar filters, timeline main, sticky header
- **Tablet (768-1023px):** Collapsible filters, timeline full width
- **Mobile (<768px):** Full-screen filters modal, timeline full width, drill-down full screen

---

### Accessibility (WCAG 2.1 AA)

- ✅ Keyboard navigation (Tab, Enter, Escape)
- ✅ Color contrast ratios (4.5:1 for text)
- ✅ Alt text for icons
- ✅ ARIA labels for interactive elements
- ✅ Focus indicators visible
- ✅ Screen reader friendly (semantic HTML)

---

## PRIORITIZATION & PHASING

### MVP Scope (Phase 1 - Must Have)

**Features:**
1. ✅ Decision Capture via Tactiq Webhooks
2. ✅ Decision Extraction (LLM-Powered)
3. ✅ Agent-Based Decision Enrichment (LangGraph)
4. ✅ Vector Embedding & Semantic Search (H3)
5. ✅ Decision Storage & Relationships
6. ✅ Dashboard - Project Decision Timeline
7. ✅ Decision Drill-Down
8. ✅ Gabriela's Executive Digest
9. ✅ Filters & Exploration
10. ✅ Role-Based Access Control

**What Gets Shipped:**
- ✅ Gabriela catches up on entire project in <30 minutes
- ✅ Team leads make autonomous decisions with confidence
- ✅ Full decision context available for drill-down
- ✅ Executive digest for leadership oversight
- ✅ Project-level access control

---

### Phase 1.5 Quick Wins (If Time Permits)

- 📧 Email digest delivery (sends weekly)
- 📄 PDF export (timeline + decision log)
- 📊 Basic analytics (decisions/week, adoption %)
- 🏷️ Meeting type tagging UI (let users tag meeting type)

---

### Phase 2+ Features (Out of Scope)

- ❌ Client-facing dashboard (limited visibility)
- ❌ Decision impact simulation
- ❌ Custom ML fine-tuning
- ❌ Cross-project knowledge search
- ❌ Advanced notifications
- ❌ Action item tracking
- ❌ Monday.com integration

---

## SUCCESS METRICS & ACCEPTANCE CRITERIA

### Business Metrics

| Metric | Target | Validation |
|--------|--------|-----------|
| Gabriela catch-up time | <30 min/project | Post-maternity survey |
| Team autonomous decisions | 85%+ by team leads | Decision author tracking |
| Team confidence (during absence) | 8/10+ | Team survey |
| System adoption | 8+/9 architects using 3+/week | Usage analytics |
| Maternity leave coverage | Zero knowledge loss | Decision audit |

---

### Product Metrics

| Metric | Target | Validation |
|--------|--------|-----------|
| Decision capture accuracy | 95%+ recall, <5% false positives | Monthly audit |
| Consensus detection | 90%+ accuracy | Sample audit |
| Dashboard load time | <2 seconds | Performance monitoring |
| Search latency | <500ms | Query monitoring |
| System uptime | 99%+ | Monitoring dashboard |

---

### Acceptance Criteria by Feature

**Feature 1: Tactiq Integration**
- [ ] Webhook receives 100% of Tactiq transcripts
- [ ] Stored with full metadata, no data loss
- [ ] Idempotent (no duplicates)
- [ ] Error handling for failed webhooks

**Feature 2: LLM Extraction**
- [ ] 95%+ of real decisions extracted
- [ ] <5% false positives
- [ ] Consensus detection 90%+ accurate
- [ ] Timestamp extraction ±30 seconds

**Feature 3: Agent Enrichment**
- [ ] Similar decisions retrieved correctly
- [ ] Consistency scoring aligns with human judgment
- [ ] Confidence scores correlate with reversals
- [ ] Anomaly flags catch 80%+ of concerning patterns

**Feature 4: Vector Search**
- [ ] Semantic search returns relevant decisions
- [ ] Query <500ms for 1000 decisions
- [ ] Discipline filtering accurate
- [ ] Edge cases handled (no results, rare terms)

**Feature 5: Storage**
- [ ] All decisions stored with full metadata
- [ ] Relationships queryable
- [ ] Soft delete works, history preserved
- [ ] Query performance <200ms

**Feature 6: Timeline Dashboard**
- [ ] All decisions displayed chronologically
- [ ] Meeting grouping correct
- [ ] Discipline colors accurate
- [ ] Consensus indicators show correctly
- [ ] <2 second load for 200 decisions

**Feature 7: Drill-Down**
- [ ] Modal opens on decision click
- [ ] Transcript excerpt displayed with timestamp
- [ ] Similar decisions show with scores
- [ ] All fields populated correctly

**Feature 8: Gabriela's Digest**
- [ ] Weekly generation automatic
- [ ] Summary captures all major decisions
- [ ] Impact summaries accurate
- [ ] Flagged decisions highlighted
- [ ] <2 page length

**Feature 9: Filters**
- [ ] Each filter type works independently
- [ ] Combined filters work together
- [ ] Free-text search returns relevant results
- [ ] Performance <200ms
- [ ] Clear filters resets all

**Feature 10: Access Control**
- [ ] Login/logout works
- [ ] JWT tokens validated
- [ ] Gabriela sees all projects
- [ ] Architects see assigned projects only
- [ ] Session timeout after 24 hours

---

## DEPENDENCIES & RISKS

### External Dependencies

| Service | Purpose | MVP Critical | Phase |
|---------|---------|--------------|-------|
| **Tactiq** | Transcript delivery | ✅ CRITICAL | 1 |
| **Claude API** | Decision extraction | ✅ CRITICAL | 1 |
| **Supabase** | PostgreSQL + pgvector | ✅ CRITICAL | 1 |
| **Railway/Render** | Backend hosting | ✅ CRITICAL | 1 |
| **Vercel** | Frontend hosting | ✅ CRITICAL | 1 |
| **sentence-transformers** | Embeddings | ✅ CRITICAL | 1 |

**Mitigation:**
- Fallback: Manual transcript upload if Tactiq fails
- Monitoring: Webhook success rate + API uptime dashboards
- Redundancy: Keep recent backups of decisions table

---

### Key Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| **Maternity leave timeline slips** | MVP not ready before departure | Medium | Track milestones weekly; cut features if needed |
| **Low team adoption** | System unused, no value | Medium | Intensive onboarding; intuitive UI |
| **Claude accuracy <90%** | Manual review overhead | Low | Test extraction early; adjust prompts |
| **Gabriela still bottleneck** | Team can't be autonomous | Medium | Clear delegation authority; training |
| **Tactiq webhook failures** | Meetings not captured | Low | Monitor; manual upload fallback |
| **Scope creep** | Timeline slip, MVP not delivered | High | Strict enforcement; no Phase 2 in Phase 1 |
| **Vector search quality poor** | Similar decisions not found | Low | Fine-tune Phase 2; validate quality now |
| **Team doesn't trust LLM** | Manual override requests | Medium | Audit extraction; train team on accuracy |

---

### Technical Constraints

1. **API Budget: $100/month max**
   - Claude extraction: ~$15/month
   - Buffer for Phase 2: $85/month available
   - Mitigation: Use Haiku when possible, optimize prompts

2. **No real-time extraction (Phase 1)**
   - <4 hour latency acceptable
   - Batch processing on webhook trigger

3. **Same-project knowledge (Phase 1)**
   - No cross-project search until Phase 2
   - Simpler, clearer MVP value

4. **10-user MVP scope**
   - Gabriela + 9 architects only
   - No external teams or clients Phase 1

---

## GLOSSARY & TERMINOLOGY

### Core Terms

**Decision:** A final architectural choice made in a meeting, with attribution (who, when, why), impacts (timeline, budget, scope), and consensus level.

**Consensus:** Level of agreement on a decision by discipline (AGREE, DISAGREE, ABSTAIN, MIXED).

**Discipline:** Architectural subfield (Architecture, MEP, Landscape, Interior, Electrical, Plumbing).

**Extraction:** LLM-powered process of identifying decisions from transcript.

**Enrichment:** Agent-based enhancement of decisions with similarity, consistency, confidence, anomaly detection.

**Embedding:** Vector representation of decision statement + context (384-dimensional for sentence-transformers).

**Anomaly:** Concerning pattern flagged (high dissent, reversal, cascade).

**Causation:** What triggered the decision (client request, technical constraint, error found, etc.).

**Drill-Down:** Modal view showing full decision context, transcript excerpt, similar past decisions.

**Digest:** Executive summary of major decisions during a time period (e.g., "While you were away").

**Meeting Type:**
- **Client Meeting:** souBIM + client discuss decisions
- **Multi-Disciplinary:** Architecture + MEP + Landscape + Internal (internal-facing)
- **Internal:** souBIM team only

**Vector Search (H3):** Semantic search using embeddings and cosine distance (Phase 1).

**H3 → H2 → H1 Evolution:**
- **H3:** Vectors only (current MVP)
- **H2:** Metadata tags + vectors (Phase 2)
- **H1:** ML-learned vectors with fine-tuned embeddings (Phase 2+)

---

## NEXT STEPS FOR @ARCHITECT & @DEV

### For @architect (Start in Parallel with This PRD)

1. Review this PRD + Project Brief
2. Create system architecture diagram
3. Design backend API specification
4. Design database schema (detailed)
5. Detail LangGraph agent flow
6. Plan infrastructure & deployment
7. Estimated timeline: 2 weeks

---

### For @dev (Start After PRD & Architecture Ready)

1. Read this PRD + architecture doc thoroughly
2. Set up GitHub repositories (backend, frontend)
3. Configure infrastructure (Supabase, Railway, Vercel)
4. Implement backend API + database schema
5. Implement decision extraction pipeline
6. Implement LangGraph agent
7. Implement frontend dashboard
8. Test, refine, launch
9. Estimated timeline: 6-8 weeks

---

## DOCUMENT INFORMATION

- **Created:** 2026-02-07
- **Last Updated:** 2026-02-07
- **Version:** 1.0
- **Status:** Ready for Development
- **Audience:** @architect, @dev, @aios-master, Gabriela
- **Next Phase:** Handoff to @architect for technical design

---

**END OF PRD**

This PRD is comprehensive, specific, and actionable for development. Every feature has acceptance criteria; every API endpoint is defined; every user story has workflows and acceptance criteria.

The development team can build against this PRD with clarity on scope, success metrics, and priorities.
