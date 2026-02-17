# DecisionLog V2: Brownfield Enhancement PRD

**Document Version:** 2.2
**Date Created:** 2026-02-16
**Last Updated:** 2026-02-16
**Status:** Draft — Pending Review (v2.2 with Story 8.1 refinement)
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
- **Milestone Timeline** — A curated view of only the most important project items, overlaid on a Dot Timeline (a vertical line with dots) where large stage dots group and encapsulate milestones (smaller dots) within their date range. Project Stages on the left side, Milestone Items on the right side. Supports read-only shared links and PDF/JPEG export for client/provider communication.
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
- [x] **UX/UI Guidelines** — `docs/ux/UX-UI-GUIDELINES.md` (v1.0, created 2026-02-16 by @ux-design-expert). Covers: color system, typography scale, spacing, component patterns, interaction patterns, accessibility standards, responsive breakpoints, V2 visual patterns (Dot Timeline, Dense Rows, ItemTypeBadge, SourceIcon, DisciplineCircle).
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

### Item Type — Conceptual Relationship

```
idea → topic → decision → action_item[]
                              ↑
information ─────────────────(standalone, no lifecycle progression)
```

**IMPORTANT — Documentative, Not Lifecycle Tracking:**

The diagram above illustrates the *natural progression* of how items relate conceptually — an idea may eventually become a topic in a later meeting, and a topic may eventually be resolved as a decision. However, **the system does NOT track this lifecycle**. Each source (meeting, email, document) independently distills items at their current state. The AI classifies what it sees in that source, and we document it as-is.

- Each source produces independent items — no cross-source linking of "idea X became decision Y"
- If the same concept appears as an `idea` in Meeting A and later as a `decision` in Meeting B, these are two separate items
- The system's job is to **structure and document** source content, not to track item evolution
- Not every item follows the conceptual pattern:
  — a `decision` can be captured directly without starting as an `idea`
  — `action_item[]` can be captured directly without being derived from a `decision`

### Structured Body per Item Type

Each item type has a specific structure that the AI should extract:

| Item Type | Required Fields | Optional Fields |
|-----------|----------------|-----------------|
| **idea** | statement, who (proposed by) | context, related_topic |
| **topic** | statement, who (raised by) | discussion_points, status_note, next_steps |
| **decision** | statement, who (decided by), consensus | why, impacts, causation, affected_disciplines[] |
| **action_item** | statement, owner, is_done | due_date, context |
| **information** | statement, who (reported by) | reference_source, date_of_fact |

### Discipline Inference Guidelines (`affected_disciplines[]`)

How to determine which disciplines to include in `affected_disciplines[]` for each item type:

| Item Type | Inference Rule | Example |
|-----------|---------------|---------|
| **decision** | All disciplines with `AGREE` status in `consensus.disciplines[]`. If consensus is not explicit, infer from participants who voiced agreement. | Decision on structural approach → `[architecture, structural]` if both agreed |
| **topic** | All disciplines actively participating in the discussion (speakers on this topic). | Foundation discussion between structural and MEP → `[Structural, MEP]` |
| **idea** | The discipline of the person who proposed it, plus any disciplines explicitly mentioned as affected. | "What if we changed the MEP routing?" proposed by Architect → `[Architecture, MEP]` |
| **action_item** | The discipline of the `owner`, plus any disciplines the deliverable impacts. | "Carlos (Structural) will update load calcs affecting MEP" → `[Structural, MEP]` |
| **information** | Disciplines explicitly referenced in or impacted by the factual statement. | "City approved the environmental permit" → `[Landscape, Architecture]` |

**Key context:** The system uses `ProjectParticipant` records (name, email, discipline) to help the LLM map speakers → disciplines. This participant roster is sent as context in every extraction prompt.

### Discipline Enum & Color Map

All discipline references in the system use this closed enum. Each discipline has a fixed color for consistent visual representation across all views (badges, circles, timeline nodes, charts).

| Value | Label | Abbreviation | Color (Hex) | Tailwind Family |
|-------|-------|-------------|-------------|-----------------|
| `architecture` | Architecture | Arch | #3B82F6 | blue |
| `structural` | Structural | Struct | #8B5CF6 | purple |
| `mep` | MEP | MEP | #F97316 | orange |
| `electrical` | Electrical | Elec | #F59E0B | amber |
| `plumbing` | Plumbing | Plumb | #06B6D4 | cyan |
| `landscape` | Landscape | Land | #10B981 | green |
| `fire_protection` | Fire Protection | Fire | #EF4444 | red |
| `acoustical` | Acoustical | Acoust | #7C3AED | violet |
| `sustainability` | Sustainability | Sustain | #059669 | emerald |
| `civil` | Civil | Civil | #14B8A6 | teal |
| `client` | Client | Client | #F43F5E | rose |
| `contractor` | Contractor | Contr | #D97706 | amber-dark |
| `tenant` | Tenant | Tenant | #EC4899 | pink |
| `engineer` | Engineer | Eng | #6366F1 | indigo |
| `general` | General | Gen | #6B7280 | gray |

**Source of truth:** This table is the canonical definition for discipline values and colors. The frontend implementation in `src/lib/utils.ts` (`getDisciplineNodeColor`, `getDisciplinePillColors`, `abbreviateDiscipline`) must mirror this table exactly.

**Usage:** `affected_disciplines[]` stores `Discipline` enum values. `ProjectParticipant.discipline` stores a `Discipline` enum value. `consensus.disciplines[].discipline` stores a `Discipline` enum value.

### Why 5 Types (Not 6)

| Original Proposal | Decision | Rationale |
|-------------------|----------|-----------|
| `suggestion` | **Merged into `idea`** | AI cannot reliably distinguish formality levels between "idea" and "suggestion" in transcript text. The distinction is subjective. |
| `task` | **Merged into `action_item`** | The only difference (assigned vs unassigned) is a status attribute (`owner` field), not a type distinction. |
| `open_topic` | **Renamed to `topic`** | "Open" is a status (resolved/unresolved), not a type. Cleaner naming. |
| `information` | **Added** | Fills a real gap. Many valuable outputs are neither decisions nor action items — facts, updates, confirmations, status reports. Without this, they'd be lost. |

