# Handoff: UX Design Expert (Uma) -> Dev

**Date:** 2026-02-09
**From:** Uma (UX-Design Expert)
**To:** @dev + @data-engineer
**Subject:** 3-Layer Meeting Group Timeline — Date > Meetings > Decisions hierarchy
**Spec Reference:** `docs/ux/FRONTEND-SPEC-3-layer-timeline.md`
**Stories:** 3.11 (Data Layer), 3.12 (3-Layer Frontend)

---

## Why This Change

Gabriela identified a real-world usability gap in the 2-layer timeline:

**Problem:** When grouping decisions by date, all 5-10+ decisions from a day appear flat under one date header. Users cannot distinguish which meeting produced which decision — especially when multiple meetings occur on the same day (e.g., "Client Alignment" in the morning and "Landscape Review" in the afternoon).

**Impact:** Construction projects have multiple meetings per day, each with different participants, disciplines, and contexts. Flattening them loses critical context.

**Solution:** Add a middle layer — **Meetings** — creating a 3-layer hierarchy: **Date > Meetings > Decisions**. Each meeting shows its type (Client/Coordination/Design Review), participating disciplines, participant count, and its decisions in a collapsible accordion.

---

## What Changed

### Before (v2 — 2-layer timeline)

```
● Friday, 7 February 2026                            5 decisions
│
│  Install LED lighting system...                         Elec
│  👤 Gabriela (Project Director)                    ⏱ 00:12:15
│
│  Preserve existing trees on site...                     Land
│  👤 Gabriela (Project Director)                    ⏱ 00:08:30
│
│  ...3 more rows, no meeting context
```

### After (v3 — 3-layer timeline)

```
● Friday, 7 February 2026                            5 decisions
│
│  ┌──────────────────────────────────────────────────────────┐
│  │  📋 Client Alignment - Electrical    Client Meeting       │
│  │  Elec  MEP                           👥 2    2 decisions │
│  │  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│  │  Install LED lighting system...                   Elec   │
│  │  👤 Gabriela (Project Director)              ⏱ 00:12:15 │
│  │  ...                                                     │
│  └──────────────────────────────────────────────────────────┘
│
│  ┌──────────────────────────────────────────────────────────┐
│  │  📋 Landscape Design Review          Design Review        │
│  │  Land  Struct                        👥 1    3 decisions │
│  │  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│  │  Preserve existing trees on site...               Land   │
│  │  👤 Gabriela (Project Director)              ⏱ 00:08:30 │
│  │  ...                                                     │
│  └──────────────────────────────────────────────────────────┘
```

### New Components

| Component | Type | Description |
|-----------|------|-------------|
| `MeetingGroup` | Molecule | Collapsible card: meeting header (title, type, disciplines, participants, count) + decision list |
| `MeetingTypeBadge` | Atom | Color-coded pill: Client Meeting (rose), Coordination (teal), Design Review (amber), Internal (blue) |
| `ParticipantIndicator` | Atom | Users icon + count; hover tooltip shows participant names/roles |

### Modified Components

| Component | Changes |
|-----------|---------|
| `DecisionRow` | New props: `showMeetingTitle` (hide when inside MeetingGroup), `showAffectedDisciplines` (secondary badges from consensus keys) |
| `Timeline` | 3-layer grouping logic: Date > Meeting > Decision and Discipline > Meeting > Decision |

---

## Implementation Checklist

### Story 3.11: Data Layer (Backend + Types) — @dev + @data-engineer

#### 1. Update Backend API — `decisions.py`

**File:** `decision-log-backend/app/api/routes/decisions.py`

Add `Transcript.meeting_type` and `Transcript.participants` to the LEFT JOIN query:

```python
# CURRENT (line 35):
query = (
    db.query(Decision, Transcript.meeting_title, Transcript.meeting_date)
    .outerjoin(Transcript, Decision.transcript_id == Transcript.id)
    .filter(Decision.project_id == str(project_id))
)

# UPDATED:
query = (
    db.query(
        Decision,
        Transcript.meeting_title,
        Transcript.meeting_date,
        Transcript.meeting_type,      # NEW
        Transcript.participants,       # NEW
    )
    .outerjoin(Transcript, Decision.transcript_id == Transcript.id)
    .filter(Decision.project_id == str(project_id))
)
```

Update the response formatting to include the new fields:

```python
# Add to the response dict (around line 77-96):
"meeting_type": transcript_meeting_type,           # NEW
"meeting_participants": transcript_participants,    # NEW (rename from participants to avoid confusion)
```

Apply the same changes to the single-decision endpoint (`get_decision`).

#### 2. Update Frontend Type — `decision.ts`

**File:** `decision-log-frontend/src/types/decision.ts`

Add to the `Decision` interface:

```typescript
export interface Decision {
  // ... existing fields ...
  transcript_id?: string                                    // NEW
  meeting_participants?: Array<{ name: string; role: string }>  // NEW
}
```

Note: `meeting_type` already exists in the interface (line 8). Verify the API actually populates it now.

#### 3. Expand Seed Data

**File:** `decision-log-backend/app/database/seed.py`

- Current: 2-3 decisions per meeting, 6 total decisions in Project 1
- Needed: At least one meeting with 6+ decisions (to test collapse threshold of >5)
- Add more participants with diverse discipline roles to test multi-discipline badges
- Ensure at least one meeting has 5+ disciplines represented

#### 4. Update Mock Data

**File:** `decision-log-frontend/src/lib/mockData.ts`

- Add `transcript_id` to mock decisions (group some under the same transcript)
- Add `meeting_participants` arrays to mock decisions
- Add `meeting_type` values

#### 5. Verify API Response

