# AIOS Workflow Integration: From Research to Implementation

**Document Type:** Process & Workflow Guide
**Date:** 2026-02-08
**Purpose:** Show how to integrate UX research into AIOS story-driven development
**Audience:** @pm, @dev, @qa, @architect

---

## Overview

This guide shows **exactly how to use AIOS workflow** to turn research insights into stories, tasks, and sprints.

**Key Files Created:**
1. ✅ `docs/ux/RESEARCH-AND-DESIGN-SYSTEM-ANALYSIS.md` - Research findings
2. ✅ `docs/ux/REQUIREMENTS-TRANSLATION-GUIDE.md` - Story templates
3. 📝 `docs/stories/3.X-*.md` - Individual story files (created next)

---

## Step 1: Create Story Files from Research Insights

### Story File Naming Convention

Based on your existing pattern:
- `docs/stories/1.X-*.md` - Epic 1: Backend (Auth, DB)
- `docs/stories/2.X-*.md` - Epic 2: Vector Search & Embeddings
- `docs/stories/3.X-*.md` - Epic 3: Frontend Dashboard (NEW - from research)
- `docs/stories/4.X-*.md` - Epic 4: Role-Based Access

### Stories to Create (From Research Insights)

#### From Insight 1: Trust Through Transparency

```
docs/stories/3.7-decision-drill-down-modal.md
├── Accept Criteria: Full reasoning + transcript + consensus visible
├── Design: Shadcn/ui Dialog + Tabs
└── Depends: Story 3.5 (Timeline)
```

#### From Insight 2: Digest vs. Deep Dive

```
docs/stories/3.5-decision-timeline-component.md
├── For Architects: Full chronological timeline
├── Filters, virtual scrolling, meeting grouping
└── Depends: Backend API (Story 2.4)

docs/stories/3.8-executive-digest-view.md
├── For Gabriela: One-page summary
├── Metrics, highlights, anomalies
└── Depends: Backend digest endpoint
```

#### From Insight 3: Discipline-First

```
docs/stories/3.6-filters-search-sidebar.md
├── Discipline, meeting type, date range filters
├── Debounced search, combined filters
└── Depends: Backend filtering API
```

#### From Insight 4: Mobile-First

```
docs/stories/3.10-styling-responsive-design.md
├── Mobile responsive (375px-1024px+)
├── Touch-friendly (44px tap targets)
└── Applies to all components
```

---

## Step 2: Create Story Files Using Template

### Example Story File Template

Create `docs/stories/3.7-decision-drill-down-modal.md`:

```markdown
# Story 3.7: Decision Drill-Down Modal

**Epic:** 3 - Frontend Dashboard
**Priority:** P0 - Must Have
**Status:** Backlog → Ready
**Estimate:** 13 points
**Sprint:** Sprint 4 (Timeline/Detail Views)

---

## User Story

**As a** senior architect
**I want to** click a decision card and see full reasoning, transcript, and similar decisions
**So that** I understand why this decision was made and gain confidence making similar decisions

### Context from Research

**Research Insight:** "Trust Through Transparency"
- Architects need visibility into decision reasoning to build autonomy
- Current pain: "Don't understand why past decisions were made"
- Solution: Full drill-down with context + transcript + similar decisions

---

## Acceptance Criteria

### Decision Details Section
- [ ] Modal title shows decision statement
- [ ] Subtitle shows "By [who] at [timestamp]"
- [ ] Full "Why" reasoning visible (2-3 sentences)
- [ ] Causation: "What triggered this decision"
- [ ] Impacts section with all changes (timeline, scope, budget)
- [ ] Consensus breakdown per discipline (AGREE/DISAGREE/ABSTAIN)
- [ ] Confidence score with explanation (0-1 as %)
- [ ] Consistency notes (aligns with / contradicts past decisions)

### Transcript Excerpt Section
- [ ] Shows 5-10 minute context window around decision
- [ ] Speaker names in discipline colors
- [ ] Decision moment clearly highlighted
- [ ] Exact timestamps for each speaker line
- [ ] Link to full transcript (opens in new tab)

### Similar Decisions Section
- [ ] Shows 3-5 similar past decisions from SAME PROJECT
- [ ] Similarity score for each (e.g., "94% similar")
- [ ] Decision statement visible for each
- [ ] Clickable (navigate between similar decisions)

### Modal Behavior
- [ ] Opens on decision card click
- [ ] Closes on Escape key or close button
- [ ] Modal stays centered on screen
- [ ] Content scrollable if longer than viewport
- [ ] No focus loss (keyboard trap working)

### Responsive Design
- [ ] Desktop: 90% width, centered, max-width 900px
- [ ] Tablet: 95% width, full height with scroll
- [ ] Mobile: Full screen, scrollable
- [ ] Touch-friendly (close button ≥44px)

### Performance
- [ ] Opens in <1 second
- [ ] Smooth scroll (60 fps)
- [ ] No layout shift (CLS <0.1)

### Accessibility (WCAG 2.1 AA)
- [ ] Semantic HTML (dialog, sections, headings)
- [ ] Keyboard navigation (Tab through sections)
- [ ] Focus visible on all interactive elements
- [ ] Color contrast ≥4.5:1 for text
- [ ] Screen reader friendly (ARIA labels)

---

## Design Notes

### Components Used
- Shadcn/ui `Dialog` - Modal container
- Shadcn/ui `Tabs` - Three sections: Overview | Transcript | Similar
- Shadcn/ui `Alert` - For anomaly flags
- Custom `TranscriptExcerpt` - Formatted transcript display
- Custom `SimilarDecisionCard` - Similar decision display with score

### Tailwind Styling
```css
/* Modal styling */
.drill-down-modal {
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
}

