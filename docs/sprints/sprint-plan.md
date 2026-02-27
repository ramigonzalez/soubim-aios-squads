# DecisionLog V2 — Sprint Plan (WAVE Methodology)

> **Created by**: @sm (River) + @pm (Bob) | **Date**: 2026-02-27
> **Total Stories**: 23 | **Total Points**: ~150
> **Waves**: 7 (Wave 0–6) | **Max Parallelism**: 5 agents (Wave 3)
> **MVP Cut Line**: After Wave 3
> **Optimization Gain**: ~70% faster than sequential execution

---

## Wave Structure

Stories organized into 7 waves based on dependency resolution using Kahn's topological sort.
Story 5.1 (Database Migration) is already completed and merged to `main`.

---

## Wave 0 — Backend Foundation (2 stories, 16 pts)

> **Goal**: Build the two foundational backend APIs — Project Items CRUD and Project Management CRUD — in parallel.

| Story | Name | Pts | MoSCoW | Depends On |
|-------|------|-----|--------|------------|
| 5.2 | Backend API — Project Items CRUD | 8 | Must | 5.1 ✅ |
| 6.1 | Backend — Project CRUD, Stages, Participants | 8 | Must | 5.1 ✅ |

**Parallelism**: `5.2 ∥ 6.1` — Zero file conflicts. 5.2 creates `project_items.py` routes; 6.1 creates `stages.py` + `participants.py` routes. Both register routers in `main.py` (independent lines).

**Exit criteria**:
- All 13+ new endpoints respond correctly
- Pydantic models validate input/output
- `make check` passes (lint, format, typecheck, tests)
- Backend tests ≥85% coverage on new files

---

## Wave 1 — Frontend Migration + AI Prompts (4 stories, 24 pts)

> **Goal**: Migrate frontend to V2 types/hooks, evolve AI extraction prompts, build project creation forms.

| Story | Name | Pts | MoSCoW | Depends On |
|-------|------|-----|--------|------------|
| 5.3 | Frontend Types & Hooks Migration | 5 | Must | 5.1, 5.2 |
| 5.4 | AI Extraction Prompt Evolution | 8 | Must | 5.1, 5.2 |
| 6.2 | Frontend — Project Create/Edit Form | 8 | Must | 6.1 |
| 6.3 | Frontend — Project List Enhancement | 3 | Must | 6.1 |

**Parallelism**: `5.3 ∥ 5.4 ∥ 6.2 ∥ 6.3` — 4 parallel agents

**File Conflict Analysis**:
- 5.3: `src/types/`, `src/hooks/`, `src/store/filterStore.ts`, existing component imports
- 5.4: `decision-log-backend/app/prompts/`, `app/services/` — backend only, zero frontend overlap
- 6.2: new `src/components/organisms/ProjectForm.tsx`, `src/pages/ProjectCreate.tsx`, `src/pages/ProjectEdit.tsx`
- 6.3: `src/components/common/ProjectCard.tsx`, `src/pages/Projects.tsx` — no overlap with 5.3 targets

**Conflicts**: None. Clean parallelism.

**Exit criteria**:
- TypeScript compiles with zero errors
- All V2 hooks fetch from new endpoints
- AI extraction classifies 5 item types with 99%+ accuracy on test transcripts
- Project create/edit form functional end-to-end
- `npm run frontend:test` and `npm run frontend:lint` pass

---

## Wave 2 — Integration Layer (4 stories, 21 pts)

> **Goal**: Seed realistic V2 test data, build ingestion pipeline backend, enable manual item creation, create foundational UI atoms.

| Story | Name | Pts | MoSCoW | Depends On |
|-------|------|-----|--------|------------|
| 5.5 | Seed Data & Test Suite Update | 3 | Must | 5.1, 5.2, 5.3* |
| 7.1 | Backend — Source Entity & Ingestion Queue | 8 | Must | 5.1, 5.4 |
| 7.3 | Manual Input — Create Project Item Form | 5 | Must | 5.2, 5.3, 6.1 |
| 9.1 | Component Evolution — Badges & Source Icons | 5 | Should | 5.3 |

*5.5 has implicit dependency on 5.3 due to shared test file modifications.

**Parallelism**: `5.5 ∥ 7.1 ∥ 7.3 ∥ 9.1` — 4 parallel agents

**File Conflict Analysis**:
- 5.5: `seed.py`, backend tests, frontend tests
- 7.1: `app/api/routes/ingestion.py`, `app/services/`, `webhooks.py`
- 7.3: new `ManualItemForm.tsx`, `ManualItemCreate.tsx`, `useParticipants.ts`
- 9.1: new `src/components/atoms/` directory, `src/lib/utils.ts` additions

**Conflicts**: None. Completely different domains.

**Exit criteria**:
- Seed script creates 20+ items across all 5 types
- Webhook creates pending Source records
- Ingestion API lists/approves/rejects sources
- Manual item form creates items via POST API
- All 3 atom components render correctly with all variants
- All tests pass

