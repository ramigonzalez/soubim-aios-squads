# Frontend Specification: Decision Timeline Redesign v2

**Spec ID:** UX-SPEC-3.5v2 + UX-SPEC-3.6v2
**Author:** Uma (UX-Design Expert)
**Date:** 2026-02-08
**Stories:** 3.5 (Decision Timeline), 3.6 (Filters & Search)
**Stakeholder Feedback:** Gabriela (Project Director / Client)
**Status:** Ready for Development

---

## 1. Context & Motivation

### Client Feedback (Gabriela)

Gabriela reviewed the current implementation and provided the following feedback:

> "I want something smoother and easy to use rather than a more complex visualization. For the MVP, I want a UI/UX where I can visualize all the decisions made along the project. Decisions ordered by datetime with really compacted information. If I want to drill down, I'll click the entry. I want a very minimalistic interface without being obvious."

### Core Problem

The current implementation uses **large card boxes in a grid layout** which:
- Shows only ~3 decisions per screen (low information density)
- Feels like a dashboard/catalog rather than a chronological decision log
- The fixed 256px sidebar steals space from the main content
- Too much information crammed into each card (description, badges, metadata)

### What Gabriela Wants

A **decision ledger** — compact, scannable, chronological. Think `git log`, not Pinterest.

- **Compact rows** instead of big cards
- **~10-15 decisions visible** per screen (vs. current ~3)
- **Click to drill down** for details (existing DrilldownModal, Story 3.7)
- **Two grouping modes**: By Date and By Discipline
- **Inline filter bar** instead of sidebar (clean, elegant, space-efficient)
- **Filter by**: Discipline, Date Range, Decision Maker (who)

### Wireframe Reference

Gabriela provided a hand-drawn wireframe showing:
- Vertical timeline line with circle nodes at each date group
- Full-width compact rows (2 lines: statement + who/timestamp)
- ~10px gap between entries
- Date headers with full day name: "Friday, 3 February 2026"
- Meeting timestamp format: `{00:05:13}`

---

## 2. Design Principles (This Spec)

| Principle | Application |
|-----------|-------------|
| **Minimalism** | Show only `decision_statement`, `who`, `timestamp`, tiny discipline indicator |
| **Information Density** | 10-15 decisions visible per screen, not 3 |
| **Progressive Disclosure** | Summary in row, details on click (DrilldownModal) |
| **Scannable** | Users scan vertically, not across a grid |
| **Contextual Filtering** | Filters integrated into content flow, not a separate panel |
| **Two Mental Models** | Date-first (chronological review) AND Discipline-first (domain review) |

---

## 3. Page Layout Specification

### 3.1 Overall Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER (existing)                                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Project Decisions                      [Timeline]  Executive Digest│
│  {N} decisions found                                                │
│                                                                     │
│  ┌─ FILTER BAR (NEW) ────────────────────────────────────────────┐ │
│  │ 🔍 Search...  │ Discipline ▾ │ Date ▾ │ Who ▾ │   ✕ Clear(N) │ │
│  │ [active chip ✕] [active chip ✕]                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Group by:  (● By Date)  ( By Discipline)                          │
│                                                                     │
│  ┌─ TIMELINE CONTENT ───────────────────────────────────────────┐  │
│  │  ● {Date/Discipline Header}                       {N} items  │  │
│  │  │                                                           │  │
│  │  │  {DecisionRow}                                            │  │
│  │  │  {DecisionRow}                                            │  │
│  │  │  {DecisionRow}                                            │  │
│  │  │                                                           │  │
│  │  ● {Date/Discipline Header}                       {N} items  │  │
│  │  │                                                           │  │
│  │  │  {DecisionRow}                                            │  │
│  │  :                                                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Key Layout Changes from v1

| Element | v1 (Current) | v2 (This Spec) |
|---------|-------------|----------------|
| Filter area | 256px fixed sidebar (`<aside>`) | Horizontal filter bar (full-width, ~48-80px height) |
| Content width | `calc(100% - 256px - gap)` | **Full width** (no sidebar stealing space) |
| Timeline items | Card grid (`grid md:grid-cols-2 lg:grid-cols-3`) | **Single-column list** (full-width rows) |
| Grouping | By date only | **Toggle: By Date / By Discipline** |
| Page component | `<aside> + <main>` flex layout | `<header> + <FilterBar> + <main>` vertical stack |