/* Speaker colors in transcript */
.speaker-architecture { color: #3B82F6; } /* Blue */
.speaker-mep { color: #F97316; } /* Orange */
.speaker-landscape { color: #22C55E; } /* Green */

/* Decision highlight */
.decision-moment {
  background: #FEF3C7; /* Amber 50 */
  border-left: 3px solid #F59E0B; /* Amber 400 */
  padding: 12px;
}
```

### Color Reference
- Discipline colors from `tailwind.config.ts`
- Similarity score: green (>0.85), amber (0.6-0.85), red (<0.6)
- Anomaly flags: red for warnings, yellow for cautions

---

## Technical Details

### Data Provided by Backend

API: `GET /api/decisions/{decisionId}`

Response structure:
```json
{
  "id": "uuid",
  "decision_statement": "string",
  "who": "string (speaker name)",
  "timestamp": "HH:MM:SS",
  "discipline": "Architecture|MEP|...",
  "why": "string (full reasoning)",
  "impacts": [
    { "type": "timeline|scope|budget", "change": "description" }
  ],
  "causation": "string",
  "confidence": 0.92,
  "confidence_breakdown": { "consensus": ..., "consistency": ..., "historical": ... },
  "consensus": { "Architecture": "AGREE", "MEP": "MIXED" },
  "consistency_score": 0.87,
  "consistency_notes": "Aligns with Dec 3 decision...",
  "anomaly_flags": [
    { "type": "high_dissent", "severity": "medium", "description": "..." }
  ],
  "transcript_excerpt": "string with speaker prefixes",
  "similar_decisions": [
    { "id": "uuid", "statement": "...", "similarity_score": 0.94 }
  ]
}
```

### Frontend Components

```typescript
// src/components/DrillDownModal.tsx
interface DrillDownModalProps {
  decisionId: string;
  onClose: () => void;
}

export function DrillDownModal({ decisionId, onClose }: DrillDownModalProps) {
  const { data: decision } = useDecisionDetail(decisionId);
  // ... component logic
}

// Usage
const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);

return (
  <>
    <Timeline onDecisionClick={setSelectedDecisionId} />
    {selectedDecisionId && (
      <DrillDownModal
        decisionId={selectedDecisionId}
        onClose={() => setSelectedDecisionId(null)}
      />
    )}
  </>
);
```

### Performance Considerations
- Use React Query caching to avoid re-fetching
- Lazy-load similar decisions (don't block modal open)
- Memoize TranscriptExcerpt component (expensive to render)
- Virtual scrolling if transcript >20 lines

---

## File List

- [ ] `src/components/DrillDownModal.tsx` (main component)
- [ ] `src/components/TranscriptExcerpt.tsx` (custom)
- [ ] `src/components/SimilarDecisionCard.tsx` (custom)
- [ ] `src/hooks/useDecisionDetail.ts` (data fetching)
- [ ] `src/__tests__/DrillDownModal.test.tsx` (tests)
- [ ] `src/__tests__/TranscriptExcerpt.test.tsx` (tests)

---

## Definition of Done

### Development
- [ ] All components build without TypeScript errors
- [ ] No console errors or warnings
- [ ] All acceptance criteria met (manual check)
- [ ] Props properly typed

### Testing
- [ ] Unit tests for each component (>80% coverage)
- [ ] Integration test: Modal opens on card click
- [ ] Test edge cases: long transcript, many similar decisions
- [ ] Manual QA: Desktop + Tablet + Mobile

### Quality
- [ ] Accessibility audit: WCAG 2.1 AA pass
- [ ] Performance: Modal opens <1s, Lighthouse >90
- [ ] Code review approved by @architect + @dev lead
- [ ] No performance regressions

### Deployment
- [ ] Merged to main branch
- [ ] Deployed to staging
- [ ] Stakeholder approval (Gabriela if available)
- [ ] Ready for production

---

## Dependencies

**Depends On:**
- Story 3.5: Decision Timeline Component (needed for click trigger)
- Story 2.4: Decision Detail API endpoint (backend)
- Story 3.10: Responsive Design (mobile testing)

**Blocks:**
- (None - this is a detail view)

---

## Related Stories

- Story 3.5: Decision Timeline (parent view)
- Story 3.6: Filters (used to narrow decisions)
- Story 3.8: Executive Digest (high-level view)

---

## Notes

### Edge Cases to Handle
1. **Long transcript** - Use scrollable container, don't expand infinitely
2. **No similar decisions** - Show message: "No similar decisions in project history"
3. **Slow API** - Show loading spinner, don't block modal open
4. **Mobile with long transcript** - Full-screen scroll, optimized layout

### Future Enhancements (Phase 2+)
- Copy decision to clipboard
- Share drill-down link
- Download transcript as PDF
- Inline edit decision (Gabriela approval)
- Comments/annotations on decisions

### Testing Strategy
1. Manual QA: Click decision on timeline, verify modal opens
2. Unit tests: Component renders, props passed correctly
3. Integration test: API call succeeds, data displays
4. Accessibility: Keyboard navigation, screen reader
5. Performance: Modal <1s open time

---

## Sprint Planning Notes

**Estimated Effort:** 13 points = 5 days (includes testing, QA)

**Team Assignment:**
- @dev: DrillDownModal + TranscriptExcerpt (3 days)
- @qa: Testing + accessibility audit (2 days)
- @architect: Design review (0.5 day)

**Timeline:**
- Day 1-2: Component scaffolding + styling
- Day 3: API integration + transcript formatting
- Day 4: Similar decisions display + performance
- Day 5: Testing + accessibility + polish

---

**Story Status:** Backlog
**Next Review:** Sprint Planning
**Author:** Uma (UX Design Expert)
**Created:** 2026-02-08

---

## Reference Links

- Research Insight: RESEARCH-AND-DESIGN-SYSTEM-ANALYSIS.md → Insight 1
- Translation Guide: REQUIREMENTS-TRANSLATION-GUIDE.md → Part 1 Example
- API Design: docs/architecture/02-API-SPECIFICATION.md
- Design System: docs/ux/RESEARCH-AND-DESIGN-SYSTEM-ANALYSIS.md → Shadcn/ui
```

---

## Step 3: Create Task Breakdown for Sprint

Once story is "Ready", create tasks:

```markdown
# Sprint 4 Tasks for Story 3.7

## Task 1: DrillDownModal Component
- Create component scaffolding
- Add Tabs for sections
- Wire up props and state
- **Owner:** @dev | **Points:** 3 | **Duration:** 1 day

## Task 2: Overview Tab
- Decision details display
- Impacts, consensus, confidence
- Consistency notes, anomaly flags
- **Owner:** @dev | **Points:** 3 | **Duration:** 1 day

## Task 3: TranscriptExcerpt Component
- Format transcript with speaker colors
- Highlight decision moment
- Add timestamps
- **Owner:** @dev | **Points:** 3 | **Duration:** 1 day

## Task 4: Similar Decisions Tab
- Fetch similar decisions from API
- Display with scores
- Make clickable (navigate)
- **Owner:** @dev | **Points:** 2 | **Duration:** 4 hours

## Task 5: Testing & QA
- Unit tests (>80%)
- Manual QA all breakpoints
- Accessibility audit
- Performance check
- **Owner:** @qa | **Points:** 2 | **Duration:** 1 day
```

---

## Step 4: Track Progress in Story Files

### Checklist Format

Update the story file as you progress:

```markdown
## Progress Checklist

### Phase 1: Development (In Progress)
- [x] Task 1: Component scaffolding
- [x] Task 2: Overview tab
- [ ] Task 3: Transcript component (50%)
- [ ] Task 4: Similar decisions
- [ ] Task 5: Testing

### Phase 2: Quality Assurance
- [ ] Manual QA desktop
- [ ] Manual QA mobile
- [ ] Accessibility audit
- [ ] Performance testing

### Phase 3: Review & Merge
- [ ] Code review
- [ ] Approved by @architect
- [ ] Merged to main
- [ ] Deployed to staging

---

## Blockers

**Current:** Transcript formatting - Need to parse speaker prefixes from API response
**Resolution:** Work with @dev (backend) to format transcript properly

---

## File Progress

- [x] `src/components/DrillDownModal.tsx` - 100%
- [x] `src/components/TranscriptExcerpt.tsx` - 60%
- [ ] `src/components/SimilarDecisionCard.tsx` - 0%
- [ ] Tests - 0%
```

---

## Step 5: Communication & Handoff

### Daily Standup Update

```
Story 3.7: Decision Drill-Down Modal
Status: On Track (70% complete)

Yesterday:
- Built DrillDownModal scaffold
- Completed Overview tab styling

Today:
- Build TranscriptExcerpt component
- Format transcript with speaker colors

Blockers:
- None

Next Steps:
- Similar decisions component (tomorrow)
- Begin QA testing
```

### Sprint Review

```
Story 3.7: Decision Drill-Down Modal
Status: DONE ✅

Completed:
- ✅ All components built
- ✅ Acceptance criteria met
- ✅ Unit tests (92% coverage)
- ✅ Manual QA passed
- ✅ Accessibility audit passed
- ✅ Performance: Modal opens <800ms

Ready for: Production release with Story 3.5 & 3.6
```

---

## Complete Workflow Summary

```
PHASE 1: RESEARCH (Completed ✅)
├── Conduct user research
├── Analyze design systems
├── Document findings
└── Create RESEARCH-AND-DESIGN-SYSTEM-ANALYSIS.md

PHASE 2: REQUIREMENTS (In Progress)
├── Translate research to user stories
├── Create story files (docs/stories/3.X-*.md)
├── Define acceptance criteria
├── Create REQUIREMENTS-TRANSLATION-GUIDE.md
└── Get team alignment

PHASE 3: PLANNING
├── Sprint planning
├── Estimate story points
├── Assign to team
└── Create task breakdown

PHASE 4: EXECUTION
├── Daily development
├── Continuous testing
├── Track progress in stories
└── Daily standups

PHASE 5: QUALITY
├── QA testing
├── Accessibility audit
├── Performance validation
└── Code review

PHASE 6: RELEASE
├── Staging deployment
├── Final stakeholder review
├── Production release
└── Monitor metrics
```

---

## Files to Create Next

Based on research, create these story files:

```bash
# Epic 3: Frontend Dashboard (from research)
docs/stories/3.5-decision-timeline-component.md
docs/stories/3.6-filters-search-sidebar.md
docs/stories/3.7-decision-drill-down-modal.md
docs/stories/3.8-executive-digest-view.md
docs/stories/3.9-api-endpoints-timeline-digest.md
docs/stories/3.10-styling-responsive-design.md
```

---

## Quick Start Checklist

To implement this workflow right now:

- [x] ✅ Created `RESEARCH-AND-DESIGN-SYSTEM-ANALYSIS.md`
- [x] ✅ Created `REQUIREMENTS-TRANSLATION-GUIDE.md`
- [ ] 📝 Create `docs/stories/3.5-decision-timeline-component.md`
- [ ] 📝 Create `docs/stories/3.6-filters-search-sidebar.md`
- [ ] 📝 Create `docs/stories/3.7-decision-drill-down-modal.md`
- [ ] 📝 Create `docs/stories/3.8-executive-digest-view.md`
- [ ] 📝 Create `docs/stories/3.10-styling-responsive-design.md`
- [ ] 📋 Create sprint plan (assign points, sprint number)
- [ ] 🤝 Team alignment meeting (review stories, clarify questions)
- [ ] 🚀 Sprint kickoff

---

**Document Status:** Complete - Ready to Implement
**Next Action:** Create story files from template
**Contact:** Uma (UX Design Expert) for design questions

