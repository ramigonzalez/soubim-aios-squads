# Frontend Specification: 3-Layer Meeting Group Timeline

**Spec ID:** UX-SPEC-3.12
**Author:** Uma (UX-Design Expert)
**Date:** 2026-02-09
**Stories:** 3.11 (Data Layer), 3.12 (3-Layer Timeline)
**Stakeholder Feedback:** Gabriela (Project Director / Client) — Feb 9, 2026
**Status:** Ready for Development
**Extends:** `docs/ux/FRONTEND-SPEC-timeline-redesign-v2.md` (v2 2-layer timeline)

---

## 1. Context & Motivation

### The Problem with 2 Layers

The v2 timeline uses a **2-layer hierarchy**: Date > Decisions. This works for basic scanning, but Gabriela identified a real-world gap:

> Each meeting produces 5-10+ decisions. Multiple meetings happen on the same day (Design Review, MEP Coordination, Client Alignment). Users cannot tell which meeting produced which decision when everything is flat under a date header.

### What Gabriela Wants: 3 Layers

**Date > Meetings > Decisions** — a natural hierarchy that mirrors how construction projects work:

- A project day has **multiple meetings**
- Each meeting has a **type**, **participants from multiple disciplines**, and **decisions**
- Users need to quickly identify meeting context (client call vs. internal coordination)
- Disciplines participating in a meeting may not all produce decisions, but their presence matters

### Gabriela's Feedback (Feb 9, 2026)

> "I need to see which meeting each decision came from. When I look at Feb 7, I had a Client Alignment call in the morning and a Landscape Review in the afternoon — those are totally different contexts. Show me the meetings, then the decisions inside them."

---

## 2. Design Principles (Additions to v2)

| Principle | Application |
|-----------|-------------|
| **Contextual Grouping** | 3 layers: Date > Meeting > Decisions. Meeting context wraps decisions. |
| **Multi-Discipline Visibility** | Show ALL disciplines that participated, not just decision-makers |
| **Meeting Type Recognition** | Color-coded badges for instant meeting type identification |
| **Progressive Collapse** | Large meetings (>5 decisions) collapsed by default for scannability |
| **Participant Awareness** | Who was in the room matters — show count + tooltip |

---

## 3. Visual Structure

### 3.1 Three-Layer Hierarchy — Grouped by Date

```
● Friday, 7 February 2026                                           5 decisions
│
│  ┌─────────────────────────────────────────────────────────────────────────┐
│  │  📋 Client Alignment - Electrical       Client Meeting                  │
│  │  Elec  MEP                              👥 2         2 decisions   ▼   │
│  │  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│  │  Install LED lighting system with smart controls...             Elec   │
│  │  👤 Gabriela (Project Director)                            ⏱ 00:12:15 │
│  │                                                                        │
│  │  Upgrade electrical panels to support EV charging...            Elec   │
│  │  👤 Carlos (MEP Engineer)                                  ⏱ 00:28:40 │
│  └─────────────────────────────────────────────────────────────────────────┘
│
│  ┌─────────────────────────────────────────────────────────────────────────┐
│  │  📋 Landscape Design Review             Design Review                   │
│  │  Land  Struct                           👥 1         3 decisions   ▼   │
│  │  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│  │  Preserve existing trees on site and install green roof...      Land   │
│  │  👤 Gabriela (Project Director)                            ⏱ 00:08:30 │
│  │  ...                                                                   │
│  └─────────────────────────────────────────────────────────────────────────┘
│
● Thursday, 6 February 2026                                          4 decisions
│
│  ┌─────────────────────────────────────────────────────────────────────────┐
│  │  📋 Structural Design Review            Design Review                   │
│  │  Struct                                 👥 2         2 decisions   ▼   │
│  │  ...                                                                   │
│  └─────────────────────────────────────────────────────────────────────────┘
│
│  ┌─────────────────────────────────────────────────────────────────────────┐
│  │  📋 MEP Coordination                    Coordination                    │
│  │  MEP  Plumb  Land                       👥 2         2 decisions   ▼   │
│  │  ...                                                                   │
│  └─────────────────────────────────────────────────────────────────────────┘
:
```