---

## 4. Component Specifications

### 4.1 DecisionRow (NEW — replaces DecisionCard)

**Atomic level:** Molecule
**File:** `src/components/molecules/DecisionRow.tsx`
**Replaces:** `src/components/molecules/DecisionCard.tsx`

#### Visual Spec

```
┌──────────────────────────────────────────────────────────────────────┐
│  Install central HVAC system with zone-controlled ventilation   Mep │
│  👤 Carlos (MEP Engineer)       📋 MEP Coordination      ⏱ 00:05:13 │
└──────────────────────────────────────────────────────────────────────┘
```

#### Layout Details

| Property | Value | Notes |
|----------|-------|-------|
| **Height** | ~56-64px (2 lines of content + padding) | Compact! |
| **Padding** | `py-3 px-4` (12px vertical, 16px horizontal) | Tight but breathable |
| **Background** | `bg-white` | Clean base |
| **Border** | `border-b border-gray-100` | Bottom border only, subtle separator |
| **Border-radius** | `rounded-md` | Subtle rounding |
| **Hover** | `hover:bg-blue-50/50` background + `cursor-pointer` | Gentle highlight |
| **Active/Press** | `active:bg-blue-50` | Tactile feedback |
| **Transition** | `transition-colors duration-150` | Smooth state change |
| **Gap between rows** | `8px` (Gabriela specified ~10px) | `space-y-2` on container |

#### Content Layout (2 rows)

**Row 1: Decision Statement + Discipline Tag**
```
┌──────────────────────────────────────────────────────────────────┐
│ {decision_statement, truncated 1 line}              {discipline} │
└──────────────────────────────────────────────────────────────────┘
```

| Element | Style | Behavior |
|---------|-------|----------|
| `decision_statement` | `text-sm font-medium text-gray-900 truncate flex-1` | Single line, truncated with ellipsis |
| `discipline` | Tiny pill badge: `text-xs px-2 py-0.5 rounded-full` | Uses discipline color tokens. Abbreviate: "Architecture" → "Arch", "Structural" → "Struct", "Electrical" → "Elec" |

**Row 2: Who + Meeting Title + Timestamp**
```
┌──────────────────────────────────────────────────────────────────┐
│ 👤 {who}                  📋 {meeting_title}        ⏱ {timestamp}│
└──────────────────────────────────────────────────────────────────┘
```

| Element | Style | Notes |
|---------|-------|-------|
| User icon | `lucide-react User`, `w-3.5 h-3.5 text-gray-400` | Tiny, muted |
| `who` | `text-xs text-gray-500` | e.g., "Carlos (MEP Engineer)" |
| FileText icon | `lucide-react FileText`, `w-3.5 h-3.5 text-gray-400` | Center-right, muted |
| `meeting_title` | `text-xs text-gray-400 italic truncate max-w-[160px]` | e.g., "MEP Coordination". Hidden if null/empty. Lighter than `who` — secondary context |
| Clock icon | `lucide-react Clock`, `w-3.5 h-3.5 text-gray-400` | Right-aligned |
| `timestamp` | `text-xs text-gray-500 font-mono tabular-nums` | Format: `HH:MM:SS` from meeting recording |

#### Conditional: Date Column (Discipline grouping mode only)

When grouping by Discipline, add `meeting_date` between `who` and `timestamp`:

```
│ 👤 Carlos (MEP Engineer)   📋 MEP Coord.   📅 Feb 7, 2026   ⏱ 00:05:13 │
```

**Note:** `meeting_title` is always shown (both grouping modes) when available, since multiple meetings can occur on the same date.

#### Props Interface

```typescript
interface DecisionRowProps {
  decision: Decision
  onClick: (id: string) => void
  showDate?: boolean       // true when grouped by discipline
  showDiscipline?: boolean // true when grouped by date (default)
}
```

#### Interaction

