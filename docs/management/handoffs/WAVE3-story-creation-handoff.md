# Wave 3 Story Creation Handoff

**From:** @sm (River) — Wave 2 session
**To:** @sm (River) — Wave 3 session
**Date:** 2026-02-19
**Branch:** `feat/decision_log-v2`

---

## Status

| Wave | Stories | Status |
|------|---------|--------|
| Wave 1 (E5 + E6) | 8 stories | ✅ COMPLETE |
| Wave 2 (E7 + E8) | 7 stories | ✅ COMPLETE |
| **Wave 3 (E8.4 + E9 + E10)** | **9 stories** | **⏳ PENDING** |

**Total V2 progress:** 15/24 stories created

---

## Wave 3 Stories to Create (9 total)

### 8.4: Milestone Timeline Sharing & Export
- **Epic:** E8 — Milestone Timeline
- **Scope:** Export milestone timeline as PNG/PDF, shareable URL with filter state
- **Dependencies:** 8.1-8.3 (all complete)
- **Reviewer:** @ux-design-expert (Uma)

### EPIC 9: Project History Enhancement (5 stories)

| Story | Title | SP Est. | Key Focus |
|-------|-------|---------|-----------|
| 9.1 | Item Type Badges & Source Icons | 5 | New `ItemTypeBadge` + `SourceIcon` molecules |
| 9.2 | Dense Rows Layout & Visual Separation | 8 | Dense row variant for `ProjectItemRow` |
| 9.3 | Multi-Discipline Circles | 5 | `DisciplineCircle` with multi-discipline overlay |
| 9.4 | Meeting Summary & Advanced Filters | 8 | Meeting group headers + expanded filter sidebar |
| 9.5 | Rename & Navigation Update | 3 | "Decisions" → "Project History" throughout UI |

- **Dependencies:** All depend on E5 (complete)
- **Review flags:** 9.2 uses UX spec from `FRONTEND-SPEC-timeline-polish-v3.md`

### EPIC 10: Email & Document Integration (3 stories)

| Story | Title | SP Est. | Key Focus |
|-------|-------|---------|-----------|
| 10.1 | Email Item Extraction Pipeline | 8 | LLM prompt to extract items from email body |
| 10.2 | Document Ingestion (PDF & DOCX) | 8 | PDF/DOCX parsing → item extraction |
| 10.3 | Google Drive Folder Monitoring | 8 | Watch folder for new docs, auto-ingest |

- **Dependencies:** All depend on E7 (complete)
- **Review flags:** 10.2 needs @architect (Aria) review for storage decisions

---

## Reference Documents (read these first)

### Must-Read (in order)
1. **PRD v2.2:** `docs/management/prd/02_DecisionLog_V2_PRD.md`
   - Epic 9 requirements (FR35-42), Epic 10 requirements (FR11+)
2. **Epic Breakdown v2.2:** `docs/management/epics/02_EPICS_V2_Breakdown.md`
   - Story descriptions, dependency graph, delivery timeline
3. **UX/UI Guidelines:** `docs/ux/UX-UI-GUIDELINES.md`
   - V2 Visual Patterns (Dot Timeline, Dense Rows, ItemTypeBadge, SourceIcon, DisciplineCircle)
   - Component architecture, color system, accessibility standards

### Gold Standard Template
4. **Story 3.5:** `docs/stories/3.5-decision-timeline-component.md`
   - Follow this exact structure: ACs with checkboxes, Tasks with time estimates, File List, Dev Notes with code patterns, Testing Strategy

### Architecture Reference
5. **API Spec:** `docs/architecture/02-API-SPECIFICATION.md`
6. **DB Schema:** `docs/architecture/03-DATABASE-SCHEMA.md`
7. **Agent Pipeline:** `docs/architecture/04-AGENT-PIPELINE.md` (for E10 extraction)
8. **Frontend Arch:** `docs/architecture/05-FRONTEND-ARCHITECTURE.md`

### Predecessor Stories (for context)
9. **Story 8.1:** `docs/stories/8.1-frontend-milestone-timeline-component.md` (predecessor for 8.4)
10. **UX Polish Spec:** `docs/ux/FRONTEND-SPEC-timeline-polish-v3.md` (for 9.2 Dense Rows)

---

## Story Creation Checklist (per story)

Each story MUST include:
- [ ] Story header (ID, Epic, Sprint, Status, Estimation, Reviewer)
- [ ] Summary (1-2 sentences)
- [ ] Acceptance Criteria with `- [ ]` checkboxes (specific, testable)
- [ ] Tasks with time estimates
- [ ] Dev Notes with code patterns/examples
- [ ] File List (new + modified files)
- [ ] Testing Strategy with coverage target (80%+)
- [ ] Change Log table
- [ ] Dependencies (Related Stories, Blocked By, Blocks)
- [ ] JSON examples for API contracts (backend stories)
- [ ] SQL for database stories
- [ ] Tailwind classes for frontend stories

---

## Suggested Creation Order

**Phase A — E8 wrap-up:**
1. 8.4 (Sharing & Export) — closes E8

**Phase B — E9 (dependency order):**
2. 9.1 (Badges & Icons) — foundation molecules
3. 9.3 (Multi-Discipline Circles) — another molecule
4. 9.2 (Dense Rows) — uses 9.1 and 9.3 molecules
5. 9.4 (Meeting Summary & Filters) — uses Dense Rows
6. 9.5 (Rename & Navigation) — final sweep

**Phase C — E10 (dependency order):**
7. 10.1 (Email Extraction) — core pipeline
8. 10.2 (Document Ingestion) — extends pipeline
9. 10.3 (Google Drive Monitor) — auto-ingestion

---

## Session Instructions

```
@sm activate

Context: Continuing V2 story creation, Wave 3.
Read handoff: docs/management/handoffs/WAVE3-story-creation-handoff.md
Read progress: docs/stories/STORY_CREATION_PROGRESS.md
YOLO mode: ON (auto-commit after each batch)

Create 9 stories following the reference docs and creation order above.
After all 9 stories: Update STORY_CREATION_PROGRESS.md with Wave 3 section.
```

---

— River, removendo obstáculos 🌊
