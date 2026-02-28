# WAVE 6 — Final Polish

**Started:** 2026-02-28
**Completed:** 2026-02-28
**Goal:** Deliver sharing & export for Milestone Timeline and rename/navigation updates — completing Sprint 5.
**Parallelism:** `8.4 || 9.5` — 2 parallel agents

## Stories

| Story | Name | Points | Agent | Status | Tests |
|-------|------|--------|-------|--------|-------|
| 8.4 | Milestone Timeline Sharing & Export | 5 | agent-a75a3497 (worktree) | Ready for Review | 24 FE + 19 BE |
| 9.5 | Rename & Navigation Update | 3 | agent-adf3f152 (worktree) | Ready for Review | 19 new |

**Total:** 8 story points, 43 new tests, 445 frontend tests passing

## File Conflict Analysis

- **8.4**: Frontend — `ShareDialog.tsx`, `SharedMilestoneTimeline.tsx`, `useSharedLinks.ts`, `exportTimeline.ts`, `ProjectDetail.tsx` (share toolbar), `MilestoneTimeline.tsx` (forwardRef + readOnly), `App.tsx` (shared route). Backend — `shared_links.py`, `models.py` (SharedLink), `main.py` (router), `auth.py` (public path)
- **9.5**: Frontend — `ProjectDetail.tsx` (tab toggle, hash persistence, breadcrumb, heading), `Timeline.tsx` (error text rename)
- **Shared file conflicts**: `ProjectDetail.tsx` (both stories modify — independent sections)

## Merge Strategy

Both worktrees completed in parallel (~6-12 min each). Both agents regressed `ProjectDetail.tsx` to an older codebase pattern (using `useDecisions` instead of `useProjectItems`).

**Resolution:** Used main's `ProjectDetail.tsx` as the V2 base and manually merged both stories' features on top:
- **From 9.5:** `getInitialView()` URL hash reader, `handleViewChange()` with `replaceState`, breadcrumb nav with `aria-label`, dynamic h1, segmented tab control with icons (Star, Clock, FileText), ARIA tab roles
- **From 8.4:** Share/export state (`shareDialogOpen`, `exportMenuOpen`, `isExporting`), `milestoneTimelineRef`, export handlers (`handleExportPDF`, `handleExportJPEG`), admin-only Share/Export toolbar, ShareDialog component

Other files were cleanly copied or had targeted edits applied to main's existing code (no regression).

**Test fixes during merge:**
- `Timeline.test.tsx`: Updated expected text from "Failed to load items" to "Failed to load project history" (9.5 rename)
- `SharedMilestoneTimeline.test.tsx`: Added MilestoneTimeline mock since the real component uses internal hooks not available in shared context
- `ProjectDetail.test.tsx`: Rewritten to mock V2 hooks (`useProjectItems`, `useToggleMilestone`, `useMilestones`, `useStages`, etc.)

## Agent Logs

- [Story 8.4 Log](./8.4-milestone-timeline-sharing-export.md) — Sharing links + PDF/JPEG export
- [Story 9.5 Log](./9.5-rename-navigation-update.md) — Tab toggle, hash persistence, breadcrumb

## Key Integration Notes

- 8.4 adds SharedLink model to backend with 4 API endpoints (create, list, revoke, public view)
- 8.4 adds `/shared/milestones/:token` public route (no auth, no nav bar)
- 8.4 uses html2canvas + jsPDF for PDF/JPEG export of milestone timeline
- 9.5 renames "Timeline" tab to "Project History" and adds "Milestone Timeline" as default tab
- 9.5 persists active tab in URL hash (#milestones, #history, #digest)
- MilestoneTimeline now supports forwardRef and readOnly mode (hides filter bar)

## Exit Criteria

- [x] Share dialog creates/copies/revokes links
- [x] Shared public page renders milestone timeline without auth
- [x] PDF and JPEG export work via html2canvas + jsPDF
- [x] Tab toggle with 3 views (Milestone Timeline, Project History, Executive Digest)
- [x] URL hash persistence for active tab
- [x] Breadcrumb navigation updates per active view
- [x] No standalone "Timeline" text (only "Milestone Timeline" or "Project History")
- [x] All 445 frontend tests pass (2 skipped)
- [x] Both stories marked Ready for Review