| Event | Behavior |
|-------|----------|
| `click` | Calls `onClick(decision.id)` → Opens DrilldownModal (Story 3.7) |
| `hover` | Background changes to `bg-blue-50/50` |
| `keyboard Enter` | Same as click (via `role="button"` + `tabIndex={0}` + `onKeyDown`) |
| `focus` | `ring-2 ring-blue-500 ring-offset-1` (accessibility) |

---

### 4.2 Timeline (REDESIGNED)

**Atomic level:** Organism
**File:** `src/components/organisms/Timeline.tsx` (modify existing)

#### Visual Spec — Grouped by Date (default)

```
● Friday, 7 February 2026                                    3 decisions
│
│  Install central HVAC system with zone-controlled...            Mep
│  👤 Carlos (MEP Engineer)                                  ⏱ 00:05:13
│
│  Approve revised floor plan for levels 12-18...                Arch
│  👤 Gabriela (Project Director)                            ⏱ 00:12:47
│
│  Use recycled steel for structural framing...              Struct
│  👤 Carlos (Structural Engineer)                           ⏱ 00:31:02
│
● Tuesday, 4 February 2026                                   2 decisions
│
│  Install LED lighting system with smart controls...           Elec
│  👤 Gabriela (Project Director)                            ⏱ 00:08:22
│
│  Route main plumbing through eastern shaft...              Plumb
│  👤 Ana (Plumbing Engineer)                                ⏱ 00:45:11
:
```

#### Visual Spec — Grouped by Discipline

```
● Architecture (blue node)                                    4 decisions
│
│  Approve revised floor plan for levels 12-18...
│  👤 Gabriela (Director)             📅 Feb 7, 2026        ⏱ 00:12:47
│
│  Set maximum building height to 180m...
│  👤 Ana (Architect)                  📅 Feb 3, 2026        ⏱ 00:22:15
│
● MEP (orange node)                                           3 decisions
│
│  Install central HVAC system with zone-controlled...
│  👤 Carlos (MEP Engineer)            📅 Feb 7, 2026        ⏱ 00:05:13
│
● Structural (purple node)                                    2 decisions
│
│  Use high-strength concrete (C50) for foundation...
│  👤 Carlos (Structural Eng.)         📅 Feb 1, 2026        ⏱ 00:31:02
:
```

#### Timeline Visual Elements

**Vertical Line:**
| Property | Value |
|----------|-------|
| Width | `2px` (`w-0.5`) |
| Color | `bg-gray-200` |
| Position | Left side, connecting all group headers |
| Implementation | `border-l-2 border-gray-200` on the items container with `ml-[5px]` offset from node center |

**Group Node (Circle):**
| Property | Value (By Date) | Value (By Discipline) |
|----------|-----------------|----------------------|
| Size | `12px` (`w-3 h-3`) | `12px` (`w-3 h-3`) |
| Color | `bg-blue-600` | Discipline color token (e.g., `bg-discipline-mep`) |
| Shape | `rounded-full` | `rounded-full` |
| Border | `ring-2 ring-white` (white outline for contrast) | Same |

**Group Header:**
| Property | Value (By Date) | Value (By Discipline) |
|----------|-----------------|----------------------|
| Text | Full date: "Friday, 7 February 2026" | Discipline name: "Architecture" |
| Style | `text-sm font-semibold text-gray-700` | `text-sm font-semibold text-gray-700` |
| Right side | `{N} decisions` count, `text-xs text-gray-400` | Same |

**Date format function:**
```typescript
// "Friday, 7 February 2026"
function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}
```

#### Grouping Toggle

```
Group by:  (● By Date)  ( By Discipline)
```

| Property | Value |
|----------|-------|
| Component | Shadcn/ui `RadioGroup` with `RadioGroupItem` or custom segmented control |
| Position | Below filter bar, above timeline content |
| Style | `text-sm text-gray-600`, `flex items-center gap-4` |
| Default | "By Date" selected |
| State | `groupBy: 'date' | 'discipline'` in component state (not in URL for MVP) |

#### Props Interface

```typescript
interface TimelineProps {
  decisions: Decision[]
  onSelectDecision: (id: string) => void
  groupBy: 'date' | 'discipline'
}
```

#### Grouping Logic

