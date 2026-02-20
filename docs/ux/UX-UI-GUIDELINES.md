# DecisionLog UX/UI Guidelines

**Document Version:** 1.0
**Date Created:** 2026-02-16
**Author:** Uma (UX-Design Expert)
**Status:** Active — Single Source of Truth
**Supersedes:** Informal specs embedded in stories
**Referenced by:** PRD v2.2 (line 96), CLAUDE.md

---

## TABLE OF CONTENTS

1. [Design Philosophy](#1-design-philosophy)
2. [Color System](#2-color-system)
3. [Typography](#3-typography)
4. [Spacing & Layout](#4-spacing--layout)
5. [Responsive Breakpoints](#5-responsive-breakpoints)
6. [Component Architecture](#6-component-architecture)
7. [Interaction Patterns](#7-interaction-patterns)
8. [Animation & Motion](#8-animation--motion)
9. [Iconography](#9-iconography)
10. [Accessibility Standards](#10-accessibility-standards)
11. [V2 Visual Patterns](#11-v2-visual-patterns)
12. [Dark Mode & Theming](#12-dark-mode--theming)
13. [Print & Export Styles](#13-print--export-styles)

---

## 1. DESIGN PHILOSOPHY

### Core Principles

| # | Principle | Description | Origin |
|---|-----------|-------------|--------|
| 1 | **Minimalism** | Show only what's needed at each level. No gratuitous decoration. | Gabriela: "smoother and easy to use rather than complex visualization" |
| 2 | **Information Density** | Prioritize scannable rows over spacious cards. Target: 10-15 items visible per screen. | V1 redesign feedback — 3 items/screen was insufficient |
| 3 | **Progressive Disclosure** | Summary in the row, details on click. Every layer adds depth without adding clutter. | DrilldownModal pattern, 3-layer hierarchy |
| 4 | **Contextual Grouping** | Information is grouped by how users think: Date > Source > Item. Two mental models supported: chronological and discipline-first. | Validated with Gabriela (Feb 2026) |
| 5 | **Accessible by Default** | WCAG 2.1 AA minimum. Color is never the sole information channel. Keyboard navigable. | PRD NFR, inclusive design |
| 6 | **Consistent, Not Uniform** | Reuse patterns and tokens across views, but allow each view to serve its unique purpose (Milestone Timeline is elegant; Project History is dense). | Atomic design methodology |

### Design Voice

The UI communicates **professional clarity** suited to an architecture firm:
- Clean, geometric, unhurried
- Neutral backgrounds with purposeful color accents (discipline-coded)
- Typography that establishes hierarchy without shouting
- Generous use of white space between groups, compact within groups

---

## 2. COLOR SYSTEM

### 2.1 Semantic Colors (CSS Variables)

These are defined as HSL CSS variables in the root stylesheet and consumed via Tailwind.

| Token | Usage | Tailwind Class |
|-------|-------|---------------|
| `--background` | Page background | `bg-background` |
| `--foreground` | Primary text | `text-foreground` |
| `--border` | Default borders | `border-border` |
| `--input` | Form input borders | `border-input` |
| `--ring` | Focus rings | `ring-ring` |

### 2.2 Discipline Colors (Canonical Definition)

**Source of truth.** All implementations (`tailwind.config.ts`, `src/lib/utils.ts`) must mirror this table exactly.

| Value | Label | Abbrev. | Hex | Tailwind Family | Pill BG | Pill Text |
|-------|-------|---------|-----|-----------------|---------|-----------|
| `architecture` | Architecture | Arch | `#3B82F6` | blue | `bg-blue-100` | `text-blue-700` |
| `structural` | Structural | Struct | `#8B5CF6` | purple | `bg-purple-100` | `text-purple-700` |
| `mep` | MEP | MEP | `#F97316` | orange | `bg-orange-100` | `text-orange-700` |
| `electrical` | Electrical | Elec | `#F59E0B` | amber | `bg-amber-100` | `text-amber-700` |
| `plumbing` | Plumbing | Plumb | `#06B6D4` | cyan | `bg-cyan-100` | `text-cyan-700` |
| `landscape` | Landscape | Land | `#10B981` | green | `bg-green-100` | `text-green-700` |
| `fire_protection` | Fire Protection | Fire | `#EF4444` | red | `bg-red-100` | `text-red-700` |
| `acoustical` | Acoustical | Acoust | `#7C3AED` | violet | `bg-violet-100` | `text-violet-700` |
| `sustainability` | Sustainability | Sustain | `#059669` | emerald | `bg-emerald-100` | `text-emerald-700` |
| `civil` | Civil | Civil | `#14B8A6` | teal | `bg-teal-100` | `text-teal-700` |
| `client` | Client | Client | `#F43F5E` | rose | `bg-rose-100` | `text-rose-700` |
| `contractor` | Contractor | Contr | `#D97706` | amber-dark | `bg-amber-200` | `text-amber-700` |
| `tenant` | Tenant | Tenant | `#EC4899` | pink | `bg-pink-100` | `text-pink-700` |
| `engineer` | Engineer | Eng | `#6366F1` | indigo | `bg-indigo-100` | `text-indigo-700` |
| `general` | General | Gen | `#6B7280` | gray | `bg-gray-100` | `text-gray-700` |

**Usage rules:**
- **Pill/Badge format:** light background + darker text from the same hue family (`bg-{color}-100` + `text-{color}-700`)
- **Timeline nodes:** solid hex on `bg-[#hex]`
- **Discipline circles (V2):** solid hex background, white single-letter, `w-6 h-6 rounded-full`
- **Fallback:** `bg-gray-100` / `text-gray-700` for unknown disciplines

### 2.3 Consensus Colors

| Status | Hex | Background | Text |
|--------|-----|------------|------|
| Agree | `#10B981` | `bg-green-100` | `text-green-900` |
| Mixed | `#F59E0B` | `bg-amber-100` | `text-amber-900` |
| Dissent | `#EF4444` | `bg-red-100` | `text-red-900` |

### 2.4 Impact Severity Colors

| Level | Hex | Classes |
|-------|-----|---------|
| High | `#DC2626` | `bg-red-100 text-red-900` |
| Medium | `#F59E0B` | `bg-amber-100 text-amber-900` |
| Low | `#9CA3AF` | `bg-gray-100 text-gray-900` |

### 2.5 Impact Type Colors

Used in DrilldownModal impact breakdown.

| Type | Dot | Background | Text |
|------|-----|------------|------|
| Scope | `bg-blue-500` | `bg-blue-50` | `text-blue-700` |
| Cost | `bg-amber-500` | `bg-amber-50` | `text-amber-700` |
| Schedule | `bg-red-500` | `bg-red-50` | `text-red-700` |
| Quality | `bg-emerald-500` | `bg-emerald-50` | `text-emerald-700` |
| Risk | `bg-rose-500` | `bg-rose-50` | `text-rose-700` |
| Resource | `bg-violet-500` | `bg-violet-50` | `text-violet-700` |

### 2.6 Meeting Type Colors

| Type | Background | Text | Dot |
|------|------------|------|-----|
| Client Meeting | `bg-rose-50` | `text-rose-700` | `bg-rose-400` |
| Coordination | `bg-teal-50` | `text-teal-700` | `bg-teal-400` |
| Design Review | `bg-amber-50` | `text-amber-700` | `bg-amber-400` |
| Internal | `bg-blue-50` | `text-blue-700` | `bg-blue-400` |

### 2.7 Item Type Colors (V2)

| Type | Hex | Icon | Badge BG | Badge Text |
|------|-----|------|----------|------------|
| Decision | `#10B981` (green) | `CheckCircle2` | `bg-green-100` | `text-green-700` |
| Topic | `#F59E0B` (amber) | `MessageCircle` | `bg-amber-100` | `text-amber-700` |
| Action Item | `#3B82F6` (blue) | `Target` | `bg-blue-100` | `text-blue-700` |
| Idea | `#8B5CF6` (purple) | `Lightbulb` | `bg-purple-100` | `text-purple-700` |
| Information | `#64748B` (slate) | `Info` | `bg-slate-100` | `text-slate-700` |

### 2.8 Source Type Colors (V2)

| Source | Icon (Lucide) | Badge BG | Badge Text |
|--------|---------------|----------|------------|
| Meeting | `Video` | `bg-indigo-100` | `text-indigo-700` |
| Email | `Mail` | `bg-sky-100` | `text-sky-700` |
| Document | `FileText` | `bg-orange-100` | `text-orange-700` |
| Manual Input | `PenLine` | `bg-gray-100` | `text-gray-700` |

### 2.9 Status Colors (Ingestion)

| Status | Color | Classes |
|--------|-------|---------|
| Pending | Yellow | `bg-yellow-100 text-yellow-800` |
| Approved | Green | `bg-green-100 text-green-800` |
| Rejected | Red | `bg-red-100 text-red-800` |
| Processed | Blue | `bg-blue-100 text-blue-800` |

### 2.10 Interactive State Colors

| State | Background | Border |
|-------|------------|--------|
| Hover (row) | `bg-blue-50/50` | — |
| Hover (meeting header) | `bg-gray-100/50` | — |
| Focus ring | — | `ring-2 ring-ring ring-offset-2` |
| Selected/Active | `bg-blue-50` | `border-blue-500` |
| Disabled | `opacity-50` | — |
| Error | `bg-red-50` | `border-red-500` |

### Color Rules

1. **Never rely on color alone** to convey meaning — always pair with icon, text, or shape
2. **Discipline colors are immutable** — the hex values above are the canonical definition
3. **Use the 100/700 pattern** for all badge/pill components (light bg, dark text from same hue)
4. **Contrast ratios** must meet WCAG AA: 4.5:1 for normal text, 3:1 for large text
5. **Fallback to gray** for any unrecognized or missing enum value

---

## 3. TYPOGRAPHY

### 3.1 Font Stack

```css
font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
             "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
```

The system font stack ensures fast loading, native feel, and consistent rendering across platforms.

### 3.2 Type Scale

| Token | Size | Line Height | Weight | Tailwind | Usage |
|-------|------|-------------|--------|----------|-------|
| **Display** | 24px | 32px | Bold (700) | `text-2xl font-bold` | Page titles |
| **Heading** | 18px | 28px | Semibold (600) | `text-lg font-semibold` | Section headers, modal titles |
| **Subheading** | 14px | 20px | Semibold (600) | `text-sm font-semibold` | Group headers (meeting titles, source groups) |
| **Body** | 14px | 20px | Medium (500) | `text-sm font-medium` | Primary content, item statements |
| **Body Regular** | 14px | 20px | Normal (400) | `text-sm` | Secondary content, descriptions |
| **Caption** | 12px | 16px | Normal (400) | `text-xs` | Metadata, counts, timestamps, secondary info |
| **Overline** | 12px | 16px | Bold (700) | `text-xs font-bold tracking-wide uppercase` | Date headers (V2 Dense Rows style) |

### 3.3 Hierarchy by View

#### Project History (V2 Dense Rows)

| Layer | Style | Example |
|-------|-------|---------|
| Date header | `text-xs font-bold tracking-wide uppercase` + sticky | `FEB 8, 2026` |
| Source group | `text-sm font-semibold` + `border-l-2` colored | `Client Alignment - Electrical` |
| Item row | `text-sm font-medium` (statement) + `text-xs` (metadata) | Decision text + who + timestamp |

#### Milestone Timeline (V2)

| Element | Style |
|---------|-------|
| Stage name | `text-sm font-semibold` |
| Stage date range | `text-xs text-gray-500` |
| Milestone statement | `text-sm font-medium` |
| Milestone metadata | `text-xs text-gray-500` |
| "Current" label | `text-xs font-bold text-blue-600 uppercase` |
| "Today" marker | `text-xs font-semibold text-red-500` |

#### Timeline (V1 — Current Implementation)

| Layer | Style |
|-------|-------|
| Date header | `text-sm font-semibold` with full format: "Friday, 7 February 2026" |
| Meeting title | `text-sm font-medium` |
| Decision statement | `text-sm font-medium` (truncated) |
| Who / Timestamp | `text-xs text-gray-500` |

### 3.4 Typography Rules

1. **No font sizes below 12px** (`text-xs`) — accessibility floor
2. **Truncation:** use `line-clamp-1` or `truncate` for row content; full text available on drill-down
3. **Date formats:**
   - Full date: `Friday, 7 February 2026` (en-GB locale) — V1 timeline
   - Dense date: `FEB 8, 2026` (uppercase, short month) — V2 Project History
   - Timestamp: `HH:MM:SS` format for meeting recordings
   - Date range: `Jan 15 - Mar 30, 2026` — stage schedules
4. **Number formatting:** `formatNumber()` for large values (1K, 1.2M)

---

## 4. SPACING & LAYOUT

### 4.1 Spacing Scale

Based on a **4px base unit**. All spacing values are multiples of 4.

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `space-1` | 4px | `p-1`, `gap-1` | Minimal inner padding (badges) |
| `space-2` | 8px | `p-2`, `gap-2` | Gap between items in a row, between rows |
| `space-3` | 12px | `p-3`, `gap-3` | Row vertical padding, filter bar padding |
| `space-4` | 16px | `p-4`, `gap-4` | Row horizontal padding, section gaps |
| `space-5` | 20px | `p-5`, `gap-5` | Large section padding |
| `space-6` | 24px | `p-6`, `gap-6` | Card/modal inner padding |
| `space-8` | 32px | `p-8`, `gap-8` | Page-level spacing, large separators |

### 4.2 Layout Patterns

#### Row Dimensions

| Element | Height | Padding | Gap |
|---------|--------|---------|-----|
| Dense item row (V2) | 32-40px | `py-2 px-4` | `space-y-0.5` |
| Standard item row (V1) | 56-64px | `py-3 px-4` | `space-y-2` |
| Meeting group header | 48px | `py-3 px-4` | — |
| Date header (V2 sticky) | 32px | `py-2 px-4` | — |
| Filter bar | auto | `p-3` | `gap-2` between items |

#### Container Widths

| Context | Width | Tailwind |
|---------|-------|----------|
| Page content | Max 1280px, centered | `max-w-screen-xl mx-auto` |
| Modal (DrilldownModal) | Max 640px | `max-w-lg` |
| Form (ProjectForm) | Max 768px | `max-w-screen-md` |
| Milestone Timeline | Max 960px, centered | `max-w-4xl mx-auto` |

#### Content Margins

| Region | Value |
|--------|-------|
| Page padding | `px-4 sm:px-6 lg:px-8` |
| Section spacing | `mb-6` between major sections |
| Meeting group spacing | `mb-3` between groups |

### 4.3 Border Conventions

| Element | Border | Radius |
|---------|--------|--------|
| Cards / meeting groups | `border border-gray-200` | `rounded-lg` (8px) |
| Badges / pills | — | `rounded-full` (full pill) |
| Input fields | `border border-input` | `rounded-md` (6px) |
| Buttons | — | `rounded-md` |
| Modal | `border border-gray-200` | `rounded-xl` (12px) |
| Meeting group left accent | `border-l-4 border-{discipline-color}` | — |
| Source group left accent (V2) | `border-l-2 border-{source-color}` | — |

### 4.4 Shadow Conventions

| Level | Usage | Tailwind |
|-------|-------|----------|
| None | Default for rows, badges | — |
| Subtle | Cards, meeting groups | `shadow-sm` |
| Medium | Modals, popovers, dropdowns | `shadow-md` |
| Large | Toast notifications | `shadow-lg` |

---

## 5. RESPONSIVE BREAKPOINTS

### 5.1 Breakpoint Definitions

Defined in `tailwind.config.ts`:

| Token | Width | Target |
|-------|-------|--------|
| `sm` | 375px | Mobile (iPhone SE+) |
| `md` | 768px | Tablet (iPad) |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Large desktop |
| `2xl` | 1536px | Extra large |

### 5.2 Strategy: Mobile-Aware, Desktop-First

The primary user (Gabriela) uses desktop for daily work and mobile/iPad during field visits and maternity leave. We design for desktop first, then ensure mobile works well.

### 5.3 Responsive Behavior by Component

| Component | Mobile (< 768px) | Tablet (768-1023px) | Desktop (1024px+) |
|-----------|-------------------|---------------------|--------------------|
| Navigation | Hamburger menu | Full horizontal | Full horizontal |
| Filter bar | Stacked, collapsible | Horizontal, wrapping | Horizontal, single row |
| Timeline rows | Full-width, taller rows | Standard | Standard |
| Meeting groups | Stacked, simplified | Full layout | Full layout |
| DrilldownModal | Full-screen sheet | Centered modal | Centered modal |
| Milestone Timeline | Single-column, no side labels | Two-column (stages left, milestones right) | Two-column |
| Project cards | Single column | 2-column grid | 3-column grid |
| Date headers | Sticky, condensed | Sticky | Sticky |

### 5.4 Touch Targets

- Minimum touch target: **44x44px** on mobile (WCAG 2.5.5 Target Size)
- Interactive row height on mobile: minimum **48px**
- Spacing between interactive elements: minimum **8px**

---

## 6. COMPONENT ARCHITECTURE

### 6.1 Atomic Design Hierarchy

```
atoms/         Pure display, single-purpose, no side effects
   ↓
molecules/     Composed from atoms, may have local state
   ↓
organisms/     Complex components with API calls, stores, business logic
   ↓
templates/     Page layout wrappers
   ↓
pages/         Route-level components (combine templates + organisms)
```

### 6.2 Component Placement Rules

| Criteria | Directory | Examples |
|----------|-----------|---------|
| Used across multiple pages | `common/` | `Navigation`, `ProjectCard` |
| Pure display, no side effects | `atoms/` | `DisciplinePill`, `ItemTypeBadge`, `SourceIcon` |
| Composed display, minimal state | `molecules/` | `DecisionRow`, `MeetingGroup`, `MilestoneNode` |
| Complex state, API calls, stores | `organisms/` | `Timeline`, `FilterBar`, `MilestoneTimeline` |
| Page layout wrapper | `templates/` | `DashboardTemplate` |

### 6.3 Component Inventory

#### Existing (V1 — Implemented)

| Component | Type | Directory | Description |
|-----------|------|-----------|-------------|
| `DisciplinePill` | Atom | `atoms/` | Colored pill with abbreviated discipline name |
| `MeetingTypeBadge` | Atom | `atoms/` | Meeting type label (Client Meeting, Coordination, etc.) |
| `ParticipantIndicator` | Atom | `atoms/` | Count badge with CSS hover tooltip (no Radix) |
| `DecisionRow` | Molecule | `molecules/` | 2-line compact decision display (statement + metadata) |
| `MeetingGroup` | Molecule | `molecules/` | Accordion card wrapping decisions per meeting |
| `DisciplineBadge` | Molecule | `molecules/` | Display badge with discipline color coding |
| `FilterPopover` | Molecule | `molecules/` | Radix popover wrapping filter options |
| `GroupingToggle` | Molecule | `molecules/` | Radio toggle: By Date / By Discipline |
| `Timeline` | Organism | `organisms/` | Main timeline view with 3-layer hierarchy |
| `FilterBar` | Organism | `organisms/` | Horizontal filter bar with popovers |
| `FiltersSidebar` | Organism | `organisms/` | Legacy sidebar filters (deprecated in favor of FilterBar) |
| `DrilldownModal` | Organism | `organisms/` | Full decision detail modal (Radix Dialog) |
| `ExecutiveDigest` | Organism | `organisms/` | Summary view with cost/timeline/risk overview |
| `Navigation` | Common | `common/` | Top nav bar |
| `ProjectCard` | Common | `common/` | Project list card |

#### New (V2 — Planned)

| Component | Type | Directory | Description |
|-----------|------|-----------|-------------|
| `ItemTypeBadge` | Atom | `atoms/` | Compact colored badge with icon per item type |
| `SourceIcon` | Atom | `atoms/` | Icon per source type (Video, Mail, FileText, PenLine) |
| `DisciplineCircle` | Atom | `atoms/` | Single-letter colored circle, primary gets ring |
| `StagePill` | Atom | `atoms/` | Project stage name badge |
| `MilestoneNode` | Molecule | `molecules/` | Dot timeline node (right side — milestone content) |
| `StageNode` | Molecule | `molecules/` | Dot timeline node (left side — stage marker) |
| `ProjectItemRow` | Molecule | `molecules/` | Dense row for Project History (replaces DecisionRow for V2) |
| `MeetingSummary` | Molecule | `molecules/` | Expandable AI-generated meeting summary |
| `IngestionRow` | Molecule | `molecules/` | Row in ingestion approval table |
| `MilestoneTimeline` | Organism | `organisms/` | Dot Timeline view (stages + milestones) |
| `IngestionApproval` | Organism | `organisms/` | Ingestion review table with approve/reject |
| `ProjectForm` | Organism | `organisms/` | Project create/edit form |
| `StageScheduleBuilder` | Organism | `organisms/` | Stage date-range editor within ProjectForm |

### 6.4 State Management Pattern

| Layer | Tool | Scope | Examples |
|-------|------|-------|---------|
| Server state | React Query | API data, cache, mutations | `useProjectItems`, `useMilestones` |
| Client state | Zustand | UI-wide state, filters, preferences | `filterStore`, `milestoneStore` |
| Local state | `useState` | Component-scoped | Accordion expanded, tooltip visible |
| URL state | URL params | Shareable, bookmarkable | Filter state, active tab |

**Rule:** If state needs to survive navigation or be shareable, it goes in URL params. If it's UI-wide but not shareable, Zustand. If it's data from the API, React Query. If it's scoped to one component, local state.

---

## 7. INTERACTION PATTERNS

### 7.1 Navigation

| Pattern | Behavior |
|---------|----------|
| Project Detail tabs | `Milestone Timeline` | `Project History` — tab toggle, state in URL hash |
| Default view | Milestone Timeline if stages exist, else Project History |
| Breadcrumbs | `Projects > Project Name > [Current View]` |
| Back navigation | Browser back button preserves scroll position and filter state |

### 7.2 Filtering

| Pattern | Implementation |
|---------|---------------|
| Filter location | Horizontal bar above content (not sidebar) |
| Filter controls | Popover dropdowns (Radix) for multi-option, chips for toggles |
| Active filters | Shown as removable chips below filter bar |
| Filter count | Badge showing number of active filters |
| Clear filters | Single "Clear all" button resets to default |
| Filter persistence | URL params for shareability, Zustand for session |
| Response time | < 200ms for filter updates (client-side filtering where possible) |
| Debounce | 300ms on search input |

### 7.3 Drill-Down (Progressive Disclosure)

| Level | What's Shown | Action to Go Deeper |
|-------|-------------|---------------------|
| Row | Statement (truncated) + type badge + discipline + who + timestamp | Click row |
| Modal | Full statement, context, consensus, impacts, transcript excerpt, similar items | Scroll within modal tabs |

### 7.4 Accordion / Collapse

| Context | Default State | Trigger |
|---------|---------------|---------|
| Meeting group (V1) | Expanded if <= 5 decisions, collapsed if > 5 | Click header or chevron |
| Source group (V2) | Same rule: expanded <= 5, collapsed > 5 | Click header or chevron |
| Meeting summary (V2) | Collapsed (icon button on hover) | Click summary icon |

### 7.5 Toggles & Actions

| Action | Pattern | Feedback |
|--------|---------|----------|
| Milestone toggle | Star/flag icon, filled when active | Optimistic UI — instant toggle, rollback on error |
| Action item is_done | Checkbox toggle | Optimistic UI with strikethrough text |
| Ingestion approve/reject | Toggle switch or button pair | Status badge color change |
| Delete/destructive | Confirmation dialog (Radix AlertDialog) | Toast notification on success |

### 7.6 Empty States

| View | Empty State Message |
|------|---------------------|
| Milestone Timeline | "No milestones yet. Mark important items as milestones from the Project History." |
| Project History | "No project items yet. Items will appear as meetings are processed." |
| Project List | "Create your first project" with CTA button |
| Filter results | "No items match your filters." with "Clear filters" link |
| Ingestion queue | "All caught up! No pending items to review." |

### 7.7 Loading States

| Pattern | Implementation |
|---------|---------------|
| Skeleton screens | `animate-pulse` gray blocks matching row layout |
| Inline loading | Spinner (16px) next to triggering button |
| Full-page loading | Centered spinner with "Loading project..." text |
| Optimistic updates | Apply change immediately, revert on error with toast |

### 7.8 Error States

| Pattern | Implementation |
|---------|---------------|
| API error | Red banner at top of content area: "Failed to load. Try again." with retry button |
| Form validation | Inline red text below field, red border on invalid input |
| Network error | Toast notification: "Network error. Changes will sync when reconnected." |
| Permission error | Redirect to appropriate view with toast: "Admin access required." |

---

## 8. ANIMATION & MOTION

### 8.1 Duration Scale

| Token | Duration | Usage |
|-------|----------|-------|
| `instant` | 0ms | Immediate feedback (color change on click) |
| `fast` | 150ms | Hover states, micro-interactions |
| `normal` | 200ms | Expand/collapse, chevron rotation |
| `smooth` | 300ms | Modal enter, slide transitions |
| `slow` | 500ms | Skeleton fade-out after content loads |

### 8.2 Easing

| Curve | Usage | CSS |
|-------|-------|-----|
| Ease-out | Elements entering (modals, dropdowns) | `ease-out` |
| Ease-in | Elements leaving (modal close) | `ease-in` |
| Ease-in-out | Expand/collapse, toggle | `ease-in-out` |

### 8.3 Animation Patterns

| Element | Animation | Tailwind |
|---------|-----------|----------|
| Row hover | Background color fade | `transition-colors duration-150` |
| Chevron rotation | 180deg rotate | `transition-transform duration-200` |
| Modal overlay | Opacity fade in | `transition-opacity duration-300` |
| Skeleton loading | Pulse | `animate-pulse` |
| Filter chip appear | Scale from 0.95 + fade | `transition-all duration-200` |
| Tooltip | Opacity fade | `transition-opacity duration-150` |

### 8.4 Motion Rules

1. **60fps scroll performance** — never animate layout properties (`width`, `height`) during scroll
2. **Prefer opacity and transform** — GPU-accelerated, non-layout-triggering
3. **Respect prefers-reduced-motion** — wrap animations in `@media (prefers-reduced-motion: no-preference)`
4. **No animation on data load** — content appears immediately, skeletons fade out
5. **Subtle, not flashy** — motion serves function (feedback, orientation), not decoration

---

## 9. ICONOGRAPHY

### 9.1 Icon Library

**Lucide React** — consistent, lightweight, MIT-licensed.

Import pattern:
```tsx
import { CheckCircle2, MessageCircle, Target, Lightbulb, Info } from 'lucide-react'
```

### 9.2 Icon Sizing

| Context | Size | Tailwind |
|---------|------|----------|
| Inline with text-xs | 12px | `w-3 h-3` |
| Inline with text-sm | 16px | `w-4 h-4` |
| Button icon | 16px | `w-4 h-4` |
| Standalone (row leading) | 20px | `w-5 h-5` |
| Modal header | 24px | `w-6 h-6` |

### 9.3 Icon Usage Map

| Context | Icon | Notes |
|---------|------|-------|
| **Item Types** | | |
| Decision | `CheckCircle2` | Green |
| Topic | `MessageCircle` | Amber |
| Action Item | `Target` | Blue |
| Idea | `Lightbulb` | Purple |
| Information | `Info` | Slate |
| **Source Types** | | |
| Meeting | `Video` | |
| Email | `Mail` | |
| Document | `FileText` | |
| Manual Input | `PenLine` | |
| **Actions** | | |
| Expand/Collapse | `ChevronDown` | Rotates 180deg when expanded |
| Filter | `Filter` | |
| Search | `Search` | |
| Close | `X` | |
| Milestone | `Star` | Filled when active, outline when inactive |
| Edit | `Pencil` | |
| Delete | `Trash2` | |
| External link | `ExternalLink` | |
| Share | `Share2` | |
| Export | `Download` | |
| **Navigation** | | |
| Back | `ArrowLeft` | |
| Menu | `Menu` | Mobile hamburger |
| User | `User` | Profile menu |
| **Status** | | |
| Success | `CheckCircle` | Green |
| Warning | `AlertTriangle` | Amber |
| Error | `AlertCircle` | Red |
| Info | `Info` | Blue |

### 9.4 Icon Rules

1. **Always pair with text** in navigation and primary actions — icon-only buttons need `aria-label`
2. **Consistent sizing** within a component — don't mix 16px and 20px in the same row
3. **Color follows parent** text color unless the icon has semantic meaning (item type, status)
4. **No custom SVGs** unless Lucide doesn't have a suitable icon — maintain visual consistency

---

## 10. ACCESSIBILITY STANDARDS

### 10.1 Compliance Target

**WCAG 2.1 Level AA** — minimum for all production features.

### 10.2 Color Contrast

| Context | Minimum Ratio | Standard |
|---------|---------------|----------|
| Normal text (< 18px) | 4.5:1 | WCAG 1.4.3 |
| Large text (>= 18px or 14px bold) | 3:1 | WCAG 1.4.3 |
| UI components (borders, icons) | 3:1 | WCAG 1.4.11 |
| Non-text indicators | 3:1 | WCAG 1.4.11 |

**Validated pairs from our color system:**
- `text-blue-700` on `bg-blue-100` — 4.6:1 (passes AA)
- `text-gray-700` on `bg-gray-100` — 5.4:1 (passes AA)
- All discipline pill pairs should be verified against these thresholds

### 10.3 Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus to next interactive element |
| `Shift+Tab` | Move focus to previous interactive element |
| `Enter` / `Space` | Activate button, open modal, toggle accordion |
| `Escape` | Close modal, popover, dropdown |
| `Arrow keys` | Navigate within dropdown/select options |

**Focus management:**
- Focus ring visible on all interactive elements: `ring-2 ring-ring ring-offset-2`
- Modal traps focus within the dialog
- On modal close, focus returns to the trigger element
- Skip-to-content link at top of page

### 10.4 Screen Reader Support

| Pattern | Implementation |
|---------|---------------|
| Page structure | Semantic HTML: `<main>`, `<nav>`, `<header>`, `<section>` |
| Headings | Hierarchical: `h1` (page) > `h2` (section) > `h3` (group) |
| Lists | `<ul>` for item lists, `<ol>` for ordered steps |
| Tables | `<table>` with `<th scope>` for ingestion approval |
| Icons | Decorative: `aria-hidden="true"`. Semantic: `aria-label="..."` |
| Live regions | `aria-live="polite"` for filter count updates, toast notifications |
| Status changes | `aria-live="assertive"` for error messages |
| Modals | `role="dialog"`, `aria-labelledby`, `aria-describedby` |
| Accordion | `aria-expanded`, `aria-controls` on header; `role="region"` on panel |

### 10.5 Touch & Motor

- Minimum touch target: 44x44px (WCAG 2.5.5)
- Minimum spacing between targets: 8px
- No time-limited interactions (no auto-dismissing content that requires action)
- Drag-and-drop (if used for stage reordering) must have keyboard alternative

### 10.6 Content

- Meaningful `alt` text for all non-decorative images
- Error messages describe what went wrong AND how to fix it
- Form labels associated via `htmlFor` / `id` (never floating placeholders as sole labels)
- Required fields marked with both visual indicator and `aria-required="true"`

---

## 11. V2 VISUAL PATTERNS

### 11.1 Milestone Timeline (Dot Timeline)

The Milestone Timeline uses a **vertical line with dot nodes** as its primary visual metaphor.

```
      STAGES (left)              LINE        MILESTONES (right)
                                  │
    ┌─────────────┐              ●── large
    │  Briefing    │             │
    │  Jan 1-31    │             │    ○── small  ┌──────────────────────┐
    └─────────────┘              │              │ ✓ Decision: Agreed   │
                                 │              │   on C50 concrete    │
                                 │              │   🎯 Arch Struct     │
                                 │              │   Feb 3, 2026        │
                                 │              └──────────────────────┘
                                 │
                                 │    ○── small  ┌──────────────────────┐
                                 │              │ 💡 Idea: Glass       │
                                 │              │   panels for north   │
                                 │              │   facade             │
                                 │              └──────────────────────┘
                                 │
    ┌─────────────────┐          ●── large
    │  Estudo Prelim.  │         │
    │  Feb 1 - Mar 15  │         │
    │  ▸ Current       │         │
    └─────────────────┘          │
                                 │
                          ── ── ── ── Today ── ── ──
                                 │
    ┌─────────────┐              ●── large (dimmed — future)
    │  Anteprojeto │             │
    │  Mar 16-Apr 30│            │
    └─────────────┘              │
```

**Visual specifications:**

| Element | Style |
|---------|-------|
| Vertical line | `w-0.5 bg-gray-300` (2px, gray) |
| Stage dot (large) | `w-4 h-4 rounded-full bg-gray-400` (16px), current: `bg-blue-500 ring-4 ring-blue-100` |
| Milestone dot (small) | `w-2.5 h-2.5 rounded-full bg-gray-400` (10px) |
| Current stage | Highlighted dot + accent color + "Current" label in `text-xs font-bold text-blue-600 uppercase` |
| Future stages | `opacity-50` (dimmed) |
| "Today" marker | Dashed horizontal line `border-dashed border-red-400` with "Today" label |
| Stage card (left) | `text-sm font-semibold` name, `text-xs text-gray-500` date range |
| Milestone card (right) | ItemTypeBadge + statement + SourceIcon + date + DisciplineCircle(s) |

### 11.2 Project History Dense Rows

The V2 Project History replaces the V1 timeline with a Linear/Notion-inspired dense layout.

```
┌──────────────────────────────────────────────────────────────────────┐
│  FEB 8, 2026                                                    12  │ ← Overline, sticky
├──────────────────────────────────────────────────────────────────────┤
│  ▸ │ 📹 Client Alignment - Electrical  │ 2 items │ 45min │ 👥3  ▼ │ ← Source group
│    │──────────────────────────────────────────────────────────────── │
│    │ ✓  Agreed on LED lighting with smart controls   A E    Gabri… │ ← Item row
│    │ 🎯 Carlos will prepare load calculations by Fri  S M   Carlo… │ ← Item row
├──────────────────────────────────────────────────────────────────────┤
│  ▸ │ 📹 Landscape Design Review        │ 3 items │ 30min │ 👥2  ▼ │
│    │  ... (collapsed — 3 items)                                     │
├──────────────────────────────────────────────────────────────────────┤
│  ▸ │ 📧 RE: Foundation specs updated   │ 1 item  │           ▼    │ ← Email source
│    │──────────────────────────────────────────────────────────────── │
│    │ ℹ  City approved environmental permit Feb 3      L A    Gabri… │
└──────────────────────────────────────────────────────────────────────┘
```

**Item row anatomy (left to right):**
1. ItemTypeBadge icon (16px, colored)
2. Statement text (truncated, `text-sm font-medium`)
3. DisciplineCircle(s) — first 3 + "+N"
4. Who (truncated, `text-xs text-gray-500`)
5. Timestamp/date (`text-xs text-gray-400`)
6. Milestone star (admin only, on hover)

### 11.3 DisciplineCircle Component

Single-letter colored circles representing affected disciplines.

| Property | Value |
|----------|-------|
| Size | `w-6 h-6` (24px) |
| Shape | `rounded-full` |
| Background | Discipline hex color |
| Text | White, single letter (first letter of abbreviation), `text-xs font-bold` |
| Primary indicator | `ring-2 ring-white ring-offset-1` on the first/primary discipline |
| Overflow | Show first 3 + `+N` counter (`text-xs text-gray-500`) |
| Spacing | `-ml-1` for overlapping stack (like avatar groups) |

Example: `[A][S][M] +2` for Architecture, Structural, MEP + 2 more

### 11.4 ItemTypeBadge Component

Compact inline badge for item type identification.

| Property | Value |
|----------|-------|
| Layout | Icon + label, inline-flex |
| Icon size | `w-3.5 h-3.5` (14px) |
| Label | Optional (show in expanded contexts, hide in dense rows) |
| Padding | `px-2 py-0.5` |
| Border radius | `rounded-full` |
| Typography | `text-xs font-medium` |
| Colors | See Section 2.7 |

### 11.5 SourceIcon Component

Icon-only or icon+label for source type identification.

| Property | Value |
|----------|-------|
| Icon size | `w-4 h-4` (16px) inline with text |
| Color | See Section 2.8 |
| Label | Optional, `text-xs` |
| Tooltip | Source type name on hover |

---

## 12. DARK MODE & THEMING

### Current Decision

**Dark mode is NOT planned for V1 or V2.** The application uses a light theme exclusively.

### Future Considerations

If dark mode is introduced post-V2:
- CSS variables (`--background`, `--foreground`, etc.) are already HSL-based and can be swapped
- Discipline colors will need dark-mode variants (increase saturation, reduce brightness)
- The `100/700` badge pattern becomes `900/200` in dark mode
- Use `dark:` Tailwind prefix for overrides
- Test all contrast ratios in dark mode independently

---

## 13. PRINT & EXPORT STYLES

### 13.1 PDF Export (Milestone Timeline)

| Property | Value |
|----------|-------|
| Page size | A4 portrait |
| Margins | 20mm all sides |
| Header | Project name + export date |
| Footer | Page number + "Generated by DecisionLog" |
| Font size | Body 10pt, headings 12pt |
| Colors | Print-safe — verify all discipline colors print legibly on white |
| Layout | Single column, stages and milestones listed linearly |

### 13.2 JPEG Export (Milestone Timeline)

| Property | Value |
|----------|-------|
| Resolution | 2x device pixel ratio (retina quality) |
| Width | Match viewport width at export time |
| Background | White (`#FFFFFF`) |
| Quality | 90% JPEG compression |

### 13.3 Print Stylesheet

```css
@media print {
  /* Hide non-essential UI */
  nav, .filter-bar, .action-buttons { display: none; }

  /* Ensure colors print */
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  /* Prevent page breaks inside groups */
  .meeting-group, .milestone-node { break-inside: avoid; }
}
```

---

## APPENDIX A: Utility Functions Reference

These functions in `src/lib/utils.ts` implement the color system:

| Function | Returns | Usage |
|----------|---------|-------|
| `cn(...classes)` | Merged Tailwind classes | Class composition everywhere |
| `getDisciplinePillColors(discipline)` | `{ bg, text }` | DisciplinePill, badges |
| `getDisciplineNodeColor(discipline)` | `bg-[#hex]` | Timeline nodes |
| `getConsensusColor(consensus)` | `{ bg, text }` | Consensus badges |
| `getImpactColor(severity)` | Combined classes | Impact severity badges |
| `getImpactTypeColor(type)` | `{ dot, bg, text }` | Impact type indicators |
| `getMeetingTypeColors(type)` | `{ bg, text, dot }` | Meeting type badges |
| `abbreviateDiscipline(discipline)` | Abbreviated string | Compact pill labels |
| `formatFullDate(dateStr)` | "Friday, 7 February 2026" | V1 date headers |
| `formatTimestamp(timestamp)` | "HH:MM:SS" | Meeting recording time |

**V2 additions needed:**
| Function | Returns | Usage |
|----------|---------|-------|
| `getItemTypeColors(itemType)` | `{ bg, text, icon }` | ItemTypeBadge |
| `getSourceTypeColors(sourceType)` | `{ bg, text, icon }` | SourceIcon |
| `getItemTypeIcon(itemType)` | Lucide icon component | ItemTypeBadge |
| `getSourceTypeIcon(sourceType)` | Lucide icon component | SourceIcon |

---

## APPENDIX B: Color Token Quick Reference (Copy-Paste)

For adding V2 colors to `tailwind.config.ts`:

```typescript
// Add to theme.extend.colors
itemType: {
  decision:    '#10B981',  // Green
  topic:       '#F59E0B',  // Amber
  action_item: '#3B82F6',  // Blue
  idea:        '#8B5CF6',  // Purple
  information: '#64748B',  // Slate
},
sourceType: {
  meeting:      '#6366F1',  // Indigo
  email:        '#0EA5E9',  // Sky
  document:     '#F97316',  // Orange
  manual_input: '#6B7280',  // Gray
},
// Add V2 disciplines to existing discipline object
discipline: {
  // ... existing 6 ...
  fire_protection: '#EF4444',  // Red
  acoustical:      '#7C3AED',  // Violet
  sustainability:  '#059669',  // Emerald
  civil:           '#14B8A6',  // Teal
  client:          '#F43F5E',  // Rose
  contractor:      '#D97706',  // Amber-dark
  tenant:          '#EC4899',  // Pink
  engineer:        '#6366F1',  // Indigo
  general:         '#6B7280',  // Gray
},
```

---

## APPENDIX C: Decision Log

Design decisions made and their rationale, for future reference.

| # | Decision | Rationale | Date |
|---|----------|-----------|------|
| 1 | CSS tooltip over Radix Tooltip | Radix UI tooltip not installed; avoids new dependency | Feb 2026 |
| 2 | Local state for accordion | Story spec says no global store for meeting expand/collapse | Feb 2026 |
| 3 | Horizontal FilterBar over Sidebar | Gabriela wanted "inline, not a panel" — maximizes content width | Feb 2026 |
| 4 | Popover-based filters over dropdowns | Better multi-select UX, consistent with chip pattern | Feb 2026 |
| 5 | No Shadcn/ui component library install | Using Radix primitives directly + Tailwind for full control | Feb 2026 |
| 6 | System font stack | No custom font loading — fastest render, native feel | Feb 2026 |
| 7 | Dense Rows (Linear/Notion style) for Project History | Optimized for scanning 50+ items, information density priority | Feb 2026 |
| 8 | Dot Timeline for Milestones | Elegant, minimalist — Gabriela's preferred "cronograma" concept | Feb 2026 |
| 9 | No dark mode in V1/V2 | Not requested, reduces scope, HSL variables ready for future | Feb 2026 |
| 10 | Discipline-based consensus (not name-based) | Simpler schema, maps directly to existing discipline system | Feb 2026 |

---

**Document maintained by:** Uma (UX-Design Expert)
**Last updated:** 2026-02-16
**Next review:** Before V2 Phase 2 development begins

--- Uma, desenhando com empatia