- `meeting_type` returns: "Design Review", "Coordination", "Client Meeting"
- `transcript_id` returns: string UUID for each decision
- `meeting_participants` returns: `[{ "name": "Carlos", "role": "Structural Engineer" }]`

---

### Story 3.12: 3-Layer Frontend — @dev

#### 1. Create `MeetingTypeBadge` Atom

**File:** `src/components/atoms/MeetingTypeBadge.tsx`

Color mapping:
- Client Meeting -> `bg-rose-50 text-rose-700`
- Coordination -> `bg-teal-50 text-teal-700`
- Design Review -> `bg-amber-50 text-amber-700`
- Internal -> `bg-blue-50 text-blue-700`
- Unknown -> `bg-gray-50 text-gray-600`

#### 2. Create `ParticipantIndicator` Atom

**File:** `src/components/atoms/ParticipantIndicator.tsx`

- `Users` icon from lucide-react + participant count
- Shadcn/ui `Tooltip` on hover showing participant names and roles
- Focus-accessible (not hover-only)

#### 3. Create `MeetingGroup` Molecule

**File:** `src/components/molecules/MeetingGroup.tsx`

- Collapsible card with meeting header + decision list
- Header shows: title, MeetingTypeBadge, discipline badges (from participants), ParticipantIndicator, decision count, chevron
- Discipline badges from `meeting_participants[].role` mapped to discipline names
- Overflow: show first 3 disciplines + "+N more" if >4
- Accordion: <=5 decisions expanded, >5 collapsed by default
- Click header toggles, click row opens DrilldownModal

#### 4. Update `DecisionRow`

**File:** `src/components/molecules/DecisionRow.tsx`

- Add `showMeetingTitle?: boolean` prop (default true for backward compat; false inside MeetingGroup)
- Add `showAffectedDisciplines?: boolean` prop
- When `showAffectedDisciplines=true`: derive affected disciplines from `consensus` keys, show as smaller secondary badges

#### 5. Update `Timeline` Grouping Logic

**File:** `src/components/organisms/Timeline.tsx`

- Add 3-layer grouping functions: `groupByDateWithMeetings()`, `groupByDisciplineWithMeetings()`
- Sub-group decisions within each date/discipline by `transcript_id`
- Render `MeetingGroup` components instead of flat `DecisionRow` list
- Handle orphan decisions (no `transcript_id`) as "Other Decisions" group
- Handle cross-discipline meetings in discipline mode (same meeting appears under multiple disciplines)

#### 6. Update `TimelineSkeleton`

- Reflect 3-layer structure: date header > meeting card skeletons > decision row skeletons
- 2 date groups x 2 meeting cards x 2 rows each

---

## Files Referenced

| File | Action | Story |
|------|--------|-------|
| `docs/ux/FRONTEND-SPEC-3-layer-timeline.md` | Created — full design spec | Reference |
| `decision-log-backend/app/api/routes/decisions.py` | Modify — add `meeting_type`, `participants` to JOIN | 3.11 |
| `decision-log-frontend/src/types/decision.ts` | Modify — add `transcript_id`, `meeting_participants` | 3.11 |
| `decision-log-backend/app/database/seed.py` | Modify — expand with more decisions + diverse participants | 3.11 |
| `decision-log-frontend/src/lib/mockData.ts` | Modify — add new fields to mock data | 3.11 |
| `src/components/atoms/MeetingTypeBadge.tsx` | Create — meeting type color badge | 3.12 |
| `src/components/atoms/ParticipantIndicator.tsx` | Create — participant count + tooltip | 3.12 |
| `src/components/molecules/MeetingGroup.tsx` | Create — collapsible meeting card | 3.12 |
| `src/components/molecules/DecisionRow.tsx` | Modify — add `showMeetingTitle`, `showAffectedDisciplines` | 3.12 |
| `src/components/organisms/Timeline.tsx` | Modify — 3-layer grouping logic | 3.12 |

---

## Impact Assessment

| Dimension | Assessment |
|-----------|------------|
| **Breaking changes** | **Yes — API response adds new fields.** Frontend must handle `meeting_type`, `meeting_participants`, and `transcript_id` being present. All fields are optional/nullable so older clients won't break. |
| **Visual impact** | **Medium** — timeline gains a new visual layer (meeting cards) between date headers and decision rows. More information-dense but still scannable. |
| **Backend effort** | **Low** (0.5 day) — add 2 columns to existing LEFT JOIN query and response dict |
| **Frontend effort** | **Medium-High** (3-4 days) — 3 new components, modified grouping logic, edge cases |
| **Risk** | **Low** — additive changes, no removal of existing functionality. 2-layer fallback if `transcript_id` is null. |
| **Blocked by** | Story 3.11 (data layer) must complete before Story 3.12 (frontend) can use real data |
| **Dependencies** | Shadcn/ui `Tooltip` component (may need install: `npx shadcn-ui@latest add tooltip`) |

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Collapsible cards (not nested indent)** | Cards provide clear visual boundary for meetings within the timeline line |
| **<=5 expanded, >5 collapsed** | Balances information density with scannability. Most meetings have 2-5 decisions. |
| **Discipline badges from participants, not decisions** | A discipline can participate without producing a decision — their presence still matters |
| **MeetingTypeBadge colors** | Rose for client (high attention), teal for coordination (calm), amber for review (focus), blue for internal (routine) |
| **"Other Decisions" for orphans** | Graceful degradation — decisions without a transcript_id still appear, just without meeting context |
| **Cross-discipline duplication** | In discipline mode, showing the same meeting under multiple disciplines is correct — each discipline's decisions are grouped under their heading |

---

*Handoff from Uma (UX-Design Expert) — desenhando com empatia*