### 3.2 Three-Layer Hierarchy — Grouped by Discipline

```
● Architecture (blue node)                                          4 decisions
│
│  ┌─────────────────────────────────────────────────────────────────────────┐
│  │  📋 Facade Design Review                Design Review                   │
│  │  Arch                                   👥 1    📅 Feb 5    1 dec   ▼  │
│  │  ...                                                                   │
│  └─────────────────────────────────────────────────────────────────────────┘
│
● MEP (orange node)                                                 3 decisions
│
│  ┌─────────────────────────────────────────────────────────────────────────┐
│  │  📋 MEP Coordination                    Coordination                    │
│  │  MEP  Plumb  Land                       👥 2    📅 Feb 6    2 dec   ▼  │
│  │  ...                                                                   │
│  └─────────────────────────────────────────────────────────────────────────┘
:
```

In discipline mode, `meeting_date` is shown inline in the meeting header (since date is no longer the outer group).

---

## 4. Component Specifications

### 4.1 MeetingGroup (NEW)

**Atomic level:** Molecule
**File:** `src/components/molecules/MeetingGroup.tsx`

#### Visual Spec — Meeting Header

```
┌──────────────────────────────────────────────────────────────────────────┐
│  📋 Meeting Title                MeetingTypeBadge                        │
│  [Discipline] [Discipline] [+N]  👥 3      (📅 date)     N decisions  ▼ │
├──────────────────────────────────────────────────────────────────────────┤
│  {DecisionRow}                                                           │
│  {DecisionRow}                                                           │
│  {DecisionRow}                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Layout Details

| Property | Value | Notes |
|----------|-------|-------|
| Container | `bg-white border border-gray-200 rounded-lg overflow-hidden` | Card-like wrapper |
| Shadow | `shadow-sm` | Subtle depth |
| Margin | `mb-3` | Space between meeting groups |
| Header padding | `px-4 py-3` | Comfortable click target |
| Header background | `bg-gray-50/50` | Very subtle differentiation from decision rows |
| Header cursor | `cursor-pointer` | Entire header is clickable |
| Header hover | `hover:bg-gray-100/50` | Feedback on hover |
| Divider | `border-t border-gray-100` | Between header and decisions |

#### Header Row 1: Title + Meeting Type

| Element | Style | Notes |
|---------|-------|-------|
| FileText icon | `lucide-react FileText`, `w-4 h-4 text-gray-400` | Left of title |
| `meeting_title` | `text-sm font-medium text-gray-800 truncate` | Primary text |
| `MeetingTypeBadge` | See atom spec below | Right-aligned, color-coded |

#### Header Row 2: Disciplines + Participants + Count + Chevron

| Element | Style | Notes |
|---------|-------|-------|
| Discipline badges | `text-xs px-1.5 py-0.5 rounded` with discipline colors at 10% opacity | From `meeting_participants[].role` |
| Overflow pill | `text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500` | "+N more" when >4 disciplines |
| Participant indicator | `ParticipantIndicator` atom (see below) | Shows `Users` icon + count |
| Date (discipline mode) | `text-xs text-gray-400` with Calendar icon | Only in discipline grouping |
| Decision count | `text-xs text-gray-400` | e.g., "3 decisions" |
| Chevron | `lucide-react ChevronDown`, `w-4 h-4 text-gray-400` | Rotates 180deg when collapsed |

#### Accordion Behavior

| Condition | Default State |
|-----------|---------------|
| <=5 decisions | **Expanded** |
| >5 decisions | **Collapsed** (show header only) |
| User toggles | Remembers state per meeting in component state |

#### Props Interface

```typescript
interface MeetingGroupProps {
  meetingTitle: string
  meetingType?: string
  meetingDate?: string
  participants: Array<{ name: string; role: string }>
  decisions: Decision[]
  onSelectDecision: (id: string) => void
  showDate?: boolean              // true in discipline grouping mode
  defaultExpanded?: boolean       // computed from decision count
}
```

#### Interaction

| Event | Behavior |
|-------|----------|
| Click header | Toggle expanded/collapsed |
| Hover header | `bg-gray-100/50` |
| Enter/Space on header | Toggle expanded/collapsed |
| Click decision row | Opens DrilldownModal (passes through) |
| Tab | Focus header first, then decisions within (when expanded) |

---

### 4.2 MeetingTypeBadge (NEW Atom)

**Atomic level:** Atom
**File:** `src/components/atoms/MeetingTypeBadge.tsx`

#### Color Coding

| Meeting Type | Background | Text | Tailwind Classes |
|-------------|------------|------|-----------------|
| Client Meeting | `bg-rose-50` | `text-rose-700` | `bg-rose-50 text-rose-700` |
| Coordination | `bg-teal-50` | `text-teal-700` | `bg-teal-50 text-teal-700` |
| Design Review | `bg-amber-50` | `text-amber-700` | `bg-amber-50 text-amber-700` |
| Internal | `bg-blue-50` | `text-blue-700` | `bg-blue-50 text-blue-700` |
| Unknown/Other | `bg-gray-50` | `text-gray-600` | `bg-gray-50 text-gray-600` |

#### Style

```
text-xs font-medium px-2 py-0.5 rounded-full
```

#### Props Interface

```typescript
interface MeetingTypeBadgeProps {
  type: string    // "Client Meeting", "Coordination", "Design Review", "Internal"
}
```

---

### 4.3 ParticipantIndicator (NEW Atom)

**Atomic level:** Atom
**File:** `src/components/atoms/ParticipantIndicator.tsx`

#### Visual Spec

```
👥 3
```

A simple icon + count. On hover, shows a tooltip with participant names and roles.

#### Layout

| Element | Style |
|---------|-------|
| Container | `inline-flex items-center gap-1 text-xs text-gray-500` |
| Users icon | `lucide-react Users`, `w-3.5 h-3.5 text-gray-400` |
| Count | `text-xs text-gray-500` |

#### Tooltip Content (on hover)

```
┌──────────────────────────────┐
│  Participants                │
│  ─────────────────────────── │
│  Carlos — Structural Engineer│
│  Gabriela — Project Director │
│  Ana — Plumbing Engineer     │
└──────────────────────────────┘
```

| Property | Value |
|----------|-------|
| Component | Shadcn/ui `Tooltip` + `TooltipTrigger` + `TooltipContent` |
| Width | Auto (min `w-48`) |
| Style | Default Shadcn tooltip (dark background, light text) |
| Title | "Participants" in `text-xs font-semibold` |
| List | Each participant: `{name} — {role}` in `text-xs` |
| Max height | `max-h-48 overflow-y-auto` (for long lists) |

#### Props Interface

```typescript
interface ParticipantIndicatorProps {
  participants: Array<{ name: string; role: string }>
}
```

---

### 4.4 Multi-Discipline Display

#### At the Meeting Level

Discipline badges in the meeting header represent ALL disciplines that **participated** in the meeting, derived from `meeting_participants[].role`.

**Logic:**
```typescript
function getMeetingDisciplines(participants: Array<{ name: string; role: string }>): string[] {
  const roleToDisc: Record<string, string> = {
    'structural engineer': 'structural',
    'mep engineer': 'mep',
    'project director': 'architecture',  // directors map to architecture
    'architect': 'architecture',
    'plumbing engineer': 'plumbing',
    'electrical engineer': 'electrical',
    'landscape architect': 'landscape',
    'sustainability engineer': 'landscape',
  }
  const disciplines = new Set<string>()
  for (const p of participants) {
    const disc = roleToDisc[p.role.toLowerCase()]
    if (disc) disciplines.add(disc)
  }
  return [...disciplines]
}
```

**Overflow behavior:**
- Show up to 4 discipline badges
- If >4, show first 3 + "+N more" pill
- Pill uses `bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded`

**Badge style (meeting level):**
```
text-xs px-1.5 py-0.5 rounded
bg-discipline-{name}/10 text-discipline-{name}
```

Uses 10% opacity background with full-color text for subtlety (these are secondary to the meeting title).

#### At the Decision Level

Each `DecisionRow` inside a meeting group shows:

1. **Primary discipline** (existing `discipline` field) — prominent badge, same as v2 spec
2. **Affected disciplines** (derived from `consensus` keys) — smaller secondary badges

**Logic:**
```typescript
function getAffectedDisciplines(decision: Decision): string[] {
  if (!decision.consensus) return []
  const knownDiscs = ['architecture', 'mep', 'structural', 'electrical', 'plumbing', 'landscape']
  return Object.keys(decision.consensus)
    .filter(key => knownDiscs.includes(key.toLowerCase()) && key.toLowerCase() !== decision.discipline.toLowerCase())
}
```

**Visual:**
```
Install central HVAC system with zone-controlled...    MEP  struct land
```

- Primary: `text-xs px-2 py-0.5 rounded-full bg-discipline-mep/10 text-discipline-mep font-medium`
- Affected: `text-xs px-1 py-0 rounded bg-gray-100 text-gray-500` (smaller, muted)

---

### 4.5 Updated DecisionRow (Modifications)

The `DecisionRow` from the v2 spec gains a new prop:

```typescript
interface DecisionRowProps {
  decision: Decision
  onClick: (id: string) => void
  showDate?: boolean              // true when grouped by discipline
  showDiscipline?: boolean        // true when grouped by date (default)
  showMeetingTitle?: boolean      // NEW: false when inside MeetingGroup (title in header)
  showAffectedDisciplines?: boolean  // NEW: show secondary discipline badges from consensus
}
```

**When inside a MeetingGroup:**
- `showMeetingTitle={false}` — the meeting title is shown in the MeetingGroup header, not repeated in each row
- `showAffectedDisciplines={true}` — show secondary badges derived from consensus keys

---

### 4.6 Updated Timeline Grouping Logic

#### 3-Layer Group by Date

```typescript
interface MeetingGroupData {
  meetingTitle: string
  meetingType?: string
  meetingDate?: string
  transcriptId?: string
  participants: Array<{ name: string; role: string }>
  decisions: Decision[]
}