### Milestone Flag

Any item of any type can be marked as a **milestone** (`is_milestone: boolean`). Milestones appear on the Milestone Timeline. Only Admin users (Gabriela) can mark/unmark milestones.

### Action Item Completion

Items of type `action_item` can be marked as **done** (`is_done: boolean`, default `false`). This provides a simple done/undone toggle for tracking action item completion. Only Admin users (Gabriela) can toggle `is_done`.

---

## REQUIREMENTS

### Functional Requirements

**Project Item Model (FR1-FR7)**
- **FR1:** The system SHALL support 5 item types: `idea`, `topic`, `decision`, `action_item`, `information`
- **FR2:** Each project item SHALL track: `item_type`, `source_type`, `affected_disciplines[]`, `is_milestone`, `statement`, `who`, `timestamp`, `context`
- **FR3:** Each source (meeting, email, document, manual input) SHALL independently distill items at their current state. The system SHALL NOT track item type promotion or cross-source lifecycle transitions. Each extracted item is a standalone record.
- **FR4:** The `affected_disciplines[]` field SHALL replace the single `discipline` field, supporting multiple disciplines per item. Discipline inference SHALL follow the per-item-type rules defined in the "Discipline Inference Guidelines" section.
- **FR5:** Action items SHALL support `owner` (string) and `is_done` (boolean, default false) fields. Admin users can toggle `is_done`.
- **FR6:** Each item type SHALL follow the structured body defined in "Structured Body per Item Type" — the AI extraction prompt SHALL extract the required and optional fields per type.
- **FR7:** The LLM extraction SHALL receive `ProjectParticipant` records (name, email, discipline) as context to enable accurate discipline inference and speaker-to-discipline mapping.

**Multi-Source Ingestion (FR8-FR14)**
- **FR8:** The system SHALL support 4 source types: `meeting`, `email`, `document`, `manual_input`
- **FR9:** Meeting source SHALL continue using the existing Tactiq/Fathom webhook pipeline
- **FR10:** Email source SHALL integrate with Gmail API via scheduled polling job. Polling frequency SHALL be configurable via environment variable (`GMAIL_POLL_INTERVAL_MINUTES`, default: 30).
- **FR11:** Document source SHALL support PDF and DOCX file processing (Phase 2)
- **FR12:** Manual input source SHALL provide a form with fields: `statement` (required, textarea), `item_type` (required, select from 5 types), `affected_disciplines[]` (required, multi-select), `who` (required, text), `date` (required, date picker), `context/notes` (optional, textarea). For `action_item` type: additionally show `owner` (text) and `due_date` (date picker).
- **FR13:** The system SHALL extract project items (all 5 types) from each source type using adapted AI prompts stored in versioned prompt files.
- **FR14:** Each source SHALL store its raw content (transcript text, email body, document text) for traceability and re-processing. Each extracted item SHALL maintain a link to its originating source.

**Ingestion Approval (FR15-FR20)**
- **FR15:** The system SHALL provide an Ingestion Approval page showing all incoming source materials before ETL processing
- **FR16:** For meetings, the approval page SHALL display: Call ID, Project, Date/Time, Meeting Type, Source, Include toggle, AI one-line summary, Transcript link
- **FR17:** For emails, the approval page SHALL display: Email ID, Project, Date, Subject, From, To/CC count, Include toggle, AI one-line summary, Thread link
- **FR18:** For documents, the approval page SHALL display: Document ID, Project, Upload Date, File Name, File Type, File Size, Include toggle, AI one-line summary, File link
- **FR19:** Admin users SHALL be able to approve/reject individual source materials for processing
- **FR20:** Manual input items SHALL bypass the ingestion approval page and be embedded directly upon creation

**Project CRUD (FR21-FR27)**
- **FR21:** The system SHALL provide a Project creation page with fields: title, description, project_type, actual_project_stage, project_stage_schedule
- **FR22:** The `project_stage_schedule` SHALL support an ordered list of stages with: stage_name, stage_from (date), stage_to (date)
- **FR23:** Stages SHALL NOT overlap in dates
- **FR24:** The system SHALL provide predefined stage templates per project type (e.g., Architecture: Briefing → Levantamento → Estudo Preliminar → Anteprojeto → Projeto Legal → Projeto Executivo → Acompanhamento de Obra)
- **FR25:** The `actual_project_stage` SHALL be a pointer to the current active stage in the schedule
- **FR26:** Users SHALL be able to create, read, update, and archive projects
- **FR27:** The system SHALL support an optional `ProjectParticipant` roster per project, storing: `name`, `email`, `discipline`. This roster is used as LLM context for discipline inference during item extraction.

**Milestone Timeline (FR28-FR34)**
- **FR28:** The system SHALL provide a Milestone Timeline view showing only items marked as `is_milestone: true`
- **FR29:** The Milestone Timeline SHALL use a **Dot Timeline** layout: a vertical line running top-to-bottom with dot nodes at temporal anchor points. **Project Stages** are represented as **large dots** that visually group and encapsulate the milestones within their date range. **Milestone Items** are represented as **smaller dots** on the same line, positioned chronologically within their parent stage's period. **Project Stages** are displayed on the left side, **Milestone Items** on the right side.
- **FR30:** Project Stages SHALL render as **large dots** on the vertical line with stage information on the **left side**: stage name, date range (from → to). Stages act as visual dividers — clearly identifying which milestones belong to each stage period. The current active stage SHALL be visually distinguished (highlighted dot, accent color, "Current" label).
- **FR31:** Milestone Items SHALL render as **smaller dots** on the vertical line, positioned within their parent stage's date range, with content on the **right side**. Each milestone SHALL display: item_type badge, statement, source icon, date, `affected_disciplines[]` badges. Milestones SHALL be visually distinct from stage dots (smaller size, different style).
- **FR32:** The Milestone Timeline SHALL indicate the current date position on the vertical line with a "Today" marker.
- **FR33:** Admin users SHALL be able to mark/unmark items as milestones from any view (Project History, Drill-Down, Milestone Timeline)
- **FR34:** The Milestone Timeline SHALL support filtering by source type and item type