```typescript
// Group by Date
function groupByDate(decisions: Decision[]): Record<string, Decision[]> {
  const grouped = decisions.reduce((acc, d) => {
    const key = d.meeting_date || d.created_at
    const dateKey = new Date(key).toISOString().split('T')[0] // normalize to YYYY-MM-DD
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(d)
    return acc
  }, {} as Record<string, Decision[]>)

  // Sort keys newest first
  return Object.fromEntries(
    Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a))
  )
}

// Group by Discipline
function groupByDiscipline(decisions: Decision[]): Record<string, Decision[]> {
  const grouped = decisions.reduce((acc, d) => {
    const key = d.discipline || 'general'
    if (!acc[key]) acc[key] = []
    acc[key].push(d)
    return acc
  }, {} as Record<string, Decision[]>)

  // Sort each group's decisions by date (newest first)
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => {
      const dateA = a.meeting_date || a.created_at
      const dateB = b.meeting_date || b.created_at
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    })
  }

  return grouped
}
```

#### States

| State | Display |
|-------|---------|
| **Loading** | Skeleton: 3 groups, each with 3 skeleton rows (pulsing `animate-pulse` thin bars) |
| **Empty** | Centered icon (Calendar) + "No decisions yet" + subtitle. Dashed border container |
| **Error** | Shadcn Alert (destructive) + Retry button |
| **Data** | Timeline with grouped DecisionRows |

---

### 4.3 FilterBar (NEW — replaces FiltersSidebar)

**Atomic level:** Organism
**File:** `src/components/organisms/FilterBar.tsx`
**Replaces:** `src/components/organisms/FiltersSidebar.tsx`

#### Visual Spec — Default State (no filters active)

```
┌──────────────────────────────────────────────────────────────────────┐
│  🔍  Search decisions...    │ Discipline ▾ │ Date ▾ │ Who ▾        │
└──────────────────────────────────────────────────────────────────────┘
```

#### Visual Spec — With Active Filters

```
┌──────────────────────────────────────────────────────────────────────┐
│  🔍  foundation             │ Discipline ▾ │ Date ▾ │ Who ▾  ✕ (3) │
│                                                                      │
│  [MEP ✕]  [Structural ✕]  [Feb 1 – Feb 7 ✕]                       │
└──────────────────────────────────────────────────────────────────────┘
```

#### Layout Details

| Property | Value |
|----------|-------|
| Container | `bg-white border border-gray-200 rounded-lg p-3` |
| Shadow | `shadow-sm` (very subtle) |
| Margin | `mb-4` (below page header, above grouping toggle) |
| Width | Full width of content area |
| Height | ~48px collapsed, ~80px with active filter chips |

#### Search Input

| Property | Value |
|----------|-------|
| Position | Left side, takes flexible width |
| Icon | `lucide-react Search`, `w-4 h-4 text-gray-400`, inside input left |
| Input | `text-sm`, `placeholder="Search decisions..."`, `border-0 focus:ring-0` (borderless inside bar) |
| Debounce | 300ms |
| Clear | Small `X` icon appears when text present |

#### Filter Dropdowns (Popovers)

Each filter is a button that opens a Shadcn/ui `Popover`:

**Discipline Popover:**
```
┌──────────────────────┐
│  □ Architecture      │
│  □ MEP               │
│  □ Structural        │
│  □ Electrical        │
│  □ Plumbing          │
│  □ Landscape         │
└──────────────────────┘
```

| Property | Value |
|----------|-------|
| Component | Shadcn/ui `Popover` + `PopoverTrigger` + `PopoverContent` |
| Trigger | `Button variant="outline" size="sm"` with chevron-down icon |
| Content | List of Shadcn/ui `Checkbox` + `Label` pairs |
| Width | `w-48` (popover content) |
| Active indicator | Trigger shows count: "Discipline (2)" when filters active |

**Date Range Popover:**
```
┌──────────────────────────┐
│  From:  [ date picker  ] │
│  To:    [ date picker  ] │
│                          │
│  Quick:                  │
│  ○ Last 7 days           │
│  ○ Last 30 days          │
│  ○ This month            │
│  ○ All time              │
└──────────────────────────┘
```

