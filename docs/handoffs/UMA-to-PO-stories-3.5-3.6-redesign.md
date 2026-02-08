# Handoff: UX Design Expert (Uma) → Product Owner

**Date:** 2026-02-08
**From:** Uma (UX-Design Expert)
**To:** @po
**Subject:** Update Stories 3.5 and 3.6 — Timeline Redesign v2 (Gabriela's Feedback)
**Spec Reference:** `docs/ux/FRONTEND-SPEC-timeline-redesign-v2.md`

---

## Why This Handoff

Gabriela (Project Director / Client) reviewed the current implementation of Stories 3.5 (Decision Timeline) and 3.6 (Filters & Search Sidebar) and provided critical feedback:

> "I want something smoother and easy to use. Decisions ordered by datetime with really compacted information. If I want to drill down, I'll click the entry. A very minimalistic interface. The sidebar is too big."

She also provided a **hand-drawn wireframe** showing her preferred layout: a compact vertical timeline with full-width rows grouped by date, with a vertical line connecting entries.

I've produced a full redesign spec (`FRONTEND-SPEC-timeline-redesign-v2.md`) that addresses all her concerns. **Stories 3.5 and 3.6 need to be updated** to reflect the new design direction before @dev begins implementation.

---

## What Changed (Design Decisions Summary)

### Story 3.5 — Decision Timeline

| Area | Original Story | Redesign (v2) | Reason |
|------|---------------|----------------|--------|
| **Layout** | Card grid (3 columns) | Single-column vertical list | Gabriela wants compact, scannable rows |
| **Item component** | `DecisionCard` (big box, ~180px tall) | `DecisionRow` (compact, ~56-64px tall) | 3x more decisions visible per screen |
| **Info per item** | Statement + description + who + date + consensus + impact + confidence + anomaly badges | Statement + who + timestamp + tiny discipline pill | Progressive disclosure — details on click |
| **Grouping** | By date only | **Two modes**: By Date + By Discipline (toggle) | Gabriela requested both visualization types |
| **Visual timeline** | Blue dot + date header, no connecting line | Vertical line + circle nodes connecting groups | Matches Gabriela's wireframe |
| **Date format** | "Feb 7, 2026" (short) | "Friday, 7 February 2026" (full, human-readable) | Per Gabriela's wireframe |
| **Timestamp** | Date shown | Meeting recording timestamp `HH:MM:SS` | Gabriela wants to know *when in the meeting* |

### Story 3.6 — Filters

| Area | Original Story | Redesign (v2) | Reason |
|------|---------------|----------------|--------|
| **Container** | 256px fixed sidebar (`<aside>`) | Horizontal inline filter bar (full-width, ~48-80px) | Gabriela said sidebar is too big, wants clean and elegant |
| **Filter types** | Discipline + Meeting Type + Date Range + Anomalies | **Discipline + Date Range + Who (Decision Maker)** | Gabriela specifically requested filtering by `who` |
| **Meeting Type filter** | Included | **Removed for MVP** | Not requested by Gabriela |
| **Anomalies filter** | Included | **Deferred to Phase 2** | Not requested for MVP |
| **Who filter** | Not included | **NEW — required** | Gabriela explicitly requested filtering by decision maker |
| **UI pattern** | Sidebar with checkboxes always visible | Popover dropdowns that open on demand | Space-efficient, modern pattern (Linear/Notion style) |
| **Active filters** | Summary at bottom of sidebar | **Chip row** below filter bar with remove buttons | More visible, directly actionable |
| **Mobile** | Drawer from left | Bottom sheet (Shadcn Drawer) | Better mobile UX pattern |

---

## Action Items for @po

### 1. Update Story 3.5 — Decision Timeline Component

**File:** `docs/stories/3.5-decision-timeline-component.md`

#### Update Summary Section
- Change description to reflect compact row-based timeline with two grouping modes
- Reference `FRONTEND-SPEC-timeline-redesign-v2.md` as the design spec

#### Update Acceptance Criteria

**REPLACE** the "Decision Cards" section with:
- [ ] `DecisionRow` component: compact 2-line row (~56-64px height)
  - Line 1: `decision_statement` (truncated, 1 line) + discipline pill (abbreviated)
  - Line 2: `who` (left) + `timestamp` in `HH:MM:SS` format (right)
  - No description, consensus, impact, confidence, or anomaly badges in row
  - Click row → Opens DrilldownModal (Story 3.7)
  - Hover: subtle `bg-blue-50/50` highlight

**REPLACE** the "Meeting Grouping" section with:
- [ ] Two grouping modes via toggle: "By Date" (default) and "By Discipline"
- [ ] **By Date mode:**
  - Group by `meeting_date`, sorted newest first
  - Header: Full date format "Friday, 7 February 2026" + decision count
  - Blue circle node at each group header
  - Vertical timeline line connecting groups (`border-l-2 border-gray-200`)
- [ ] **By Discipline mode:**
  - Group by `discipline` field
  - Header: Discipline name + decision count
  - Discipline-colored circle node at each group header
  - Each row shows `meeting_date` inline (since discipline is the group header)
  - Decisions within group sorted by date (newest first)

**REPLACE** the grid layout references:
- Remove: `grid gap-4 md:grid-cols-2 lg:grid-cols-3`
- Replace with: single-column vertical list, `space-y-2` (8px gap between rows)

**UPDATE** Component Architecture section:
- Rename `DecisionCard` → `DecisionRow` (Molecule)
- Add `GroupingToggle` (Molecule)
- Remove `MeetingGroup` molecule (grouping logic moves into Timeline)

**ADD** reference to spec:
```
**Design Spec:** docs/ux/FRONTEND-SPEC-timeline-redesign-v2.md
```

#### Update Tasks
- Task for creating `DecisionRow.tsx` (replaces DecisionCard task)
- Task for Timeline redesign with vertical line + two grouping modes
- Task for `GroupingToggle.tsx` component
- Update test scenarios to match new component structure

#### Update File List
- `src/components/molecules/DecisionRow.tsx` (new, replaces DecisionCard)
- `src/components/molecules/GroupingToggle.tsx` (new)
- `src/components/organisms/Timeline.tsx` (major redesign)
- `src/components/molecules/DecisionCard.tsx` (deprecated)
- `src/lib/utils.ts` (add `formatFullDate`, `formatTimestamp`, `abbreviateDiscipline`)

---

### 2. Update Story 3.6 — Filters & Search

**File:** `docs/stories/3.6-filters-search-sidebar.md`

#### Update Title
- Change from "Filters & Search **Sidebar**" to "Filters & Search **Bar**"

#### Update Summary Section
- Replace sidebar description with horizontal inline filter bar
- Mention popover-based dropdowns instead of always-visible checkboxes
- Reference `FRONTEND-SPEC-timeline-redesign-v2.md`

#### Update Acceptance Criteria

**REPLACE** the "Filter Sidebar Layout & Structure" section with:
- [ ] `FilterBar` component: horizontal full-width bar above timeline
- [ ] Container: `bg-white border border-gray-200 rounded-lg p-3 shadow-sm`
- [ ] Inline layout: Search input + Discipline dropdown + Date dropdown + Who dropdown + Clear button
- [ ] Active filter chips row below the bar (when filters active)

**REPLACE** the "Discipline Filter" section with:
- [ ] Discipline filter via Shadcn/ui `Popover`
- [ ] Trigger: outline button "Discipline" with chevron-down icon
- [ ] Popover content: checkboxes for Architecture, MEP, Structural, Electrical, Plumbing, Landscape
- [ ] Active count shown on trigger: "Discipline (2)"

**REMOVE** the "Meeting Type Filter" section entirely (deferred, not MVP)

**REPLACE** the "Date Range Filter" section with:
- [ ] Date Range filter via Shadcn/ui `Popover`
- [ ] Trigger: outline button "Date" with chevron-down icon
- [ ] Popover: From/To date inputs + quick presets (Last 7 days, Last 30 days, This month, All time)

**ADD** new "Decision Maker (Who) Filter" section:
- [ ] Who filter via Shadcn/ui `Popover`
- [ ] Trigger: outline button "Who" with chevron-down icon
- [ ] Popover: mini search input + checkboxes for unique `who` values (extracted client-side from loaded decisions)
- [ ] Active count shown on trigger: "Who (1)"

**REMOVE** the "Anomalies Filter" section (deferred to Phase 2)

**ADD** "Active Filter Chips" section:
- [ ] Chips row below filter bar showing all active filters
- [ ] Each chip shows filter value + remove (X) button
- [ ] Discipline chips use discipline color tokens
- [ ] Date range chip: "Feb 1 – Feb 7"
- [ ] Only visible when `activeFilterCount > 0`

**UPDATE** the "Responsive Design" section:
- Desktop: full filter bar visible
- Mobile (< 768px): Search always visible, filters collapse to single "Filters ({count})" button → opens Shadcn `Drawer` (bottom sheet)

#### Update State Management
- Add `decisionMakers: string[]` to filterStore
- Add `toggleDecisionMaker(name: string)` action
- Remove `meetingTypes` and `toggleMeetingType` (deferred)

#### Update Component Architecture
```
FilterBar (Organism)
├── SearchInput (Molecule) — debounced 300ms
├── FilterPopover × 3 (Molecule) — reusable
│   ├── DisciplinePopover
│   ├── DateRangePopover
│   └── WhoPopover
├── ActiveFilterChips (Molecule)
└── ClearAllButton (Atom)
```

#### Update File List
- `src/components/organisms/FilterBar.tsx` (new, replaces FiltersSidebar)
- `src/components/molecules/FilterPopover.tsx` (new, reusable)
- `src/components/organisms/FiltersSidebar.tsx` (deprecated)
- `src/store/filterStore.ts` (modify — add decisionMakers, remove meetingTypes)

#### Update Shadcn/ui Dependencies
- Add: `Popover`, `Drawer` (for mobile)
- Keep: `Checkbox`, `Badge`, `Button`, `Input`
- Remove dependency on: `Accordion` (no longer needed without sidebar)

---

### 3. Cross-Story Updates

#### Story 3.5 ↔ 3.6 Dependency
- Story 3.6 no longer "enhances" Story 3.5 — they are **co-dependent** in the redesign
- Both reference `FRONTEND-SPEC-timeline-redesign-v2.md` as the authoritative design source
- `ProjectDetail.tsx` changes span both stories

#### Estimation Impact
- Original: 3.5 = 8 SP, 3.6 = 8 SP (total 16 SP)
- Revised estimate: **~6.5 days total** (see spec Section 14 for breakdown)
- Some work is simpler now (no sidebar layout, simpler rows) but new features added (grouping modes, who filter)
- Suggest keeping at 8 SP each, or reassess with @dev

#### Add to Both Stories
```markdown
**Design Spec:** docs/ux/FRONTEND-SPEC-timeline-redesign-v2.md
**Supersedes:** Original visual design criteria (functional requirements remain)
**Client Feedback:** Gabriela requested minimalistic timeline with compact rows,
inline filter bar, two grouping modes (date/discipline), filter by decision maker
```

---

## Files Referenced

| File | Purpose |
|------|---------|
| `docs/ux/FRONTEND-SPEC-timeline-redesign-v2.md` | **Complete redesign spec** (authoritative source) |
| `docs/stories/3.5-decision-timeline-component.md` | Story to update |
| `docs/stories/3.6-filters-search-sidebar.md` | Story to update |
| `decision-log-frontend/src/components/organisms/Timeline.tsx` | Current implementation (to be redesigned) |
| `decision-log-frontend/src/components/molecules/DecisionCard.tsx` | Current implementation (to be replaced) |
| `decision-log-frontend/src/components/organisms/FiltersSidebar.tsx` | Current implementation (to be replaced) |
| `decision-log-frontend/src/store/filterStore.ts` | Current store (to be modified) |
| `decision-log-frontend/src/pages/ProjectDetail.tsx` | Page integration (to be modified) |

---

## Notes for @po

1. **Functional requirements remain valid** — React Query, Zustand, virtual scrolling, URL persistence, WCAG AA, testing targets. Only the **visual design and component structure** changed.
2. **DrilldownModal (Story 3.7) is untouched** — all the detail Gabriela doesn't want in the list view is already handled by the modal.
3. **Executive Digest (Story 3.8) is untouched** — separate view, separate concern.
4. **The spec is implementation-ready** — @dev can reference it directly. The stories need updating primarily for traceability and acceptance criteria alignment.
5. **Consider adding a "v2" note in the Change Log** of each story to track that this was a client-driven redesign.

---

*Handoff from Uma (UX-Design Expert) — desenhando com empatia 💝*
