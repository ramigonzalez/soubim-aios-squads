# File Ownership Map — DecisionLog V2 Sprint

> **Created by**: @sm (River) + @architect (Aria) | **Date**: 2026-02-27
> **Purpose**: Pre-planned file ownership per wave to prevent merge conflicts between parallel @dev agents.

---

## Ownership Rules

1. Each agent ONLY modifies files assigned to it in the ownership map
2. If an agent needs to modify a file it doesn't own, document it in the wave log and defer
3. Primary owner writes first when shared files exist
4. Secondary owner appends/extends after primary completes
5. When in doubt, run stories sequentially within the wave

---

## Wave 0 — Backend Foundation

| Story | Files Created | Files Modified |
|-------|--------------|----------------|
| 5.2 | `app/api/models/project_item.py`, `app/api/routes/project_items.py`, `tests/unit/test_project_items_api.py` | `app/api/routes/decisions.py`, `app/main.py` (register items router) |
| 6.1 | `app/database/migrations/003_add_stages_templates.py`, `app/api/models/project.py`, `app/api/routes/stages.py`, `app/api/routes/participants.py`, `tests/unit/test_stages_api.py`, `tests/unit/test_participants_api.py` | `app/database/models.py`, `app/api/routes/projects.py`, `app/main.py` (register stages + participants routers) |

**Conflicts**: Both modify `app/main.py` to register routers.
**Resolution**: Independent lines — each appends `app.include_router()` calls. Both agents append to different positions. **No blocking conflict.**

---

## Wave 1 — Frontend Migration + AI Prompts

| Story | Files Created | Files Modified |
|-------|--------------|----------------|
| 5.3 | `src/types/projectItem.ts`, `src/hooks/useProjectItems.ts`, `src/hooks/useMilestones.ts`, `src/hooks/useProjectItemMutation.ts`, `src/tests/hooks/useProjectItems.test.ts`, `src/tests/hooks/useMilestones.test.ts` | `src/types/decision.ts` (deprecation), `src/store/filterStore.ts`, `src/hooks/useDecisions.ts` (deprecation), `src/components/organisms/Timeline.tsx`, `src/components/molecules/DecisionRow.tsx`, `src/components/organisms/DrilldownModal.tsx`, `src/pages/ProjectDetail.tsx` |
| 5.4 | `app/prompts/extract_meeting.md`, `app/prompts/extract_email.md` (placeholder), `app/prompts/extract_document.md` (placeholder), `app/services/prompt_loader.py`, `app/services/extraction_v2.py`, `tests/test_extraction_v2.py`, `tests/fixtures/transcripts/` | `app/services/extraction_service.py`, `app/services/enrichment_service.py` |
| 6.2 | `src/components/organisms/ProjectForm.tsx`, `src/components/organisms/StageScheduleBuilder.tsx`, `src/components/organisms/ParticipantRoster.tsx`, `src/pages/ProjectCreate.tsx`, `src/pages/ProjectEdit.tsx`, `src/hooks/useStageTemplates.ts`, `src/hooks/useProjectMutation.ts`, `src/tests/components/ProjectForm.test.tsx` | `src/App.tsx` (add routes), `src/pages/Projects.tsx` (add create button) |
| 6.3 | `src/components/molecules/StagePill.tsx`, `src/tests/components/StagePill.test.tsx` | `src/components/common/ProjectCard.tsx`, `src/pages/Projects.tsx` (sort, empty state) |

**Conflicts**:
- 6.2 and 6.3 both modify `src/pages/Projects.tsx` — 6.2 adds "Create Project" button, 6.3 adds sort dropdown and empty state.
- **Resolution**: 6.2 is primary owner of `Projects.tsx`. 6.3 appends sort/empty state. Run 6.2 first on this file, 6.3 second. OR: 6.3 only modifies `ProjectCard.tsx` and the sort logic, while 6.2 adds the create button in a different section. **Independent sections — safe to parallel.**

**No other conflicts.** 5.4 is entirely backend. 5.3 modifies different frontend files than 6.2/6.3.