**Milestone Timeline Sharing & Export (FR43-FR44)**
- **FR43:** The Milestone Timeline SHALL support **read-only shared links** — a unique URL that displays the timeline visualization without requiring authentication, enabling client/provider communication
- **FR44:** The Milestone Timeline SHALL support **exporting** the visualization as PDF and JPEG formats for offline sharing and presentations

**Project History Enhancement (FR35-FR42)**
- **FR35:** The existing Timeline SHALL be renamed to "Project History"
- **FR36:** Project History SHALL adopt a **Dense Rows** layout inspired by Linear/Notion — row-based list view with collapsible source groups (meetings as accordions), optimized for information density and scanning 50+ items.
- **FR37:** Project History SHALL display items from all 4 source types with source-specific icons
- **FR38:** The typography hierarchy SHALL differentiate the 3 layers via: Date (UPPERCASE, `text-sm font-bold tracking-wide`, sticky header), Source group (`text-sm font-semibold`, `border-l-2`, accordion), Item row (`font-medium`, single line with icon + text + discipline circles + metadata)
- **FR39:** Meeting sources SHALL display an expandable AI-generated summary (icon button on row hover)
- **FR40:** Items SHALL display item type badges with distinct colors and icons per type (inline, compact for row format)
- **FR41:** Project History SHALL support filtering by: source type, item type, discipline, date range, search query
- **FR42:** The `affected_disciplines[]` SHALL render as single-letter colored circles (`w-6 h-6 rounded-full`), with primary discipline getting a ring indicator

### Non-Functional Requirements

- **NFR1:** Data model migration SHALL preserve all existing V1 decision data without loss
- **NFR2:** The Milestone Timeline SHALL load in <2 seconds for projects with up to 500 items
- **NFR3:** Gmail API polling SHALL handle rate limits gracefully and not exceed Google's quota
- **NFR4:** Ingestion Approval page SHALL handle up to 100 pending items without pagination performance degradation
- **NFR5:** AI extraction prompts SHALL achieve 99%+ accuracy on item type classification (measured via test suite)
- **NFR6:** All new features SHALL maintain existing JWT auth and role-based access patterns
- **NFR7:** Frontend bundle size increase SHALL not exceed 15% over V1 baseline
- **NFR8:** All new API endpoints SHALL follow existing FastAPI patterns (Pydantic models, SQLAlchemy ORM)
- **NFR9:** All raw source content (transcript text, email body, document text) SHALL be stored permanently for traceability and potential re-processing

### Compatibility Requirements

- **CR1: Existing API Compatibility** — All V1 API endpoints SHALL continue to function. New endpoints extend, not replace. The `/api/projects/{id}/decisions` endpoint SHALL return Project Items with backward-compatible field names.
- **CR2: Database Schema Compatibility** — Migration from `decisions` table to `project_items` table SHALL be reversible. All existing data SHALL be migrated with `item_type: 'decision'` and `source_type: 'meeting'`.
- **CR3: UI/UX Consistency** — New components SHALL follow existing atomic design patterns (atoms, molecules, organisms, templates). Tailwind CSS classes, color system, and DisciplineBadge component SHALL be reused and extended.
- **CR4: Integration Compatibility** — Tactiq webhook pipeline SHALL continue to function unchanged. New sources (Gmail, Documents) SHALL follow the same ETL pattern: Source → Raw Storage → AI Extraction → Project Items.

---

## USER INTERFACE ENHANCEMENT GOALS

### Prerequisites

**UX/UI Guidelines Document (Required before V2 development):**
~~A consolidated UX/UI Guidelines document must be created by @ux-design-expert.~~ **COMPLETED** — See `docs/ux/UX-UI-GUIDELINES.md` (v1.0). Covers: color system (disciplines, consensus, impact, item types, source types, meeting types), typography scale, spacing conventions, component architecture (Atomic Design inventory), interaction patterns, animation/motion, iconography, accessibility (WCAG 2.1 AA), responsive breakpoints, V2 visual patterns (Dot Timeline, Dense Rows, DisciplineCircle, ItemTypeBadge, SourceIcon), print/export styles.

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
| **Project Create/Edit** (`/projects/new`, `/projects/:id/edit`) | New | Project CRUD form with stage schedule builder and participant roster |
| **Project Detail** (`/projects/:id`) | Modified | Add tab/toggle: "Milestone Timeline" \| "Project History". Add source/item type filters |
| **Milestone Timeline** (tab within Project Detail) | New | Dot Timeline: vertical line with dot nodes. Large stage dots (left side) group and encapsulate smaller milestone dots (right side) within their date range. Current stage highlighted, "Today" marker. Read-only shared links + PDF/JPEG export. Elegant, minimalist. |
| **Project History** (tab within Project Detail) | Modified | Renamed from Timeline. Dense Rows layout (Linear/Notion style): row-based, collapsible source groups, UPPERCASE date headers, single-line item rows, accordion meetings. Optimized for scanning 50+ items. |
| **Ingestion Approval** (`/ingestion`) | New | Table of pending source materials (meetings, emails, documents) with approve/reject controls |
| **Manual Input** (`/projects/:id/items/new`) | New | Form for manually creating project items with type-specific fields |

### UI Consistency Requirements
- All new badges (ItemTypeBadge, SourceIcon) SHALL use the existing color system pattern from `src/lib/utils.ts`
- Milestone Timeline SHALL use Tailwind's existing spacing and typography scales
- New modals and forms SHALL reuse `DrilldownModal` patterns (Radix Dialog)
- Stage schedule builder SHALL use native date inputs styled with Tailwind (no new date picker dependency unless justified by @architect)
- Project History Dense Rows SHALL follow Linear/Notion row-height conventions (32-40px per row)

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
- Add columns: `item_type`, `source_type`, `is_milestone`, `is_done`, `affected_disciplines` (JSON array), `owner`
- Preserve all existing data with defaults: `item_type='decision'`, `source_type='meeting'`, `is_milestone=false`, `is_done=false`
- Add `project_stages` table for stage schedule
- Add `sources` table for raw source storage and approval workflow
- Add `project_participants` table for participant-discipline mapping
- Add `stage_templates` table for predefined templates