| Property | Value |
|----------|-------|
| Date inputs | HTML5 `type="date"` with Shadcn/ui Input styling |
| Quick filters | Radio buttons for common ranges |
| Width | `w-64` |

**Who (Decision Maker) Popover:**
```
┌──────────────────────┐
│  🔍 Filter names...  │
│  □ Carlos            │
│  □ Gabriela          │
│  □ Ana               │
│  □ Miguel            │
└──────────────────────┘
```

| Property | Value |
|----------|-------|
| Data source | Extract unique `who` values from decisions (client-side) |
| Search | Mini search input within popover to filter names |
| Component | Same Checkbox + Label pattern |

#### Active Filter Chips

When filters are active, show a row of removable chips below the filter bar:

```
[MEP ✕]  [Structural ✕]  [Carlos ✕]  [Feb 1 – Feb 7 ✕]
```

| Property | Value |
|----------|-------|
| Container | `flex flex-wrap gap-1.5 mt-2` (only renders if active filters > 0) |
| Chip style | `inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full hover:bg-gray-200` |
| Discipline chips | Use discipline color: `bg-discipline-mep/10 text-discipline-mep` |
| Remove button | `X` icon, `w-3 h-3`, removes that specific filter |

#### Clear All Button

| Property | Value |
|----------|-------|
| Position | Right side of filter bar, inline with dropdowns |
| Visibility | Only shown when `activeFilterCount > 0` |
| Style | `text-xs text-gray-500 hover:text-gray-700` with small X icon |
| Label | `✕ Clear ({count})` |
| Action | Resets all filters via `filterStore.reset()` |

#### Mobile (< 768px)

| Property | Value |
|----------|-------|
| Search | Full width, always visible |
| Filter buttons | Collapse to single `🎚️ Filters ({count})` button |
| Popover behavior | Opens as bottom sheet (Shadcn/ui `Drawer`) |
| Active chips | Horizontally scrollable row |

---

### 4.4 Updated ProjectDetail Page

**File:** `src/pages/ProjectDetail.tsx` (modify existing)

#### Key Changes

1. **Remove** `<aside>` sidebar wrapper for FiltersSidebar
2. **Add** `<FilterBar />` in vertical flow (below header, above timeline)
3. **Add** grouping toggle state (`groupBy: 'date' | 'discipline'`)
4. **Pass** `groupBy` to Timeline component
5. **Full-width** main content (no `flex gap-6` with sidebar)

#### New Layout Structure

```tsx
<div className="min-h-screen bg-gray-50">
  <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    {/* Header + View Toggle (existing, unchanged) */}
    <PageHeader />

    {/* NEW: Filter Bar (replaces sidebar) */}
    <FilterBar />

    {/* NEW: Grouping Toggle */}
    <GroupingToggle value={groupBy} onChange={setGroupBy} />

    {/* Main Content (now full-width, no sidebar) */}
    <main>
      {view === 'timeline' ? (
        <Timeline
          decisions={filteredDecisions}
          onSelectDecision={handleSelectDecision}
          groupBy={groupBy}
        />
      ) : (
        <ExecutiveDigest digest={digestData} />
      )}
    </main>

    {/* DrilldownModal (existing, unchanged) */}
    <DrilldownModal ... />
  </div>
</div>
```

Note: `max-w-5xl` (1024px) instead of `max-w-7xl` (1280px) — content doesn't need to be super wide without sidebar. Adjust if needed.

---

## 5. State Management Changes

### 5.1 FilterStore Updates

**File:** `src/store/filterStore.ts` (modify existing)

#### New Fields

```typescript
interface FilterState {
  // Existing
  disciplines: string[]
  dateFrom: string | null
  dateTo: string | null
  searchQuery: string

  // NEW
  decisionMakers: string[]   // filter by "who" field

  // REMOVED
  // meetingTypes: string[]  // Gabriela didn't request this for MVP

  // NEW Actions
  toggleDecisionMaker: (name: string) => void
  setDecisionMakers: (names: string[]) => void

  // Existing actions (keep)
  toggleDiscipline: (discipline: string) => void
  setDisciplines: (disciplines: string[]) => void
  setDateRange: (from: string | null, to: string | null) => void
  setSearchQuery: (query: string) => void
  reset: () => void
}
```

