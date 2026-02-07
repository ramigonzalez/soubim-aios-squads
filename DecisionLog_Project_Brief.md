# DecisionLog: Project Brief

**Document Version:** 1.0
**Date Created:** 2026-02-07
**Status:** Ready for PRD Development
**Prepared by:** Atlas (Business Analyst)
**For:** souBIM Architecture Company

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Problem Statement](#problem-statement)
3. [Proposed Solution](#proposed-solution)
4. [Target Users](#target-users)
5. [Goals & Success Metrics](#goals--success-metrics)
6. [MVP Scope](#mvp-scope)
7. [Post-MVP Vision](#post-mvp-vision)
8. [Technical Considerations](#technical-considerations)
9. [Constraints & Assumptions](#constraints--assumptions)
10. [Risks & Open Questions](#risks--open-questions)
11. [Appendices](#appendices)
12. [Next Steps](#next-steps)

---

## EXECUTIVE SUMMARY

### Product Concept

**DecisionLog** is a decision-centric documentation system that silently captures architectural project discussions from Google Meet calls, extracts cross-disciplinary decisions with full attribution (WHO, WHEN, WHAT CHANGED, IMPACT, CONSENSUS), and visualizes them through a project timeline dashboard.

This enables:
- **Team autonomy:** Trained leads make decisions with confidence, knowing they're documented and Gabriela can review asynchronously
- **Gabriela's transition:** She moves from operational decisions to sales focus; reviews project decisions via digest/dashboard
- **Knowledge preservation:** Project history is self-documenting; new hires onboard by reading timeline
- **Client transparency:** Clients see decision rationale and project evolution

### Primary Problem

Architecture firms lose institutional knowledge during leadership transitions. Daily disciplinary decisions (material changes, structural revisions, budget impacts, timeline shifts) happen in meetings but are never documented systematically. When leadership is absent, no one knows the project's decision evolution or can catch decisions made in their absence.

### Target Market

- **Immediate:** souBIM (10-50 person architecture firm, 3+ concurrent projects)
- **Expansion:** Architecture/BIM firms, engineering firms, design studios, construction companies

### Key Differentiators

1. **Silent capture via Tactiq webhooks** - No meeting friction, transcripts delivered automatically
2. **Decision-centric** - Not just transcripts, but structured decisions with impact mapping
3. **Multi-disciplinary tracking** - Shows consensus/dissent across Architecture, MEP, Landscape, etc.
4. **Semantic discipline filtering (Vector search from MVP)** - AI understands discipline context
5. **Project memory for leadership** - Gabriela's "catch-up digest" when she returns
6. **Role-based access** - Director sees everything across all projects; team members see their projects
7. **No training data needed** - Uses LLM-based sentiment/consensus detection (works day 1)

### MVP Core Features

- ✅ Tactiq webhook integration for real-time meeting transcripts
- ✅ Decision extraction via Claude + LLM analysis
- ✅ Consensus detection (AGREE/DISAGREE/ABSTAIN by discipline)
- ✅ Project decision timeline (chronological with meeting types)
- ✅ Vector-based semantic search for discipline filtering (H3)
- ✅ Filters: by discipline, meeting type, decision impact scope
- ✅ Gabriela's Digest (executive summary per project during absence)
- ✅ Transcript drill-down (click decision → see meeting excerpt with timestamp + citation)
- ✅ Role-based access control
- ✅ PDF export (timeline + decision log)

### Success Definition

- Gabriela can catch up on 3 months of project decisions in <30 minutes via dashboard
- Team has confidence decisions are documented and attributed correctly
- 95%+ of real project decisions are captured and surfaced
- Semantic search finds discipline-relevant decisions without explicit tagging
- Zero friction in meetings (Tactiq runs invisibly, webhooks deliver automatically)

---

## PROBLEM STATEMENT

### Current State (souBIM Architecture)

souBIM is a growing architecture/BIM firm with 3+ concurrent projects:
- **Type A:** Contractor projects (souBIM team embedded in larger architecture firm)
- **Type B:** souBIM-led projects (souBIM is the architectural lead)

Currently, **Gabriela (Director)** is the central decision-maker in all architectural discussions across both project types. She leads:
- Client meetings (scope, material, timeline decisions)
- Multi-disciplinary meetings (Architecture, MEP, Landscape, Interior, Electrical, Plumbing)
- Internal architecture reviews

### The Triggering Event (Maternity Leave)

**Gabriela is taking maternity leave for 2-3 months (starting in ~2 months).**

During this time:
- 3+ projects with 1+ internal calls/day + 1+ multi-disciplinary calls/day will continue
- ~50+ decisions per project will be made without her
- Team lacks autonomous decision-making authority and confidence
- All decisions disappear into thin air—no record of what was decided, when, by whom, or why

### The Structural Problem (Beyond Maternity Leave)

This isn't just a maternity leave problem. **It's a scaling problem.** souBIM cannot grow beyond Gabriela's bandwidth.

Current state:

1. **Decision Authority Concentrated in One Person**
   - Team leads (Architecture discipline leads) cannot make independent decisions
   - They wait for Gabriela approval, slowing projects
   - New hires learn to defer rather than decide
   - Gabriela is exhausted, cannot focus on business development/sales

2. **Zero Decision Documentation**
   - Decisions happen in Google Meet calls with zero recording
   - No timeline of "what changed when"
   - No audit trail: "Who decided this? When? Why?"
   - No cross-disciplinary impact tracking: decisions in one discipline cascade unpredictably

3. **Team Lacks Autonomy During Absence**
   - Team members are untrained to make decisions without Gabriela
   - They don't know project context or Gabriela's architectural vision
   - They lack confidence in decisions (what if they're wrong?)
   - They have no way to inform Gabriela of what happened while she was away

4. **Knowledge Loss at Transitions**
   - When Gabriela returns, no timeline exists
   - She cannot catch up on what changed, why, or what cascading impacts occurred
   - New hires cannot self-onboard by reading project history
   - Each project transition loses institutional context

5. **Client Transparency Gap**
   - Clients experience changes as ad-hoc, not strategically planned
   - Change orders lack decision context/justification
   - Gabriela (primary client interface) cannot hand off client knowledge to team

### Impact of the Problem

- **Immediate (Maternity Leave):** 2-3 months of project decisions disappear; team paralyzed without Gabriela
- **Medium-term:** Gabriela returns to chaos; weeks needed to catch up; team lacks confidence in their decisions
- **Long-term:** souBIM cannot scale; Gabriela remains the bottleneck; business development impossible; turnover risk if team feels disempowered

### Why Existing Solutions Don't Work

- **Google Meet recordings alone:** Video is searchable, decisions are buried in context
- **Slack threads:** Scattered, incomplete, loses audio nuance and speaker context
- **Monday.com (current tool):** Task management, not decision intelligence; no decision extraction or timeline
- **Fathom/Otter.ai:** Full transcripts only—no decision-centric view, no cross-disciplinary impact, users visible in calls, data to external service
- **Manual decision logs:** Requires discipline, gets skipped, missing context/consensus
- **Email/shared docs:** Duplicate work, version control nightmare, updates lag reality

### The Strategic Opportunity

This is **NOT** just a "maternity leave coverage" problem. This is a **business model transformation**:

- **Before:** Gabriela = Operational + Sales bottleneck
- **After:** Gabriela = Sales-focused; trained team leads = Operational decisions
- **Enabler:** A system that documents decisions so Gabriela can trust team autonomously + train new hires by showing them project history

### Urgency & Market Opportunity

- **Immediate (souBIM):** Gabriela leaves in weeks. Need decision capture ASAP.
- **Broader Market:** Every multi-disciplinary architecture/engineering firm (construction, design, MEP) faces this exact problem
- **Industry Gap:** No tool exists that combines silent transcription + decision intelligence + cross-disciplinary impact tracking
- **Growing Category:** As firms scale and remote/hybrid work increases, decision accountability becomes critical

---

## PROPOSED SOLUTION

### Solution Name

**DecisionLog** (working title)

### Core Concept

A decision-centric documentation system that captures architectural project decisions from Google Meet calls, structures them with full attribution (WHO, WHEN, WHAT CHANGED, CONSENSUS, DISCIPLINE IMPACT), and surfaces them through a project timeline dashboard. This enables:

1. **Team autonomy:** Trained leads make decisions with confidence, knowing they're documented and Gabriela can review asynchronously
2. **Gabriela's transition:** She moves from operational decisions to sales focus; reviews project decisions via digest/dashboard
3. **Knowledge preservation:** Project history is self-documenting; new hires onboard by reading timeline
4. **Client transparency:** Clients see decision rationale and project evolution

### How It Works

#### Phase 1: Capture (Tactiq Webhooks)

- Google Meet calls happen naturally (no user friction)
- **Tactiq** (https://tactiq.io/, enterprise plan already owned) captures transcript + metadata
- Webhooks deliver transcript in real-time to DecisionLog backend
- System stores: transcript text, participants, timestamps, meeting type (Client/Multi-disc/Internal)

#### Phase 2: Extract Decisions (LLM-Powered with Agent)

- Claude analyzes full transcript context: "What decisions were made?"
- For each decision, Claude extracts:
  - **Decision statement** (e.g., "Changed structural material from concrete to steel")
  - **Who decided** (extracted from speaker ID via Tactiq)
  - **When** (timestamp of decision moment in transcript)
  - **Why** (contextual reasoning from full discussion)
  - **Discipline attribution** (which discipline made it: Architecture, MEP, Landscape, etc.)
  - **Consensus level** (AGREE/DISAGREE/ABSTAIN by discipline, inferred from tone)
  - **Scope/deadline impact** (if mentioned: "This adds 2 weeks" or "Increases budget by $X")
  - **Causation** (what triggered this decision: client request, technical constraint, error found, etc.)

**Agent-Based Enrichment (LangGraph + Tools):**

For each decision, the agent uses tools to enrich extraction:
1. **retrieve_similar_decisions** - Find past decisions in THIS project that relate to current decision
2. **validate_decision_consistency** - Check if decision aligns with or contradicts past decisions
3. **extract_decision_context** - Get full context reasoning for decision
4. **calculate_confidence_score** - Compute confidence based on consensus + consistency + historical support
5. **flag_anomalies** - Detect concerning patterns (high dissent, reversal patterns, broad cascades)

#### Phase 3: Embed & Index (Vector Search)

- Decision statement + context embedded as vectors (sentence-transformers, local)
- Indexed in pgvector (Supabase)
- Enables semantic search: "Show me all decisions affecting MEP scope"
- Discipline filtering via H3 approach (AI-assigned discipline tags)
- Phase 2: Evolve to H2 (metadata tags) → H1 (learned vectors with fine-tuned embeddings)

#### Phase 4: Store & Relate (PostgreSQL)

- Decisions stored with full metadata
- Decision relationships tracked: "Decision A triggered Decision B on Day 3"
- Reversals tracked: "Decision X reversed on Day 5, triggered by Decision Y error"
- Role-based access control: Gabriela sees all; team sees their projects; clients see only their meetings

#### Phase 5: Visualize & Explore (Dashboard)

**Project Timeline View:**
- Chronological decisions by meeting
- Meeting type badges (Client, Multi-disc, Internal)
- Each decision shows: statement, who, when, consensus, discipline, impact
- Expandable: Click decision → see full transcript excerpt + timestamp + speaker

**Gabriela's Digest (Executive Summary):**
- "While you were gone: 3 structural changes, 1 MEP cost impact, 2 timeline shifts"
- Quick catch-up on each project
- Links to detailed timeline for deep dives

**Filters:**
- By discipline (Architecture, MEP, Landscape, Interior, Electrical, Plumbing)
- By meeting type (Client, Multi-disciplinary, Internal)
- By date range
- By decision type (Material, Structural, Budget, Timeline, Scope)
- By consensus level (high dissent = flagged)

**Discipline-Specific View (Phase 1):**
- "Show me all decisions affecting my discipline"
- Example: "MEP engineer sees Architecture decisions + their cascading impacts"
- Powered by semantic search (H3 discipline filtering)

### Why This Approach Works

1. **Zero meeting friction:** Tactiq runs silently; webhooks deliver automatically
2. **Autonomous team training:** Decisions documented so trained leads can decide confidently
3. **Gabriela's async oversight:** Dashboard + digest = stays informed without attending meetings
4. **Knowledge transfer:** New hires read timeline, understand project evolution
5. **Client transparency:** Decisions visible with rationale (clients see only their meetings)
6. **Scalable:** Works across all 3+ projects; scales as souBIM adds projects
7. **Cost-effective:** ~$25/month; pgvector (no cost); webhooks (Tactiq already owned)
8. **Technically feasible:** LLM extraction, vector search, PostgreSQL—all proven technology
9. **Agent-based enrichment:** LangGraph tools enable knowledge base learning from day 1
10. **Progressive embeddings:** H3→H2→H1 evolution path as data accumulates

### What It Is NOT (Out of Scope - MVP)

- ❌ Real-time meeting intelligence (Phase 3)
- ❌ Decision impact simulation (requires historical data—Phase 2)
- ❌ Informal decision capture (Slack, email, hallway—Phase 2)
- ❌ Audio recording/storage (privacy-first: text only)
- ❌ Action item tracking (Phase 2)
- ❌ Risk tracking (Phase 2)
- ❌ Meeting agenda templating (Phase 1.5)
- ❌ Predictive decision reversal (Phase 2)
- ❌ Cross-project knowledge search (Phase 2)
- ❌ Client-facing dashboard (Phase 2+)
- ❌ Mobile app (Phase 3)
- ❌ Multi-platform support (Phase 3)

### Success Metrics

- ✅ Gabriela can catch up on 3 months of decisions in <30 minutes
- ✅ Team leads make 80%+ of decisions independently during Gabriela's absence
- ✅ 95%+ of real decisions captured and attributed correctly
- ✅ Zero meeting friction (Tactiq invisible, decisions extracted automatically)
- ✅ Dashboard used 3+ times/week by team and Gabriela
- ✅ New hires onboarded 50% faster via timeline self-service

---

## TARGET USERS

### User Segment 1: Gabriela (Architecture Director)

**Profile:**
- Role: Architecture Director, oversees all souBIM projects (Type A contractor + Type B lead)
- Frequency: 3-5x/week (async review, not daily attendance)
- Primary need: Stay informed on all architectural decisions across projects without attending every meeting
- Pain point: Can't catch up on 2-3 months of decisions while on maternity leave; loses visibility into what changed and why
- Success metric: "I can understand what happened on each project in <30 min via executive digest"

**Workflows:**
1. **Weekly project catch-up:** Reviews Gabriela's Digest for each active project (~15 min total)
2. **Decision oversight:** Sees all architectural decisions made by team leads, approves/flags as needed
3. **Transition planning:** Reads decision timelines to understand project evolution during absence
4. **Team training:** Reviews decisions made by architects to ensure they align with vision; uses timeline to coach team

**What she'll use:**
- ✅ Executive digest per project
- ✅ Full decision timeline with drill-down to transcript
- ✅ All souBIM projects (Type A & B) in one view
- ✅ Filters by date, decision type, impact level
- ✅ Flagged decisions (high impact, low consensus)
- ❌ Real-time notifications (async only)

**Volume:** 1 person

---

### User Segment 2: souBIM Architects (3 Groups × 3 Architects)

**Profile:**
- Role: Senior architects, junior architects in 3 architectural teams/groups
- Reporting to: Gabriela (Director)
- Frequency: Daily during meetings + post-meeting review
- Primary need: Understand architectural decisions being made; gain autonomy to lead decisions; learn project context
- Pain points:
  - Lack confidence making decisions without Gabriela present
  - Don't understand full context of past decisions
  - Decisions from other disciplines (MEP, Landscape) impact architecture but aren't clearly documented
  - When Gabriela is away, team feels disempowered
- Success metric: "I can make architectural decisions confidently during meetings, knowing Gabriela will review them; I understand why past decisions were made"

**Workflows:**
1. **Before meeting:** Reviews relevant project timeline to understand context and existing decisions
2. **During meeting:** Participates in architectural decision-making; system captures their voice and consensus
3. **After meeting:** Reviews decisions made, especially those affecting their work
4. **Cross-discipline impact:** Sees "MEP decided X, which affects our structural layout" and adjusts accordingly
5. **Gabriela's absence:** Makes architectural decisions independently; documents them in system; knows Gabriela will review upon return
6. **Mentoring/Onboarding:** Uses timeline to teach new team members about project history and decision rationale

**What they'll use:**
- ✅ Full project timeline (architectural decisions + external discipline impacts)
- ✅ Decision drill-down to see full context and transcript
- ✅ Filters by date, decision type
- ✅ Consensus tracking (who agreed/disagreed on architectural decisions)
- ✅ Cross-discipline impact view ("How does MEP's decision affect us?")
- ❌ Executive digest (too high-level)
- ❌ Approval workflows (Gabriela approves, not peers)

**Volume:** 9 people (3 groups × 3 architects)

---

### User Segment 3: External Clients (Phase 2+)

**Profile:**
- Role: Client project manager, client architect, stakeholder
- Frequency: 2-4x/month (after major decisions)
- Primary need: Understand why the project is changing; see decision timeline
- Pain point: Changes feel ad-hoc; no clear justification for scope/timeline/budget shifts
- Success metric: "I see the decision timeline for my project and understand what changed and why"

**Workflows:**
1. **Receives update:** Gabriela or architect shares "Client Decision Timeline" after significant decisions
2. **Reviews changes:** Views timeline of architectural decisions affecting their project
3. **Understands impacts:** Links decisions to scope/budget/timeline changes
4. **Negotiates:** Has clear record of what was decided and can propose changes with full context

**What they'll use:**
- ✅ Client-only decision timeline (decisions from their meetings only)
- ✅ Read-only access (cannot create/edit)
- ✅ Drill-down to see decision context
- ❌ Internal architectural meetings (not invited)
- ❌ Consensus/dissent details (internal only)

**Volume:** Future expansion (Phase 2+)

---

### What Gets Tracked (MVP Scope)

| Decision Type | Tracked? | Created By | Visible To |
|---|---|---|---|
| **souBIM architectural decisions** | ✅ Yes | Architects | Gabriela + all architects |
| **External discipline decisions (MEP, Landscape, etc.)** | ✅ Yes, as context | System (from meeting transcripts) | Gabriela + relevant architects (read-only) |
| **Client decisions/approvals** | ✅ Yes | System (extracted) | Gabriela + relevant architects |
| **Other firm's architectural decisions (Type A projects)** | ⚠️ Contextual only | System | Gabriela + relevant architects (reference only) |

**Key:** souBIM owns the "decision object" for its architectural choices. External disciplines' decisions are *recorded* to show impacts, but souBIM doesn't manage their decision workflows.

---

### MVP User Access Control

| Permission | Gabriela | Architects | Clients (Phase 2) |
|---|---|---|---|
| View all projects | ✅ | Own projects only | Own project only |
| View all decisions | ✅ | Own projects | Own meetings only |
| Create decisions | ✅ (approve) | ✅ (participate) | ❌ |
| Edit decisions | ✅ | ✅ (own decisions) | ❌ |
| Approve decisions | ✅ | ❌ | ❌ |
| Export timeline | ✅ | ✅ | ⚠️ (Phase 2) |

---

### MVP User Volume

- **Gabriela:** 1
- **Architects (3 groups × 3):** 9
- **Total MVP users:** 10
- **Future clients:** 3-5 per project (Phase 2+)

---

## GOALS & SUCCESS METRICS

### Business Objectives

1. **Enable Gabriela's Transition to Sales**
   - Goal: Gabriela moves from operational/architectural decisions to business development focus
   - Metric: By Month 6, Gabriela spends ≤10 hrs/week on project decisions (vs. current ~30 hrs)
   - Validation: Time tracking; number of decisions Gabriela delegates to architects

2. **Survive Maternity Leave Without Knowledge Loss**
   - Goal: Zero architectural knowledge loss during Gabriela's 2-3 month maternity leave
   - Metric: Team makes 90%+ of decisions independently; Gabriela can catch up in <2 hours/project upon return
   - Validation: Decision audit; Gabriela's catch-up time; team confidence survey

3. **Empower Architectural Team Autonomy**
   - Goal: Architects make architectural decisions with confidence, without waiting for Gabriela
   - Metric: Decision turnaround time reduces from 2-3 days (waiting for Gabriela) to <4 hours (same day)
   - Validation: Decision creation timestamps; team feedback; decision velocity

4. **Enable Future Scaling**
   - Goal: souBIM can handle 5-10 projects simultaneously without adding management overhead
   - Metric: Same team size manages 2x current projects with same decision quality
   - Validation: Project capacity; quality metrics; team utilization

---

### User Success Metrics

**For Gabriela:**

1. **Async Oversight Confidence**
   - Metric: Gabriela reviews decisions with <10 min catch-up per project/week
   - Target: 95% of architectural decisions understood in digest view without drill-down
   - Validation: Dashboard usage logs; Gabriela survey

2. **Maternity Leave Coverage**
   - Metric: Successfully reviews all major project decisions while on leave
   - Target: Reviews 1-2 decision summaries/day (async, 15 min/day commitment)
   - Validation: Review frequency; approval turnaround time

3. **Sales Focus Enablement**
   - Metric: Time freed up from daily operational meetings = available for business development
   - Target: 15+ hours/week reclaimed for sales activities
   - Validation: Calendar analysis; sales activity increase

---

**For Architects (Team of 9):**

1. **Decision Autonomy & Confidence**
   - Metric: Architects make architectural decisions without waiting for Gabriela approval
   - Target: 85%+ of decisions created directly by architects (not by Gabriela)
   - Target: Architects report 8/10+ confidence in decisions made during Gabriela's absence
   - Validation: Decision creation author; team confidence surveys

2. **Reduced Decision Latency**
   - Metric: Time from decision discussion to documentation
   - Target: <4 hours (from meeting to system)
   - Current: 2-3 days (waiting for Gabriela to document)
   - Validation: Meeting timestamps vs. decision creation timestamps

3. **Context Availability for Learning**
   - Metric: New team members onboard faster via timeline self-service
   - Target: New architect reaches productivity in 3 days (vs. current 2 weeks waiting for Gabriela mentoring)
   - Validation: Time-to-first-decision metric; mentor time savings

4. **Cross-Discipline Understanding**
   - Metric: Architects understand how external discipline decisions (MEP, Landscape) affect architecture
   - Target: 90%+ of architects report "clear visibility" of external impacts
   - Validation: Survey; decision quality (fewer surprises)

---

### Key Performance Indicators (KPIs)

**Decision Capture & Quality:**

1. **Decisions Captured per Month**
   - Target: 150-200 decisions/month (3-5 decisions/day × 50 meeting days)
   - Validation: System logs

2. **Decision Extraction Accuracy**
   - Target: 95%+ of real decisions captured (recall); <5% false positives
   - Validation: Monthly audit (sample 30 decisions, validate against Gabriela)

3. **Consensus Detection Accuracy**
   - Target: 90%+ accuracy on AGREE/DISAGREE/ABSTAIN classification
   - Validation: Compare LLM consensus vs. Gabriela's perception in survey

4. **Time to Decision Documentation**
   - Target: <4 hours from meeting end to decision in system
   - Current baseline: Unknown (decisions scattered in notes/email)
   - Validation: Timestamp comparison

---

**Adoption & Usage:**

5. **Daily Active Users (DAU)**
   - Target: 8+ of 9 architects using system 3+ times/week
   - Target: Gabriela using system 2-3 times/week
   - Validation: Login frequency; feature usage

6. **Dashboard Engagement**
   - Target: Decision timeline viewed 5+ times/week per architect
   - Target: Gabriela's digest accessed 2+ times/week
   - Validation: Page view analytics

7. **Drill-Down Usage**
   - Target: 30%+ of decisions viewed via drill-down (engineer reading context/transcript)
   - Validation: Click-through analytics

---

**Maternity Leave Coverage (Specific Metrics):**

8. **Gabriela's Catch-Up Time**
   - Target: <2 hours per project to understand 2-3 months of decisions
   - Metric: "How long did it take you to catch up on each project?"
   - Validation: Post-maternity survey

9. **Team Decision Coverage During Absence**
   - Target: 95%+ of architectural decisions documented (not lost)
   - Target: 0 cases of "we didn't know what was decided in that meeting"
   - Validation: Decision audit; team interviews

10. **Decision Quality During Absence**
    - Target: 90%+ of decisions made during absence hold up post-review (no major reversals)
    - Validation: Decision reversal rate; Gabriela review notes

---

**Business Impact (Phase 2+):**

11. **Project Scaling Capacity**
    - Target: Handle 5-10 concurrent projects with same team (vs. current 3)
    - Metric: Project capacity increase without proportional team growth
    - Validation: Projects/architect ratio

12. **Sales Enablement**
    - Target: Gabriela increases sales pipeline by 30%+ due to freed-up time
    - Validation: Sales metrics; new projects in pipeline

13. **Team Retention**
    - Target: 0 attrition due to "disempowerment" or "training burden"
    - Validation: Exit interview feedback; retention survey

---

### MVP Success Criteria (Must Have)

✅ Gabriela can catch up on one project in <30 minutes
✅ 90%+ of decisions captured and attributed correctly
✅ Team leads make 80%+ of decisions independently during Gabriela's absence
✅ Zero knowledge loss during maternity leave
✅ System used 3+ times/week by 8+ of 9 architects
✅ Dashboard loads in <2 seconds

---

## MVP SCOPE

### Core MVP Features (Must Have for Launch)

**1. Decision Capture via Tactiq Webhooks**
- ✅ Tactiq (https://tactiq.io/) integration via webhooks
- ✅ Real-time transcript delivery when meeting ends
- ✅ Automatic parsing: participants, timestamps, full transcript
- ✅ Support for Google Meet (only platform initially)
- ✅ Handles 4+ hour calls without data loss

**2. Decision Extraction (LLM-Powered)**
- ✅ Claude analyzes full transcript
- ✅ Extracts all FINAL decisions
- ✅ Structured data: decision statement, who, when, why, discipline, impacts, consensus
- ✅ Speaker identification from Tactiq metadata
- ✅ Consensus detection (AGREE/DISAGREE/ABSTAIN by discipline, inferred from tone)
- ✅ Causation tracking ("what triggered this decision?")
- ✅ Scope/deadline impact detection ("adds 2 weeks" or "increases budget by $X")

**3. Agent-Based Decision Enrichment (LangGraph + Tools)**
- ✅ **Tool 1: retrieve_similar_decisions()** - Find past decisions in THIS project that relate to current decision
- ✅ **Tool 2: validate_decision_consistency()** - Check if decision aligns with or contradicts past decisions
- ✅ **Tool 3: extract_decision_context()** - Get full context reasoning for decision
- ✅ **Tool 4: calculate_confidence_score()** - Compute confidence based on consensus + consistency + historical support
- ✅ **Tool 5: flag_anomalies()** - Detect concerning patterns (high dissent, reversals, broad cascades)

**4. Vector-Embedded & Semantic Search (H3 - Discipline Filtering)**
- ✅ Decision statements embedded as vectors (sentence-transformers, local)
- ✅ Indexed in pgvector + Supabase
- ✅ Semantic search: "Show me all decisions affecting MEP scope"
- ✅ Discipline tagging (AI-assigned during extraction: Architecture, MEP, Landscape, etc.)
- ✅ Foundation for H2→H1 evolution (metadata tags → vectors → ML)

**5. Decision Storage & Relationships**
- ✅ PostgreSQL + pgvector schema for decisions
- ✅ Metadata: timestamp, speaker, discipline, impact level, confidence score
- ✅ Decision relationships: "Decision A triggered Decision B"
- ✅ Reversal tracking: "Decision X reversed on Day 5, triggered by Decision Y error"
- ✅ Cross-project decision indexing (same project only, Phase 1)

**6. Dashboard: Project Decision Timeline**
- ✅ Chronological view of all decisions per project
- ✅ Meeting type badges (Client Meeting, Multi-disciplinary, Internal)
- ✅ Each decision shows: statement, who, when, consensus, discipline, impact
- ✅ Color-coded by discipline (Architecture=Blue, MEP=Orange, etc.)
- ✅ Visual indication of consensus level (high agreement green, dissent red)

**7. Decision Drill-Down**
- ✅ Click decision → view full context
- ✅ Shows meeting transcript excerpt (5-10 min window around decision)
- ✅ Timestamp highlight showing exact moment decision was made
- ✅ Speaker names and their tone/statements visible
- ✅ Link to full meeting transcript

**8. Gabriela's Executive Digest**
- ✅ One-page summary per project: "While you were gone:"
  - 3 structural changes made
  - 1 MEP impact on timeline (+2 weeks)
  - 2 client scope changes
  - Key dates/deadlines set
- ✅ Links to detailed timeline for each item
- ✅ Generated weekly (or on-demand)
- ✅ Email delivery option (Phase 1.5)

**9. Filters & Exploration**
- ✅ Filter by date range (e.g., "show me decisions from Dec 1-15")
- ✅ Filter by discipline (Architecture, MEP, Landscape, etc.)
- ✅ Filter by meeting type (Client, Multi-disc, Internal)
- ✅ Filter by decision impact (High/Medium/Low)
- ✅ Filter by consensus level (High agreement / Dissent flagged)
- ✅ Search by keyword (free-text search across decision statements)

**10. Role-Based Access Control**
- ✅ Gabriela: View all projects, all decisions
- ✅ Architects: View assigned projects, all decisions
- ✅ New hires: Read-only access to assigned projects
- ✅ Authentication via email/password (basic, Phase 1)
- ✅ Project-level access management

**11. Discipline-Specific View (Phase 1)**
- ✅ "Show me all decisions affecting my discipline"
- ✅ Example: "MEP engineer sees Architecture decisions + their cascading impacts"
- ✅ Powered by semantic search (H3 discipline filtering)
- ✅ Helps architects understand external constraints

---

### Out of Scope for MVP (Documented for Future Phases)

**Phase 2 (Post-Launch, 3-6 months):**
- ❌ Real-time meeting intelligence (Phase 3)
- ❌ Decision impact simulation (requires historical data)
- ❌ Informal decision capture (Slack, email, hallway conversations)
- ❌ Audio recording/storage (privacy-first: text only)
- ❌ Action item tracking (separate system)
- ❌ Risk tracking (separate system)
- ❌ Decision templating (enforce complete decisions)
- ❌ Email notifications (too noisy; async digest only)
- ❌ Custom ML model for consensus (requires 6+ months data)
- ❌ Client-facing dashboard (Phase 2+)
- ❌ Mobile app (web-first)
- ❌ Advanced analytics (decision reversal trends, etc.)
- ❌ Integration with Monday.com (future enhancement)
- ❌ Cross-project knowledge search (Phase 2)

**Phase 3 (1+ year):**
- ❌ Real-time decision extraction during calls
- ❌ Predictive decision reversal flagging
- ❌ Cross-project decision pattern analysis
- ❌ Industry benchmarking
- ❌ Multiple platform support (Teams, Zoom, etc.)

---

### What MVP Delivers

**For Gabriela:**
- ✅ Catch up on entire project in <30 minutes via digest + timeline
- ✅ Review all architectural decisions asynchronously
- ✅ Approve/flag decisions remotely
- ✅ Understand project evolution during maternity leave

**For Architects:**
- ✅ See full decision context (why was this decided?)
- ✅ Make autonomous decisions with confidence
- ✅ Understand how external disciplines' decisions affect architecture
- ✅ Onboard faster by reading decision timeline
- ✅ Document decisions automatically (no manual logging required)

**For souBIM:**
- ✅ Survive maternity leave without knowledge loss
- ✅ Enable Gabriela's transition to sales
- ✅ Build institutional memory (decisions documented)
- ✅ Foundation for scaling to 5-10 projects

---

### MVP Success Criteria (Must Ship)

✅ Gabriela catches up in <30 min per project
✅ 95%+ of decisions captured accurately
✅ <4 hour latency: meeting ends → decision in system
✅ Zero context loss (full transcripts available for drill-down)
✅ 8+ of 9 architects use system 3+ times/week
✅ System performance: dashboard loads <2 seconds
✅ Role-based access working correctly
✅ $25/month operating cost (Claude API ~$15 + hosting ~$10)

---

### Timeline to MVP Launch

- **Week 1-2:** Backend API + database schema + Tactiq integration
- **Week 2-3:** LLM extraction pipeline + Claude integration
- **Week 3-4:** Vector embedding + semantic search + LangGraph agent setup
- **Week 4-5:** Frontend dashboard (timeline, filters, drill-down)
- **Week 5-6:** Role-based access + Gabriela's digest + polish
- **Week 6-7:** Testing, refinement, user testing with Gabriela + 2-3 architects
- **Week 7-8:** Launch + iteration based on feedback

**Target Launch:** 6-8 weeks from start

---

## POST-MVP VISION

### Phase 2 Features (Months 3-6 Post-Launch)

Once MVP is live and souBIM has 3+ months of real decision data:

**2.1: Enhanced Decision Intelligence**
- Real-time meeting intelligence (detect decisions as they happen in calls)
- Decision impact simulation ("If we reverse this decision, what cascades?")
- Predictive decision reversal flagging (ML learns which decisions are risky)
- Decision confidence scoring (ML analyzes firmness of consensus)

**2.2: Discipline-Specific Dashboards**
- MEP engineer sees: "Architecture made 3 decisions affecting MEP scope"
- Landscape sees: "Architecture changes requiring landscape mitigation"
- Proactive notifications when decisions affecting your discipline are made
- Automatic impact summary generation

**2.3: Decision Ownership & Status Tracking**
- Each decision gets an owner: "Architecture will implement by Date X"
- Status tracking: Implemented / Blocked / Pending / In Progress
- Timeline shows decision status evolution
- Accountability layer: who decided, who implements, when

**2.4: Client-Facing Dashboard**
- Limited decision timeline (decisions from client meetings only)
- Read-only access to understand project evolution
- Drill-down to see decision context (without internal politics)
- Explains scope/budget/timeline changes professionally

**2.5: Decision Templating**
- Architectural decisions require certain questions answered
- "Decision made but missing context" flagging
- Auto-generates decision summary with all critical info
- Ensures completeness before Gabriela reviews

**2.6: Custom ML Model Fine-Tuning**
- Train model on 500+ labeled souBIM decisions
- Specialized accuracy for architectural language
- Cost drops to $0.001 per decision (vs. $0.0001 with LLM)
- Faster inference; real-time capable

**2.7: Monday.com Integration**
- Decisions linked to Monday.com tasks/projects
- Decision timeline syncs with project status
- No duplicate data entry
- Single source of truth across tools

**2.8: Advanced Search & Analytics**
- Semantic search evolution (H3→H2→H1)
- "Show me all decisions that ultimately reversed"
- "Which decisions caused most cascading impacts?"
- "What's the average time-to-reversal for structural decisions?"

**2.9: Expand Knowledge Base Scope**
- Phase 1: Same project_id only
- Phase 2: Company-wide search (all souBIM projects)
- "In other projects, we made similar decisions..."
- Better historical validation and pattern recognition

---

### Phase 3 Features (Months 6-12 Post-Launch)

Once souBIM has 12+ months of data and MVP is stable:

**3.1: Cross-Project Pattern Analysis**
- "Similar decisions in Project A reversed 40 days later; Project B made same decision yesterday"
- Proactive alerts: "Watch out, this decision pattern tends to reverse"
- Decision learning: what works, what doesn't across projects
- Historical decision performance metrics

**3.2: Real-Time Decision Extraction During Calls**
- Live intelligence during Google Meet
- Show Gabriela/architects: "A decision point is being discussed right now"
- Pause-and-clarify for important decisions
- Real-time consensus tracking during discussion
- (Lower priority; post-hoc analysis sufficient for MVP)

**3.3: Multi-Platform Support**
- Zoom, Microsoft Teams in addition to Google Meet
- Unified decision timeline across platforms
- Works with hybrid meeting scenarios

**3.4: Industry Benchmarking & Insights**
- Anonymous comparison: "Architectural decisions in your firm vs. industry"
- Trend data: "Structural decisions trending toward X approach"
- Performance benchmarking: decision reversal rates, time-to-implementation
- Competitive intelligence (ethical aggregation)

**3.5: Decision Governance & Approval Workflows**
- Complex approval workflows for high-impact decisions
- Multi-stakeholder sign-off (Gabriela, finance, client)
- Audit trails for compliance-heavy projects
- Integration with formal change order processes

**3.6: Predictive Timeline Impact**
- When decision is made: "Based on this change, project timeline will shift by X days"
- Budget impact simulation (not just architectural scope)
- Risk assessment: "This decision has 60% reversal likelihood"
- Proactive mitigation recommendations

---

### Long-Term Vision (1-2 Years)

**Expansion to Enterprise Architecture Firms:**
- Scale from 10-user souBIM to 100-user enterprise firms
- Multi-team management (separate Architecture, MEP, Landscape teams)
- Cross-office decision coordination
- Scalable deployment (self-hosted or SaaS)

**Multi-Firm Collaboration (2+ years):**
- Controlled decision sharing between client architect + contractor architect
- Joint decision timeline ("We decided together on Dec 15")
- Clear accountability: who decided what
- Privacy boundaries: internal vs. collaborative decisions

**Industry-Wide Decision Intelligence Platform:**
- Eventually: The system that architecture firms rely on for decision management
- Benchmark against other firms (anonymized)
- Industry standards for decision documentation
- Certification: "Design decisions made with full transparency and documentation"

**AI-Powered Design Feedback:**
- Claude reviews architectural decisions
- "Based on building codes, your material choice on Dec 3 may cause X issue"
- Proactive design review before cascading impacts
- Accelerates decision quality

---

### Expansion Opportunities

**Adjacent Markets (Post-souBIM Validation):**

1. **Other Architecture/BIM Firms** (primary expansion)
   - Target: 50-200 person architecture firms
   - Problem same as souBIM: knowledge loss, decision tracking, autonomy
   - Go-to-market: "See how souBIM scaled with DecisionLog"

2. **Engineering Firms** (structural, MEP, civil)
   - Problem: Complex multi-discipline decisions
   - Decision timeline already works for engineering
   - Expansion: support for engineering-specific decisions

3. **Construction Companies** (general contractors)
   - Problem: Site decisions, change orders, contractor alignment
   - Adapted system: decisions during construction (not just design)
   - Different workflow but same principle

4. **Design Studios** (interior, product, graphic)
   - Problem: Design review decisions, iterative choices
   - Adaptation: design-specific decision types
   - Collaboration: designer + client decision tracking

5. **Product Development Teams** (software, hardware)
   - Problem: Feature decisions, technical choices, pivots
   - Adaptation: product decisions instead of architectural
   - Market: faster iteration with full decision history

---

### Revenue Model Evolution

| Phase | Model | Customers | ARR |
|-------|-------|-----------|-----|
| **MVP** | Internal cost (souBIM) | — | $0 |
| **Phase 2** | Freemium (limited users) | Early adopters | $50-100K |
| **Phase 3** | SaaS subscription | 10-20 firms | $500K-1M |
| **Year 2+** | Enterprise + consulting | 50+ firms | $5M+ |

---

### Success Indicators for Post-MVP

**Phase 2 Success:**
- ✅ 50%+ souBIM architects use predictive features
- ✅ Decision reversal rate drops 30% (better informed)
- ✅ Gabriela spends <5 hrs/week on project decisions
- ✅ 2-3 other architecture firms request product

**Phase 3 Success:**
- ✅ Multiple firms using system with >80% adoption
- ✅ Industry recognition ("The decision intelligence platform")
- ✅ Real-time features used in 30%+ of calls
- ✅ Cross-firm collaboration starting

**Long-Term Success:**
- ✅ Market-leading decision intelligence platform
- ✅ 100+ firms relying on system
- ✅ Industry standard for decision documentation
- ✅ Acquisition target or sustainable independent company

---

## TECHNICAL CONSIDERATIONS

### Platform Requirements

**Target Platforms:**
- ✅ Web browser (primary): Chrome, Firefox, Safari, Edge
- ✅ Google Meet integration (via Tactiq webhooks)
- ✅ Desktop (Windows, Mac, Linux) via responsive web
- ❌ Mobile app (not MVP; responsive web sufficient)
- ❌ Native apps (web-first approach)

**Browser/OS Support:**
- Chrome/Chromium: ✅ Latest 2 versions
- Firefox: ✅ Latest 2 versions
- Safari: ✅ Latest 2 versions
- Edge: ✅ Latest 2 versions
- Minimum: ES2020 JavaScript, CSS Grid support

**Performance Requirements:**
- Dashboard load time: <2 seconds (first meaningful paint)
- Decision drill-down: <1 second
- Search results: <500ms (even with 1000+ decisions)
- Filters: Real-time responsive (<200ms)
- API latency: <200ms p95

---

### Technology Stack (Phase 1 MVP)

**Frontend:**
- Framework: React 18+ with TypeScript
- State management: React Query (server state) + Zustand (client state)
- UI components: Shadcn/ui (Tailwind-based, accessible)
- Visualization: Recharts (timeline, charts)
- Data tables: TanStack Table (filtering, sorting)
- Styling: Tailwind CSS
- Build tool: Vite
- Deployment: Vercel (git push → live)

**Backend API:**
- Language: Python 3.11+
- Framework: FastAPI (async-first, type-safe)
- Type validation: Pydantic v2
- Database ORM: SQLAlchemy
- Authentication: JWT + HTTP-only cookies
- Async: asyncio + aiohttp (parallel API calls)
- Deployment: Railway, Render, or AWS EC2
- Monitoring: Sentry (error tracking, optional)

**Decision Extraction Pipeline:**
- Language: Python 3.11+ (same as backend)
- **LLM:** Anthropic SDK (Claude 3.5 Sonnet)
- **Agent Framework:** LangGraph + LangChain
- **Embeddings:** sentence-transformers (local, free)
- Text Processing: spaCy (NLP, speaker ID)
- Async: asyncio (parallel Claude + embedding calls)
- Scheduling: APScheduler (process webhooks)

**Database & Vector Storage:**
- Primary Database: PostgreSQL 15+ (relational data)
- Vector Extension: pgvector (vector similarity search)
- Hosting: Supabase (PostgreSQL + pgvector + auth bundled)
- ORM: SQLAlchemy
- Backup: Automatic daily snapshots (Supabase)

**Vector Embeddings (Phase 1):**
- **Model:** sentence-transformers (all-MiniLM-L6-v2)
- **Setup:** `pip install sentence-transformers`
- **Deployment:** Runs locally on backend (no API calls)
- **Cost:** Free (MIT license, 22MB model)
- **Quality:** 80% for general text
- **Latency:** <100ms per decision
- **Storage:** pgvector in PostgreSQL
- **Similarity Search:** Cosine distance via SQL
- **Indexing:** None (Phase 1: <1000 decisions, exact search is fine)

**Vector Embeddings (Phase 2+):**
- Fine-tune sentence-transformers on souBIM architecture decisions
- Improves accuracy to 95%+ for architectural language
- Still local deployment, zero additional cost

---

### Architecture: Separate Repositories

**Repository Structure:**

```
decision-log-backend/
├── app/
│   ├── main.py                      # FastAPI app
│   ├── api/
│   │   ├── routes/
│   │   │   ├── decisions.py         # GET /projects/{id}/decisions
│   │   │   ├── projects.py          # GET /projects
│   │   │   └── auth.py              # POST /auth/login
│   │   └── middleware/
│   │       ├── auth.py              # JWT validation
│   │       └── logging.py           # Structured logging
│   ├── models/
│   │   ├── decision.py              # Pydantic models
│   │   ├── project.py
│   │   └── user.py
│   ├── services/
│   │   ├── decision_service.py      # Business logic
│   │   └── project_service.py
│   ├── database/
│   │   ├── models.py                # SQLAlchemy ORM models
│   │   ├── crud.py                  # CRUD operations
│   │   └── session.py               # DB connection pool
│   ├── extraction/
│   │   ├── agent.py                 # LangGraph agent
│   │   ├── llm.py                   # Claude calls
│   │   ├── embeddings.py            # sentence-transformers
│   │   ├── tools.py                 # Agent tools
│   │   └── scheduler.py             # Tactiq webhook processor
│   ├── config.py                    # Settings, env vars
│   └── utils/
│       ├── auth.py                  # JWT generation
│       └── logger.py                # Structured logging
├── requirements.txt
├── .env.example
├── alembic/                         # Database migrations
├── tests/                           # Unit + integration tests
└── README.md

decision-log-frontend/
├── src/
│   ├── components/
│   │   ├── Timeline.tsx             # Decision timeline
│   │   ├── DecisionCard.tsx
│   │   ├── Filters.tsx
│   │   └── DrillDown.tsx
│   ├── pages/
│   │   ├── Projects.tsx
│   │   ├── ProjectDetail.tsx
│   │   └── DecisionDetail.tsx
│   ├── hooks/
│   │   ├── useDecisions.ts          # API calls
│   │   └── useFilters.ts
│   ├── services/
│   │   └── api.ts                   # Fetch wrapper
│   ├── store/
│   │   └── store.ts                 # Zustand state
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── .env.example
```

**Deployment:**
- Backend: Railway/Render (`git push` → auto-deploy)
- Frontend: Vercel (`git push` → auto-deploy)
- Database: Supabase (managed PostgreSQL + pgvector)
- CI/CD: GitHub Actions (test on PR, deploy on merge)

---

### Data Flow: Phase 1 Extraction Pipeline

```
1. MEETING CAPTURED
   Google Meet happens
   Tactiq captures transcript + metadata

2. WEBHOOK DELIVERY
   Tactiq sends: POST /webhooks/transcript
   Payload: { meeting_id, participants, transcript, timestamps }
   Backend stores raw transcript in database

3. EXTRACTION AGENT (LangGraph)

   Step 1: Initial Extraction (Claude)
   - Input: Full transcript (20K tokens max)
   - Task: "Extract all FINAL decisions"
   - Output: List of 30-50 potential decisions
   - Cost: ~$0.10 per 4-hour meeting (Sonnet)

   Step 2: For Each Decision (Agent Tools)
   - Tool 1: retrieve_similar_decisions()
     WHERE project_id = SAME_PROJECT
     AND discipline = decision_discipline
     LIMIT 5
     → Returns past decisions from THIS project only

   - Tool 2: validate_decision_consistency()
     Claude analyzes: Does this decision align with past decisions?
     → Returns consistency score

   - Tool 3: extract_decision_context()
     Takes full transcript context around timestamp
     → Returns reasoning/context summary

   - Tool 4: calculate_confidence_score()
     Factors: consensus + consistency + historical support
     → Returns 0-1 confidence score

   - Tool 5: flag_anomalies()
     Detect: contradictions, high dissent, broad cascades
     → Returns flags for review

   Step 3: Embed & Store
   - Embed decision statement using sentence-transformers (local)
   - Store in PostgreSQL + pgvector
   - Process time: ~30 seconds per meeting

4. STORAGE (PostgreSQL + pgvector)
   decisions table:
   ├── id (UUID)
   ├── project_id (FK)
   ├── meeting_id (FK)
   ├── decision_statement (text)
   ├── who (speaker name)
   ├── timestamp (HH:MM:SS)
   ├── discipline (Architecture|MEP|Landscape|etc)
   ├── why (reasoning, full context)
   ├── impacts (JSON: [{ type, change }])
   ├── consensus (JSON: { discipline: AGREE|DISAGREE|ABSTAIN })
   ├── confidence (float 0-1)
   ├── embedding (vector, 384 dims)
   ├── similar_decisions (JSON: [decision_ids])
   ├── consistency_notes (text)
   ├── anomaly_flags (JSON: [{ type, severity }])
   ├── created_at
   └── updated_at

5. DASHBOARD QUERY
   User clicks "View Project Timeline"

   Query 1: Get all decisions
   SELECT * FROM decisions
   WHERE project_id = X
   ORDER BY timestamp

   Query 2: Search similar (if user filters by discipline)
   SELECT * FROM decisions
   WHERE project_id = X
   AND discipline = Y
   ORDER BY timestamp

6. FRONTEND DISPLAY
   Timeline View:
   - Chronological list of decisions
   - Meeting type badges (Client, Multi-disc, Internal)
   - Consensus visual indicators
   - Drill-down links

   Filters:
   - Date range
   - Discipline
   - Meeting type
   - Confidence level
   - Anomaly flags

   Drill-Down View:
   - Decision statement
   - Who, when, why
   - Impacts
   - Transcript excerpt (5-10 min around timestamp)
   - Similar past decisions (from THIS project)
   - Consistency notes
   - Full transcript link
```

---

### Agent Tools (LangGraph Implementation)

**Tool 1: retrieve_similar_decisions**
```
Purpose: Find past decisions in this project that relate to current decision
Scope: SAME PROJECT ONLY (Phase 1)
Query: Vector similarity search + project filter
Returns: 3-5 past decisions with similarity scores
Cost: ~0.001 per tool call
```

**Tool 2: validate_decision_consistency**
```
Purpose: Check if decision aligns with or contradicts past decisions
Input: Current decision + similar past decisions
Method: Claude analyzes alignment
Returns: Consistency score + notes
Cost: ~$0.01 per decision
```

**Tool 3: extract_decision_context**
```
Purpose: Get full context reasoning for decision
Input: Decision timestamp, full transcript
Method: Full transcript context provided to Claude during initial extraction
Returns: Context summary (prepared by Claude during initial extraction)
Cost: Included in initial extraction pass
```

**Tool 4: calculate_confidence_score**
```
Purpose: Compute confidence in decision extraction
Factors:
  - Consensus level (HIGH/MEDIUM/LOW)
  - Consistency with past (aligns/contradicts/neutral)
  - Historical support (similar past decisions exist?)
Returns: Confidence score 0-1
Cost: Local computation, <1ms
```

**Tool 5: flag_anomalies**
```
Purpose: Detect concerning patterns
Checks:
  - High dissent (one or more disciplines disagree)
  - Reversal pattern (similar decision was reversed before)
  - Broad cascade (affects many disciplines)
Returns: Array of flags for review
Cost: Local computation, <1ms
```

---

### Integration Points

| Service | Purpose | Cost | Phase |
|---------|---------|------|-------|
| **Tactiq** | Transcript delivery | Included (enterprise plan) | 1 |
| **Claude API** | Decision extraction | ~$15/month | 1 |
| **sentence-transformers** | Embeddings (local) | Free | 1 |
| **PostgreSQL + pgvector** | Storage | Supabase free tier | 1 |
| **Vercel** | Frontend hosting | Free tier | 1 |
| **Railway/Render** | Backend hosting | ~$10-20/month | 1 |
| **Sentry** | Error tracking | Free tier | 1 |

**Total Phase 1 Monthly Cost: ~$25-35/month** (under $100 budget)

---

### What's NOT in Phase 1 MVP

❌ OpenAI embeddings (cost + external dependency)
❌ Cross-project knowledge search (Phase 2)
❌ Real-time meeting intelligence (Phase 3)
❌ Audio/video storage (text transcripts only)
❌ Complex context extraction algorithms (full transcript context instead)
❌ Multi-region deployment (single region)
❌ SaaS for other firms (internal tool first)
❌ HNSW indexing (exact search is fast enough for 200 decisions)
❌ LLM vs ML question for consensus (LLM only for MVP)

---

### Technology Choices Rationale

| Choice | Why | Alternative | Tradeoff |
|--------|-----|-------------|----------|
| **Python + FastAPI** | Better for ML/data pipelines | Node.js | Slightly different DevOps |
| **sentence-transformers** | Free, local, domain-adaptable | OpenAI embeddings | Slightly lower accuracy initially |
| **LangGraph + LangChain** | Agent orchestration, tool calling | Direct SDK | Added ~500 lines of code |
| **pgvector** | Built-in PostgreSQL | Pinecone/Weaviate | Single vendor lock (Supabase) |
| **Supabase** | Bundled PostgreSQL + pgvector + auth | AWS RDS + extras | Less flexible for enterprise |
| **Separate repos** | Clear boundaries, independent deploy | Monorepo | Type sync friction |
| **Vercel + Railway** | Managed, zero-config | Self-hosted | Less control |
| **Full transcript context** | Claude has complete picture | Fixed time window | Simpler, more accurate |
| **Direct Anthropic SDK** | Simpler, no abstraction overhead | LangChain SDK | More boilerplate code |

---

### Security & Compliance (Phase 1)

- ✅ HTTPS everywhere (Vercel + Railway handle)
- ✅ Text transcripts only (no audio/video storage)
- ✅ Data encryption in transit (TLS 1.3)
- ✅ Data encryption at rest (Supabase default)
- ✅ No PII in extracts (speaker names only, no email)
- ✅ JWT authentication (secure, stateless)
- ✅ CORS protection (API restricts frontend origins)
- ✅ Rate limiting (FastAPI middleware)
- ✅ SQL injection safe (SQLAlchemy parameterized)
- ⚠️ GDPR compliance (deletion on request, Phase 2)
- ⚠️ Audit logging (basic, Phase 2)

---

### Rationale for Phase 1 Design

- **No over-engineering:** Full transcript context instead of complex extraction
- **Free embeddings:** sentence-transformers instead of OpenAI API
- **Same-project scope:** Simpler queries, faster, clearer value
- **LangGraph agents:** Enables enrichment without complexity
- **Supabase bundle:** PostgreSQL + pgvector + auth = one service
- **Separate repos:** Independent deploy cycles, clear boundaries
- **Cost-effective:** ~$25/month keeps within budget

---

## CONSTRAINTS & ASSUMPTIONS

### Constraints

**Technical Constraints:**

1. **API Budget: $100/month Maximum**
   - Claude extraction: ~$15/month (200 decisions × extraction)
   - Embeddings: $0 (local sentence-transformers)
   - Buffer for Phase 2: $85/month available
   - Mitigation: Use Haiku when possible, optimize prompts, batch requests

2. **No Audio/Video Storage**
   - Decision: Text transcripts only
   - Trade-off: Can't replay audio, but privacy/compliance benefit
   - Mitigation: Transcript timestamps + excerpts sufficient for context

3. **Same-Project Knowledge Base (Phase 1)**
   - Decision: Search similar decisions only within project_id
   - Trade-off: Can't access company-wide decision history yet
   - Benefit: Simpler queries, faster, clearer value
   - Mitigation: Expand scope in Phase 2 when MVP is stable

4. **No Real-Time Extraction (Phase 1)**
   - Decision: Batch processing after meeting ends (<4 hour latency)
   - Trade-off: Can't flag decisions as they happen
   - Benefit: Simpler architecture, async-friendly
   - Mitigation: Real-time intelligence in Phase 3

5. **10-User MVP Scope**
   - Gabriela: 1 user
   - Architects: 9 users (3 groups × 3)
   - No external team leads or clients in Phase 1
   - Trade-off: Limited user testing
   - Mitigation: Gather feedback intensively from 10 users

6. **Single Language (Portuguese/English)**
   - Assumption: souBIM meetings primarily Portuguese or English
   - Trade-off: Won't work for other languages
   - Mitigation: Claude handles both well; add others in Phase 2

**Resource Constraints:**

7. **Development Timeline: 6-8 Weeks**
   - Team size: Estimated 2-3 developers
   - Iterations: 1-2 per week
   - Trade-off: Can't add features mid-sprint
   - Mitigation: Strict MVP scope, no scope creep

8. **No Historical Data for Fine-Tuning**
   - Assumption: Starting from zero decisions
   - Trade-off: LLM extraction (not fine-tuned ML) until Month 6
   - Mitigation: Collect decisions, train in Phase 2

9. **Supabase Dependency**
   - Single vendor for PostgreSQL + pgvector + auth
   - Trade-off: Lock-in, but fast to market
   - Mitigation: Export data capability in Phase 2

---

### Key Assumptions

**Product Assumptions:**

1. **Gabriela WILL transition to sales focus** (not just maternity cover)
   - Assumption: System creates enough confidence in team decisions
   - Risk: If team can't be trusted, Gabriela stays operational
   - Validation: Track time spent on decisions; survey team confidence

2. **Team leads CAN make autonomous architectural decisions**
   - Assumption: With documented history, architects gain confidence
   - Risk: May need more training or Gabriela still needed as bottleneck
   - Validation: Measure decision latency (before/after); team feedback

3. **Decision timeline is sufficient for catch-up**
   - Assumption: <30 min catch-up per project is achievable
   - Risk: May need more context, deeper dives, live support
   - Validation: Gabriela's post-maternity feedback; time-tracking

4. **Clients won't need visibility in Phase 1**
   - Assumption: Internal decision tracking is primary MVP value
   - Risk: Clients might request early access
   - Validation: Get client feedback in Phase 2

5. **Same-project knowledge is sufficient**
   - Assumption: Project-specific decisions are most relevant
   - Risk: Cross-project patterns might be critical
   - Validation: Gather feedback; expand in Phase 2 if needed

---

**Technical Assumptions:**

6. **Tactiq webhooks are reliable**
   - Assumption: Transcripts deliver within 5 min of meeting end
   - Risk: Webhook failures, duplicate deliveries, missing transcripts
   - Validation: Monitor webhook success rate; add retry logic

7. **Claude can accurately extract 95%+ of decisions**
   - Assumption: Full transcript context enables high accuracy
   - Risk: Architectural language might confuse LLM
   - Validation: Monthly human audit (sample 30 decisions); adjust prompts

8. **sentence-transformers embeddings work for architecture domain**
   - Assumption: General-purpose embeddings sufficient for Phase 1
   - Risk: Architectural terminology might not embed well
   - Validation: Test similarity search quality; fine-tune in Phase 2 if needed

9. **pgvector exact search is fast enough for 200 decisions**
   - Assumption: <100ms query latency acceptable
   - Risk: Latency issues if queries get complex
   - Validation: Monitor query times; add HNSW in Phase 2 if needed

10. **Supabase free tier can handle MVP load**
    - Assumption: 10 users, 200 decisions/month, modest queries
    - Risk: Hitting rate limits or storage limits
    - Validation: Monitor usage; upgrade tier if needed

---

**Process Assumptions:**

11. **Maternity leave happens in 2 months**
    - Assumption: System must be live before Gabriela leaves
    - Risk: Timeline slip, go-live pushed past maternity leave
    - Validation: Track milestone completion; adjust scope if needed

12. **Team will use system daily**
    - Assumption: Adoption will be high (8+ of 9 architects, 3+ uses/week)
    - Risk: Low adoption if interface is confusing or workflow disrupted
    - Validation: Usage analytics; user feedback sessions

13. **Decisions are always made in Google Meet calls**
    - Assumption: No Slack decisions, emails, hallway conversations
    - Risk: Important decisions happen outside recorded meetings
    - Validation: Ask team if other decision channels exist

14. **No major API changes to Tactiq or Claude**
    - Assumption: Stability of third-party services
    - Risk: Breaking changes to APIs
    - Validation: Monitor API status; maintain abstraction layer

---

## RISKS & OPEN QUESTIONS

### Key Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|-----------|
| **Maternity leave timeline slips** | MVP not ready before Gabriela leaves | Medium | Track milestones weekly; cut features if needed |
| **Low team adoption** | System unused, no value realized | Medium | Intensive onboarding; make interface intuitive |
| **Claude accuracy <90%** | Many false decisions, manual review needed | Low | Test extraction early; adjust prompts; audit monthly |
| **Gabriela still acts as bottleneck** | Team can't truly be autonomous | Medium | Clear authority + training; team empowerment culture |
| **Tactiq webhook failures** | Meetings not captured; decisions lost | Low | Monitor success rate; fallback manual upload |
| **Embedding quality poor** | Similar decisions not found | Low | Fine-tune in Phase 2; manual validation |
| **Scope creep during development** | Timeline slips, MVP not delivered | High | Strict scope enforcement; no Phase 2 features in Phase 1 |

---

### Open Questions

1. **How do we handle informal decisions (Slack, email)?**
   - Phase 1: Ignore (Google Meet only)
   - Phase 2: Consider manual logging option

2. **What's the approval workflow for high-impact decisions?**
   - Current assumption: Gabriela reviews asynchronously
   - Question: Should there be formal approval step?

3. **How do we measure success during maternity leave?**
   - Metric: Team makes 80%+ of decisions independently
   - Challenge: Hard to measure without Gabriela present

4. **What if clients demand visibility during Phase 1?**
   - Current: Phase 2 feature
   - Risk: Scope creep request

5. **How do we handle decision context that's not in the meeting?**
   - Example: "We decided this based on code review yesterday"
   - Phase 1: Accept this limitation; Phase 2: Link external context

6. **How do we measure team autonomy improvement?**
   - Metric: Decision latency (time from discussion to approval)
   - Baseline: 2-3 days (waiting for Gabriela)
   - Target: <4 hours (same day approval)
   - Validation: Timestamp comparison before/after

7. **What if MEP/other disciplines demand access?**
   - Assumption: Phase 1 is souBIM-only
   - Risk: External teams want to manage their own decisions
   - Mitigation: Clear Phase 1 scope; discuss Phase 2 expansion

8. **How do we prevent decision fatigue?**
   - Risk: Too many notifications, too much tracking
   - Mitigation: Async digest only (no real-time alerts); digestible summaries

---

## APPENDICES

### A. Technology Stack Summary

```
Frontend: React 18 + TypeScript + Tailwind + Vercel
Backend: Python 3.11 + FastAPI + Railway/Render
Agent: LangGraph + LangChain + Anthropic SDK
Embeddings: sentence-transformers (local, free)
Database: PostgreSQL + pgvector (Supabase)
Authentication: JWT + HTTP-only cookies
Monitoring: Sentry (error tracking, optional)
CI/CD: GitHub Actions
```

---

### B. Cost Breakdown (Phase 1)

```
Claude API:              $15/month
Railway/Render backend:  $10-20/month
Vercel frontend:         Free (within limits)
Supabase database:       Free tier (sufficient for MVP)
Sentry monitoring:       Free tier
Domain name:             $12/year (negligible)

TOTAL:                   ~$25-35/month
Budget remaining:        $65-75/month (reserved for Phase 2)
```

---

### C. Timeline Estimate

```
Week 1-2:   Backend setup + database schema + API structure
Week 2-3:   Tactiq integration + LLM extraction pipeline
Week 3-4:   Agent tools + vector search + storage
Week 4-5:   Frontend dashboard + timeline visualization
Week 5-6:   Filters, drill-down, Gabriela's digest
Week 6-7:   Testing, bug fixes, performance optimization
Week 7-8:   User testing, refinement, launch prep

Target Launch: 6-8 weeks from start
```

---

### D. Success Metrics (Detailed)

| Metric | Target | Validation | Timeline |
|--------|--------|-----------|----------|
| Decision capture accuracy | 95%+ | Monthly audit | Ongoing |
| Team adoption | 8+/9 architects using 3+/week | Usage analytics | Week 4+ |
| Gabriela catch-up time | <30 min per project | Post-maternity survey | Month 3+ |
| Decision autonomy | 80%+ decisions by team leads | Decision author tracking | Ongoing |
| System uptime | 99%+ | Monitoring dashboard | Ongoing |
| Dashboard latency | <2 seconds | Performance monitoring | Week 5+ |
| Team confidence | 8/10+ on decisions during absence | Team survey | Month 3+ |
| Decision reversals | <10% during absence period | Decision audit | Month 3+ |

---

### E. Team & Roles

- **Product Owner:** Gabriela (approves direction, provides feedback)
- **Backend Developer:** Python, FastAPI, LangGraph, database design
- **Frontend Developer:** React, TypeScript, API integration, dashboard
- **DevOps (Optional):** CI/CD, deployment, infrastructure, monitoring

---

### F. Key Decisions Made During Discovery

**Embedding Strategy:**
- ✅ Use sentence-transformers (local, free) instead of OpenAI
- ✅ Phase 2: Fine-tune on architecture domain
- ✅ H3 → H2 → H1 evolution path

**Knowledge Base Scope:**
- ✅ Phase 1: Same project_id only
- ✅ Phase 2: Expand to company-wide
- ✅ Phase 3: Industry insights

**Context Strategy:**
- ✅ Full transcript context during extraction (Claude has everything)
- ✅ 5-10 min excerpt for dashboard display
- ✅ No fixed time windows (avoid context loss)

**Agent Architecture:**
- ✅ LangGraph + LangChain for orchestration
- ✅ 5 tools for decision enrichment
- ✅ Direct Anthropic SDK (no abstraction overhead)

**Deployment:**
- ✅ Separate repositories (backend vs frontend)
- ✅ Independent deployment cycles
- ✅ Clear boundaries, easier to scale

---

## NEXT STEPS

### Immediate Actions (This Week)

1. ✅ **Approve Project Brief** - Stakeholder sign-off
2. **Set up repositories**
   - Create `decision-log-backend` (Python)
   - Create `decision-log-frontend` (React)
   - Initialize GitHub Actions CI/CD

3. **Configure infrastructure**
   - Create Supabase project (PostgreSQL + pgvector)
   - Set up Railway/Render account for backend
   - Configure Vercel for frontend
   - Create GitHub organization/team

4. **Secure credentials**
   - Generate Anthropic API key (Claude)
   - Obtain Tactiq API credentials + webhook setup
   - GitHub Personal Access Token
   - Create `.env` templates for both repos

---

### Week 1-2 Development Kickoff

**Backend Foundation:**
1. FastAPI server boilerplate
2. SQLAlchemy models (projects, decisions, meetings, users)
3. Supabase PostgreSQL connection + pgvector
4. JWT authentication setup + password hashing
5. Database migrations (Alembic)

**Tactiq Integration:**
1. POST `/webhooks/transcript` endpoint
2. Store raw transcript in database
3. Schedule extraction task (APScheduler)
4. Error handling + retry logic

**Extraction Pipeline (Foundation):**
1. Claude decision extraction (analyze full transcript)
2. sentence-transformers embedding setup
3. Pydantic validation for decisions
4. Basic error logging

---

### Week 3-4 Agent & Tools Implementation

**LangGraph Agent:**
1. Agent state management
2. Tool definitions (retrieve_similar, validate_consistency, etc.)
3. Agent loop orchestration
4. Error handling + fallbacks

**Tools:**
1. retrieve_similar_decisions() - Vector search
2. validate_decision_consistency() - Claude analysis
3. extract_decision_context() - Context extraction
4. calculate_confidence_score() - Scoring logic
5. flag_anomalies() - Anomaly detection

**API Endpoints:**
1. GET `/projects/{id}/decisions` - List decisions
2. GET `/decisions/{id}/drill-down` - Full decision context
3. GET `/projects/{id}/digest` - Gabriela's digest
4. POST `/auth/login` - Authentication

---

### Week 5-6 Frontend & Dashboard

**Frontend Scaffold:**
1. React + TypeScript + Vite setup
2. API service layer + React Query
3. Authentication flow (login, JWT storage)
4. Layout components

**Dashboard Components:**
1. Project list view
2. Decision timeline component
3. Filters component (date, discipline, type)
4. Decision card (summary view)
5. Drill-down modal (full context)
6. Gabriela's digest view

**Styling:**
1. Tailwind CSS + Shadcn/ui
2. Timeline visualization (Recharts)
3. Responsive design
4. Accessibility (WCAG 2.1 AA)

---

### Week 7-8 Testing & Launch Prep

**Testing:**
1. Unit tests for extraction logic
2. Integration tests for API endpoints
3. E2E tests for dashboard workflows
4. Load testing (100+ decisions)

**User Testing:**
1. 2-3 hour session with Gabriela
2. Feedback gathering
3. Iterate on interface/workflows
4. Performance optimization

**Documentation:**
1. User guide for Gabriela + architects
2. API documentation (Swagger/OpenAPI)
3. Deployment runbook
4. Troubleshooting guide

**Go-Live Preparation:**
1. Security audit
2. Performance optimization
3. Monitoring setup (Sentry)
4. Backup testing

---

### Launch Week

1. **Deploy to Production**
   - Backend to Railway/Render
   - Frontend to Vercel
   - Database migrations
   - Webhook configuration

2. **Monitor & Support**
   - Watch error logs (Sentry)
   - Quick bug fixes
   - User support
   - Performance monitoring

3. **Gather Feedback**
   - User interviews (Gabriela, architects)
   - Usage analytics review
   - Identify quick wins for Phase 1.5

4. **Celebrate! 🎉**
   - Project launch
   - Team retrospective
   - Plan Phase 2

---

### Phase 1.5 Quick Wins (If time permits)

- Email digest delivery (sends Gabriela weekly digest)
- Meeting type selector (tag meetings as Client/Multi-disc/Internal)
- Export to PDF (timeline + decision log)
- Basic analytics dashboard (decisions/week, team adoption)

---

## PM HANDOFF

**This Project Brief provides complete context for DecisionLog MVP.**

**When ready for PRD development, @po should:**

1. **Review this brief thoroughly** with all stakeholders
2. **Create detailed PRD** using "PRD Generation Mode" (section by section)
3. **Clarify ambiguities** with Gabriela + architecture team
4. **Get explicit buy-in** from Gabriela + key architects
5. **Hand off to @dev** with clear, detailed requirements

**Key Points for PRD:**
- Emphasize "team autonomy" as core value
- Clarify "same project only" scope for Phase 1
- Highlight "zero friction meetings" (Tactiq silent)
- Stress "decision ownership" accountability
- Explain "knowledge base learning" over time
- Note "maternity leave deadline" urgency

---

## APPENDIX: DISCUSSION SUMMARY

### Major Decisions Made During Project Brief Development

**1. LLM vs ML for Decision Extraction**
- ✅ Decided: LLM (Claude) for MVP
- Rationale: No training data, works day 1, better on nuance
- Phase 2: Fine-tune custom ML once data accumulates

**2. Embedding Model Selection**
- ✅ Decided: sentence-transformers (local, free)
- ✅ Rejected: OpenAI embeddings (unnecessary cost)
- Phase 2: Fine-tune on architecture domain

**3. Knowledge Base Scope (Phase 1)**
- ✅ Decided: Same project_id only
- ✅ Rejected: Company-wide search (Phase 2)
- Rationale: Simpler, clearer value, less complexity

**4. Context Extraction Strategy**
- ✅ Decided: Full transcript context (Claude has everything)
- ✅ Rejected: Fixed time windows (arbitrary, context loss)
- ✅ Rejected: Semantic expansion (too complex for MVP)

**5. Agent Framework**
- ✅ Decided: LangGraph + LangChain
- Rationale: Tool calling, state management, ReAct pattern
- User insight: "We have agent-like behavior (knowledge base learning)"

**6. Vector Search Indexing**
- ✅ Decided: Skip HNSW for MVP
- Rationale: 200 decisions = exact search is fast enough
- Phase 2: Add HNSW when >10K decisions

**7. Repository Architecture**
- ✅ Decided: Separate repos (frontend, backend)
- ✅ Rejected: Monorepo
- Rationale: Independent deployment, clear boundaries, simpler CI/CD

**8. Backend Language**
- ✅ Decided: Python + FastAPI (not Node.js)
- Rationale: Better for ML/data processing, direct Anthropic SDK

**9. Backend API**
- ✅ Decided: Direct Anthropic SDK (not LangChain SDK)
- Rationale: No abstraction overhead, linear workflow, simpler debugging

---

### Key Insights from Stakeholder Discussions

**From User Requirements Gathering:**
- "The director will be out in 2 months, need decision capture ASAP"
- "Team is not able to handle conversations with clients"
- "Three ongoing projects, each with architecture leads (not fully autonomous)"
- "Decisions made in daily calls, no documentation"
- "Need to track WHO decided, WHEN, WHAT TRIGGERED IT, and impacts"
- "Want to shift Gabriela to Sales, not operational work"

**From Technical Discussions:**
- "Can we use free embedding models? Yes → sentence-transformers"
- "Should we search across projects? Not yet → Phase 2"
- "Fixed time windows for context? No → full transcript"
- "Do we need LangGraph? Yes → agent tools + knowledge base"
- "Why not Fathom? Visible users, external data, no decision intelligence"
- "Why not Slack threads? Scattered, loses context"

**From Scope & Prioritization:**
- "Keep Phase 1 MVP tight, deliver value first"
- "Don't over-engineer for Phase 2 or 3"
- "User count is small (10 people) = focus on quality not scale"
- "Maternity leave deadline is hard constraint"
- "Same project scope is smart MVP boundary"

---

### Evolution of Solution Design

**Initial Concept:**
- "Bot in Google Meet calls"
- "Similar to Tactic plugin"
- "Chain lock timeline visualization"

**Evolved To:**
- "Decision capture + LLM extraction + agent tools"
- "Full transcript context analysis"
- "Knowledge base learning within project"
- "Vector-powered semantic search"
- "Executive digest for leadership"
- "Phased vision (MVP → Phase 2 → Phase 3)"

---

## Document Information

- **Created:** 2026-02-07
- **Last Updated:** 2026-02-07
- **Version:** 1.0
- **Status:** Ready for PRD Development
- **Audience:** Product Owner, Development Team, Stakeholders
- **Next Phase:** PRD Creation by @po

---

**END OF PROJECT BRIEF**

This document represents the complete synthesis of all discussions, decisions, and refinements made during the project discovery phase. It's ready to be handed off to @po for detailed PRD development.