---

## Wave 3 — Core Features (5 stories, 45 pts) ← MVP CUT LINE

> **Goal**: Build the two major frontend views (Milestone Timeline + Dense Rows), Ingestion Approval page, Gmail poller, and email extraction pipeline. After this wave, the complete V2 system is operational.

| Story | Name | Pts | MoSCoW | Depends On |
|-------|------|-----|--------|------------|
| 8.1 | Frontend — Milestone Timeline Component | 13 | Should | 5.3, 6.1, 5.5 |
| 7.2 | Frontend — Ingestion Approval Page | 8 | Must | 7.1 |
| 9.2 | Dense Rows Layout & Visual Separation | 8 | Should | 9.1, 5.3 |
| 7.4 | Backend — Gmail API Poller | 8 | Should | 5.1, 7.1 |
| 10.1 | Email Item Extraction Pipeline | 8 | Could | 7.1, 5.4 |

**Parallelism**: `8.1 ∥ 7.2 ∥ 9.2 ∥ 7.4 ∥ 10.1` — **5 parallel agents** (maximum parallelism)

**File Conflict Analysis**:
- 8.1: creates `MilestoneTimeline.tsx`, `MilestoneNode.tsx`, `StageNode.tsx`, modifies `ProjectDetail.tsx`
- 7.2: creates ingestion page/components, modifies `App.tsx` (routes), `Navigation.tsx`, `utils.ts`
- 9.2: modifies `Timeline.tsx`, creates `ProjectItemRow.tsx`, `SourceGroupAccordion.tsx`, `utils.ts`
- 7.4: backend only — `gmail_client.py`, `gmail_poller.py`, `main.py` (scheduler)
- 10.1: backend only — `email_extractor.py`, `prompts/extract_email.md`

**Conflicts**: `utils.ts` modified by 7.2 (adds `formatFileSize`) and 9.2 (adds `formatDenseDate`). **Resolution**: Independent function additions — both append new functions to different sections.

**Exit criteria**:
- Milestone Timeline renders stages + milestones with Today marker
- Ingestion Approval page shows pending sources with bulk actions
- Dense Rows layout with 3-layer visual hierarchy
- Gmail poller discovers project-related emails
- Email extraction pipeline produces items from email content
- **MVP: System can receive meetings/emails → extract items → display in both views**

---

## Wave 4 — Enhancement Layer (3 stories, 18 pts)

> **Goal**: Add milestone flagging, multi-discipline circle integration, and document ingestion capability.

| Story | Name | Pts | MoSCoW | Depends On |
|-------|------|-----|--------|------------|
| 8.2 | Frontend — Milestone Flag Toggle | 5 | Should | 8.1, 5.2, 5.3 |
| 9.3 | Multi-Discipline Circles | 5 | Should | 9.1, 9.2*, 8.1* |
| 10.2 | Document Ingestion (PDF & DOCX) | 8 | Could | 7.1, 10.1 |

*9.3 has implicit dependencies: modifies `ProjectItemRow.tsx` (created in 9.2) and `MilestoneNode.tsx` (created in 8.1).

**Parallelism**: `(8.2 → 9.3 sequential) ∥ 10.2` — 2 parallel tracks

**File Conflict**:
- 8.2 and 9.3 both modify `MilestoneNode.tsx` and `DrilldownModal.tsx`
- **Resolution**: Sequential override — 8.2 runs first (adds star toggle), then 9.3 runs (adds discipline circles). 10.2 is fully parallel (backend + small frontend upload button).

**Exit criteria**:
- Admin can flag/unflag milestones with optimistic UI
- Multi-discipline circles display across all views with overflow tooltip
- PDF/DOCX upload, text extraction, and AI item extraction functional
- All tests pass

---

## Wave 5 — Advanced Features (3 stories, 18 pts)

> **Goal**: Add filter systems to both timeline views and enable Google Drive document monitoring.

| Story | Name | Pts | MoSCoW | Depends On |
|-------|------|-----|--------|------------|
| 8.3 | Frontend — Milestone Timeline Filters | 5 | Should | 8.1, 8.2 |
| 9.4 | Meeting Summary & Advanced Filters | 8 | Should | 9.2, 9.1, 9.3 |
| 10.3 | Google Drive Folder Monitoring | 8 | Could | 10.2, 7.1 |

**Parallelism**: `8.3 ∥ 9.4 ∥ 10.3` — 3 parallel agents

**File Conflict Analysis**:
- 8.3: modifies `MilestoneTimeline.tsx`, creates `MilestoneFilterBar.tsx`, modifies `utils.ts`
- 9.4: modifies `filterStore.ts`, `FilterBar.tsx`, `SourceGroupAccordion.tsx`, `ProjectDetail.tsx`
- 10.3: backend only + tiny `ProjectForm.tsx` field addition

