# Frontend Specification: Timeline Polish & Filter Redesign v3

**Spec ID:** UX-SPEC-3.13 + UX-SPEC-3.14 + UX-SPEC-3.15
**Author:** Uma (UX-Design Expert)
**Date:** 2026-02-09
**Stories:** 3.13 (Visual Hierarchy), 3.14 (Filter Redesign), 3.15 (Meeting Type Filter)
**Stakeholder Feedback:** Rami (Product Owner) — Feb 9, 2026
**Status:** Ready for Development
**Extends:** `docs/ux/FRONTEND-SPEC-3-layer-timeline.md` (3-layer timeline)

---

## 1. Context & Motivation

### Stakeholder Feedback (Rami, Feb 9, 2026)

> "It's awesome how you organized the decision collapse and the participants in the meeting view. I just want to fix some things. At some point, you don't know whether it's the meeting limit and whether it is the decisions. I want something more intuitive and clean. Clearly identifying that the first box is the meeting and all the tiles below are the decisions. Maybe a clear delimitation, maybe some color."

> "The filters are with a really bad design. I want you to reorganize that filter section following a minimalist, elegant, clean, and essential UX/UI design. Also create a filter to filter by meeting type."

> "I don't know if we want the number of decisions of each day. Maybe what we want to see is the number of meetings of each day."

### Issues Identified (5)

| # | Issue | Impact |
|---|-------|--------|
| 1 | Meeting header and decision rows share same white bg — no visual parent-child relationship | Users can't tell where meeting ends and decisions begin |
| 2 | Day counter shows "X decisions" instead of "X meetings" | Breaks mental model of Day > Meetings > Decisions hierarchy |
| 3 | Filter dropdowns have no labels, no icons — just empty boxes with chevrons | Users don't know what each filter does without clicking |
| 4 | Filter checkboxes and date inputs use dark unstyled defaults | Feels heavy, out of place with the clean design |
| 5 | No Meeting Type filter exists | Users can't filter by client meeting vs coordination vs design review |

---

## 2. Design Principles (This Spec)

| Principle | Application |
|-----------|-------------|
| **Visual Nesting** | Decision rows are visually "inside" the meeting card via background contrast + indentation |
| **Label Everything** | Every filter has a visible label + icon — no guessing |
| **Consistent Counting** | Day counters show meeting count (primary hierarchy), not decision count |
| **Minimal Chrome** | Pill-style filter buttons with clean active states, no heavy borders |
| **Color as Signal** | Meeting header gets discipline accent; decisions get subtle gray inset |

---

## 3. Story 3.13: Meeting-Decision Visual Hierarchy

### 3.1 Meeting Card — Left Accent Border

Add a colored left border to the meeting card that signals the primary discipline:

**Before:**
```
┌──────────────────────────────────────────────────────────────┐
│  Meeting Header (bg-white)                                    │
├──────────────────────────────────────────────────────────────┤
│  Decision Row 1 (bg-white)                                    │
│  Decision Row 2 (bg-white)                                    │
└──────────────────────────────────────────────────────────────┘
```

**After:**
```
┃┌─────────────────────────────────────────────────────────────┐
┃│  Meeting Header (bg-white)                                   │
┃├─────────────────────────────────────────────────────────────┤
┃│  ┌──────────────────────────────────────────────────────┐   │
┃│  │  Decision Row 1 (bg-gray-50/80)                      │   │
┃│  ├──────────────────────────────────────────────────────┤   │
┃│  │  Decision Row 2 (bg-gray-50/80)                      │   │
┃│  └──────────────────────────────────────────────────────┘   │
┃└─────────────────────────────────────────────────────────────┘
```

#### Meeting Card Container Changes

| Property | Before | After | Notes |
|----------|--------|-------|-------|
| Left border | `border border-gray-200` | `border border-gray-200 border-l-4 border-l-{discipline}` | 4px left accent, colored by primary discipline |
| Border color source | N/A | First discipline from `getParticipantDisciplines()` | Falls back to `border-l-gray-300` if no disciplines |

**Discipline Border Colors (Tailwind classes):**

| Discipline | Border Class |
|-----------|-------------|
| Architecture | `border-l-blue-400` |
| MEP | `border-l-orange-400` |
| Structural | `border-l-purple-400` |
| Electrical | `border-l-amber-400` |
| Plumbing | `border-l-cyan-400` |
| Landscape | `border-l-green-400` |
| Orphan/None | `border-l-gray-300` |

#### Decision Rows Area — Inset Background