### 5.2 Grouping State

Managed locally in `ProjectDetail.tsx` (no need for global store):

```typescript
const [groupBy, setGroupBy] = useState<'date' | 'discipline'>('date')
```

---

## 6. Data Requirements

### 6.1 Decision Fields Used by DecisionRow

| Field | Type | Source | Display |
|-------|------|--------|---------|
| `id` | string | API | Key + onClick callback |
| `decision_statement` | string | API | Row 1, truncated to 1 line |
| `who` | string | API | Row 2, left side |
| `meeting_title` | string? | API | Row 2, center — italic, muted. Identifies which meeting the decision came from. Hidden if null/empty |
| `timestamp` | string | API | Row 2, right side (format: `HH:MM:SS`) |
| `discipline` | string | API | Tiny pill badge, right of statement |
| `meeting_date` | string | API | Group header (By Date) or inline (By Discipline) |
| `created_at` | string | API | Fallback for grouping if `meeting_date` is null |

### 6.2 Fields NOT Shown in Row (moved to DrilldownModal)

- `why` / rationale
- `consensus`
- `impacts`
- `confidence`
- `anomaly_flags`
- `causation`
- `similar_decisions`
- `transcript_excerpt`

### 6.3 Decision Maker List (for "Who" filter)

Extracted client-side from loaded decisions:

```typescript
// Extract unique decision makers from current decisions
const decisionMakers = useMemo(() => {
  const names = decisions.map(d => d.who)
  return [...new Set(names)].sort()
}, [decisions])
```

---

## 7. Responsive Behavior

### Desktop (>= 1024px)

```
┌──────────────────────────────────────────────────────────────┐
│ Header                              [Timeline] [Digest]      │
│                                                              │
│ 🔍 Search...  │ Discipline ▾ │ Date ▾ │ Who ▾ │ ✕ Clear(2) │
│ [MEP ✕] [Carlos ✕]                                          │
│                                                              │
│ Group by: (● Date) ( Discipline)                             │
│                                                              │
│ ● Friday, 7 February 2026                        3 items    │
│ │  Decision row full width...                                │
│ │  Decision row full width...                                │
│ │  Decision row full width...                                │
│ ● Tuesday, 4 February 2026                       2 items    │
│ │  Decision row full width...                                │
└──────────────────────────────────────────────────────────────┘
```

### Tablet (768px - 1023px)

- Same layout, slightly tighter padding
- Filter bar wraps naturally (search on top, buttons below)
- Decision rows stay full width

### Mobile (< 768px)

```
┌──────────────────────────┐
│ Header              ☰    │
│                          │
│ Project Decisions        │
│ [Timeline] [Digest]      │
│                          │
│ 🔍 Search...    🎚️ (2)   │
│ [MEP ✕] [Carlos ✕]      │
│                          │
│ (● Date) ( Discipline)   │
│                          │
│ ● Fri, 7 Feb 2026    3  │
│ │                        │
│ │ Install central HV...  │
│ │ Carlos        ⏱ 05:13 │
│ │                        │
│ │ Approve floor plan...  │
│ │ Gabriela      ⏱ 12:47 │
│ :                        │
└──────────────────────────┘
```

| Element | Mobile Behavior |
|---------|----------------|
| Filter dropdowns | Single "Filters" button → opens Shadcn `Drawer` (bottom sheet) |
| Active chips | Horizontal scroll |
| Date format | Abbreviated: "Fri, 7 Feb 2026" |
| Timestamp | Shortened: "05:13" (omit hours if 00) |
| Decision statement | Truncated to ~40 chars |
| Touch targets | Min 44px height per row |

---

## 8. Accessibility (WCAG 2.1 AA)

