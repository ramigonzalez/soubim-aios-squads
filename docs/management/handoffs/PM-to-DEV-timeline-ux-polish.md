# Handoff: PM (Morgan) → Dev (Dex)

**Date:** 2026-02-09
**From:** Morgan (PM)
**To:** @dev (Dex)
**Subject:** Timeline UX Polish — Meeting Border Color + Filter Dropdown Styling
**Story:** 3.16 (`docs/stories/3.16-timeline-ux-polish.md`)
**Branch:** `feat/stories-3.5-3.6-timeline-redesign-v2`

---

## 🚨 YOLO MODE — Execute Without Further Approvals

This is a pre-approved bug-fix story with exact code changes specified below. Execute all steps sequentially, run tests at the end, and commit. No design decisions or PM check-ins required.

---

## What Changed

Two UX regressions identified by Uma (UX-Design Expert):

| # | Issue | Root Cause | Fix |
|---|-------|-----------|-----|
| 1 | Meeting card left border shows first discipline's color — misleading for multi-discipline meetings | `MeetingGroup.tsx:65-70` uses `getDisciplineBorderColor(disciplines[0])` | Switch to meeting type color (matches MeetingTypeBadge) |
| 2 | Filter checkboxes and date inputs render as unstyled browser defaults | `@tailwindcss/forms` plugin not installed | Install plugin + polish dropdown interiors |

---

## Implementation Steps

### Step 1: Install `@tailwindcss/forms`

```bash
cd decision-log-frontend
npm install -D @tailwindcss/forms
```

**File:** `tailwind.config.ts` — Add plugin:

```typescript
// BEFORE (line 47):
plugins: [],

// AFTER:
plugins: [require('@tailwindcss/forms')],
```

**Why:** This plugin resets form elements to a consistent baseline so that Tailwind utility classes (`rounded`, `text-blue-600`, `focus:ring-blue-500`) actually apply. Without it, checkboxes and date inputs use browser defaults.

---

### Step 2: Add `getMeetingTypeBorderColor()` + `getDisciplineDotColor()` to utils.ts

**File:** `decision-log-frontend/src/lib/utils.ts`

**Add** these two functions (after `getMeetingTypeColors` at line 224):

```typescript
/**
 * Get meeting type left-border color for MeetingGroup accent (Story 3.16)
 * Replaces getDisciplineBorderColor — uses meeting type instead of discipline
 */
export function getMeetingTypeBorderColor(type?: string): string {
  if (!type) return 'border-l-gray-300'
  const colorMap: Record<string, string> = {
    'client meeting': 'border-l-rose-400',
    'coordination': 'border-l-teal-400',
    'design review': 'border-l-amber-400',
    'internal review': 'border-l-blue-400',
    'internal': 'border-l-blue-400',
  }
  return colorMap[type.toLowerCase()] || 'border-l-gray-300'
}

/**
 * Get discipline dot color for filter dropdown (Story 3.16)
 */
export function getDisciplineDotColor(discipline: string): string {
  const colorMap: Record<string, string> = {
    architecture: 'bg-blue-400',
    mep: 'bg-orange-400',
    structural: 'bg-purple-400',
    electrical: 'bg-amber-400',
    plumbing: 'bg-cyan-400',
    landscape: 'bg-green-400',
  }
  return colorMap[discipline.toLowerCase()] || 'bg-gray-400'
}
```

**Remove** the `getDisciplineBorderColor()` function (lines 198-210). It's only used in `MeetingGroup.tsx` and is being replaced.

---

### Step 3: Switch MeetingGroup border to meeting type color

**File:** `decision-log-frontend/src/components/molecules/MeetingGroup.tsx`

**Update import** (line 7):

```typescript
// BEFORE:
import { getDisciplinePillColors, getDisciplineBorderColor, abbreviateDiscipline } from '../../lib/utils'

// AFTER:
import { getDisciplinePillColors, getMeetingTypeBorderColor, abbreviateDiscipline } from '../../lib/utils'
```