---

## Wave 2 — Integration Layer

| Story | Files Created | Files Modified |
|-------|--------------|----------------|
| 5.5 | (none) | `app/database/seed.py`, `app/tests/test_models.py`, `app/tests/test_routes.py`, `src/tests/components/DecisionCard.test.tsx`, `src/tests/components/Timeline.test.tsx`, `src/tests/components/FiltersSidebar.test.tsx` |
| 7.1 | `app/api/routes/ingestion.py`, `app/api/models/ingestion.py`, `app/services/summary_service.py`, `app/services/ingestion_pipeline.py`, `tests/unit/test_ingestion_api.py` | `app/api/routes/webhooks.py`, `app/main.py` (register ingestion router) |
| 7.3 | `src/components/organisms/ManualItemForm.tsx`, `src/pages/ManualItemCreate.tsx`, `src/tests/components/ManualItemForm.test.tsx` | `src/App.tsx` (add route), `src/types/projectItem.ts` (add DISCIPLINE_LABELS if missing), `src/pages/ProjectHistory.tsx` (add "Add Item" button) |
| 9.1 | `src/components/atoms/ItemTypeBadge.tsx`, `src/components/atoms/SourceIcon.tsx`, `src/components/atoms/DisciplineCircle.tsx`, `src/components/atoms/DisciplineCircles.tsx`, `src/tests/components/ItemTypeBadge.test.tsx`, `src/tests/components/SourceIcon.test.tsx`, `src/tests/components/DisciplineCircle.test.tsx`, `src/tests/components/DisciplineCircles.test.tsx` | `src/lib/utils.ts` (add item/source/discipline utility functions) |

**Conflicts**: None.
- 5.5: seed data + test updates (backend + specific frontend tests)
- 7.1: backend ingestion (completely different routes)
- 7.3: new frontend form components
- 9.1: new atoms/ directory + utils.ts additions

7.3 and 9.1 both modify frontend files but different ones. 7.3 may modify `src/types/projectItem.ts` (add labels), 9.1 modifies `src/lib/utils.ts`. **Different files — no conflict.**

---

## Wave 3 — Core Features (MVP)

| Story | Files Created | Files Modified |
|-------|--------------|----------------|
| 8.1 | `src/components/organisms/MilestoneTimeline.tsx`, `src/components/molecules/MilestoneNode.tsx`, `src/components/molecules/StageNode.tsx`, `src/tests/components/MilestoneTimeline.test.tsx` | `src/pages/ProjectDetail.tsx` (add tab toggle) |
| 7.2 | `src/types/ingestion.ts`, `src/services/ingestionService.ts`, `src/store/ingestionStore.ts`, `src/hooks/useIngestion.ts`, `src/hooks/useIngestionMutation.ts`, `src/components/molecules/IngestionStatusBadge.tsx`, `src/components/molecules/AISummaryExpander.tsx`, `src/components/molecules/MeetingSourceRow.tsx`, `src/components/molecules/EmailSourceRow.tsx`, `src/components/molecules/DocumentSourceRow.tsx`, `src/components/molecules/IngestionFiltersBar.tsx`, `src/components/organisms/BulkActionBar.tsx`, `src/components/organisms/IngestionApproval.tsx`, `src/pages/Ingestion.tsx`, `src/tests/components/IngestionApproval.test.tsx` | `src/App.tsx` (add /ingestion route), `src/components/common/Navigation.tsx` (add badge), `src/lib/utils.ts` (add formatFileSize) |
| 9.2 | `src/components/molecules/ProjectItemRow.tsx`, `src/components/molecules/SourceGroupAccordion.tsx`, `src/tests/components/ProjectItemRow.test.tsx`, `src/tests/components/SourceGroupAccordion.test.tsx` | `src/components/organisms/Timeline.tsx` (major redesign), `src/lib/utils.ts` (add formatDenseDate), `src/tests/components/Timeline.test.tsx` |
| 7.4 | `app/services/gmail_client.py`, `app/services/gmail_poller.py`, `tests/test_gmail_poller.py`, `tests/test_gmail_client.py` | `app/main.py` (register scheduler), `requirements.txt` (add google packages) |
| 10.1 | `app/prompts/extract_email.md` (full version), `app/services/email_extractor.py`, `tests/test_email_extractor.py`, `tests/fixtures/emails/` (5 test files) | `app/services/ingestion_processor.py` (add email handler) |

