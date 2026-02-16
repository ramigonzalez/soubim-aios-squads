# Handoff: UMA (UX) to PM — Timeline Polish & Filter Redesign v3

**From:** Uma (UX-Design Expert)
**To:** PM (Project Manager)
**Date:** 2026-02-09
**Priority:** High — Stakeholder feedback from Rami (Product Owner)

---

## Summary

Rami reviewed the 3-layer timeline implementation and identified **5 UX issues** that need fixing before the timeline can be considered complete. I've created a detailed frontend spec covering all changes.

## Spec Reference

**Spec:** `docs/ux/FRONTEND-SPEC-timeline-polish-v3.md`

## Requested Stories (3)

### Story 3.13: Meeting-Decision Visual Hierarchy (3 pts)
**Problem:** Users can't visually distinguish where a meeting card ends and its child decisions begin. Everything is white-on-white.
**Solution:**
- Add 4px colored left border to meeting cards (discipline color)
- Decision rows get `bg-gray-50/80` inset background
- Decision rows get slight left indent
- Day counter changes from "X decisions" to "X meetings"

**Files:** MeetingGroup.tsx, DecisionRow.tsx, Timeline.tsx, utils.ts
**Effort:** ~0.75 day

### Story 3.14: Filter Bar Redesign (5 pts)
**Problem:** Filter dropdowns are unlabeled empty boxes. Checkboxes and date inputs have unstyled dark defaults. Group-by toggle wastes vertical space on its own row.
**Solution:**
- Pill-style filter buttons with icons and labels
- Styled checkboxes (blue accent, rounded)
- Light date inputs replacing dark ones
- Group-by toggle moved inline with filters as segmented control
- Search input on its own full-width row

**Files:** FilterBar.tsx, FilterPopover.tsx, ProjectDetail.tsx
**Effort:** ~1 day

### Story 3.15: Meeting Type Filter (3 pts)
**Problem:** No way to filter by meeting type (client meeting vs coordination vs design review). Users want to see only decisions from specific meeting types.
**Solution:**
- New "Type" filter button in the filter bar
- Popover with color-coded meeting types (matching MeetingTypeBadge colors)
- Add `meetingTypes` to the Zustand filter store
- Filter logic to show only decisions from matching meetings

**Files:** filterStore.ts, FilterBar.tsx, FilterPopover.tsx, ProjectDetail.tsx
**Effort:** ~0.75 day

## Sprint Impact

**Total points:** 11 pts (3 + 5 + 3)
**Total effort:** ~2.5 days
**Dependencies:** Stories 3.11 + 3.12 must be complete (they are already implemented on current branch)
**Recommended:** Add to Sprint 5 alongside existing 3.11/3.12 stories

## Dependency Chain

```
3.13 (Visual Hierarchy) ──── parallel ──── 3.14 (Filter Redesign)
                                               │
                              3.15 (Meeting Type Filter) ─────┘
                              (depends on 3.14 FilterBar changes)
```

**Recommendation:** Implement 3.13 and 3.14 in parallel, then 3.15 on top of 3.14.

## Action Items for PM

1. Create stories 3.13, 3.14, 3.15 in `docs/stories/`
2. Add stories to Sprint 5 in `docs/management/sprints/SPRINT_PLAN.md`
3. Assign to @dev (Dex) for implementation
4. Ensure acceptance criteria from spec are included in each story

---

*Handoff by Uma — desenhando com empatia*