| Requirement | Implementation |
|-------------|----------------|
| Semantic HTML | `<main>` for timeline, `<article>` for each row, `<nav>` for filter bar |
| ARIA labels | Rows: `aria-label="Decision: {statement}"` |
| Keyboard nav | Tab through rows, Enter to open modal, Escape to close |
| Focus visible | `ring-2 ring-blue-500 ring-offset-1` on focus |
| Color contrast | All text >=4.5:1 contrast ratio |
| Screen reader | Group headers announce: "{date}, {N} decisions" |
| Roles | DecisionRow: `role="button"`, `tabIndex={0}` |
| Popover a11y | Shadcn/ui Popover handles ARIA automatically |

---

## 9. Files to Create/Modify

### New Files

| File | Type | Description |
|------|------|-------------|
| `src/components/molecules/DecisionRow.tsx` | Component | Compact decision row (replaces DecisionCard) |
| `src/components/organisms/FilterBar.tsx` | Component | Horizontal filter bar with popovers |
| `src/components/molecules/GroupingToggle.tsx` | Component | Radio toggle: By Date / By Discipline |
| `src/components/molecules/FilterPopover.tsx` | Component | Reusable popover with checkbox list |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/organisms/Timeline.tsx` | Redesign: vertical list with timeline line, support `groupBy` prop |
| `src/pages/ProjectDetail.tsx` | Remove sidebar layout, add FilterBar + GroupingToggle, add `groupBy` state |
| `src/store/filterStore.ts` | Add `decisionMakers`, `toggleDecisionMaker`. Remove `meetingTypes` |
| `src/lib/utils.ts` | Add `formatFullDate()`, `formatTimestamp()`, `abbreviateDiscipline()` |
| `src/types/decision.ts` | Add `meeting_title?: string` field to `Decision` interface |
| `src/lib/mockData.ts` | Add `meeting_title` to mock decision entries |

### Deprecated Files (can remove or keep for reference)

| File | Reason |
|------|--------|
| `src/components/molecules/DecisionCard.tsx` | Replaced by DecisionRow |
| `src/components/organisms/FiltersSidebar.tsx` | Replaced by FilterBar |

---

## 10. Utility Functions Needed

```typescript
// src/lib/utils.ts — add these

/**
 * Format date as "Friday, 7 February 2026"
 */
export function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Format timestamp as HH:MM:SS (meeting recording time)
 * Input: "00:05:13" or ISO string → "00:05:13"
 */
export function formatTimestamp(timestamp: string): string {
  // If already in HH:MM:SS format, return as-is
  if (/^\d{2}:\d{2}:\d{2}$/.test(timestamp)) return timestamp
  // Otherwise try to extract time portion from ISO string
  try {
    const date = new Date(timestamp)
    return date.toISOString().substring(11, 19)
  } catch {
    return timestamp
  }
}

/**
 * Abbreviate discipline name for compact display
 */