| Property | Before | After | Notes |
|----------|--------|-------|-------|
| Decision area bg | `bg-white` (inherited) | `bg-gray-50/80` | Subtle inset effect |
| Decision area padding | None (rows have own px-4) | `px-2 pt-1 pb-1` outer wrapper | Creates visual nesting |
| Decision row indent | `px-4` | `px-4 ml-1` | Slight left indent for child feeling |
| Decision row bg | `bg-white` | `bg-transparent` | Let the parent gray-50 show through |
| Decision row hover | `hover:bg-blue-50/50` | `hover:bg-white` | Hover to white on gray-50 base = clean lift |
| Last row border | `border-b border-gray-100` | No `border-b` on last row | Clean bottom edge |

#### Orphan Group ("Other Decisions")

Orphan meetings get `border-l-gray-300` (neutral accent) — no discipline color since they don't belong to a meeting.

### 3.2 Day Counter — Meetings Instead of Decisions

**Before:**
```
● Friday, 6 February 2026                              2 decisions
```

**After:**
```
● Friday, 6 February 2026                              2 meetings
```

#### Implementation

In `Timeline.tsx`, change the group header counter:

**Before:**
```typescript
{group.total} decision{group.total !== 1 ? 's' : ''}
```

**After:**
```typescript
{group.meetings.length} meeting{group.meetings.length !== 1 ? 's' : ''}
```

**Note:** In discipline grouping mode, also show meetings count (not decisions). The decision count is already visible in each MeetingGroup header.

#### Aria-Label Update

Update the header aria-label to match:
```typescript
aria-label={`${group.label}, ${group.meetings.length} meeting${group.meetings.length !== 1 ? 's' : ''}`}
```

### 3.3 Files Modified (Story 3.13)

| File | Changes |
|------|---------|
| `src/components/molecules/MeetingGroup.tsx` | Add `border-l-4` accent, add `bg-gray-50/80` decisions area, adjust decision row styling |
| `src/components/molecules/DecisionRow.tsx` | Change hover to `hover:bg-white`, remove bottom border on last item awareness |
| `src/components/organisms/Timeline.tsx` | Change day counter from decisions to meetings count |
| `src/lib/utils.ts` | Add `getDisciplineBorderColor()` utility function |

---

## 4. Story 3.14: Filter Bar Redesign

### 4.1 Filter Button Redesign — Labeled Pills with Icons

**Before:**
```
🔍 Search decisions...    [    ▾]  [    ▾]  [    ▾]
```
Unlabeled, empty dropdown triggers with no context.

**After:**
```
🔍 Search decisions...

🏗 Discipline ▾    📅 Date range ▾    👥 Who ▾    🏷 Type ▾     [Date | Discipline]
[Active chips: Architecture ✕ | Last 7 days ✕ | Clear all]
```

#### Filter Bar Layout Changes

| Property | Before | After |
|----------|--------|-------|
| Layout | Single row: search + 3 dropdowns | Two sections: search row + filter pills row |
| Search | Shares row with filters | Full-width on its own row |
| Filter buttons | `border border-gray-300 rounded-md` no label | `rounded-full border border-gray-200` with icon + label |
| Group-by toggle | Separate row below filter bar | Inline with filter pills, right-aligned |
| Active chips | Below search row | Below filter pills row |

#### Filter Button Style Spec

**Default state:**
```
rounded-full border border-gray-200 px-3 py-1.5 text-sm text-gray-600
hover:border-gray-300 hover:bg-gray-50 transition-colors
inline-flex items-center gap-1.5
```

**Active state (has selections):**
```
rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700
hover:bg-blue-100 transition-colors
```

**Active count badge:**
```
ml-0.5 min-w-[18px] h-[18px] bg-blue-600 text-white text-[10px] font-medium
rounded-full inline-flex items-center justify-center
```

#### Icons per Filter

| Filter | Icon | From |
|--------|------|------|
| Discipline | `Building2` | lucide-react |
| Date range | `Calendar` | lucide-react |
| Who | `Users` | lucide-react |
| Type | `Tag` | lucide-react |

Icon size: `w-3.5 h-3.5` — subtle, not overpowering.

### 4.2 Checkbox Styling (All Filter Popovers)

**Before:** Dark black `#333` squares — system default checkboxes. Heavy, unstyled.

**After:** Styled Tailwind checkboxes:

```
w-4 h-4 rounded border-gray-300 text-blue-600
focus:ring-blue-500 focus:ring-offset-0 focus:ring-1
cursor-pointer
```