**API Integration Strategy:**
- New endpoints extend existing router structure in `app/api/routes/`
- Create `project_items.py` router (replaces `decisions.py` over time)
- Create `ingestion.py` router for approval workflow
- Create `stages.py` router for project stage management
- Create `participants.py` router for participant roster
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

**AI Prompt Management Strategy:**
- All LLM extraction prompts stored in `decision-log-backend/app/prompts/` directory
- One prompt file per source type: `extract_meeting.md`, `extract_email.md`, `extract_document.md`
- Prompts are version-controlled, loaded at runtime, and referenced by the extraction service
- Benefits: iterate prompts without code changes, test prompts independently, different prompts per source type

### Code Organization and Standards

**File Structure:** Follows existing conventions — see CLAUDE.md naming conventions
**Naming:** Frontend PascalCase components, camelCase hooks/stores, snake_case backend
**New directories:**
```
decision-log-frontend/src/
├── components/
│   ├── atoms/
│   │   ├── ItemTypeBadge.tsx          (NEW)
│   │   ├── SourceIcon.tsx             (NEW)
│   │   └── DisciplineCircle.tsx       (NEW — single-letter colored circle)
│   ├── molecules/
│   │   ├── MilestoneNode.tsx          (NEW — dot timeline node)
│   │   ├── StageNode.tsx              (NEW — dot timeline stage marker)
│   │   ├── MeetingSummary.tsx         (NEW)
│   │   ├── ProjectItemRow.tsx         (NEW — dense row for Project History)
│   │   └── IngestionRow.tsx           (NEW)
│   ├── organisms/
│   │   ├── MilestoneTimeline.tsx      (NEW — dot timeline)
│   │   ├── IngestionApproval.tsx      (NEW)
│   │   ├── ProjectForm.tsx            (NEW)
│   │   └── StageScheduleBuilder.tsx   (NEW)

decision-log-backend/app/
├── api/routes/
│   ├── project_items.py               (NEW)
│   ├── ingestion.py                   (NEW)
│   ├── stages.py                      (NEW)
│   └── participants.py                (NEW)
├── prompts/                            (NEW — versioned LLM prompts)
│   ├── extract_meeting.md
│   ├── extract_email.md
│   └── extract_document.md
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
| Gmail API rate limiting blocks email ingestion | Medium | Medium | Configurable polling frequency via env var, exponential backoff |
| AI item type classification accuracy <99% | High | Medium | Curated test suite, prompt iteration, human review in Ingestion Approval, versioned prompts for rapid iteration |
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
  timestamp: datetime            // When it occurred in the source

  // Classification
  item_type: enum('idea', 'topic', 'decision', 'action_item', 'information')
  source_type: enum('meeting', 'email', 'document', 'manual_input')
  affected_disciplines: Discipline[] // All disciplines involved (enum values, replaces single discipline)
  is_milestone: boolean          // Appears on Milestone Timeline (default: false)

  // Context
  why: string?                   // Reasoning/rationale
  causation: string?             // What caused this item

  // Structured impact tracking
  impacts: {                     // Downstream effects (structured JSON)
    cost_impact: string?         // e.g., "+$5000", "budget neutral"
    timeline_impact: string?     // e.g., "+2 weeks", "no change"
    scope_impact: string?        // e.g., "adds foundation redesign"
    risk_level: enum('low', 'medium', 'high')?
    affected_areas: string[]?    // e.g., ["foundation", "MEP routing"]
  }?

  // Consensus tracking (for decisions)
  consensus: {                   // Discipline-level agreement tracking (structured JSON)
    disciplines: [               // Each participating discipline's vote
      {
        discipline: Discipline   // Discipline enum value
        status: enum('AGREE', 'DISAGREE', 'ABSTAIN')
        notes: string?           // Optional per-discipline notes
      }
    ]
  }?

  // Action Item specific
  owner: string?                 // Assigned person (action_items)
  is_done: boolean               // Done/undone toggle (default: false)

  // Source reference
  source_id: UUID? (FK → Source) // Link to original source material
  source_excerpt: string?        // Relevant excerpt from source

  // Agent enrichment (preserved from V1)
  confidence: float?
  similar_items: json?
  consistency_notes: string?
  anomaly_flags: json?
  embedding: vector(384)

  // Metadata
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
  occurred_at: datetime          // When source was created/occurred
  ingestion_status: enum('pending', 'approved', 'rejected', 'processed')
  ai_summary: string?            // One-line AI summary
  approved_by: UUID? (FK → User)
  approved_at: datetime?

  // Raw content storage (for traceability & re-processing)
  raw_content: text?             // Full raw text of the source (transcript, email body, doc text)

  // Meeting-specific (preserved from Transcript model)
  meeting_type: string?
  participants: json?
  duration_minutes: int?
  webhook_id: string? (UNIQUE)   // Idempotency key

  // Email-specific
  email_from: string?
  email_to: json?                // Array of recipients
  email_cc: json?
  email_thread_id: string?

  // Document-specific (Phase 2)
  file_url: string?
  file_type: string?             // pdf, docx
  file_size: int?
  drive_folder_id: string?

  created_at: datetime
  updated_at: datetime
}
```

### ProjectParticipant (New Entity)

