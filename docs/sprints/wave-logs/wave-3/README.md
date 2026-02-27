# WAVE 3 — MVP Cut Line (Maximum Parallelism)

**Started:** 2026-02-27
**Completed:** 2026-02-27
**Goal:** Deliver the Milestone Timeline, Ingestion Approval UI, Dense Rows layout, Gmail API poller, and Email extraction pipeline — completing the MVP feature set.
**Parallelism:** `8.1 || 7.2 || 9.2 || 7.4 || 10.1` — 5 parallel agents (maximum wave parallelism)

## Stories

| Story | Name | Points | Agent | Status | Tests |
|-------|------|--------|-------|--------|-------|
| 8.1 | Frontend — Milestone Timeline Component | 13 | agent-a320c95f | Ready for Review | 15 new |
| 7.2 | Frontend — Ingestion Approval Page | 8 | agent-ab2b6109 | Ready for Review | 34 new |
| 9.2 | Dense Rows Layout & Visual Separation | 8 | agent-a361c2bf | Ready for Review | 34 new |
| 7.4 | Backend — Gmail API Poller | 8 | agent-a9c08091 | Ready for Review | 49 new |
| 10.1 | Email Item Extraction Pipeline | 8 | agent-a828803e | Ready for Review | 24 new |

**Total:** 45 story points, 156 new tests, 299 frontend tests passing, 22 backend tests passing

## File Conflict Analysis

- **8.1**: Frontend — `MilestoneTimeline.tsx`, `MilestoneNode.tsx`, `StageNode.tsx`, `useStages.ts`, `ProjectDetail.tsx` (view toggle)
- **7.2**: Frontend — `IngestionApproval.tsx`, `Ingestion.tsx`, `ingestionService.ts`, `ingestionStore.ts`, `Navigation.tsx`, `App.tsx`, `utils.ts` (+formatFileSize)
- **9.2**: Frontend — `Timeline.tsx` (dense rewrite), `ProjectItemRow.tsx`, `SourceGroupAccordion.tsx`, `utils.ts` (+formatDenseDate)
- **7.4**: Backend — `gmail_poller.py`, `gmail_auth.py`, `email_matcher.py`, `scheduler.py`, `admin.py`, `config.py`, `main.py`, `requirements.txt`
- **10.1**: Backend — `email_extractor.py`, `extract_email.md` prompt, `ingestion_pipeline.py`
- **Shared file conflicts**: `utils.ts` (7.2 + 9.2 both append), `App.tsx` (7.2 owns), `main.py` (7.4 owns), `ingestion_pipeline.py` (10.1 owns)

## Merge Strategy

All 5 worktrees completed in parallel (~8-14 min each). Merged via file copy:
- Worktrees agent-a320c95f, agent-a828803e, agent-a9c08091 on older base (48210d1)
- Worktrees agent-a361c2bf, agent-ab2b6109 on latest main (d596b3c)
- **utils.ts**: Manually merged — appended formatFileSize (7.2) and formatDenseDate (9.2)
- **projectItem.ts**: Added ProjectStage, StagesResponse, MilestonesResponse types from 8.1 to main's version (preserving existing V2 types)
- **useMilestones.ts**: Main's version preserved (existing from Story 5.3)

## Agent Logs

- [Story 8.1 Log](./8.1-milestone-timeline.md) — Milestone Timeline with stage grouping
- [Story 7.2 Log](./7.2-ingestion-approval.md) — Admin ingestion approval page
- [Story 9.2 Log](./9.2-dense-rows-layout.md) — Dense single-line item rows
- [Story 7.4 Log](./7.4-gmail-api-poller.md) — Gmail API polling with OAuth2/service account
- [Story 10.1 Log](./10.1-email-extraction-pipeline.md) — AI email item extraction

## Key Integration Notes

- 8.1's MilestoneTimeline uses inline atoms (built on older base without Story 9.1 atoms) — future refactor to use 9.1 atoms
- 9.2 completely rewrites Timeline.tsx to dense rows layout with SourceGroupAccordion
- 8.1 adds 3-view toggle in ProjectDetail.tsx: milestones | history | digest
- 7.2 adds /ingestion route + IngestionNavLink with pending count badge
- 7.4 + 10.1 form the complete email pipeline: Gmail poll → Source record → AI extraction → ProjectItems

## Exit Criteria

- [x] Milestone Timeline renders with stage grouping and today marker
- [x] Ingestion Approval page with bulk actions and admin guard
- [x] Dense rows layout with source group accordions
- [x] Gmail API poller with OAuth2 + service account auth
- [x] Email extraction pipeline with Claude AI
- [x] All frontend tests pass (299 passed, 2 skipped)
- [x] All runnable backend tests pass (22 passed)
- [x] Both formatFileSize and formatDenseDate added to utils.ts
- [x] ProjectStage types added to projectItem.ts
- [x] All 5 stories marked Ready for Review