**Conflicts**:
1. `src/lib/utils.ts` — modified by 7.2 (adds `formatFileSize`) and 9.2 (adds `formatDenseDate`)
   - **Resolution**: Independent function additions. Both append to end of file. **No blocking conflict.**
2. `src/App.tsx` — modified by 7.2 (adds /ingestion route) and potentially 8.1 (if adding route)
   - **Resolution**: 7.2 is primary owner of App.tsx route additions for this wave. 8.1 modifies `ProjectDetail.tsx`, not App.tsx routes.
3. `app/main.py` — modified by 7.4 (scheduler) and 10.1 doesn't modify main.py
   - **Resolution**: 7.4 is sole owner of main.py for this wave.

**All conflicts are independent-section additions. Safe parallelism.**

---

## Wave 4 — Enhancement Layer

| Story | Files Created | Files Modified |
|-------|--------------|----------------|
| 8.2 | `src/components/molecules/MilestoneStarToggle.tsx`, `src/hooks/useMilestoneToggle.ts`, `src/tests/components/MilestoneStarToggle.test.tsx`, `src/tests/hooks/useMilestoneToggle.test.ts` | `src/components/molecules/DecisionRow.tsx` (add star), `src/components/organisms/DrilldownModal.tsx` (add star in header), `src/components/molecules/MilestoneNode.tsx` (add unmark star) |
| 9.3 | `src/tests/components/MultiDisciplineIntegration.test.tsx` | `src/components/molecules/ProjectItemRow.tsx` (add DisciplineCircles), `src/components/molecules/MilestoneNode.tsx` (replace inline with atom), `src/components/organisms/DrilldownModal.tsx` (full discipline list), `src/components/atoms/DisciplineCircles.tsx` (add tooltip), `src/store/filterStore.ts` (discipline array filter), `src/pages/ProjectDetail.tsx` (filter logic) |
| 10.2 | `app/api/routes/documents.py`, `app/services/document_processor.py`, `app/prompts/extract_document.md`, `tests/test_document_processor.py`, `tests/fixtures/documents/`, `src/components/molecules/DocumentUploadButton.tsx`, `src/tests/components/DocumentUploadButton.test.tsx` | `app/services/ingestion_processor.py` (add document handler), `requirements.txt` (add pdfplumber, python-docx), `src/pages/ProjectDetail.tsx` (add upload button) |

**Conflicts**:
1. **8.2 and 9.3** both modify: `MilestoneNode.tsx`, `DrilldownModal.tsx`
   - **Resolution**: **Sequential override** — 8.2 is primary owner, runs first. 9.3 runs after 8.2 completes on shared files.
   - 8.2 adds: star toggle to MilestoneNode, star in DrilldownModal header
   - 9.3 adds: DisciplineCircles to MilestoneNode, full discipline section to DrilldownModal
   - Changes are in different code locations within each file.

2. **9.3 and 10.2** both modify `ProjectDetail.tsx`
   - **Resolution**: 9.3 modifies filter logic section; 10.2 adds upload button to toolbar. **Independent sections.**

**Execution order**: 8.2 first → then 9.3 (on shared files). 10.2 runs fully parallel.

---

## Wave 5 — Advanced Features