```
ProjectParticipant {
  id: UUID (PK)
  project_id: UUID (FK → Project)
  name: string                   // Participant full name
  email: string?                 // Email address
  discipline: Discipline          // Discipline enum value (e.g., architecture, structural, mep)
  role: string?                  // e.g., "Lead", "Consultant", "Client"
  created_at: datetime
  updated_at: datetime

  UNIQUE(project_id, email)      // One entry per participant per project
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
ALTER TABLE project_items ADD COLUMN is_done BOOLEAN DEFAULT false;
ALTER TABLE project_items ADD COLUMN affected_disciplines JSONB DEFAULT '[]';
ALTER TABLE project_items ADD COLUMN owner VARCHAR;
ALTER TABLE project_items ADD COLUMN source_id UUID;

-- Phase 2: Migrate existing data
UPDATE project_items SET affected_disciplines = jsonb_build_array(discipline) WHERE discipline IS NOT NULL;

-- Phase 3: Create new tables
CREATE TABLE sources (...);
CREATE TABLE project_stages (...);
CREATE TABLE stage_templates (...);
CREATE TABLE project_participants (...);

-- Phase 4: Link existing data — create Source records from transcripts
INSERT INTO sources (id, project_id, source_type, title, raw_content, ...)
  SELECT gen_random_uuid(), project_id, 'meeting', meeting_title, transcript_text, ...
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
| PATCH | `/api/projects/{id}/items/{item_id}` | Update item (milestone flag, is_done toggle) |
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

**Project Participants**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/{id}/participants` | List project participants |
| POST | `/api/projects/{id}/participants` | Add participant |
| PATCH | `/api/projects/{id}/participants/{id}` | Update participant |
| DELETE | `/api/projects/{id}/participants/{id}` | Remove participant |