Replace native `<input type="checkbox">` with styled version using `accent-color` or a custom checkbox component.

### 4.3 Date Input Styling

**Before:** Dark backgrounds on date inputs (`bg-gray-800 text-white`-looking).

**After:** Light, clean inputs:

```
bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700
focus:border-blue-300 focus:ring-1 focus:ring-blue-200
```

Quick preset links styling:
```
text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 px-2 py-1.5 rounded-md
cursor-pointer transition-colors
```

### 4.4 Group-by Toggle — Inline with Filters

Move the "Group by: By Date / By Discipline" toggle from its own row into the filter pills row, right-aligned.

**Styling — Segmented Control:**
```
inline-flex rounded-full border border-gray-200 p-0.5 bg-gray-100
```

Each option:
```
// Inactive
px-3 py-1 text-xs font-medium text-gray-500 rounded-full transition-colors

// Active
px-3 py-1 text-xs font-medium text-gray-900 bg-white rounded-full shadow-sm
```

### 4.5 Filter Popover Improvements

| Property | Before | After |
|----------|--------|-------|
| Width | Various | Standardized `w-56` for all |
| Padding | `p-3` | `p-3` (keep) |
| Shadow | `shadow-lg` | `shadow-md` (softer) |
| Border | `border-gray-200` | `border-gray-200` (keep) |
| Border radius | `rounded-lg` | `rounded-xl` (slightly rounder) |
| Item spacing | variable | `space-y-1` for checkbox items |
| Item hover | none | `hover:bg-gray-50 rounded-md px-2 py-1.5` per item row |

### 4.6 Files Modified (Story 3.14)

| File | Changes |
|------|---------|
| `src/components/organisms/FilterBar.tsx` | Redesign layout: search row + filter pills row, add icons, add labels, restyle buttons, move group-by inline |
| `src/components/molecules/FilterPopover.tsx` | Restyle trigger buttons (pill style), improve checkbox styling, improve popover radius/shadow |
| `src/pages/ProjectDetail.tsx` | Remove standalone GroupingToggle, pass groupBy state down to FilterBar |

---

## 5. Story 3.15: Meeting Type Filter

### 5.1 New Filter — Meeting Type

A new filter dropdown that lets users filter decisions by the type of meeting they originated from.

#### Meeting Types Available

Derived from data (unique `meeting_type` values), expected types:

| Meeting Type | Display Label | Color |
|-------------|---------------|-------|
| `client meeting` | Client Meeting | Rose (`bg-rose-50 text-rose-700`) |
| `coordination` | Coordination | Teal (`bg-teal-50 text-teal-700`) |
| `design review` | Design Review | Amber (`bg-amber-50 text-amber-700`) |
| `internal review` | Internal Review | Blue (`bg-blue-50 text-blue-700`) |
| `internal` | Internal | Blue (`bg-blue-50 text-blue-700`) |

#### Filter Popover Spec

Same checkbox-list pattern as Discipline filter:

```
┌──────────────────────────┐
│  ○ Client Meeting        │   ← rose dot
│  ○ Coordination          │   ← teal dot
│  ○ Design Review         │   ← amber dot
│  ○ Internal Review       │   ← blue dot
└──────────────────────────┘
```

Each row has a small color dot (matching meeting type color) before the label, instead of a plain checkbox. This gives instant visual recognition.

**Color dot spec:**
```
w-2.5 h-2.5 rounded-full {meetingTypeColor.bg with full opacity}
```

For the checkbox behavior, wrap the color dot + label in a clickable row:
```
flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer
```

#### Filter Store Changes

Add to `filterStore.ts`:

```typescript
// New state
meetingTypes: string[]

// New actions
toggleMeetingType: (type: string) => void
setMeetingTypes: (types: string[]) => void
```

#### Filtering Logic

In `ProjectDetail.tsx` (or wherever filtering happens), add:

```typescript
// Add meeting type filter
if (filters.meetingTypes.length > 0) {
  filtered = filtered.filter(d =>
    d.meeting_type && filters.meetingTypes.includes(d.meeting_type.toLowerCase())
  )
}
```

#### Active Chip for Meeting Type

When meeting type filters are active, show chips with the meeting type color:

```
[Client Meeting ✕]  ← bg-rose-50 text-rose-700
[Coordination ✕]    ← bg-teal-50 text-teal-700
```

### 5.2 Files Modified (Story 3.15)

