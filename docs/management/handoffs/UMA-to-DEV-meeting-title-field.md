# Handoff: UX Design Expert (Uma) → Dev

**Date:** 2026-02-08
**From:** Uma (UX-Design Expert)
**To:** @dev
**Subject:** Add `meeting_title` to DecisionRow — Multiple meetings per day disambiguation
**Spec Reference:** `docs/ux/FRONTEND-SPEC-timeline-redesign-v2.md` (Section 4.1, updated)

---

## Why This Change

When grouping decisions **By Date**, all decisions from the same day appear under one group header (e.g., "Friday, 7 February 2026"). However, a project typically has **multiple meetings per day** (e.g., "MEP Coordination", "Design Review", "Client Alignment"). Without a `meeting_title` in the row, users cannot tell **which meeting** produced each decision.

This was identified during review as a real-world usability gap that would surface immediately in production use.

---

## What Changed

### DecisionRow — Row 2 Updated

**Before (current):**
```
👤 Carlos (MEP Engineer)                               ⏱ 00:05:13
```

**After (with meeting_title):**
```
👤 Carlos (MEP Engineer)          📋 MEP Coordination   ⏱ 00:05:13
```

### New Field

| Element | Icon | Style | Behavior |
|---------|------|-------|----------|
| `meeting_title` | `FileText` from `lucide-react` (`w-3.5 h-3.5 text-gray-400`) | `text-xs text-gray-400 italic truncate max-w-[160px]` | Only shown if `meeting_title` is not null/empty. Lighter than `who` — secondary context. Truncated at ~160px. |

### Position in Row 2

```
[User icon + who]     [FileText icon + meeting_title]     [Clock icon + timestamp]
left                  center-right                         right
```

The `meeting_title` sits between `who` and `timestamp` in the `ml-auto` flex group, alongside the optional date (in discipline mode).

---

## Implementation Checklist

### 1. Update `Decision` type
**File:** `src/types/decision.ts`
- Add `meeting_title?: string` to the `Decision` interface

### 2. Update `DecisionRow` component
**File:** `src/components/molecules/DecisionRow.tsx`
- Import `FileText` from `lucide-react`
- Add `meeting_title` display between `who` and `timestamp` in Row 2
- Only render if `decision.meeting_title` is truthy
- Style: `text-xs text-gray-400 italic truncate max-w-[160px]`
- Icon: `FileText` with `w-3.5 h-3.5 text-gray-400`

### 3. Update mock data
**File:** `src/lib/mockData.ts`
- Add `meeting_title` to each mock `Decision` entry
- Use realistic titles: "Design Review", "MEP Coordination", "Site Planning", "Client Alignment", etc.

### 4. Verify TypeScript compiles
- Run `npx tsc --noEmit` — should pass with 0 errors

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Italic + lighter gray (`text-gray-400`)** | Subordinate to `who` (`text-gray-500`). Meeting title is contextual, not primary |
| **Truncate at 160px** | Long titles like "MEP Coordination Review Q1 2026" must not break layout |
| **Always visible** (both grouping modes) | Multiple meetings can happen on the same date AND within the same discipline |
| **`FileText` icon** | Subtle document icon — distinct from User (person) and Clock (time) |
| **Optional field** | Old/imported data without meeting titles still renders correctly |
| **No extra row height** | Fits within existing Row 2 flex layout, no vertical expansion |

---

## Files Referenced

| File | Action |
|------|--------|
| `docs/ux/FRONTEND-SPEC-timeline-redesign-v2.md` | Updated — Section 4.1, 6.1, 15, Change Log |
| `src/types/decision.ts` | Add `meeting_title?: string` |
| `src/components/molecules/DecisionRow.tsx` | Add meeting_title to Row 2 |
| `src/lib/mockData.ts` | Add meeting_title to mock data |

---

## Impact Assessment

- **Breaking:** No — `meeting_title` is optional (`?`), all existing data works
- **Visual:** Minimal — same row height, subtle italic text
- **Effort:** ~30 minutes
- **Risk:** Zero — additive change, no regressions

---

*Handoff from Uma (UX-Design Expert) — desenhando com empatia 💝*