interface DateGroupData {
  date: string
  meetings: MeetingGroupData[]
  totalDecisions: number
}

function groupByDateWithMeetings(decisions: Decision[]): DateGroupData[] {
  // Step 1: Group by date
  const byDate = groupByDate(decisions)

  // Step 2: Within each date, sub-group by transcript_id
  return Object.entries(byDate).map(([date, dateDecs]) => {
    const byMeeting = new Map<string, Decision[]>()
    const orphans: Decision[] = []

    for (const d of dateDecs) {
      if (d.transcript_id) {
        const key = d.transcript_id
        if (!byMeeting.has(key)) byMeeting.set(key, [])
        byMeeting.get(key)!.push(d)
      } else {
        orphans.push(d)
      }
    }

    const meetings: MeetingGroupData[] = [...byMeeting.entries()].map(([tid, decs]) => ({
      meetingTitle: decs[0].meeting_title || 'Untitled Meeting',
      meetingType: decs[0].meeting_type,
      meetingDate: decs[0].meeting_date,
      transcriptId: tid,
      participants: decs[0].meeting_participants || [],
      decisions: decs.sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
    }))

    // Orphans go into a special group
    if (orphans.length > 0) {
      meetings.push({
        meetingTitle: 'Other Decisions',
        meetingType: undefined,
        meetingDate: date,
        participants: [],
        decisions: orphans,
      })
    }

    return {
      date,
      meetings,
      totalDecisions: dateDecs.length,
    }
  })
}
```

#### 3-Layer Group by Discipline

Same concept but outer layer is discipline, then sub-group meetings within each discipline:

```typescript
function groupByDisciplineWithMeetings(decisions: Decision[]): DisciplineGroupData[] {
  // Step 1: Group by discipline
  const byDisc = groupByDiscipline(decisions)

  // Step 2: Within each discipline, sub-group by transcript_id
  // Same meeting sub-grouping logic as above
  // ...
}
```

**Cross-discipline meetings:** A meeting like "MEP Coordination" that produces decisions in both `mep` and `plumbing` disciplines will appear under BOTH discipline groups. Each group shows only the decisions relevant to that discipline, but the meeting header shows all participants.

---

## 5. Updated TimelineSkeleton

The skeleton loading state should reflect the 3-layer structure:

```
● ████████████████████                                           █ decisions
│
│  ┌────────────────────────────────────────────────────────────────────┐
│  │  ████████████████          ██████████                              │
│  │  ██  ██  ██                👥 █       █ decisions                  │
│  │  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈  │
│  │  ████████████████████████████████████               ██            │
│  │  ██ ████████████                               ⏱ ██:██:██        │
│  │  ████████████████████████████████████               ██            │
│  │  ██ ████████████                               ⏱ ██:██:██        │
│  └────────────────────────────────────────────────────────────────────┘
│
│  ┌────────────────────────────────────────────────────────────────────┐
│  │  ████████████████          ██████████                              │
│  │  ...                                                               │
│  └────────────────────────────────────────────────────────────────────┘
```

Skeleton shows: 2 date groups, each with 2 meeting cards, each meeting card with 2 skeleton rows. Uses `animate-pulse`.

---

## 6. Edge Cases

### 6.1 Orphan Decisions (No `transcript_id`)

Decisions without a `transcript_id` (e.g., manually entered or imported from legacy systems):
- Grouped into a special "Other Decisions" meeting group within the date
- No meeting type badge, no participant indicator
- Meeting title shown as "Other Decisions" in muted style (`text-gray-400 italic`)
- Decisions still show their own discipline badges

### 6.2 Single-Decision Meetings

Meetings with only 1 decision:
- Display identically to multi-decision meetings (header + 1 row)
- Always expanded (<=5 decisions threshold)
- No special visual treatment — consistency matters

### 6.3 Cross-Discipline Meetings (Discipline Grouping Mode)

A meeting like "MEP Coordination" produces decisions in both `mep` and `plumbing`:
- In discipline mode: the meeting appears under **both** the MEP group and the Plumbing group
- Each instance only shows the decisions relevant to that discipline group
- Meeting header always shows ALL participant disciplines (the full picture)

### 6.4 Long Participant Lists

If a meeting has many participants (>6):
- Tooltip list scrolls with `max-h-48 overflow-y-auto`
- Count shows accurate number (e.g., "👥 12")
- No truncation of the tooltip — users can scroll

### 6.5 Missing Meeting Type

If `meeting_type` is null/empty:
- No `MeetingTypeBadge` rendered (graceful absence)
- Meeting header still shows title, disciplines, participants

### 6.6 Empty Meetings (All Decisions Filtered Out)

When filters remove all decisions from a meeting:
- The entire meeting group is hidden
- Date groups with no remaining meetings are also hidden

---

## 7. Accessibility (WCAG 2.1 AA)

| Requirement | Implementation |
|-------------|----------------|
| Meeting group semantics | `role="region"` with `aria-label="{meeting_title}, {N} decisions"` |
| Accordion pattern | Meeting header: `aria-expanded="true/false"`, `aria-controls="meeting-{id}-decisions"` |
| Decision list | `role="list"` on container, `role="listitem"` on each row |
| Keyboard | Tab: header → decisions (if expanded) → next header. Enter/Space: toggle. |
| Tooltip | `ParticipantIndicator` tooltip accessible via focus (not hover-only) |
| Screen reader | Announces: "Meeting: {title}, {type}, {N} participants, {M} decisions, expanded/collapsed" |

---

## 8. Files to Create/Modify

### New Files

| File | Type | Description |
|------|------|-------------|
| `src/components/molecules/MeetingGroup.tsx` | Component | Collapsible meeting card with header + decision list |
| `src/components/atoms/MeetingTypeBadge.tsx` | Component | Color-coded meeting type pill |
| `src/components/atoms/ParticipantIndicator.tsx` | Component | Users icon + count with tooltip |

### Modified Files

| File | Changes |
|------|---------|
| `src/components/organisms/Timeline.tsx` | 3-layer grouping logic, render MeetingGroup within date/discipline groups |
| `src/components/molecules/DecisionRow.tsx` | Add `showMeetingTitle`, `showAffectedDisciplines` props; render secondary discipline badges |
| `decision-log-frontend/src/types/decision.ts` | Add `transcript_id?: string`, `meeting_participants?: Array<{name: string, role: string}>` |
| `decision-log-backend/app/api/routes/decisions.py` | Add `Transcript.meeting_type`, `Transcript.participants` to JOIN and response |

---

## 9. Data Requirements

### New Fields Needed in API Response

| Field | Source | Purpose |
|-------|--------|---------|
| `transcript_id` | `Decision.transcript_id` | Group decisions by meeting (already returned, needs frontend type) |
| `meeting_type` | `Transcript.meeting_type` | Meeting type badge color |
| `meeting_participants` | `Transcript.participants` | Discipline badges + participant tooltip |

### Existing Fields Used

| Field | Purpose |
|-------|---------|
| `meeting_title` | Meeting header title |
| `meeting_date` | Date grouping + inline date in discipline mode |
| `discipline` | Primary discipline badge on DecisionRow |
| `consensus` | Derive affected disciplines for secondary badges |

---

## 10. Shadcn/ui Components Required

| Component | Usage | Notes |
|-----------|-------|-------|
| `Tooltip` | ParticipantIndicator hover | `npx shadcn-ui@latest add tooltip` |
| `Collapsible` | MeetingGroup accordion | `npx shadcn-ui@latest add collapsible` (or manual implementation) |
| `Badge` | Discipline pills, meeting type | Already installed |

---

## 11. Implementation Priority

| Priority | Task | Effort |
|----------|------|--------|
| **P0** | Backend: Add `meeting_type` + `participants` to API | 0.5 day |
| **P0** | Frontend types: Add `transcript_id`, `meeting_participants` | 0.25 day |
| **P0** | MeetingTypeBadge atom | 0.25 day |
| **P0** | ParticipantIndicator atom | 0.25 day |
| **P0** | MeetingGroup molecule | 1 day |
| **P0** | Timeline: 3-layer grouping logic | 1 day |
| **P1** | DecisionRow: affected discipline badges | 0.5 day |
| **P1** | Cross-discipline meetings in discipline mode | 0.5 day |
| **P1** | Updated TimelineSkeleton | 0.25 day |
| **P2** | Edge cases (orphans, empty meetings) | 0.5 day |
| **P2** | Tests | 1 day |

**Total estimated effort: ~6 days** (Story 3.11: 1 day, Story 3.12: 3-4 days, testing: 1 day)

---

## Change Log

| Date | Change |
|------|--------|
| 2026-02-09 | Created 3-layer timeline spec based on Gabriela's feedback about meeting grouping |

---

**Related Stories:** 3.5 (Timeline v2), 3.6 (Filters), 3.7 (DrilldownModal), 3.11 (Data Layer), 3.12 (3-Layer Timeline)
**Extends:** `docs/ux/FRONTEND-SPEC-timeline-redesign-v2.md`

---

*Generated by Uma (UX-Design Expert) — desenhando com empatia*