| File | Changes |
|------|---------|
| `src/store/filterStore.ts` | Add `meetingTypes: string[]`, `toggleMeetingType()`, `setMeetingTypes()`, update `reset()` |
| `src/components/organisms/FilterBar.tsx` | Add Meeting Type filter button + popover |
| `src/components/molecules/FilterPopover.tsx` | Support optional color dots for items |
| `src/pages/ProjectDetail.tsx` | Add meeting type filtering logic |

---

## 6. Complete File Change Summary

### Modified Files

| File | Story | Changes |
|------|-------|---------|
| `src/components/molecules/MeetingGroup.tsx` | 3.13 | Left accent border, gray-50 decision area |
| `src/components/molecules/DecisionRow.tsx` | 3.13 | Hover to white, transparent bg |
| `src/components/organisms/Timeline.tsx` | 3.13 | Day counter: meetings instead of decisions |
| `src/lib/utils.ts` | 3.13 | Add `getDisciplineBorderColor()` |
| `src/components/organisms/FilterBar.tsx` | 3.14, 3.15 | Complete redesign: labeled pills, icons, meeting type filter, inline group-by |
| `src/components/molecules/FilterPopover.tsx` | 3.14, 3.15 | Pill triggers, styled checkboxes, color dot support |
| `src/store/filterStore.ts` | 3.15 | Add `meetingTypes` state + actions |
| `src/pages/ProjectDetail.tsx` | 3.14, 3.15 | Move group-by to FilterBar, add meeting type filtering |

### No New Files

All changes are modifications to existing components. No new files needed.

---

## 7. Acceptance Criteria

### Story 3.13: Visual Hierarchy
- [ ] Meeting cards have a 4px left border colored by primary discipline
- [ ] Orphan group has gray left border
- [ ] Decision rows area has `bg-gray-50/80` background
- [ ] Decision rows have subtle left indent
- [ ] Decision rows hover to white (lift effect on gray)
- [ ] Day header shows "X meeting(s)" instead of "X decisions"
- [ ] Aria labels updated to reference meetings count

### Story 3.14: Filter Redesign
- [ ] Each filter button shows an icon + label (Discipline, Date range, Who, Type)
- [ ] Filter buttons use pill style (rounded-full)
- [ ] Active filters show blue-tinted button + count badge
- [ ] Checkboxes in all popovers are styled (not dark squares)
- [ ] Date inputs are light styled (not dark backgrounds)
- [ ] Group-by toggle moved inline with filters, right-aligned as segmented control
- [ ] Search input on its own row, full width
- [ ] Active filter chips display below filter pills row
- [ ] Quick date presets styled as clean clickable text

### Story 3.15: Meeting Type Filter
- [ ] New "Type" filter button appears in filter bar
- [ ] Clicking opens popover with meeting types from data
- [ ] Each type shows color dot matching MeetingTypeBadge colors
- [ ] Selected types filter decisions (only show decisions from matching meetings)
- [ ] Active meeting type chips show with correct colors
- [ ] `meetingTypes` added to filterStore with toggle/set/reset
- [ ] Decisions without meeting_type are hidden when type filter active

---

## 8. Implementation Priority

| Priority | Task | Effort | Story |
|----------|------|--------|-------|
| **P0** | Meeting card left accent border | 0.25 day | 3.13 |
| **P0** | Decision area gray-50 inset | 0.25 day | 3.13 |
| **P0** | Day counter: meetings count | 15 min | 3.13 |
| **P0** | Filter buttons: add icons + labels | 0.5 day | 3.14 |
| **P0** | Checkbox/date input restyling | 0.25 day | 3.14 |
| **P1** | Group-by toggle inline | 0.25 day | 3.14 |
| **P1** | Meeting Type filter (store + UI + logic) | 0.5 day | 3.15 |
| **P1** | Active chip colors for meeting types | 15 min | 3.15 |
| **P2** | Popover styling polish | 15 min | 3.14 |

**Total estimated effort: ~2.5 days**

---

## Change Log

| Date | Change |
|------|--------|
| 2026-02-09 | Created v3 polish spec based on Rami's feedback on visual hierarchy, filters, and meeting count |

---

**Related Stories:** 3.5 (Timeline v2), 3.6 (Filters), 3.11 (Data Layer), 3.12 (3-Layer Timeline), 3.13-3.15 (This spec)
**Extends:** `docs/ux/FRONTEND-SPEC-3-layer-timeline.md`

---

*Generated by Uma (UX-Design Expert) — desenhando com empatia*