**Conflicts**: None. 8.3 filters MilestoneTimeline; 9.4 filters Project History. Different components.

**Exit criteria**:
- Milestone Timeline filterable by source type and item type with URL persistence
- Project History has meeting summaries, source/type filter chips, URL-synced state
- Google Drive folder polling discovers new PDF/DOCX files automatically
- All filter tests pass

---

## Wave 6 — Final Polish (2 stories, 8 pts)

> **Goal**: Add sharing/export capabilities and finalize the UI rename from "Timeline" to "Project History".

| Story | Name | Pts | MoSCoW | Depends On |
|-------|------|-----|--------|------------|
| 8.4 | Milestone Timeline Sharing & Export | 5 | Could | 8.1, 8.3 |
| 9.5 | Rename & Navigation Update | 3 | Should | 9.2, 8.1, 9.4 |

**Parallelism**: `8.4 ∥ 9.5` — 2 parallel agents

**File Conflict**: Both modify `ProjectDetail.tsx` — independent sections (8.4 adds toolbar share/export buttons; 9.5 refines tab toggle text and breadcrumb). **Resolution**: Independent sections.

**Exit criteria**:
- Shareable links generated with expiration and view count
- PDF and JPEG export captures filtered timeline view
- All UI text says "Project History" (not "Timeline")
- Tab toggle defaults correctly based on stages
- URL hash persistence works for tab state
- **All 23 stories complete. Full V2 delivery.**

---

## Summary

| Wave | Stories | Points | Parallelism | Goal |
|------|---------|--------|-------------|------|
| 0 | 5.2, 6.1 | 16 | 2 parallel | Backend Foundation |
| 1 | 5.3, 5.4, 6.2, 6.3 | 24 | 4 parallel | Frontend + AI |
| 2 | 5.5, 7.1, 7.3, 9.1 | 21 | 4 parallel | Integration |
| 3 | 8.1, 7.2, 9.2, 7.4, 10.1 | 45 | **5 parallel** | Core Features (MVP) |
| 4 | 8.2, 9.3, 10.2 | 18 | 2 tracks | Enhancement |
| 5 | 8.3, 9.4, 10.3 | 18 | 3 parallel | Advanced |
| 6 | 8.4, 9.5 | 8 | 2 parallel | Final Polish |
| **Total** | **23** | **~150** | **Max 5** | |

---

## MVP Cut Line

**After Wave 3.** At this point:
- E5 (Data Model Evolution) — **100% complete**
- E6 (Project Management) — **100% complete**
- E7 (Multi-Source Ingestion) — **Core complete** (7.1, 7.2, 7.3, 7.4)
- E8 (Milestone Timeline) — **Base complete** (8.1)
- E9 (Project History) — **Base complete** (9.1, 9.2)
- E10 (Email & Document) — **Email started** (10.1)

The system can receive meetings via webhook, receive emails via Gmail, extract project items (all 5 types), display them in Milestone Timeline and Dense Rows views, manage projects with stages/participants, and support manual item creation.

---

## Dependency Graph (Visual)

```
COMPLETED: [5.1] ✅

Wave 0:  [5.2] ─────────────────────────────────┬────────────────────────────────┐
         [6.1] ──────────┬──────┬────────────────┤                                │
                         │      │                │                                │
Wave 1:  [5.3] ◄─(5.2)  │    [5.4] ◄─(5.2)   [6.2] ◄─(6.1)  [6.3] ◄─(6.1)   │
           │             │      │                                                 │
Wave 2:  [9.1] ◄─(5.3)  │    [7.1] ◄─(5.4)   [7.3] ◄─(5.2,5.3,6.1)           │
           │             │      │                                   [5.5] ◄─(5.2,5.3)
           │             │      ├──────────┬──────────┐               │
Wave 3:  [9.2] ◄─(9.1)  │    [7.2]     [7.4]     [10.1]          [8.1] ◄─(5.3,6.1,5.5)
           │             │                            │               │
Wave 4:  [9.3] ◄─(9.2,8.1)                        [10.2]          [8.2] ◄─(8.1)
           │                                          │               │
Wave 5:  [9.4] ◄─(9.3,9.2)                        [10.3]          [8.3] ◄─(8.2)
           │                                                          │
Wave 6:  [9.5] ◄─(9.4,9.2,8.1)                                   [8.4] ◄─(8.3)
```

### Critical Path

The longest dependency chain determines the minimum number of waves:

```
5.2 → 5.3 → 9.1 → 9.2 → 9.3 → 9.4 → 9.5
 W0    W1    W2    W3    W4    W5    W6
```

**7 stories on the critical path = 7 waves minimum.** This plan achieves that theoretical minimum.

---

*Sprint Plan v1.0.0 — WAVE Parallel Development Methodology*
*@sm (River) + @pm (Bob)*
