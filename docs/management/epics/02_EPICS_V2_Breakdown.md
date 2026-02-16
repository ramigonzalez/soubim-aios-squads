# DecisionLog V2: Epics Breakdown

**Document Version:** 2.2
**Date Created:** 2026-02-16
**Last Updated:** 2026-02-16
**Status:** Draft — Pending Review (v2.2 with Story 8.1 refinement)
**Product Owner:** Morgan (PM)
**For:** DecisionLog V2 Enhancement
**Source PRD:** `docs/management/prd/02_DecisionLog_V2_PRD.md`

---

## TABLE OF CONTENTS

1. [Epic 5: Data Model Evolution & Project Item Taxonomy](#epic-5-data-model-evolution--project-item-taxonomy)
2. [Epic 6: Project Management Foundation](#epic-6-project-management-foundation)
3. [Epic 7: Multi-Source Ingestion Pipeline](#epic-7-multi-source-ingestion-pipeline)
4. [Epic 8: Milestone Timeline](#epic-8-milestone-timeline)
5. [Epic 9: Project History Enhancement](#epic-9-project-history-enhancement)
6. [Epic 10: Email & Document Integration](#epic-10-email--document-integration-phase-2)
7. [Dependency Graph](#dependency-graph)
8. [Delivery Timeline](#delivery-timeline)

---

## EPIC 5: Data Model Evolution & Project Item Taxonomy

**Epic ID:** E5
**Priority:** CRITICAL (Foundation)
**Timeline:** Phase 1, Weeks 1-2
**Owner:** @dev (Backend + Frontend)
**Depends on:** V1 Complete (E1-E4)
**Blocks:** E6, E7, E8, E9
**Related PRD FRs:** FR1-FR7

### Epic Description

Evolve the core data model from "Decision-only" to "Project Item" with 5 types (idea, topic, decision, action_item, information), multi-discipline support (`affected_disciplines: Discipline[]` typed enum), milestone flagging, action item `is_done` toggle, structured `impacts` schema and discipline-level `consensus` tracking (each discipline votes AGREE/DISAGREE/ABSTAIN), and multi-source tracking. Each source independently distills items — no cross-source lifecycle tracking.

### Business Value

- Capture 95%+ of meeting content (vs ~40% decisions-only)
- Enable milestone curation for quick project understanding
- Support multi-source information architecture
- Preserve all V1 data integrity during migration

### Success Criteria

- [ ] Database migration completes without data loss
- [ ] All V1 API endpoints continue to function (backward compatibility)
- [ ] AI extraction identifies all 5 item types at 99%+ accuracy
- [ ] Frontend renders V1 data correctly through new types
- [ ] All existing tests pass post-migration
- [ ] Prompt files in `app/prompts/` loaded at runtime (not hardcoded)

### Stories (5)

| Story | Title | Effort | Priority |
|-------|-------|--------|----------|
| 5.1 | Database Migration — Decision to Project Item | L | Critical |
| 5.2 | Backend API — Project Items CRUD | L | Critical |
| 5.3 | Frontend Types & Hooks Migration | M | Critical |
| 5.4 | AI Extraction Prompt Evolution | L | Critical |
| 5.5 | Seed Data & Test Suite Update | S | High |

### Key Changes from v2.0
- No `promoted_from_id` — system is documentative, not lifecycle tracking
- `is_done` boolean added for action items (simple done/undone toggle)
- `affected_disciplines: Discipline[]` — typed enum replaces free-form strings
- `Discipline` enum defined with 15 values and fixed color map (source of truth in PRD)
- `consensus` simplified: discipline-level voting (AGREE/DISAGREE/ABSTAIN per discipline, no top-level status)
- `raw_content` stored in Source for traceability
- `ProjectParticipant` entity added for LLM context
- AI prompts stored in `app/prompts/` directory (not hardcoded)

### Key Changes from v2.1
- Dot Timeline: refined vertical layout with large stage dots (left) + smaller milestone dots (right)
- New Story 8.4: Milestone Timeline Sharing & Export (read-only links + PDF/JPEG)
- New FRs: FR43 (shared links), FR44 (export)

### Agent Assignment

| Story | Primary | QA | Review |
|-------|---------|------|--------|
| 5.1 | @dev | @qa | @architect |
| 5.2 | @dev | @qa | @architect |
| 5.3 | @dev | @qa | — |
| 5.4 | @dev | @qa | @pm (prompt review) |
| 5.5 | @dev | @qa | — |

---

## EPIC 6: Project Management Foundation

**Epic ID:** E6
**Priority:** HIGH
**Timeline:** Phase 1, Week 3
**Owner:** @dev (Full-stack)
**Depends on:** E5
**Blocks:** E8 (stage schedule needed for Dot Timeline)
**Related PRD FRs:** FR21-FR27

### Epic Description

Enable full project lifecycle management with creation form, stage scheduling with predefined templates, participant roster management (name, email, discipline), and project list enhancement showing current stage status.

### Business Value

- Projects have defined lifecycle stages (Briefing → Acompanhamento de Obra)
- Participant roster provides LLM context for discipline inference
- Gabriela can set up projects before first meeting
- Current stage visible at a glance from project list
- Foundation for Dot Timeline's stage nodes

### Success Criteria

- [ ] Projects created with stage schedules + participant rosters via form
- [ ] Predefined templates load correctly
- [ ] Date validation prevents overlapping stages
- [ ] Project list shows current stage badge
- [ ] V1 projects (without stages) display gracefully
- [ ] Participant CRUD fully functional

### Stories (3)

| Story | Title | Effort | Priority |
|-------|-------|--------|----------|
| 6.1 | Backend — Project CRUD, Stage Schedule & Participants | L | High |
| 6.2 | Frontend — Project Create/Edit Form | L | High |
| 6.3 | Frontend — Project List Enhancement | S | Medium |

### Agent Assignment

| Story | Primary | QA | Review |
|-------|---------|------|--------|
| 6.1 | @dev | @qa | @architect |
| 6.2 | @dev | @qa | @ux-design-expert |
| 6.3 | @dev | @qa | — |

---

## EPIC 7: Multi-Source Ingestion Pipeline

**Epic ID:** E7
**Priority:** HIGH
**Timeline:** Phase 2, Weeks 4-5 (Stories 7.1-7.3) + Phase 4, Weeks 9-10 (Story 7.4)
**Owner:** @dev (Backend + Frontend)
**Depends on:** E5
**Blocks:** E10
**Related PRD FRs:** FR8-FR20

### Epic Description

Build the ingestion approval workflow where admins review incoming source materials before ETL processing. All sources store `raw_content` for traceability. Extend the capture pipeline beyond meetings to support manual input (with defined form fields). Gmail API integration (Story 7.4) ships in Phase 4 with polling frequency configurable via env variable.

### Business Value

- Admin control over what enters the system (no unwanted meeting noise)
- Manual input captures informal decisions and conversations
- Raw content stored for re-processing and validation
- Unified pipeline for all source types
- Quality gate before AI processing

### Success Criteria

- [ ] Tactiq webhooks create pending Source records with `raw_content` stored
- [ ] Ingestion Approval page displays meetings, emails, and documents distinctly
- [ ] Admin can approve/reject sources individually and in batch
- [ ] Approved sources trigger ETL with `ProjectParticipant[]` as LLM context
- [ ] Manual input form with all defined fields creates items directly
- [ ] Gmail poller respects `GMAIL_POLL_INTERVAL_MINUTES` env var (Phase 4)

### Stories (4)

| Story | Title | Effort | Priority | Phase |
|-------|-------|--------|----------|-------|
| 7.1 | Backend — Source Entity & Ingestion Queue | L | High | 2 |
| 7.2 | Frontend — Ingestion Approval Page | L | High | 2 |
| 7.3 | Manual Input — Create Project Item Form | M | High | 2 |
| 7.4 | Backend — Gmail API Poller | L | Medium | 4 |

### Agent Assignment

| Story | Primary | QA | Review |
|-------|---------|------|--------|
| 7.1 | @dev | @qa | @architect |
| 7.2 | @dev | @qa | @ux-design-expert |
| 7.3 | @dev | @qa | @ux-design-expert |
| 7.4 | @dev | @qa | @devops (infra) |

---

## EPIC 8: Milestone Timeline

**Epic ID:** E8
**Priority:** HIGH (Highest client value)
**Timeline:** Phase 2, Weeks 5-6
**Owner:** @dev (Frontend) + @ux-design-expert
**Depends on:** E5 (item types + milestone flag), E6 (stage schedule)
**Blocks:** None
**Related PRD FRs:** FR28-FR34, FR43-FR44

### Epic Description

Deliver Gabriela's "60-second project understanding" tool. A **Dot Timeline** — a vertical line with dot nodes where **Project Stages** appear as large dots (left side) that group and encapsulate **Milestone Items** (smaller dots, right side) within their date range. Current stage highlighted, "Today" marker, elegant minimalist design. Supports read-only shared links and PDF/JPEG export for client/provider communication.

### Business Value

- Gabriela understands project status in <60 seconds
- Client/provider communication enabled via milestone summary
- Curated view cuts through information overload
- Project stage schedule provides temporal context

### Success Criteria

- [ ] Vertical Dot Timeline renders with large stage dots (left) and smaller milestone dots (right)
- [ ] Current stage visually distinguished with accent color + "Current" label
- [ ] "Today" marker on vertical line at current date
- [ ] Stages and milestones are visually distinct from each other
- [ ] Only milestone-flagged items appear
- [ ] Milestone toggle works from any view (admin only)
- [ ] Filters by source type and item type
- [ ] Loads in <2 seconds with 50 milestones
- [ ] Elegant, minimalist design (Gabriela approval via @ux-design-expert wireframe)
- [ ] Read-only shared links generate unique URL for unauthenticated viewing
- [ ] Export as PDF/JPEG produces shareable output

### Stories (4)

| Story | Title | Effort | Priority |
|-------|-------|--------|----------|
| 8.1 | Frontend — Milestone Timeline Component (Dot Timeline) | L | High |
| 8.2 | Frontend — Milestone Flag Toggle | M | High |
| 8.3 | Frontend — Milestone Timeline Filters | M | Medium |
| 8.4 | Milestone Timeline Sharing & Export | M | Medium |

### Agent Assignment

| Story | Primary | QA | Review |
|-------|---------|------|--------|
| 8.1 | @dev | @qa | @ux-design-expert |
| 8.2 | @dev | @qa | — |
| 8.3 | @dev | @qa | — |
| 8.4 | @dev | @qa | @architect |

---

## EPIC 9: Project History Enhancement

**Epic ID:** E9
**Priority:** MEDIUM
**Timeline:** Phase 3, Weeks 7-8
**Owner:** @dev (Frontend) + @ux-design-expert
**Depends on:** E5 (item types, multi-discipline)
**Blocks:** None
**Related PRD FRs:** FR35-FR42

### Epic Description

Evolve the existing Timeline into "Project History" using a **Dense Rows** layout inspired by Linear/Notion. Row-based list view with collapsible source groups (meetings as accordions), optimized for information density and scanning 50+ items. Features: UPPERCASE date headers, `border-l-2` source groups, single-line item rows with compact badges, single-letter discipline circles, expandable meeting summaries, and advanced filtering by source/item type.

### Business Value

- Clear visual hierarchy eliminates layer confusion (Gabriela's original feedback)
- Dense rows enable scanning 50+ items efficiently
- Item type badges show information kind at a glance
- Meeting summaries provide quick context
- Advanced filters enable targeted retrieval
- Multi-discipline circles show cross-team involvement

### Success Criteria

- [ ] Dense Rows layout: UPPERCASE dates, accordion sources, single-line item rows (32-40px)
- [ ] Item type badges with distinct colors/icons for all 5 types
- [ ] Source icons distinguish all 4 source types
- [ ] Single-letter discipline circles with primary ring indicator
- [ ] Meeting summaries expand/collapse
- [ ] Advanced filters (source + item type + discipline + date + search)
- [ ] "Timeline" renamed to "Project History" across UI

### Stories (5)

| Story | Title | Effort | Priority |
|-------|-------|--------|----------|
| 9.1 | Component Evolution — Item Type Badges & Source Icons | M | High |
| 9.2 | Dense Rows Layout & Visual Layer Separation | M | High |
| 9.3 | Multi-Discipline Circles | S | Medium |
| 9.4 | Meeting Summary & Advanced Filters | L | Medium |
| 9.5 | Rename & Navigation Update | S | Low |

### Agent Assignment

| Story | Primary | QA | Review |
|-------|---------|------|--------|
| 9.1 | @dev | @qa | @ux-design-expert |
| 9.2 | @dev | @qa | @ux-design-expert |
| 9.3 | @dev | @qa | — |
| 9.4 | @dev | @qa | @ux-design-expert |
| 9.5 | @dev | @qa | — |

---

## EPIC 10: Email & Document Integration (Phase 2)

**Epic ID:** E10
**Priority:** LOW (Phase 4 — Weeks 11-12)
**Timeline:** Phase 4, Weeks 11-12
**Owner:** @dev (Backend)
**Depends on:** E7 (Ingestion Pipeline operational)
**Blocks:** None
**Related PRD FRs:** FR11, E10 stories

### Epic Description

Extend the ingestion pipeline to process emails and documents as sources of project items. Includes AI extraction prompts (`extract_email.md`, `extract_document.md`) in the prompts directory, adapted for email/document content structures. Google Drive folder monitoring for automatic document discovery. All sources store `raw_content` for traceability.

### Business Value

- Full multi-source platform: meetings + emails + documents + manual
- Captures decisions/action items from email threads
- Document upload for meeting minutes, specs, reports
- Google Drive monitoring for automatic discovery

### Success Criteria

- [ ] Email extraction pipeline produces items from email bodies
- [ ] Document upload (PDF/DOCX) creates Source records with `raw_content`
- [ ] Google Drive monitoring discovers new files
- [ ] `ProjectParticipant[]` roster used for discipline inference in all extractors
- [ ] All extracted items display correctly in Project History and Milestone Timeline
- [ ] Source-specific prompt files in `app/prompts/`

### Stories (3)

| Story | Title | Effort | Priority |
|-------|-------|--------|----------|
| 10.1 | Email Item Extraction Pipeline | L | Medium |
| 10.2 | Document Ingestion (PDF & DOCX) | M | Medium |
| 10.3 | Google Drive Folder Monitoring | L | Low |

### Agent Assignment

| Story | Primary | QA | Review |
|-------|---------|------|--------|
| 10.1 | @dev | @qa | @pm (prompt review) |
| 10.2 | @dev | @qa | @architect |
| 10.3 | @dev | @qa | @devops (infra) |

---

## DEPENDENCY GRAPH

```
V1 COMPLETE (E1-E4)
       │
       ▼
┌──────────────┐
│   E5: Data   │ ← CRITICAL PATH (Week 1-2)
│    Model     │
└──────┬───────┘
       │
       ├────────────────┬──────────────────┐
       ▼                ▼                  ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ E6: Project  │ │ E7: Ingest   │ │ E9: Project  │
│ CRUD + Parts │ │   Pipeline   │ │   History    │
│  (Week 3)    │ │  (Week 4-5)  │ │  (Week 7-8)  │
└──────┬───────┘ └──────┬───────┘ └──────────────┘
       │                │
       ├────────┐       │
       ▼        │       ▼
┌──────────────┐│ ┌──────────────┐
│ E8: Dot      ││ │ E10: Email & │
│  Timeline    │◄┘ │  Documents   │
│  (Week 5-6)  │  │  (Week 11-12) │
└──────────────┘  └──────────────┘
```

---

## DELIVERY TIMELINE

### Phase 1: Foundation (Weeks 1-3)
**Gate:** All V1 features work with new data model. Projects have stage schedules and participant rosters.

### Phase 2: Core V2 (Weeks 4-6)
**Gate:** Gabriela can approve meetings, create manual items, view Dot Timeline with stages + milestones, flag milestones.

### Phase 3: Enhancement (Weeks 7-8)
**Gate:** Project History fully enhanced with Dense Rows layout and V2 visual improvements.

### Phase 4: Email Integration (Weeks 9-12)
**Gate:** Full multi-source platform operational.

### Total: 24 Stories across 6 Epics, ~12 weeks

| Phase | Epics | Stories | Weeks |
|-------|-------|---------|-------|
| 1 | E5, E6 | 8 | 1-3 |
| 2 | E7 (partial), E8 | 6 | 4-6 |
| 3 | E9 | 5 | 7-8 |
| 4 | E7.4, E10 | 4 | 9-12 |

### Prerequisite (Before Phase 2)
- **UX/UI Guidelines Document** — @ux-design-expert must create consolidated guidelines covering color system, typography, spacing, component patterns, interaction patterns, accessibility. Currently informal/embedded in stories — insufficient for V2 scope.

---

*— Morgan, planejando o futuro*