export function abbreviateDiscipline(discipline: string): string {
  const abbreviations: Record<string, string> = {
    architecture: 'Arch',
    mep: 'MEP',
    structural: 'Struct',
    electrical: 'Elec',
    plumbing: 'Plumb',
    landscape: 'Land',
    general: 'Gen',
  }
  return abbreviations[discipline.toLowerCase()] || discipline
}
```

---

## 11. Design Token Usage

All colors MUST come from the Tailwind config design tokens, never hardcoded:

| Token | Usage |
|-------|-------|
| `discipline-architecture` (#3B82F6) | Architecture badge + group node (By Discipline) |
| `discipline-mep` (#F97316) | MEP badge + group node |
| `discipline-structural` (#8B5CF6) | Structural badge + group node |
| `discipline-electrical` (#F59E0B) | Electrical badge + group node |
| `discipline-plumbing` (#06B6D4) | Plumbing badge + group node |
| `discipline-landscape` (#10B981) | Landscape badge + group node |
| `gray-200` | Timeline vertical line |
| `blue-600` | Date group nodes (By Date mode) |
| `blue-50` | Row hover state |
| `gray-100` | Row bottom border |

---

## 12. Shadcn/ui Components Required

| Component | Usage | Install |
|-----------|-------|---------|
| `Popover` | Filter dropdowns | `npx shadcn-ui@latest add popover` |
| `Checkbox` | Filter options | Already installed or `npx shadcn-ui@latest add checkbox` |
| `RadioGroup` | Grouping toggle | `npx shadcn-ui@latest add radio-group` |
| `Drawer` (Sheet) | Mobile filter panel | `npx shadcn-ui@latest add drawer` |
| `Badge` | Discipline pills, active count | Already installed |
| `Button` | Filter triggers, clear | Already installed |
| `Input` | Search, date pickers | Already installed |

---

## 13. Performance Targets

| Metric | Target | How |
|--------|--------|-----|
| Initial load | < 2 seconds (200+ decisions) | React Query caching, skeleton loading |
| Filter update | < 200ms | Client-side filtering with Zustand |
| Search debounce | 300ms | `useDebouncedValue` hook |
| Scroll performance | 60fps | Simple DOM (no heavy cards), virtual scroll if >200 |
| Filter popover open | < 100ms | Shadcn Popover (Radix) |

---

## 14. Implementation Priority

| Priority | Task | Effort |
|----------|------|--------|
| **P0** | DecisionRow component | 0.5 day |
| **P0** | Timeline redesign (vertical list + timeline line, By Date grouping) | 1 day |
| **P0** | FilterBar with Discipline + Search | 1 day |
| **P1** | "By Discipline" grouping mode + toggle | 0.5 day |
| **P1** | Date Range popover | 0.5 day |
| **P1** | Who (Decision Maker) popover | 0.5 day |
| **P1** | Active filter chips | 0.25 day |
| **P2** | Mobile responsive (drawer, abbreviated formats) | 0.5 day |
| **P2** | URL persistence (query params) | 0.5 day |
| **P2** | Tests (unit + integration) | 1 day |
| **P3** | Loading/empty/error states polish | 0.25 day |

**Total estimated effort: ~6.5 days**

---

## 15. Acceptance Criteria Summary

### Must Have (MVP)
- [ ] DecisionRow: Compact 2-line row with statement, who, meeting_title, timestamp, discipline pill
- [ ] Timeline: Vertical list with timeline line and circle nodes
- [ ] Timeline: Group by Date (default) — newest first, full date format
- [ ] Timeline: Group by Discipline — discipline-colored nodes
- [ ] Grouping toggle: Radio/segmented control to switch modes
- [ ] FilterBar: Horizontal bar replacing sidebar
- [ ] FilterBar: Search input with 300ms debounce
- [ ] FilterBar: Discipline popover with checkboxes
- [ ] FilterBar: Date range popover with From/To inputs
- [ ] FilterBar: Who popover with decision maker checkboxes
- [ ] FilterBar: Active filter chips with remove buttons
- [ ] FilterBar: Clear all button with count
- [ ] Click row → Opens DrilldownModal (Story 3.7, existing)
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Color contrast WCAG AA (4.5:1)

### Should Have
- [ ] Mobile responsive (filter drawer, abbreviated formats)
- [ ] URL filter persistence (query params)
- [ ] Quick date presets (Last 7 days, Last 30 days, etc.)
- [ ] Skeleton loading states

### Nice to Have
- [ ] Virtual scrolling for 200+ decisions
- [ ] Animated transitions between grouping modes
- [ ] Filter result count in popover headers

---

## Change Log

| Date | Change |
|------|--------|
| 2026-02-08 | Created v2 spec based on Gabriela's feedback and hand-drawn wireframe |
| 2026-02-08 | Added `meeting_title` to DecisionRow (Row 2) — multiple meetings per day need identification |
| 2026-02-09 | Extended by `FRONTEND-SPEC-3-layer-timeline.md` — adds 3-layer meeting hierarchy (Date > Meetings > Decisions) |

---

**Related Stories:** 3.5 (Timeline), 3.6 (Filters), 3.7 (DrilldownModal), 3.8 (Executive Digest), 3.11 (Data Layer), 3.12 (3-Layer Timeline)
**Supersedes:** Original Story 3.5 and 3.6 acceptance criteria for visual design (functional requirements like React Query, Zustand, testing remain valid)
**Extended by:** `docs/ux/FRONTEND-SPEC-3-layer-timeline.md` — adds 3-layer meeting group hierarchy (Date > Meetings > Decisions) on top of this v2 spec

---

*Generated by Uma (UX-Design Expert) — desenhando com empatia 💝*