**Project CRUD (Extended)**
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects` | Create project with stages and participants |
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

**Epic Goal:** Evolve the data model from "Decision-only" to "Project Item" with 5 types, multi-discipline support, milestone flagging, multi-source tracking, and structured impact/consensus schemas. This is the foundational migration that enables all V2 features.

**Integration Requirements:** All existing V1 data must be preserved. Existing API endpoints must continue to work during transition.

#### Story 5.1: Database Migration — Decision to Project Item

As an **admin**,
I want the database schema to support the new Project Item model,
so that all V2 features can be built on a solid foundation.

**Acceptance Criteria:**
1. `decisions` table renamed to `project_items` with all new columns added (`item_type`, `source_type`, `is_milestone`, `is_done`, `affected_disciplines`, `owner`, `source_id`)
2. All existing decision data preserved with defaults: `item_type='decision'`, `source_type='meeting'`, `is_milestone=false`, `is_done=false`
3. `affected_disciplines` JSON array populated from single `discipline` field
4. `sources` table created with `raw_content` field for storing raw source text
5. `project_participants` table created
6. Existing transcript data linked to new `sources` table, with `raw_content` populated from transcript text
7. Migration is reversible (down migration script provided)
8. All existing V1 tests still pass after migration

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
2. `GET /api/projects/{id}/items/{item_id}` returns full item detail including structured `impacts` and `consensus`
3. `POST /api/projects/{id}/items` creates manual input items
4. `PATCH /api/projects/{id}/items/{item_id}` supports: milestone toggle, is_done toggle
5. `GET /api/projects/{id}/milestones` returns milestone-only items
6. Backward-compatible `/decisions` endpoint proxies to new `/items?item_type=decision`
7. Pydantic models for ProjectItem request/response with structured `impacts` and `consensus` schemas
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
2. `ItemType`, `SourceType`, `ImpactSchema`, `ConsensusSchema` TypeScript types defined
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
1. Prompt files created in `decision-log-backend/app/prompts/` directory: `extract_meeting.md` (Phase 1), `extract_email.md` and `extract_document.md` (Phase 4)
2. Prompts loaded at runtime by extraction service (not hardcoded in Python)
3. Each extracted item includes: `item_type`, `statement`, `who`, `timestamp`, `affected_disciplines[]`, `context` and type-specific fields per "Structured Body per Item Type"
4. Extraction prompt receives `ProjectParticipant[]` roster as context for discipline inference
5. Action items include `owner` when mentioned
6. Prompt achieves 99%+ accuracy on item type classification (tested against 10 curated transcripts)
7. Extraction pipeline updated to store results as `project_items` (not `decisions`)
8. Agent enrichment pipeline adapted for all item types (not just decisions)

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
3. Seed data includes `affected_disciplines[]` arrays (not single discipline)
4. Seed data includes structured `impacts` and `consensus` JSON for decision items
5. Seed data includes `ProjectParticipant` records for at least 2 projects
6. All existing tests updated to use new model names and types
7. New test cases cover: item type filtering, milestone toggle, is_done toggle
8. `npm run frontend:test` and `npm run frontend:lint` pass

---

### Epic 6: Project Management Foundation

**Epic ID:** E6
**Priority:** HIGH
**Owner:** @dev (Full-stack)
**Depends on:** E5 (Data Model)
**Blocks:** E8 (Milestone Timeline needs stage schedule)

**Epic Goal:** Enable full project lifecycle management with creation, stage scheduling, predefined templates, and participant roster management.

#### Story 6.1: Backend — Project CRUD, Stage Schedule & Participants

As an **admin**,
I want to create and manage projects with stage schedules and participant rosters,
so that every project has a defined lifecycle and team context for AI extraction.

**Acceptance Criteria:**
1. `POST /api/projects` accepts: title, description, project_type, stages[], participants[]
2. `PATCH /api/projects/{id}` updates project details, stage schedule, and participant roster
3. `project_stages` table stores ordered stages with date ranges
4. Stage date validation: no overlapping dates, stage_from < stage_to, sequential ordering
5. `actual_stage_id` updated via `PATCH /api/projects/{id}` to point to current stage
6. `GET /api/stage-templates` returns predefined templates
7. `stage_templates` table seeded with at least 2 templates (Architecture Full, Architecture Legal)
8. `project_participants` CRUD: add, update, remove participants with name, email, discipline
9. Participant roster queryable via `GET /api/projects/{id}/participants`

**Integration Verification:**
- IV1: Existing project listing still works
- IV2: Projects without stages (V1 data) display correctly

#### Story 6.2: Frontend — Project Create/Edit Form

As **Gabriela**,
I want a form to create new projects with stage schedules and team members,
so that I can set up a project's lifecycle before the first meeting.

**Acceptance Criteria:**
1. `/projects/new` route renders `ProjectForm` component
2. Form fields: title (required), description (textarea), project_type (select)
3. Stage schedule builder: add/remove rows, each with stage_name, date_from, date_to
4. "Load Template" button populates stage schedule from predefined template
5. Date validation: no overlaps, sequential dates
6. Current stage selector (dropdown from defined stages)
7. Participant roster section: add/remove rows with name, email, discipline (select)
8. Form submission creates project via API and redirects to project detail
9. `/projects/:id/edit` route reuses same form for editing

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
1. `sources` table created with all fields from Data Model section, including `raw_content` for full source text storage
2. `ingestion_status` enum: pending, approved, rejected, processed
3. Existing Tactiq webhook updated to create a `Source` record (status: pending) with `raw_content` populated from transcript text
4. `GET /api/ingestion` returns pending sources with pagination and filters
5. `PATCH /api/ingestion/{source_id}` updates status (approve/reject) — admin only
6. `POST /api/ingestion/batch` batch approve/reject — admin only
7. When source approved → triggers existing ETL pipeline (extraction + enrichment), passing `ProjectParticipant[]` roster as LLM context
8. AI one-line summary generated for each pending source

**Integration Verification:**
- IV1: Tactiq webhooks still received successfully
- IV2: Approved meetings produce same items as V1 direct processing

#### Story 7.2: Frontend — Ingestion Approval Page

As **Gabriela**,
I want to review incoming source materials and decide what gets processed,
so that only relevant content enters the system.

**Acceptance Criteria:**
1. `/ingestion` route renders `IngestionApproval` organism
2. Meeting rows display: Call ID, Project, Date/Time, Meeting Type, Source, Include toggle, AI Summary, Transcript link
3. Email rows display: Email ID, Project, Date, Subject, From, To/CC count, Include toggle, AI Summary, Thread link
4. Document rows display: Document ID, Project, Upload Date, File Name, File Type, File Size, Include toggle, AI Summary, File link
5. Bulk actions: "Approve Selected", "Reject Selected"
6. Filters: by project, by source type, by date range
7. Status indicators: pending (yellow), approved (green), rejected (red), processed (blue)
8. Only admin users can access this page (role check)
9. Real-time count badge in navigation showing pending items

**Integration Verification:**
- IV1: Navigation component shows "Ingestion" link for admin users only
- IV2: Approved items appear in Project History after processing

#### Story 7.3: Manual Input — Create Project Item Form

As a **team member**,
I want to manually create a project item,
so that information from informal conversations or external sources is captured.

**Acceptance Criteria:**
1. `/projects/:id/items/new` route renders item creation form
2. Form fields: `statement` (required, textarea), `item_type` (required, select: idea/topic/decision/action_item/information), `affected_disciplines[]` (required, multi-select from project disciplines), `who` (required, text or select from participants), `date` (required, date picker), `context/notes` (optional, textarea)
3. Conditional fields for `action_item`: `owner` (text or select from participants), `due_date` (date picker)
4. Conditional fields for `decision`: `consensus` structured input (agree/disagree names)
5. Source type auto-set to `manual_input`
6. Item saved via `POST /api/projects/{id}/items`
7. Item embedded (vector embedding) on creation
8. Manual items bypass ingestion approval — directly created
9. Success redirects to Project History with new item highlighted

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
2. Polling frequency configurable via environment variable (`GMAIL_POLL_INTERVAL_MINUTES`, default: 30)
3. Email matching: by project-specific email labels or folder rules
4. For each new email: create `Source` record with `source_type='email'`, status `pending`, `raw_content` populated with email body
5. Extract and store: subject, from, to, cc, thread_id, date
6. AI one-line summary generated from email body
7. Deduplication by `email_thread_id` + message ID
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

**Epic Goal:** Deliver the Milestone Timeline view — Gabriela's "60-second project understanding" tool. A Dot Timeline with project stages on the left and milestone items on the right, elegant and minimalist.

#### Story 8.1: Frontend — Milestone Timeline Component (Dot Timeline)

As **Gabriela**,
I want a Milestone Timeline view that shows project stages and key milestones on a vertical dot timeline,
so that I understand the project's current state in under 60 seconds.

**Acceptance Criteria:**
1. `MilestoneTimeline` organism component renders within Project Detail page
2. **Dot Timeline layout:** a vertical line running top-to-bottom with dot nodes at temporal anchor points
3. **Stage dots (large) — left side:** each project stage rendered as a large dot on the line with `stage_name` and `date range (from → to)` displayed on the left. Stages flow chronologically top-to-bottom and visually group/encapsulate the milestones within their date range — clearly identifying that a milestone belongs to that stage.
4. **Milestone dots (small) — right side:** each milestone rendered as a smaller dot on the line within its parent stage, with content on the right showing `item_type` badge, `statement`, `source` icon, `date`, `affected_disciplines[]` badges.
5. **Current stage** visually distinguished: highlighted dot node, accent color, "Current" label
6. **"Today" marker** on the vertical line indicating the current date position
7. Stage dots and milestone dots SHALL be visually distinct (different sizes, styles — stages are structural dividers, milestones are content)
8. Display sufficient context to situate Gabriela or a client: stage names, date ranges, milestone statements, item types, and discipline badges
9. Empty state: "No milestones yet. Mark important items as milestones from the Project History."
10. Elegant, minimalist design (per client request — @ux-design-expert to provide detailed wireframe)
11. Responsive: vertical layout works on mobile

**Integration Verification:**
- IV1: Stage nodes render correctly from project stage schedule data
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

#### Story 8.4: Milestone Timeline Sharing & Export

As **Gabriela**,
I want to share a read-only link of the Milestone Timeline with clients and export it as PDF/JPEG,
so that I can communicate project status without requiring system access.

**Acceptance Criteria:**
1. "Share" button on Milestone Timeline generates a unique read-only URL
2. Shared link renders the Milestone Timeline visualization without requiring authentication
3. Shared link shows project name, stage schedule, and milestone items (same as authenticated view minus edit controls)
4. Shared link expires after a configurable period (default: 30 days) or can be revoked
5. "Export" button offers PDF and JPEG format options
6. Exported file includes: project name, date of export, Dot Timeline with all visible stages and milestones
7. Export respects current filter state (exports what is currently visible)
8. Only admin users can generate shared links and export
9. Shared link tracking: log when links are accessed (view count)

**Integration Verification:**
- IV1: Shared link opens in incognito browser without login prompt
- IV2: PDF export renders legibly at A4/Letter size
- IV3: JPEG export renders at sufficient resolution for presentations

---

### Epic 9: Project History Enhancement

**Epic ID:** E9
**Priority:** MEDIUM
**Owner:** @dev (Frontend) + @ux-design-expert
**Depends on:** E5 (item types, multi-discipline)

**Epic Goal:** Evolve the existing Timeline into "Project History" using a Dense Rows layout (Linear/Notion style) with improved visual hierarchy, item type badges, source icons, meeting summaries, and advanced filtering.

#### Story 9.1: Component Evolution — Item Type Badges & Source Icons

As a **user**,
I want each project item to show its type and source visually,
so that I can quickly scan what kind of information I'm looking at.

**Acceptance Criteria:**
1. `ItemTypeBadge` atom: compact colored indicator with icon per type (Decision=green/CheckCircle2, Topic=amber/MessageCircle, Action Item=blue/Target, Idea=purple/Lightbulb, Information=slate/Info)
2. `SourceIcon` atom: icon per source (Meeting=Video, Email=Mail, Document=FileText, Manual=PenLine)
3. `DisciplineCircle` atom: single-letter colored circle (`w-6 h-6 rounded-full`), primary discipline gets ring indicator
4. Components designed for compact row display (inline, not cards)
5. Color system added to `src/lib/utils.ts` following existing pattern
6. Tests for all new atoms

**Integration Verification:**
- IV1: All 5 item types render distinct badges
- IV2: All 4 source types render distinct icons
- IV3: Existing decision items show "decision" badge + "meeting" source icon

#### Story 9.2: Dense Rows Layout & Visual Layer Separation

As a **user**,
I want the Project History to use a dense, scannable row layout,
so that I can review 50+ items efficiently.

**Acceptance Criteria:**
1. **Date headers:** UPPERCASE, `text-sm font-bold tracking-wide`, sticky, minimal height, `border-b`. Format: `FEB 8, 2026` with item count badge
2. **Source groups (meetings):** `text-sm font-semibold`, `border-l-2` colored, collapsible accordion. Show: source title, time, participant count, duration, item count, summary icon
3. **Item rows:** `font-medium`, single line, ~32-40px height. Each row shows: item_type icon + statement (truncated) + discipline circles + who + metadata
4. Visual differentiation via: UPPERCASE vs case + indent depth + `border-l` color
5. Collapsible meeting groups reduce clutter — collapsed shows item count, expanded shows rows
6. Consistent row height for fast scanning

**Integration Verification:**
- IV1: Users can visually distinguish all 3 layers without reading content
- IV2: 50+ items render performantly
- IV3: Responsive design adjusts gracefully on mobile (wider rows, smaller text)

#### Story 9.3: Multi-Discipline Circles

As a **user**,
I want to see all disciplines involved in a project item,
so that I understand which disciplines are affected.

**Acceptance Criteria:**
1. `DisciplineCircle` renders single-letter colored circles for each discipline
2. In row view: shows first 3 circles + "+N" for items with many disciplines
3. Primary discipline (first in array) gets ring/border indicator
4. Full list visible in Drill-Down Modal
5. Discipline filter works with multi-discipline items (item shown if ANY discipline matches)

**Integration Verification:**
- IV1: Migrated V1 items show single discipline circle
- IV2: New multi-discipline items show stacked circles

#### Story 9.4: Meeting Summary & Advanced Filters

As a **user**,
I want expandable meeting summaries and filters by source/item type,
so that I can understand meetings quickly and find specific types of information.

**Acceptance Criteria:**
1. Meeting summary: icon button (`FileText`) appears in meeting accordion header, click expands summary section
2. Summary shows AI-generated text from source's `ai_summary` field
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
1. `extract_email.md` prompt file created in `app/prompts/` adapted for email content structure
2. Extract all 5 item types from email body
3. Handle email threads (avoid duplicate extraction from quoted replies)
4. Extraction receives `ProjectParticipant[]` roster for discipline inference
5. Source reference links to email thread
6. Extracted items stored with `source_type='email'`
7. 85%+ extraction accuracy on test email corpus

#### Story 10.2: Document Ingestion (PDF & DOCX)

As **Gabriela**,
I want to upload project documents and extract relevant items,
so that decisions recorded in meeting minutes, specs, or reports are captured.

**Acceptance Criteria:**
1. File upload endpoint: `POST /api/projects/{id}/documents`
2. Support PDF and DOCX parsing (text extraction)
3. Uploaded document creates `Source` record with `source_type='document'`, `raw_content` populated with extracted text
4. Document appears in Ingestion Approval for review
5. `extract_document.md` prompt file for document-specific extraction
6. Approved documents processed through AI extraction pipeline
7. Extracted items stored with `source_type='document'`

#### Story 10.3: Google Drive Folder Monitoring

As **Gabriela**,
I want the system to monitor specific Google Drive folders for new documents,
so that project documents are automatically discovered.

**Acceptance Criteria:**
1. Google Drive API integration (OAuth2)
2. Configurable folder IDs per project
3. Polling for new files (configurable frequency via env variable)
4. New files auto-create `Source` records (status: pending) with `raw_content` populated
5. Support PDF and DOCX file types
6. Deduplication by Drive file ID

---

## PRIORITIZATION & PHASING

### Phase 1: Foundation (Epics 5 + 6) — Weeks 1-3

| Week | Epic | Stories | Deliverable |
|------|------|---------|-------------|
| 1 | E5 | 5.1, 5.2 | Database migrated, new API endpoints live |
| 2 | E5 | 5.3, 5.4, 5.5 | Frontend types migrated, AI prompts in files, updated seeds |
| 3 | E6 | 6.1, 6.2, 6.3 | Project CRUD with stage schedule + participants |

**Phase 1 Gate:** All existing V1 features work with new data model. Projects can be created with stage schedules and participant rosters.

### Phase 2: Core V2 Features (Epics 7 + 8) — Weeks 4-6

| Week | Epic | Stories | Deliverable |
|------|------|---------|-------------|
| 4 | E7 | 7.1, 7.2 | Ingestion approval page, meeting approval flow |
| 5 | E7, E8 | 7.3, 8.1 | Manual input, Dot Timeline component |
| 6 | E8 | 8.2, 8.3, 8.4 | Milestone flagging, filters, sharing & export |

**Phase 2 Gate:** Gabriela can: approve meetings, create manual items, view Dot Timeline with stages + milestones, flag milestones.

### Phase 3: Enhancement (Epic 9) — Weeks 7-8

| Week | Epic | Stories | Deliverable |
|------|------|---------|-------------|
| 7 | E9 | 9.1, 9.2, 9.3 | Item type badges, dense rows layout, discipline circles |
| 8 | E9 | 9.4, 9.5 | Meeting summaries, advanced filters, rename to "Project History" |

**Phase 3 Gate:** Project History fully enhanced with Dense Rows layout and V2 visual improvements.

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
| Item type classification accuracy | 99%+ | Test against curated transcript corpus |
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
| R2 | AI item type classification <99% accuracy | High | Curated test suite, versioned prompt files for rapid iteration, Ingestion Approval as human check |
| R3 | Gmail API rate limiting | Medium | Configurable poll frequency via env var, exponential backoff, quota monitoring |
| R4 | Stage schedule UX too complex | Medium | Predefined templates, progressive disclosure, UX testing with Gabriela |
| R5 | Bundle size bloat | Low | Code splitting, lazy loading for Ingestion/Milestone routes |
| R6 | Scope creep across 6 epics | High | Phase gates, each phase delivers independent value, strict story AC |
| R7 | Google Drive API auth complexity | Medium | Phase 2 — defer until core V2 stable |
| R8 | Missing UX/UI Guidelines causes inconsistency | Medium | Create consolidated guidelines doc (prerequisite, @ux-design-expert) before Phase 2 |

---

## GLOSSARY

| Term | Definition |
|------|-----------|
| **Project Item** | The core entity — any valuable piece of information captured from a source. Replaces "Decision" as the primary domain concept. Has one of 5 types. |
| **Item Type** | Classification of a project item: `idea`, `topic`, `decision`, `action_item`, `information` |
| **Source** | The raw material from which project items are extracted. Contains the original content (transcript, email body, document text). |
| **Source Type** | The classification of a source's origin channel: `meeting`, `email`, `document`, `manual_input` |
| **Affected Disciplines** | The array of disciplines involved in or impacted by a project item. Inferred per item type (see Discipline Inference Guidelines). |
| **Milestone** | A project item flagged as especially important. Appears on the Milestone Timeline. Any item type can be a milestone. |
| **Project History** | The comprehensive, detailed chronological view of all project items using Dense Rows layout (formerly "Timeline") |
| **Milestone Timeline** | The curated, high-level Dot Timeline view showing project stages (large dots, left side) and milestone items (smaller dots, right side) on a vertical timeline. Supports read-only shared links and PDF/JPEG export for client/provider communication. |
| **Dot Timeline** | The visual layout pattern: a vertical line with dot nodes — large stage dots (left side) group and encapsulate smaller milestone dots (right side) within their date range |
| **Stage Schedule** | A project's lifecycle phases with date ranges (e.g., Briefing → Levantamento → Estudo Preliminar...) |
| **Actual Stage** | The current active stage in the project's stage schedule |
| **Ingestion Approval** | The review workflow where admins approve/reject source materials before AI processing |
| **Project Participant** | A team member associated with a project, with name, email, and discipline. Used as LLM context for discipline inference. |
| **Discipline** | A typed enum (15 values) representing a project discipline with a fixed associated color. See "Discipline Enum & Color Map" for the full list. |
| **Consensus** | Discipline-level agreement tracking for decision items. Each participating discipline records their status (AGREE, DISAGREE, ABSTAIN) with optional notes. |
| **Dense Rows** | The UI layout pattern for Project History: row-based, Linear/Notion inspired, collapsible groups, optimized for scanning 50+ items |
| **Raw Content** | The original unprocessed text from a source (transcript text, email body, document text), stored for traceability |

---

## CHANGE LOG

| Change | Date | Version | Description | Author |
|--------|------|---------|-------------|--------|
| Initial draft | 2026-02-16 | 2.0 | Complete brownfield PRD for DecisionLog V2 | Morgan (PM) |
| Review feedback applied | 2026-02-16 | 2.1 | FR3 rewritten (documentative, no promotion tracking). Added: discipline inference guidelines, structured body per item type, `is_done` for action items, `ProjectParticipant` entity, document ingestion FR, raw source storage, prompt files directory, manual input form fields, Dot Timeline definition, Dense Rows layout, `impacts`/`consensus` schemas. Removed: lifecycle tracking, `promoted_from_id`. Updated: FR renumbering (FR1-FR42), NFR5 to 99%, all stories and epics for consistency. | Morgan (PM) |
| Story 8.1 refinement | 2026-02-16 | 2.2 | **Dot Timeline:** refined vertical layout — large stage dots (left side) encapsulate smaller milestone dots (right side), inspired by Gabriela's cronograma node concept. **Consensus:** simplified from name-based to discipline-based tracking (each discipline votes AGREE/DISAGREE/ABSTAIN with optional notes, removed top-level status enum). **Disciplines:** defined as typed enum with 15 values and fixed color map (source of truth in PRD). **New FRs:** FR43 (read-only shared links), FR44 (PDF/JPEG export). **New Story:** 8.4 (Sharing & Export). Updated: FR29-FR32, data model schemas, glossary. | Morgan (PM) |
| UX/UI Guidelines created | 2026-02-16 | 2.2 | Prerequisite fulfilled: `docs/ux/UX-UI-GUIDELINES.md` v1.0 created by @ux-design-expert. Checked off UX/UI Guidelines in Available Documentation. Updated prerequisites section to mark as COMPLETED. | Uma (UX) |

---

*— Morgan, planejando o futuro*