| Story | Files Created | Files Modified |
|-------|--------------|----------------|
| 8.3 | `src/components/molecules/MilestoneFilterBar.tsx`, `src/hooks/useMilestoneFilters.ts`, `src/tests/components/MilestoneFilterBar.test.tsx`, `src/tests/hooks/useMilestoneFilters.test.ts` | `src/components/organisms/MilestoneTimeline.tsx` (integrate filter bar), `src/lib/utils.ts` (add filterMilestones) |
| 9.4 | `src/components/molecules/MeetingSummary.tsx`, `src/hooks/useFilterUrlSync.ts`, `src/tests/components/MeetingSummary.test.tsx`, `src/tests/hooks/useFilterUrlSync.test.tsx` | `src/store/filterStore.ts` (add sourceTypes, itemTypes), `src/components/organisms/FilterBar.tsx` (add chips), `src/components/molecules/SourceGroupAccordion.tsx` (add summary), `src/pages/ProjectDetail.tsx` (combined filter logic) |
| 10.3 | `app/services/drive_client.py`, `app/services/drive_monitor.py`, `tests/test_drive_monitor.py`, `tests/test_drive_client.py` | `app/database/models/project.py` (add drive fields), `app/database/models/source.py` (add drive_file_id), `app/main.py` (schedule polling), `requirements.txt` (add google packages), `src/components/organisms/ProjectForm.tsx` (add Drive folder ID field) |

**Conflicts**: None.
- 8.3: MilestoneTimeline filters (different component from 9.4)
- 9.4: Project History filters (FilterBar, SourceGroupAccordion)
- 10.3: backend Drive integration + tiny frontend field

**Clean parallelism across all 3 agents.**

---

## Wave 6 — Final Polish

| Story | Files Created | Files Modified |
|-------|--------------|----------------|
| 8.4 | `app/api/routes/shared_links.py`, `app/database/models/shared_link.py`, `tests/test_shared_links.py`, `src/components/molecules/ShareDialog.tsx`, `src/hooks/useSharedLinks.ts`, `src/pages/SharedMilestoneTimeline.tsx`, `src/lib/exportTimeline.ts`, `src/tests/components/ShareDialog.test.tsx`, `src/tests/components/SharedMilestoneTimeline.test.tsx` | `app/main.py` (register router), `src/App.tsx` (add shared route), `src/components/organisms/MilestoneTimeline.tsx` (add readOnly prop, ref), `src/pages/ProjectDetail.tsx` (add share/export buttons) |
| 9.5 | (none — all modifications) | `src/pages/ProjectDetail.tsx` (tab toggle, breadcrumb, default view logic, URL hash), `src/components/organisms/Timeline.tsx` (user-facing text strings), `src/components/common/Navigation.tsx` (nav link text), `src/tests/pages/ProjectDetail.test.tsx` |

**Conflicts**: Both modify `ProjectDetail.tsx`.
- 8.4 adds: Share button + Export button to milestone toolbar section
- 9.5 modifies: Tab toggle text, breadcrumb labels, default tab logic

**Resolution**: **Independent sections.** 9.5 modifies the tab/breadcrumb area at the top. 8.4 adds toolbar buttons within the milestone tab content area. No overlap.

---

## Summary: Same-Wave File Conflicts

| Wave | File | Stories | Resolution |
|------|------|---------|------------|
| 0 | `app/main.py` | 5.2, 6.1 | Independent router registrations (append) |
| 1 | `src/pages/Projects.tsx` | 6.2, 6.3 | Independent sections (create button vs sort/empty) |
| 3 | `src/lib/utils.ts` | 7.2, 9.2 | Independent function additions (formatFileSize vs formatDenseDate) |
| 4 | `MilestoneNode.tsx`, `DrilldownModal.tsx` | 8.2, 9.3 | **Sequential: 8.2 first → 9.3 second** |
| 4 | `ProjectDetail.tsx` | 9.3, 10.2 | Independent sections (filter logic vs upload button) |
| 6 | `ProjectDetail.tsx` | 8.4, 9.5 | Independent sections (toolbar buttons vs tab/breadcrumb) |

**Total same-wave conflicts**: 6 (all pre-resolved with strategies above)

---

*File Ownership Map v1.0.0 — WAVE Parallel Development Methodology*
*@sm (River) + @architect (Aria)*