**Replace border logic** (lines 64-70):

```typescript
// BEFORE:
const primaryDiscipline = disciplines[0]
const borderColor = isOrphan
  ? 'border-l-gray-300'
  : primaryDiscipline
    ? getDisciplineBorderColor(primaryDiscipline)
    : 'border-l-gray-300'

// AFTER:
const borderColor = isOrphan
  ? 'border-l-gray-300'
  : getMeetingTypeBorderColor(meeting.meetingType)
```

This removes the dependency on `disciplines[0]` entirely. The color now always matches the MeetingTypeBadge in the header.

---

### Step 4: Polish all filter dropdowns

**File:** `decision-log-frontend/src/components/organisms/FilterBar.tsx`

#### 4a. Add import for `getDisciplineDotColor`

```typescript
// BEFORE (line 6):
import { getDisciplinePillColors, getMeetingTypeColors, formatDate } from '../../lib/utils'

// AFTER:
import { getDisciplinePillColors, getDisciplineDotColor, getMeetingTypeColors, formatDate } from '../../lib/utils'
```

#### 4b. Add color dots to Discipline filter dropdown

Inside the Discipline `<FilterPopover>` (around line 138), add a colored dot before each checkbox:

```tsx
{DISCIPLINES.map((d) => (
  <label
    key={d}
    className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
  >
    <span className={`w-2.5 h-2.5 rounded-full ${getDisciplineDotColor(d)} flex-shrink-0`} />
    <input
      type="checkbox"
      checked={disciplines.includes(d)}
      onChange={() => toggleDiscipline(d)}
      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
    />
    <span className="text-sm text-gray-700 capitalize">{d}</span>
  </label>
))}
```

#### 4c. Add avatar initials to Who filter dropdown

Before each name in the Who popover (around line 224), add an initials avatar:

```tsx
{filteredMakers.map((name) => {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <label
      key={name}
      className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
    >
      <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 text-[10px] font-medium inline-flex items-center justify-center flex-shrink-0">
        {initials}
      </span>
      <input
        type="checkbox"
        checked={decisionMakers.includes(name)}
        onChange={() => toggleDecisionMaker(name)}
        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
      />
      <span className="text-sm text-gray-700">{name}</span>
    </label>
  )
})}
```

#### 4d. Convert date presets to horizontal pill buttons

Replace the vertical preset list (around lines 183-198) with horizontal pills:

```tsx
<div className="border-t border-gray-100 pt-2">
  <p className="text-xs font-medium text-gray-400 mb-1.5">Quick</p>
  <div className="flex flex-wrap gap-1.5">
    {[
      { label: '7d', value: '7days' },
      { label: '30d', value: '30days' },
      { label: 'Month', value: 'month' },
      { label: 'All', value: 'all' },
    ].map((preset) => (
      <button
        key={preset.value}
        onClick={() => handleDatePreset(preset.value)}
        className="text-xs text-gray-600 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 px-2.5 py-1 rounded-full transition-colors"
      >
        {preset.label}
      </button>
    ))}
  </div>
</div>
```

#### 4e. Add "Clear" action inside each filter popover

**File:** `decision-log-frontend/src/store/filterStore.ts`

Add per-category clear actions to the store interface and implementation:

```typescript
// Add to FilterState interface:
clearDisciplines: () => void
clearDecisionMakers: () => void
clearMeetingTypes: () => void

// Add to create() implementation:
clearDisciplines: () => set({ disciplines: [] }),
clearDecisionMakers: () => set({ decisionMakers: [] }),
clearMeetingTypes: () => set({ meetingTypes: [] }),
```

Then in `FilterBar.tsx`, destructure the new actions from the store and add a "Clear" button at the bottom of each popover when that filter has active selections:

```tsx
// Example for Discipline popover — add after the map:
{disciplines.length > 0 && (
  <button
    onClick={clearDisciplines}
    className="w-full text-xs text-gray-400 hover:text-gray-600 mt-2 pt-2 border-t border-gray-100 text-left transition-colors"
  >
    Clear selection
  </button>
)}
```

Repeat the pattern for Who (`clearDecisionMakers`) and Type (`clearMeetingTypes`) popovers.

---

### Step 5: Update MeetingGroup tests

**File:** `decision-log-frontend/src/tests/components/MeetingGroup.test.tsx`

The existing test at line 114 (`renders discipline badges from participants`) verifies discipline rendering in the header — this remains unchanged.

**Add new test** for meeting-type-based border:

```typescript
it('applies meeting-type border color (not discipline)', () => {
  const meeting = makeMeeting(2, { meetingType: 'Client Meeting' })
  const { container } = render(
    <MeetingGroup meeting={meeting} onSelectDecision={mockOnSelect} />
  )
  const region = container.querySelector('[role="region"]')
  expect(region?.className).toContain('border-l-rose-400')
  expect(region?.className).not.toContain('border-l-purple-400') // Not structural discipline color
})

it('uses gray border for orphan meetings', () => {
  const orphanMeeting = makeMeeting(2, {
    meetingTitle: 'Other Decisions',
    transcriptId: undefined,
    meetingType: undefined,
    participants: [],
  })
  const { container } = render(
    <MeetingGroup meeting={orphanMeeting} onSelectDecision={mockOnSelect} />
  )
  const region = container.querySelector('[role="region"]')
  expect(region?.className).toContain('border-l-gray-300')
})

it('uses gray border for unknown meeting type', () => {
  const meeting = makeMeeting(2, { meetingType: 'Unknown Type' })
  const { container } = render(
    <MeetingGroup meeting={meeting} onSelectDecision={mockOnSelect} />
  )
  const region = container.querySelector('[role="region"]')
  expect(region?.className).toContain('border-l-gray-300')
})
```

---

### Step 6: Run tests + verify

```bash
cd decision-log-frontend
npm run test -- --run
npm run typecheck
```

**Visual verification** (run `npm run dev` and check):

1. Meeting cards: left border matches MeetingTypeBadge color (rose for Client, teal for Coordination, amber for Design Review)
2. Multi-discipline meetings no longer show misleading single-discipline border
3. Filter checkboxes: rounded corners, blue accent, not native browser style
4. Date inputs: light background, not dark browser default
5. Discipline dropdown: colored dots before each name
6. Who dropdown: avatar initials circles before each name
7. Date presets: horizontal pill buttons
8. Each dropdown: "Clear selection" link when filters active

---

## Files Referenced

| File | Action | Step |
|------|--------|------|
| `package.json` | Modify — add `@tailwindcss/forms` | 1 |
| `tailwind.config.ts` | Modify — register forms plugin | 1 |
| `src/lib/utils.ts` | Modify — add `getMeetingTypeBorderColor()`, `getDisciplineDotColor()`; remove `getDisciplineBorderColor()` | 2 |
| `src/components/molecules/MeetingGroup.tsx` | Modify — switch border to meeting type color | 3 |
| `src/components/organisms/FilterBar.tsx` | Modify — color dots, avatars, date pills, clear actions | 4 |
| `src/store/filterStore.ts` | Modify — add per-category clear actions | 4e |
| `src/tests/components/MeetingGroup.test.tsx` | Modify — add meeting-type border tests | 5 |

---

## Impact Assessment

| Dimension | Assessment |
|-----------|------------|
| **Breaking changes** | None — visual-only changes, no API or prop changes |
| **Visual impact** | Medium — meeting borders change from discipline to type color; filter dropdowns gain polish |
| **Effort** | Low (0.5 day) — well-scoped changes with exact code provided |
| **Risk** | Low — additive styling, `@tailwindcss/forms` is standard Tailwind plugin |
| **Rollback** | Easy — revert commit |

---

*Handoff by Morgan (PM) — shipping with clarity*
