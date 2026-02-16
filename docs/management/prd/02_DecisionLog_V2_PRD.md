# DecisionLog V2: Brownfield Enhancement PRD

**Document Version:** 2.0
**Date Created:** 2026-02-16
**Status:** Draft — Pending Review
**Product Owner:** Morgan (PM)
**For:** souBIM Architecture Company
**Supersedes:** Extends PRD v1.0 (01_DecisionLog_PRD.md)

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Existing Project Analysis](#existing-project-analysis)
3. [Enhancement Scope](#enhancement-scope)
4. [Item Type Taxonomy](#item-type-taxonomy)
5. [Requirements](#requirements)
6. [User Interface Enhancement Goals](#user-interface-enhancement-goals)
7. [Technical Constraints & Integration](#technical-constraints--integration)
8. [Data Model Evolution](#data-model-evolution)
9. [API Specification](#api-specification)
10. [Epic & Story Structure](#epic--story-structure)
11. [Prioritization & Phasing](#prioritization--phasing)
12. [Success Metrics](#success-metrics)
13. [Risks & Mitigations](#risks--mitigations)
14. [Glossary](#glossary)
15. [Change Log](#change-log)

---

## EXECUTIVE SUMMARY

### Enhancement Vision

DecisionLog V2 evolves from a **decision-only capture system** into a **comprehensive project intelligence platform**. The core insight from client feedback (Gabriela): the existing timeline is valuable for deep project history, but she needs a fast, high-level view to understand "where the project IS" at a glance.

**V2 introduces:**

- **Project Item Taxonomy** — Capture 5 types of valuable information (not just decisions): decisions, topics, action items, ideas, and information
- **Milestone Timeline** — A curated view of only the most important project items, overlaid on a Dot Timeline (a vertical line with dots) representing project stage schedule on left side and Milestones on right side.
- **Project History** — The existing timeline, enhanced with multi-source items, meeting summaries, and advanced filtering (renamed from "Timeline")
- **Multi-Source Ingestion** — Capture project items from 4 sources: Meetings, Emails, Documents, and Manual Input
- **Ingestion Approval** — A review stage where admins select which source materials get processed into the system
- **Project CRUD** — Full project lifecycle management with stage scheduling

### Why Now

After the MVP launch, Gabriela validated the core value proposition: centralizing project information eliminates information loss. However, she identified two critical gaps:

1. **Speed of comprehension** — The extended timeline is too detailed for a quick status check. She needs a milestone view for client/provider communication.
2. **Information loss** — Tracking only "decisions" loses ~60% of actionable meeting content (action items, open topics, ideas). Additionally, valuable project information lives in emails and documents that the system doesn't capture.

### Target Outcome

> Gabriela opens a project, sees the Milestone Timeline with 5-8 key items plotted against the project stage schedule, and understands the project's current state in under 60 seconds.

---

## EXISTING PROJECT ANALYSIS

### Current State (V1 — Epics 1-4 Complete)

| Component | Status | Technology |
|-----------|--------|------------|
| Backend API | Production-ready | FastAPI + SQLAlchemy (Python) |
| Database | Production-ready | PostgreSQL + pgvector |
| Auth | Complete | JWT + role-based (director, architect) |
| Decision Capture | Complete | Tactiq Webhook → LLM Extraction → Agent Enrichment |
| Vector Search | Complete | sentence-transformers (all-MiniLM-L6-v2, 384-dim) |
| Frontend Dashboard | Complete | React 18 + Vite + TypeScript + Tailwind |
| Timeline View | Complete | 3-layer hierarchy (Date → Meeting → Decision) |
| Executive Digest | Complete | Summary view with cost/timeline/risk |
| Filters | Complete | Discipline, meeting type, date range, search |
| Drill-Down Modal | Complete | Full decision context + transcript excerpt |

### What Works Well (Validated by Gabriela)
- Centralizes meeting information that was being lost in meeting minutes
- Organizes project information in one place
- New collaborators can onboard by reading the project history
- Can search for specific information and understand past project direction

### What's Missing (Client Feedback)
- No quick status view — too detailed for daily check-ins
- Only captures "decisions" — misses topics, action items, ideas
- Only captures from meetings — misses emails, documents, informal conversations
- No project lifecycle management (stages, milestones)
- No ingestion control — all meetings processed, no filtering

### Available Documentation
- [x] Tech Stack Documentation (PRD v1.0)
- [x] Source Tree/Architecture (CLAUDE.md, architecture docs)
- [x] API Documentation (PRD v1.0, routes)
- [x] Coding Standards (CLAUDE.md)
- [ ] UX/UI Guidelines (informal, embedded in stories)
- [ ] Technical Debt Documentation

---

## ENHANCEMENT SCOPE

### Enhancement Types
- [x] New Feature Addition (Milestone Timeline, Project CRUD, Ingestion Approval)
- [x] Major Feature Modification (Decision → Project Item, Multi-Source)
- [x] Integration with New Systems (Gmail API, Google Drive)
- [x] UI/UX Overhaul (Project History redesign, new Milestone view)

### Impact Assessment
- **Significant Impact** — The core data model changes (Decision → Project Item) affect every layer: database, API, frontend types, components, and AI extraction prompts.

### Goals
- Gabriela understands any project's current state in **<60 seconds** via Milestone Timeline
- Capture **95%+ of actionable meeting content** (not just decisions) across 5 item types
- Ingest project items from **4 sources**: meetings, emails, documents, manual input
- Provide **admin control** over what content enters the system via Ingestion Approval
- Enable **project lifecycle tracking** with stage scheduling and current stage indicator
- Support **client/provider communication** by exporting milestone summaries

### Background Context
The DecisionLog MVP successfully proved that AI-powered meeting transcript extraction can eliminate information loss in architecture firms. However, user testing revealed that the system captures too little (only decisions) and presents too much detail (full timeline as the only view). V2 addresses both: capture more, present it smarter.

---

## ITEM TYPE TAXONOMY

### The 5 Project Item Types

This taxonomy replaces the single "Decision" entity. Every piece of information captured by the system — from any source — is classified as one of these types.

| # | Type | Definition | AI Extraction Signal | Example |
|---|------|-----------|---------------------|---------|
| 1 | **idea** | A raw creative input or proposal mentioned but NOT formally evaluated. Low formality. May or may not be revisited. | "what if", "we could try", "maybe consider", "one option would be" | "What if we used glass panels instead of concrete on the north facade?" |
| 2 | **topic** | A subject actively under discussion across one or more sessions. Being debated, not yet resolved. Requires follow-up. | "we need to discuss", "still evaluating", "pending review", "let's revisit", "open question" | "The foundation material choice is still being evaluated between options A and B" |
| 3 | **decision** | A resolved choice with explicit or implicit consensus. Changes project direction. Documented as project fact. | "we agreed", "decided", "confirmed", "approved", "consensus is", "final answer" | "Team agreed to use C50 concrete for all structural columns" |
| 4 | **action_item** | A concrete deliverable with implied or explicit owner and expected completion. Can spawn from a decision or exist independently. | "X will...", "need to prepare", "by Friday", "follow up on", "assigned to", "responsible for" | "Carlos will prepare updated load calculations by Friday" |
| 5 | **information** | A factual statement, update, or reference captured for the record. Not actionable, not debatable — important to know. | "the permit was approved", "budget is", "timeline updated", "FYI", "for reference", "confirmed that" | "The city approved the environmental permit on Feb 3rd" |

### Item Lifecycle

```
idea → topic → decision → action_item[]
                              ↑
information ─────────────────(standalone, no lifecycle progression)
```

- Items have an `item_type` that **CAN change** as they progress (promotion)
- An `idea` can be promoted to `topic` when formal discussion begins
- A `topic` becomes a `decision` when consensus is reached
- A `decision` spawns one or more `action_item[]` with owners/deadlines
- `information` is standalone — factual records that don't progress
- Not every item follows the full lifecycle:
  — a `decision` can be captured directly without starting as an `idea`
  — `action_item[]` can be captured directly without be derived from a `decision`

### Why 5 Types (Not 6)

| Original Proposal | Decision | Rationale |
|-------------------|----------|-----------|
| `suggestion` | **Merged into `idea`** | AI cannot reliably distinguish formality levels between "idea" and "suggestion" in transcript text. The distinction is subjective. |
| `task` | **Merged into `action_item`** | The only difference (assigned vs unassigned) is a status attribute (`owner` field), not a type distinction. |
| `open_topic` | **Renamed to `topic`** | "Open" is a status (resolved/unresolved), not a type. Cleaner naming. |
| `information` | **Added** | Fills a real gap. Many valuable outputs are neither decisions nor action items — facts, updates, confirmations, status reports. Without this, they'd be lost. |

### Milestone Flag

Any item of any type can be marked as a **milestone** (`is_milestone: boolean`). Milestones appear on the Milestone Timeline. Only Admin users (Gabriela) can mark/unmark milestones.

### Action Item Extra field

Items of type `action_item` should be able to be marked as **done** (`is_done: boolean`). Action items appear on the Project History view. Only Admin users (Gabriela) can done/undone `action_items`.

---

## REQUIREMENTS

### Functional Requirements

**Project Item Model (FR1-FR5)**
- **FR1:** The system SHALL support 5 item types: `idea`, `topic`, `decision`, `action_item`, `information`
- **FR2:** Each project item SHALL track: `item_type`, `source_type`, `disciplines[]`, `is_milestone`, `statement`, `who`, `timestamp`, `context`
- **FR3:** The system SHALL support item type promotion (idea → topic → decision) with history tracking.
- **FR4:** The `disciplines[]` field SHALL replace the single `discipline` field, supporting multiple agreeing disciplines per item
- **FR5:** Action items SHALL support `owner`, `due_date`, and `status` (pending, in_progress, completed) fields

**Multi-Source Ingestion (FR6-FR12)**
- **FR6:** The system SHALL support 4 source types: `meeting`, `email`, `document`, `manual_input`
- **FR7:** Meeting source SHALL continue using the existing Tactiq/Fathom webhook pipeline
- **FR8:** Email source SHALL integrate with Gmail API via scheduled polling job with configurable frequency
- **FR9:** Document source SHALL support PDF and DOCX file processing (Phase 2)
- **FR10:** Manual input source SHALL provide a form for users to create project items directly
- **FR11:** The system SHALL extract project items (all 5 types) from each source type using adapted AI prompts
- **FR12:** Each source SHALL maintain a link to its original material (transcript, email thread, document file)

**Ingestion Approval (FR13-FR17)**
- **FR13:** The system SHALL provide an Ingestion Approval page showing all incoming source materials before ETL processing
- **FR14:** For meetings, the approval page SHALL display: Call ID, Project, Date/Time, Meeting Type, Source, Include toggle, AI one-line summary, Transcript link
- **FR15:** For emails, the approval page SHALL display: Email ID, Project, Date, Subject, From, To/CC count, Include toggle, AI one-line summary, Thread link
- **FR16:** Admin users SHALL be able to approve/reject individual source materials for processing
- **FR17:** Manual input items SHALL bypass the ingestion approval page and be embedded directly upon creation

**Project CRUD (FR18-FR23)**
- **FR18:** The system SHALL provide a Project creation page with fields: title, description, project_type, actual_project_stage, project_stage_schedule
- **FR19:** The `project_stage_schedule` SHALL support an ordered list of stages with: stage_name, stage_from (date), stage_to (date)
- **FR20:** Stages SHALL NOT overlap in dates
- **FR21:** The system SHALL provide predefined stage templates per project type (e.g., Architecture: Briefing → Levantamento → Estudo Preliminar → Anteprojeto → Projeto Legal → Projeto Executivo → Acompanhamento de Obra)
- **FR22:** The `actual_project_stage` SHALL be a pointer to the current active stage in the schedule
- **FR23:** Users SHALL be able to create, read, update, and archive projects

**Milestone Timeline (FR24-FR29)**
- **FR24:** The system SHALL provide a Milestone Timeline view showing only items marked as `is_milestone: true`
- **FR25:** The Milestone Timeline SHALL display a Gantt-style project stage schedule bar as visual backdrop
- **FR26:** Each milestone item SHALL show: item_type badge, statement, source icon, date, disciplines
- **FR27:** The Milestone Timeline SHALL indicate the current project stage with a visual marker (e.g., "You are here")
- **FR28:** Admin users SHALL be able to mark/unmark items as milestones from any view (Project History, Drill-Down, Milestone Timeline)
- **FR29:** The Milestone Timeline SHALL support filtering by source type and item type

**Project History Enhancement (FR30-FR36)**
- **FR30:** The existing Timeline SHALL be renamed to "Project History"
- **FR31:** Project History SHALL display items from all 4 source types with source-specific icons
- **FR32:** The typography hierarchy SHALL clearly differentiate the 3 layers: Date (24px bold), Meeting/Source (18px semibold), Item (16px medium)
- **FR33:** Meeting sources SHALL display an expandable AI-generated summary
- **FR34:** Items SHALL display item type badges with distinct colors and icons per type
- **FR35:** Project History SHALL support filtering by: source type, item type, discipline, date range, search query
- **FR36:** The `disciplines[]` SHALL render as multi-badge display (colored pills for each agreeing discipline)

### Non-Functional Requirements

- **NFR1:** Data model migration SHALL preserve all existing V1 decision data without loss
- **NFR2:** The Milestone Timeline SHALL load in <2 seconds for projects with up to 500 items
- **NFR3:** Gmail API polling SHALL handle rate limits gracefully and not exceed Google's quota
- **NFR4:** Ingestion Approval page SHALL handle up to 100 pending items without pagination performance degradation
- **NFR5:** AI extraction prompts SHALL achieve 99%+ accuracy on item type classification (measured via test suite)
- **NFR6:** All new features SHALL maintain existing JWT auth and role-based access patterns
- **NFR7:** Frontend bundle size increase SHALL not exceed 15% over V1 baseline
- **NFR8:** All new API endpoints SHALL follow existing FastAPI patterns (Pydantic models, SQLAlchemy ORM)

### Compatibility Requirements

- **CR1: Existing API Compatibility** — All V1 API endpoints SHALL continue to function. New endpoints extend, not replace. The `/api/projects/{id}/decisions` endpoint SHALL return Project Items with backward-compatible field names.
- **CR2: Database Schema Compatibility** — Migration from `decisions` table to `project_items` table SHALL be reversible. All existing data SHALL be migrated with `item_type: 'decision'` and `source_type: 'meeting'`.
- **CR3: UI/UX Consistency** — New components SHALL follow existing atomic design patterns (atoms, molecules, organisms, templates). Tailwind CSS classes, color system, and DisciplineBadge component SHALL be reused and extended.
- **CR4: Integration Compatibility** — Tactiq webhook pipeline SHALL continue to function unchanged. New sources (Gmail, Documents) SHALL follow the same ETL pattern: Source → Raw Storage → AI Extraction → Project Items.

---

## USER INTERFACE ENHANCEMENT GOALS

### Integration with Existing UI

All new UI elements follow the established hybrid atomic + feature-based component architecture:
- **common/** — Shared navigation, project cards
- **molecules/** — Display components (ItemTypeBadge, SourceIcon, StagePill)
- **organisms/** — Complex state components (MilestoneTimeline, IngestionApproval)
- **templates/** — Page layout wrappers

State management continues with **React Query** (server state) + **Zustand** (client state).

### Modified/New Screens and Views

| Screen | Type | Description |
|--------|------|-------------|
| **Project List** (`/projects`) | Modified | Add "Create Project" button, show current stage badge |
| **Project Create/Edit** (`/projects/new`, `/projects/:id/edit`) | New | Project CRUD form with stage schedule builder |
| **Project Detail** (`/projects/:id`) | Modified | Add tab/toggle: "Milestone Timeline" \| "Project History". Add source/item type filters |
| **Milestone Timeline** (tab within Project Detail) | New | Gantt-style stage bar + milestone items plotted chronologically |
| **Project History** (tab within Project Detail) | Modified | Renamed from Timeline. Enhanced with item types, source icons, meeting summaries, multi-discipline badges |
| **Ingestion Approval** (`/ingestion`) | New | Table of pending source materials with approve/reject controls |
| **Manual Input** (`/projects/:id/items/new`) | New | Form for manually creating project items |

### UI Consistency Requirements
- All new badges (ItemTypeBadge, SourceIcon) SHALL use the existing color system pattern from `src/lib/utils.ts`
- Milestone Timeline SHALL use Tailwind's existing spacing and typography scales
- New modals and forms SHALL reuse `DrilldownModal` patterns (Radix Dialog)
- Stage schedule builder SHALL use native date inputs styled with Tailwind (no new date picker dependency unless justified by @architect)

---

## TECHNICAL CONSTRAINTS & INTEGRATION

### Existing Technology Stack

| Layer | Technology | Version | Constraint |
|-------|-----------|---------|------------|
| **Frontend** | React + Vite + TypeScript + Tailwind | React 18, Vite 5 | Maintain bundle size |
| **Backend** | FastAPI + SQLAlchemy | Python 3.11+ | Use `python3` on this machine |
| **Database** | PostgreSQL + pgvector | PG 15+ | Migrate existing `decisions` table |
| **Auth** | JWT (HTTP-only cookies) | Custom | Extend roles for admin actions |
| **State** | Zustand + React Query | Latest | Add new stores for milestones, ingestion |
| **Vector** | sentence-transformers (all-MiniLM-L6-v2) | 384-dim | Re-embed migrated items |
| **LLM** | Claude 3.5 Sonnet (extraction) | API | Adapt prompts for 5 item types |

### Integration Approach

**Database Integration Strategy:**
- Rename `decisions` table → `project_items` with migration script
- Add columns: `item_type`, `source_type`, `is_milestone`, `disciplines` (JSON array), `owner`, `due_date`, `item_status`
- Preserve all existing data with defaults: `item_type='decision'`, `source_type='meeting'`, `is_milestone=false`
- Add `project_stages` table for stage schedule
- Add `ingestion_queue` table for approval workflow
- Add `sources` table for email/document metadata

**API Integration Strategy:**
- New endpoints extend existing router structure in `app/api/routes/`
- Create `project_items.py` router (replaces `decisions.py` over time)
- Create `ingestion.py` router for approval workflow
- Create `stages.py` router for project stage management
- Existing `/decisions` endpoint wraps new `/project-items` for backward compatibility

**Frontend Integration Strategy:**
- Rename `types/decision.ts` → `types/projectItem.ts`
- Update React Query hooks: `useDecisions` → `useProjectItems`
- New Zustand stores: `milestoneStore.ts`, `ingestionStore.ts`
- New components follow atomic design placement rules

**Testing Integration Strategy:**
- All new components get Vitest + RTL tests in `src/tests/`
- Backend routes get pytest test files
- AI extraction accuracy tested via curated test transcripts
- Migration script tested against snapshot of production data

### Code Organization and Standards

**File Structure:** Follows existing conventions — see CLAUDE.md naming conventions
**Naming:** Frontend PascalCase components, camelCase hooks/stores, snake_case backend
**New directories:**
```
decision-log-frontend/src/
├── components/
│   ├── atoms/
│   │   ├── ItemTypeBadge.tsx          (NEW)
│   │   └── SourceIcon.tsx             (NEW)
│   ├── molecules/
│   │   ├── MilestoneCard.tsx          (NEW)
│   │   ├── MeetingSummary.tsx         (NEW)
│   │   ├── StageBar.tsx              (NEW)
│   │   └── IngestionRow.tsx           (NEW)
│   ├── organisms/
│   │   ├── MilestoneTimeline.tsx      (NEW)
│   │   ├── IngestionApproval.tsx      (NEW)
│   │   ├── ProjectForm.tsx            (NEW)
│   │   └── StageScheduleBuilder.tsx   (NEW)

decision-log-backend/app/
├── api/routes/
│   ├── project_items.py               (NEW)
│   ├── ingestion.py                   (NEW)
│   └── stages.py                      (NEW)
├── services/
│   ├── item_extractor.py              (NEW — replaces decision extraction)
│   ├── gmail_poller.py                (NEW)
│   └── document_processor.py          (NEW — Phase 2)
├── database/
│   └── migrations/
│       ├── 001_decisions_to_project_items.py  (NEW)
│       └── 002_add_ingestion_stages.py        (NEW)
```

### Risk Assessment

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Data migration corrupts existing decisions | High | Low | Reversible migration + pre-migration backup |
| Gmail API rate limiting blocks email ingestion | Medium | Medium | Configurable polling frequency, exponential backoff |
| AI item type classification accuracy <90% | High | Medium | Curated test suite, prompt iteration, human review in Ingestion Approval |
| Bundle size bloat from new components | Low | Medium | Code-split Milestone/Ingestion views, lazy load |
| Stage schedule complexity for users | Medium | Low | Predefined templates, simple date-range UI |

---

## DATA MODEL EVOLUTION

### Core Entity: Project Item (replaces Decision)

```
ProjectItem {
  id: UUID (PK)
  project_id: UUID (FK → Project)

  // Core content
  statement: string              // The item's main content (was decision_statement)
  who: string                    // Who raised/decided/assigned
  timestamp: datetime            // When it occurred

  // Classification
  item_type: enum('idea', 'topic', 'decision', 'action_item', 'information')
  source_type: enum('meeting', 'email', 'document', 'manual_input')
  disciplines: string[]          // All disciplines involved (replaces single discipline)
  is_milestone: boolean          // Appears on Milestone Timeline

  // Context
  why: string?                   // Reasoning/rationale
  causation: string?             // What caused this item
  impacts: json?                 // Downstream effects
  consensus: json?               // Agreement tracking

  // Action Item specific
  owner: string?                 // Assigned person (action_items)
  due_date: date?                // Expected completion
  item_status: enum('draft', 'active', 'resolved', 'archived')

  // Source reference
  source_id: UUID? (FK → Source)  // Link to original source material
  transcript_excerpt: string?     // Relevant excerpt from source

  // Agent enrichment (preserved from V1)
  confidence: float?
  similar_items: json?
  consistency_notes: string?
  anomaly_flags: json?
  embedding: vector(384)

  // Lifecycle
  promoted_from_id: UUID? (FK → self)  // Link to predecessor item
  created_at: datetime
  updated_at: datetime
  created_by: UUID? (FK → User)
}
```

### Source (New Entity)

```
Source {
  id: UUID (PK)
  project_id: UUID (FK → Project)
  source_type: enum('meeting', 'email', 'document', 'manual_input')

  // Common fields
  title: string                  // Meeting title, email subject, doc name
  occurred_at: datetime          // When source was created
  ingestion_status: enum('pending', 'approved', 'rejected', 'processed')
  ai_summary: string?            // One-line AI summary
  approved_by: UUID? (FK → User)
  approved_at: datetime?

  // Meeting-specific (preserved from Transcript model)
  meeting_type: string?
  participants: json?
  duration_minutes: int?
  transcript_text: text?
  webhook_id: string? (UNIQUE)   // Idempotency key

  // Email-specific
  email_from: string?
  email_to: json?                // Array of recipients
  email_cc: json?
  email_thread_id: string?
  email_body: text?

  // Document-specific (Phase 2)
  file_url: string?
  file_type: string?             // pdf, docx
  file_size: int?
  drive_folder_id: string?

  created_at: datetime
  updated_at: datetime
}
```

### ProjectStage (New Entity)

```
ProjectStage {
  id: UUID (PK)
  project_id: UUID (FK → Project)
  stage_name: string             // e.g., "Briefing", "Estudo Preliminar"
  stage_from: date
  stage_to: date
  sort_order: int                // Sequential ordering
  is_current: boolean            // Pointer to active stage
  created_at: datetime
  updated_at: datetime
}
```

### Project (Extended)

```
Project {
  // Existing fields preserved...

  // New fields
  project_type: string?          // For stage template selection
  description: text?
  actual_stage_id: UUID? (FK → ProjectStage)  // Current active stage
}
```

### StageTemplate (New Entity)

```
StageTemplate {
  id: UUID (PK)
  project_type: string           // e.g., "architecture_full", "architecture_legal"
  template_name: string
  stages: json                   // Array of {stage_name, default_duration_days}
  created_at: datetime
}
```

### Migration Strategy

```sql
-- Phase 1: Rename and extend
ALTER TABLE decisions RENAME TO project_items;
ALTER TABLE project_items ADD COLUMN item_type VARCHAR DEFAULT 'decision';
ALTER TABLE project_items ADD COLUMN source_type VARCHAR DEFAULT 'meeting';
ALTER TABLE project_items ADD COLUMN is_milestone BOOLEAN DEFAULT false;
ALTER TABLE project_items ADD COLUMN disciplines JSONB DEFAULT '[]';
ALTER TABLE project_items ADD COLUMN owner VARCHAR;
ALTER TABLE project_items ADD COLUMN due_date DATE;
ALTER TABLE project_items ADD COLUMN item_status VARCHAR DEFAULT 'active';
ALTER TABLE project_items ADD COLUMN source_id UUID;
ALTER TABLE project_items ADD COLUMN promoted_from_id UUID;

-- Phase 2: Migrate data
UPDATE project_items SET disciplines = jsonb_build_array(discipline) WHERE discipline IS NOT NULL;

-- Phase 3: Create new tables
CREATE TABLE sources (...);
CREATE TABLE project_stages (...);
CREATE TABLE stage_templates (...);

-- Phase 4: Link existing data
INSERT INTO sources (id, project_id, source_type, title, ...)
  SELECT gen_random_uuid(), project_id, 'meeting', meeting_title, ...
  FROM transcripts;
UPDATE project_items SET source_id = ... -- link to corresponding source
```

---

## API SPECIFICATION

### New Endpoints

**Project Items**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/{id}/items` | List project items (replaces `/decisions`) with filters |
| GET | `/api/projects/{id}/items/{item_id}` | Get single project item detail |
| POST | `/api/projects/{id}/items` | Create manual input item |
| PATCH | `/api/projects/{id}/items/{item_id}` | Update item (type promotion, milestone flag) |
| GET | `/api/projects/{id}/milestones` | List milestone items only |

**Query Parameters for `/items`:**
```
?item_type=decision,topic         # Filter by item type(s)
&source_type=meeting,email        # Filter by source type(s)
&discipline=structural,mep        # Filter by discipline(s)
&is_milestone=true                # Only milestones
&date_from=2026-01-01             # Date range
&date_to=2026-02-16
&search=concrete                  # Full-text search
&sort_by=timestamp                # Sort field
&sort_order=desc                  # Sort direction
&limit=50&offset=0                # Pagination
```

**Ingestion**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/ingestion` | List pending source materials |
| PATCH | `/api/ingestion/{source_id}` | Approve/reject source material |
| POST | `/api/ingestion/batch` | Batch approve/reject multiple |

**Project Stages**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/{id}/stages` | List project stages |
| POST | `/api/projects/{id}/stages` | Set stage schedule |
| PATCH | `/api/projects/{id}/stages/{stage_id}` | Update a stage |
| GET | `/api/stage-templates` | List available stage templates |

**Project CRUD (Extended)**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects` | Create project with stages |
| PATCH | `/api/projects/{id}` | Update project details |
| DELETE | `/api/projects/{id}` | Archive project |

**Backward Compatibility**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/{id}/decisions` | **Preserved** — proxies to `/items?item_type=decision` |

---

## EPIC & STORY STRUCTURE

### Epic Approach

**Multi-epic structure** with 6 epics (E5-E10), continuing from V1's E1-E4. Rationale: each epic addresses a distinct domain with different technical concerns, can be developed by different team members, and delivers independent value. The dependency chain is clear and sequential.

### Dependency Graph

```
E5 (Data Model) ──────────────────┐
                                   ├──→ E8 (Milestone Timeline)
E6 (Project CRUD) ────────────────┘

E5 (Data Model) ──────────────────→ E9 (Project History Enhancement)

E7 (Ingestion Pipeline) ──────────→ E10 (Email & Document Integration)
     ↑
E5 (Data Model)
```

### Delivery Order
1. **E5** — Data Model Evolution (foundation, everything depends on this)
2. **E6** — Project Management Foundation (needed for stage schedule)
3. **E7** — Multi-Source Ingestion Pipeline (meetings first)
4. **E8** — Milestone Timeline (highest client value)
5. **E9** — Project History Enhancement (existing view upgrades)
6. **E10** — Email & Document Integration (Phase 2)

---

### Epic 5: Data Model Evolution & Project Item Taxonomy

**Epic ID:** E5
**Priority:** CRITICAL (Foundation for all V2 features)
**Owner:** @dev (Backend + Frontend)
**Depends on:** None (V1 complete)
**Blocks:** E6, E7, E8, E9

**Epic Goal:** Evolve the data model from "Decision-only" to "Project Item" with 5 types, multi-discipline support, milestone flagging, and multi-source tracking. This is the foundational migration that enables all V2 features.

**Integration Requirements:** All existing V1 data must be preserved. Existing API endpoints must continue to work during transition.

#### Story 5.1: Database Migration — Decision to Project Item

As an **admin**,
I want the database schema to support the new Project Item model,
so that all V2 features can be built on a solid foundation.

**Acceptance Criteria:**
1. `decisions` table renamed to `project_items` with all new columns added
2. All existing decision data preserved with defaults: `item_type='decision'`, `source_type='meeting'`, `is_milestone=false`
3. `disciplines` JSON array populated from single `discipline` field
4. `sources` table created with meeting-specific fields
5. Existing transcript data linked to new `sources` table
6. Migration is reversible (down migration script provided)
7. All existing V1 tests still pass after migration

**Integration Verification:**
- IV1: Existing `/api/projects/{id}/decisions` endpoint returns same data post-migration
- IV2: Existing frontend renders correctly with migrated data
- IV3: Vector search continues to function with migrated embeddings

#### Story 5.2: Backend API — Project Items CRUD

As a **developer**,
I want new API endpoints for Project Items,
so that the frontend can work with the new data model.

**Acceptance Criteria:**
1. `GET /api/projects/{id}/items` with full filter support (item_type, source_type, discipline, date range, search, milestone)
2. `GET /api/projects/{id}/items/{item_id}` returns full item detail
3. `POST /api/projects/{id}/items` creates manual input items
4. `PATCH /api/projects/{id}/items/{item_id}` supports: milestone toggle, type promotion, status change
5. `GET /api/projects/{id}/milestones` returns milestone-only items
6. Backward-compatible `/decisions` endpoint proxies to new `/items?item_type=decision`
7. Pydantic models for ProjectItem request/response
8. All endpoints respect existing JWT auth and role-based access

**Integration Verification:**
- IV1: Existing frontend works unchanged against backward-compatible endpoint
- IV2: New filter parameters return correct subsets

#### Story 5.3: Frontend Types & Hooks Migration

As a **frontend developer**,
I want updated TypeScript types and React Query hooks,
so that the frontend codebase reflects the new Project Item model.

**Acceptance Criteria:**
1. `types/decision.ts` renamed to `types/projectItem.ts` with new `ProjectItem` interface
2. `ItemType` and `SourceType` enums defined
3. `useDecisions` hook renamed to `useProjectItems` with new filter parameters
4. `useProjectItems` supports: item_type[], source_type[], is_milestone filters
5. `useMilestones` hook created for Milestone Timeline
6. Filter store (`filterStore.ts`) updated with new filter dimensions (item_type, source_type)
7. All existing component imports updated (no broken references)

**Integration Verification:**
- IV1: Existing views render correctly after type migration
- IV2: TypeScript compilation passes with zero errors
- IV3: All existing tests pass with updated imports

#### Story 5.4: AI Extraction Prompt Evolution

As a **product owner**,
I want the LLM extraction pipeline to classify items into 5 types,
so that meetings produce all valuable project items, not just decisions.

**Acceptance Criteria:**
1. Extraction prompt updated to identify all 5 item types from meeting transcripts
2. Each extracted item includes: `item_type`, `statement`, `who`, `timestamp`, `disciplines[]`, `context`
3. Action items include `owner` and `due_date` when mentioned
4. Prompt achieves 90%+ accuracy on item type classification (tested against 10 curated transcripts)
5. Extraction pipeline updated to store results as `project_items` (not `decisions`)
6. Agent enrichment pipeline adapted for all item types (not just decisions)

**Integration Verification:**
- IV1: Re-processing an existing transcript produces same decisions plus new item types
- IV2: Vector embeddings generated for all item types
- IV3: Semantic search returns results across all item types

#### Story 5.5: Seed Data & Test Suite Update

As a **developer**,
I want updated seed data and tests reflecting the new item taxonomy,
so that development and testing use realistic multi-type data.

**Acceptance Criteria:**
1. Seed data updated with items of all 5 types across multiple sources
2. At least 3 items marked as milestones in seed data
3. Seed data includes `disciplines[]` arrays (not single discipline)
4. All existing tests updated to use new model names and types
5. New test cases cover: item type filtering, milestone toggle, type promotion
6. `npm run frontend:test` and `npm run frontend:lint` pass

---

### Epic 6: Project Management Foundation

**Epic ID:** E6
**Priority:** HIGH
**Owner:** @dev (Full-stack)
**Depends on:** E5 (Data Model)
**Blocks:** E8 (Milestone Timeline needs stage schedule)

**Epic Goal:** Enable full project lifecycle management with creation, stage scheduling, and predefined templates per project type.

#### Story 6.1: Backend — Project CRUD & Stage Schedule

As an **admin**,
I want to create and manage projects with stage schedules,
so that every project has a defined lifecycle with dates.

**Acceptance Criteria:**
1. `POST /api/projects` accepts: title, description, project_type, stages[]
2. `PATCH /api/projects/{id}` updates project details and stage schedule
3. `project_stages` table stores ordered stages with date ranges
4. Stage date validation: no overlapping dates, stage_from < stage_to, sequential ordering
5. `actual_stage_id` updated via `PATCH /api/projects/{id}` to point to current stage
6. `GET /api/stage-templates` returns predefined templates
7. `stage_templates` table seeded with at least 2 templates (Architecture Full, Architecture Legal)

**Integration Verification:**
- IV1: Existing project listing still works
- IV2: Projects without stages (V1 data) display correctly

#### Story 6.2: Frontend — Project Create/Edit Form

As **Gabriela**,
I want a form to create new projects with stage schedules,
so that I can set up a project's lifecycle before the first meeting.

**Acceptance Criteria:**
1. `/projects/new` route renders `ProjectForm` component
2. Form fields: title (required), description (textarea), project_type (select)
3. Stage schedule builder: add/remove rows, each with stage_name, date_from, date_to
4. "Load Template" button populates stage schedule from predefined template
5. Date validation: no overlaps, sequential dates
6. Current stage selector (dropdown from defined stages)
7. Form submission creates project via API and redirects to project detail
8. `/projects/:id/edit` route reuses same form for editing

**Integration Verification:**
- IV1: Existing project list page shows both V1 and V2 projects
- IV2: Navigation from project list to create/edit works correctly

#### Story 6.3: Frontend — Project List Enhancement

As a **user**,
I want the project list to show each project's current stage,
so that I can see project status at a glance.

**Acceptance Criteria:**
1. `ProjectCard` component shows current stage name as a badge
2. "Create Project" button added to Projects page header
3. Project cards show project_type label
4. Sort projects by: name, created_at, current stage
5. Empty state for new users: "Create your first project"

**Integration Verification:**
- IV1: Existing projects (without stages) show "No stages defined"
- IV2: Navigation flow: Projects list → Create → Detail works end-to-end

---

### Epic 7: Multi-Source Ingestion Pipeline

**Epic ID:** E7
**Priority:** HIGH
**Owner:** @dev (Backend) + @dev (Frontend)
**Depends on:** E5 (Data Model)
**Blocks:** E10 (Email & Doc sources use this pipeline)

**Epic Goal:** Build the ingestion approval workflow and extend the capture pipeline beyond meetings to support manual input and prepare for email/document sources.

#### Story 7.1: Backend — Source Entity & Ingestion Queue

As a **developer**,
I want a Source entity and ingestion queue,
so that all incoming materials go through an approval workflow before processing.

**Acceptance Criteria:**
1. `sources` table created with all fields from Data Model section
2. `ingestion_status` enum: pending, approved, rejected, processed
3. Existing Tactiq webhook updated to create a `Source` record (status: pending) instead of direct processing
4. `GET /api/ingestion` returns pending sources with pagination and filters
5. `PATCH /api/ingestion/{source_id}` updates status (approve/reject) — admin only
6. `POST /api/ingestion/batch` batch approve/reject — admin only
7. When source approved → triggers existing ETL pipeline (extraction + enrichment)
8. AI one-line summary generated for each pending source

**Integration Verification:**
- IV1: Tactiq webhooks still received successfully
- IV2: Approved meetings produce same items as V1 direct processing

#### Story 7.2: Frontend — Ingestion Approval Page

As **Gabriela**,
I want to review incoming source materials and decide what gets processed,
so that only relevant meetings enter the system.

**Acceptance Criteria:**
1. `/ingestion` route renders `IngestionApproval` organism
2. Table displays: Source ID, Project, Date/Time, Type, Source, Include toggle, AI Summary, Link to original
3. Bulk actions: "Approve Selected", "Reject Selected"
4. Filters: by project, by source type, by date range
5. Status indicators: pending (yellow), approved (green), rejected (red), processed (blue)
6. Only admin users can access this page (role check)
7. Real-time count badge in navigation showing pending items

**Integration Verification:**
- IV1: Navigation component shows "Ingestion" link for admin users only
- IV2: Approved items appear in Project History after processing

#### Story 7.3: Manual Input — Create Project Item Form

As a **team member**,
I want to manually create a project item,
so that information from informal conversations or external sources is captured.

**Acceptance Criteria:**
1. `/projects/:id/items/new` route renders item creation form
2. Form fields: statement (required), item_type (select), disciplines[] (multi-select), who, date, context/notes
3. Action item fields (conditional): owner, due_date
4. Source type auto-set to `manual_input`
5. Item saved via `POST /api/projects/{id}/items`
6. Item embedded (vector embedding) on creation
7. Manual items bypass ingestion approval — directly created as `active`
8. Success redirects to Project History with new item highlighted

**Integration Verification:**
- IV1: Manually created items appear in Project History
- IV2: Manually created items searchable via semantic search
- IV3: Manual items display `manual_input` source icon

#### Story 7.4: Backend — Gmail API Poller (Email Ingestion)

As the **system**,
I want to periodically poll Gmail for project-related emails,
so that email-based project information is captured.

**Acceptance Criteria:**
1. Gmail API OAuth2 authentication setup (service account or user consent)
2. Configurable polling frequency (default: every 30 minutes)
3. Email matching: by project-specific email labels or folder rules
4. For each new email: create `Source` record with `source_type='email'`, status `pending`
5. Extract and store: subject, from, to, cc, body text, thread_id, date
6. AI one-line summary generated from email body
7. Deduplification by `email_thread_id` + message ID
8. Rate limiting: respect Gmail API quotas with exponential backoff
9. Background job runs via scheduled task (cron or APScheduler)

**Integration Verification:**
- IV1: Polled emails appear in Ingestion Approval page
- IV2: Approved emails trigger item extraction pipeline
- IV3: Email-sourced items display correctly in Project History

---

### Epic 8: Milestone Timeline

**Epic ID:** E8
**Priority:** HIGH (Highest client value)
**Owner:** @dev (Frontend focus) + @ux-design-expert
**Depends on:** E5 (item types + milestone flag), E6 (stage schedule)

**Epic Goal:** Deliver the Milestone Timeline view — Gabriela's "60-second project understanding" tool with Gantt-style stage backdrop and curated milestone items.

#### Story 8.1: Frontend — Milestone Timeline Component

As **Gabriela**,
I want a Milestone Timeline view that shows only the most important project items on a stage schedule,
so that I understand the project's current state in under 60 seconds.

**Acceptance Criteria:**
1. `MilestoneTimeline` organism component renders within Project Detail page
2. Gantt-style horizontal stage bar at top showing all project stages with date ranges
3. Current stage visually highlighted (color accent + "Current" label)
4. "You are here" marker on the current date within the stage bar
5. Below stage bar: chronological list of milestone items
6. Each milestone shows: item_type badge, statement, source icon, date, discipline badges
7. Items positioned relative to stage bar timeline (visual alignment with stages)
8. Empty state: "No milestones yet. Mark important items as milestones from the Project History."
9. Elegant, minimalist design (per client request)

**Integration Verification:**
- IV1: Stage bar renders correctly from project stage schedule data
- IV2: Milestone items filtered correctly (only `is_milestone: true`)
- IV3: Page loads in <2 seconds with up to 50 milestones

#### Story 8.2: Frontend — Milestone Flag Toggle

As **Gabriela**,
I want to mark/unmark items as milestones from any view,
so that I can curate the Milestone Timeline as the project evolves.

**Acceptance Criteria:**
1. Milestone toggle button (star/flag icon) on each item in Project History view
2. Milestone toggle available in Drill-Down Modal
3. Milestone toggle available on Milestone Timeline items (to unmark)
4. Toggle calls `PATCH /api/projects/{id}/items/{item_id}` with `is_milestone` update
5. Optimistic UI update (instant toggle, rollback on error)
6. Only admin users see the milestone toggle
7. Visual feedback: starred/flagged items show filled icon

**Integration Verification:**
- IV1: Toggling milestone in Project History immediately shows/hides item in Milestone Timeline
- IV2: Non-admin users cannot see or interact with milestone toggle
- IV3: Milestone count updates in UI after toggle

#### Story 8.3: Frontend — Milestone Timeline Filters

As **Gabriela**,
I want to filter the Milestone Timeline by source and item type,
so that I can focus on specific aspects of the project.

**Acceptance Criteria:**
1. Filter bar on Milestone Timeline with: source type chips, item type chips
2. Source filters: Meeting, Email, Document, Manual Input (with icons)
3. Item type filters: Idea, Topic, Decision, Action Item, Information (with colored badges)
4. Filters are combinable (AND logic)
5. Active filter count shown on filter bar
6. "Clear filters" button resets to show all milestones
7. Filter state persisted in URL params (shareable links)

**Integration Verification:**
- IV1: Filtering reduces visible milestones correctly
- IV2: URL with filter params loads correct filter state

---

### Epic 9: Project History Enhancement

**Epic ID:** E9
**Priority:** MEDIUM
**Owner:** @dev (Frontend) + @ux-design-expert
**Depends on:** E5 (item types, multi-discipline)

**Epic Goal:** Evolve the existing Timeline into "Project History" with improved visual hierarchy, item type differentiation, source icons, meeting summaries, and advanced filtering.

#### Story 9.1: Component Evolution — Item Type Badges & Source Icons

As a **user**,
I want each project item to show its type and source visually,
so that I can quickly scan what kind of information I'm looking at.

**Acceptance Criteria:**
1. `ItemTypeBadge` atom: colored pill with icon per type (Decision=green/CheckCircle2, Topic=amber/MessageCircle, Action Item=blue/Target, Idea=purple/Lightbulb, Information=slate/Info)
2. `SourceIcon` atom: icon per source (Meeting=Video, Email=Mail, Document=FileText, Manual=PenLine)
3. Badges integrated into `DecisionCard` (now `ProjectItemCard`) and `DecisionRow` (now `ProjectItemRow`)
4. Color system added to `src/lib/utils.ts` following existing pattern
5. Tests for both new atoms

**Integration Verification:**
- IV1: All 5 item types render distinct badges
- IV2: All 4 source types render distinct icons
- IV3: Existing decision items show "decision" badge + "meeting" source icon

#### Story 9.2: Typography Hierarchy & Visual Layer Separation

As a **user**,
I want the Project History to clearly differentiate dates, meetings, and items,
so that I never confuse which layer I'm looking at.

**Acceptance Criteria:**
1. Date headers: `text-2xl font-bold text-slate-900` with background strip
2. Meeting/Source groups: `text-lg font-semibold text-slate-800` with card container and `border-l-4` colored accent
3. Item cards: `text-base font-medium text-gray-900` within meeting container
4. Visual nesting: Date → indented Meeting card → indented Item cards
5. At least 3 distinct visual cues per layer (font size, background, border)

**Integration Verification:**
- IV1: Users can visually distinguish all 3 layers without reading content
- IV2: Responsive design maintains hierarchy on mobile

#### Story 9.3: Multi-Discipline Badges

As a **user**,
I want to see all disciplines involved in a project item,
so that I understand which disciplines agreed on a decision or are affected.

**Acceptance Criteria:**
1. `DisciplineBadge` updated to accept `disciplines[]` array
2. Renders multiple colored pills for each discipline
3. Truncation: shows first 3 + "+N more" for items with many disciplines
4. Full list visible in Drill-Down Modal
5. Discipline filter works with multi-discipline items (item shown if ANY discipline matches)

**Integration Verification:**
- IV1: Migrated V1 items show single discipline (from array of 1)
- IV2: New multi-discipline items show all badges

#### Story 9.4: Meeting Summary & Advanced Filters

As a **user**,
I want expandable meeting summaries and filters by source/item type,
so that I can understand meetings quickly and find specific types of information.

**Acceptance Criteria:**
1. `MeetingSummary` molecule: expandable section within Meeting group showing AI summary
2. Collapsed by default, expand on click, animated transition
3. Filter bar updated with: source type toggles, item type toggles (in addition to existing discipline/date/search)
4. Filters combinable with AND logic
5. Filter state persisted in Zustand store + URL params
6. Item count badges on each filter option

**Integration Verification:**
- IV1: Meeting summaries display when available, hidden when not
- IV2: All filters work correctly in combination
- IV3: URL-based filter state enables shareable links

#### Story 9.5: Rename & Navigation Update

As a **user**,
I want the Timeline renamed to "Project History" with updated navigation,
so that the naming reflects its purpose.

**Acceptance Criteria:**
1. "Timeline" label replaced with "Project History" across all UI
2. Project Detail page shows tab toggle: "Milestone Timeline" | "Project History"
3. Default view is Milestone Timeline (if stages exist), else Project History
4. Tab state persisted in URL hash
5. Navigation breadcrumb updated

**Integration Verification:**
- IV1: No references to "Timeline" remain in visible UI (except code internals)
- IV2: Deep linking to each tab works correctly

---

### Epic 10: Email & Document Integration (Phase 2)

**Epic ID:** E10
**Priority:** LOW (Phase 2 — after core V2 launch)
**Owner:** @dev (Backend)
**Depends on:** E7 (Ingestion Pipeline)

**Epic Goal:** Extend the ingestion pipeline to process emails and documents as sources of project items.

#### Story 10.1: Email Item Extraction Pipeline

As the **system**,
I want to extract project items from approved emails,
so that email-based decisions and action items are captured.

**Acceptance Criteria:**
1. AI extraction prompt adapted for email content (different structure than meeting transcripts)
2. Extract all 5 item types from email body
3. Handle email threads (avoid duplicate extraction from quoted replies)
4. Source reference links to email thread
5. Extracted items stored with `source_type='email'`
6. 85%+ extraction accuracy on test email corpus

#### Story 10.2: Document Ingestion (PDF & DOCX)

As **Gabriela**,
I want to upload project documents and extract relevant items,
so that decisions recorded in meeting minutes, specs, or reports are captured.

**Acceptance Criteria:**
1. File upload endpoint: `POST /api/projects/{id}/documents`
2. Support PDF and DOCX parsing (text extraction)
3. Uploaded document creates `Source` record with `source_type='document'`
4. Document appears in Ingestion Approval for review
5. Approved documents processed through AI extraction pipeline
6. Extracted items stored with `source_type='document'`

#### Story 10.3: Google Drive Folder Monitoring

As **Gabriela**,
I want the system to monitor specific Google Drive folders for new documents,
so that project documents are automatically discovered.

**Acceptance Criteria:**
1. Google Drive API integration (OAuth2)
2. Configurable folder IDs per project
3. Polling for new files (configurable frequency)
4. New files auto-create `Source` records (status: pending)
5. Support PDF and DOCX file types
6. Deduplication by Drive file ID

---

## PRIORITIZATION & PHASING

### Phase 1: Foundation (Epics 5 + 6) — Weeks 1-3

| Week | Epic | Stories | Deliverable |
|------|------|---------|-------------|
| 1 | E5 | 5.1, 5.2 | Database migrated, new API endpoints live |
| 2 | E5 | 5.3, 5.4, 5.5 | Frontend types migrated, AI prompts updated |
| 3 | E6 | 6.1, 6.2, 6.3 | Project CRUD with stage schedule working |

**Phase 1 Gate:** All existing V1 features work with new data model. Projects can be created with stage schedules.

### Phase 2: Core V2 Features (Epics 7 + 8) — Weeks 4-6

| Week | Epic | Stories | Deliverable |
|------|------|---------|-------------|
| 4 | E7 | 7.1, 7.2 | Ingestion approval page, meeting approval flow |
| 5 | E7, E8 | 7.3, 8.1 | Manual input, Milestone Timeline component |
| 6 | E8 | 8.2, 8.3 | Milestone flagging, milestone filters |

**Phase 2 Gate:** Gabriela can: approve meetings, create manual items, view Milestone Timeline with stage bar, flag milestones.

### Phase 3: Enhancement (Epic 9) — Weeks 7-8

| Week | Epic | Stories | Deliverable |
|------|------|---------|-------------|
| 7 | E9 | 9.1, 9.2, 9.3 | Item type badges, typography, multi-discipline |
| 8 | E9 | 9.4, 9.5 | Meeting summaries, advanced filters, rename |

**Phase 3 Gate:** Project History fully enhanced with all V2 visual improvements.

### Phase 4: Email Integration (Epics 7.4 + 10) — Weeks 9-12

| Week | Epic | Stories | Deliverable |
|------|------|---------|-------------|
| 9-10 | E7 | 7.4 | Gmail API poller running, emails in ingestion queue |
| 11-12 | E10 | 10.1, 10.2, 10.3 | Email extraction, document upload, Drive monitoring |

**Phase 4 Gate:** Full multi-source platform operational.

---

## SUCCESS METRICS

### Primary KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to understand project status | <60 seconds | Gabriela times herself using Milestone Timeline |
| Item capture rate (all types) | 95%+ of meeting content | Compare extracted items vs manual meeting review |
| Item type classification accuracy | 90%+ | Test against curated transcript corpus |
| Ingestion approval throughput | <5 min for 20 sources | Admin workflow timing |
| Project creation time | <3 min | Form completion timing |

### Secondary KPIs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Milestones per project (avg) | 5-15 | Database query |
| Source diversity | 2+ source types per project | After Phase 4 |
| Filter usage rate | 60%+ of sessions use filters | Analytics |
| Manual input adoption | 5+ manual items/month/project | Database query |

---

## RISKS & MITIGATIONS

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| R1 | Data migration corrupts V1 decisions | Critical | Pre-migration backup, reversible migration script, staging test |
| R2 | AI item type classification <90% accuracy | High | Curated test suite, iterative prompt refinement, Ingestion Approval as human check |
| R3 | Gmail API rate limiting | Medium | Configurable poll frequency, exponential backoff, quota monitoring |
| R4 | Stage schedule UX too complex | Medium | Predefined templates, progressive disclosure, UX testing with Gabriela |
| R5 | Bundle size bloat | Low | Code splitting, lazy loading for Ingestion/Milestone routes |
| R6 | Scope creep across 6 epics | High | Phase gates, each phase delivers independent value, strict story AC |
| R7 | Google Drive API auth complexity | Medium | Phase 2 — defer until core V2 stable |

---

## GLOSSARY

| Term | Definition |
|------|-----------|
| **Project Item** | The core entity — any valuable piece of information captured from a source. Replaces "Decision" as the primary domain concept. Has one of 5 types. |
| **Item Type** | Classification of a project item: `idea`, `topic`, `decision`, `action_item`, `information` |
| **Source** | The origin of project items. One of: `meeting`, `email`, `document`, `manual_input` |
| **Source Type** | The classification of a source's origin channel |
| **Milestone** | A project item flagged as especially important. Appears on the Milestone Timeline. Any item type can be a milestone. |
| **Project History** | The comprehensive, detailed chronological view of all project items (formerly "Timeline") |
| **Milestone Timeline** | The curated, high-level view showing only milestone items plotted against the project stage schedule |
| **Stage Schedule** | A project's lifecycle phases with date ranges (e.g., Briefing → Levantamento → Estudo Preliminar...) |
| **Actual Stage** | The current active stage in the project's stage schedule |
| **Ingestion Approval** | The review workflow where admins approve/reject source materials before AI processing |
| **Item Promotion** | Advancing an item's type in the lifecycle (e.g., idea → topic → decision) |
| **Discipline** | An architecture discipline involved in a project item (Structural, MEP, Architecture, Landscape, Electrical, Interior Design) |

---

## CHANGE LOG

| Change | Date | Version | Description | Author |
|--------|------|---------|-------------|--------|
| Initial draft | 2026-02-16 | 2.0 | Complete brownfield PRD for DecisionLog V2 | Morgan (PM) |

---

*— Morgan, planejando o futuro*
