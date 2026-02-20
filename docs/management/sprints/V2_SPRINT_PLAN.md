# DecisionLog V2 Sprint Plan
**Created:** 2026-02-20
**Scrum Master:** River (@sm)
**Product Owner:** Morgan (@pm)
**Tech Lead:** @dev
**Status:** Ready for Developer Review

---

## EXECUTIVE SUMMARY

This sprint plan reorganizes the 24 V2 stories (166 SP total) into **8 developer-ready sprints** with optimized parallelization. The plan respects critical dependencies while enabling team parallel work where safe. All stories are detailed in `docs/stories/` and ready for development kickoff.

**Key Goals:**
- ✅ Accelerate development via safe parallelization
- ✅ Maintain code quality (no shortcuts)
- ✅ Clear developer handoffs with testable AC
- ✅ Realistic estimation with buffer for complexity
- ✅ Phase gates for validation before next phase

---

## DEPENDENCY MATRIX

### Critical Path (Must Complete in Order)
```
E5.1 (DB Migration) ──→ E5.2, E5.3 ──→ E5.4, E5.5
       (CRITICAL)          (core)        (extraction)
           ↓
        E6.1 (Project CRUD stages)
           ↓
        E8.1 (Timeline needs stages)
```

### Safe Parallelization Opportunities
```
Phase 1:
  [E5.1 (13 SP)] ──→ [E5.2 (8 SP) || E5.3 (5 SP)] ──→ [E5.4 + E5.5 (11 SP)] || [E6.1 (8 SP)]
  (Week 1)          (Week 1-2)                        (Week 2-3)                (Week 3)

Phase 2:
  [E6.2 + E6.3 (11 SP)] || [E7.1 (8 SP)] || [E7.2 (8 SP)]  ──→  [E8.1 (13 SP)]
  (Week 3-4)              (Week 4-5)         (depends E7.1)      (Week 5-6)

Phase 3:
  [E8.2 + E8.3 + E8.4 (15 SP)] || [E9.1 + E9.2 (13 SP)] ──→ [E9.3 + E9.4 + E9.5 (16 SP)]
  (Week 5-7)                      (Week 7-8)              (Week 8)

Phase 4:
  [E7.4 (8 SP)] || [E10.1 (8 SP)] ──→ [E10.2 + E10.3 (16 SP)]
  (Week 9-10)      (Week 11)          (Week 11-12)
```

---

## SPRINT STRUCTURE

### Sprint Duration
- **Default:** 2 weeks (10 business days)
- **Sprint 1:** Can compress to 1 week if team ready (13 SP = aggressive but achievable)
- **Total Timeline:** 12 weeks (3 months)

### Sprint Composition Principle
- Each sprint has a clear **deliverable** and **gate criteria**
- Dependencies are marked and explained
- Parallel tracks noted where team can split effort
- Story points realistic for code quality + testing

---

## ⏱️ SPRINT 1: Data Model Foundation (CRITICAL PATH)
**Duration:** 2 weeks (adjusted per @dev review)
**Story Points:** 13
**Deliverable:** V1 → V2 data model migration complete, API endpoints working, tests passing
**Status:** ✅ @dev-approved (mitigations incorporated)

### Stories in Sprint

| ID | Title | SP | Dep | Notes |
|----|-------|----|----|-------|
| **5.1** | Database Migration — Decision to Project Item | **13** | None | **CRITICAL PATH** — Blocks all downstream. Reversible migration + pre-migration backup required. Complex schema changes. |

### Parallel Frontend/Backend Track
None — this is backend-only and critical path. One developer can own this.

### Sprint 1 Mitigations (per @dev review)
⚠️ **Timeline Risk Mitigation:** E5.1 (13 SP) allocated **2 full weeks** (not aggressive 1 week).
- Pre-migration validation: backup, test on staging, rollback procedure documented
- Parallel code review during development (reduce blocking)
- Post-migration testing: V1 compatibility verification

### Gate Criteria (Before Sprint 2)
- [ ] `decisions` table renamed to `project_items` with all new columns
- [ ] Existing V1 decision data preserved with defaults
- [ ] `affected_disciplines` JSON array populated correctly
- [ ] `sources` table created and linked
- [ ] Pre-migration backup taken and verified
- [ ] Migration reversible (down script provided and tested)
- [ ] Existing `/api/projects/{id}/decisions` endpoint returns same data
- [ ] All V1 tests still pass (regression: >80% coverage)
- [ ] Database performance validated (no new query slowdowns)
- [ ] Post-migration data integrity verified (spot checks on 5+ sample decisions)
- [ ] CodeRabbit pre-commit review: ZERO critical issues

---

## 🚀 SPRINT 2: Data Model Completion + Project CRUD Backend
**Duration:** 2 weeks
**Story Points:** 37 (5.2 + 5.3 + 5.4 + 5.5 + 6.1)
**Deliverable:** API ready for frontend, extraction pipeline updated, project creation working

### Stories in Sprint

| ID | Title | SP | Assign | Notes |
|----|-------|----|----|-------|
| **5.2** | Backend API — Project Items CRUD | 8 | @dev (Backend) | Co-dependent with 5.3. API endpoints + Pydantic models. Milestone toggle, is_done toggle. |
| **5.3** | Frontend Types & Hooks Migration | 5 | @dev (Frontend) | Rename types, update useDecisions → useProjectItems. Co-dependent with 5.2. |
| **5.4** | AI Extraction Prompt Evolution | 8 | @dev (Backend/AI) | Versioned prompt files, all 5 item types, discipline inference, 99%+ accuracy target. |
| **5.5** | Seed Data & Test Suite Update | 3 | @dev (Fullstack) | Update seeds with all 5 types, multi-discipline, milestones. Ensure tests pass. |
| **6.1** | Backend — Project CRUD, Stages, Participants | 8 | @dev (Backend) | POST/PATCH projects, stage schedule validation, participant roster. Late Sprint 2 OK (5.2 prerequisite). |

### Parallel Tracks
✅ **YES** — While 5.2 is in progress, 5.3 can start (API contracts defined in 5.2 spec)
✅ **YES** — 5.4 and 5.5 can start once 5.2 API is defined (Week 1-2 of sprint)
✅ **YES** — 6.1 can start once 5.2 is in final review (Week 2 of sprint)

### Gate Criteria (Before Sprint 3)
- [ ] All 5 item types extractable from meeting transcripts
- [ ] 99%+ item type classification accuracy on test corpus
- [ ] `/api/projects/{id}/items` with full filter support working
- [ ] Milestone and is_done toggles functional
- [ ] Seed data includes all 5 types + multi-discipline examples
- [ ] Project creation with stage schedule validation working
- [ ] `npm run frontend:test` and `npm run frontend:lint` passing
- [ ] Participant roster CRUD functional
- [ ] Extraction pipeline re-processes V1 meetings correctly

---

## 🎯 SPRINT 3: Frontend Project Management + Ingestion Backend
**Duration:** 2 weeks
**Story Points:** 20 (adjusted per @dev review — was 27)
**Deliverable:** Project create/edit forms working, ingestion queue operational
**Status:** ✅ @dev-approved (capped at 20 SP to reduce scope creep)

### Stories in Sprint

| ID | Title | SP | Assign | Notes |
|----|-------|----|----|-------|
| **6.2** | Frontend — Project Create/Edit Form | 8 | @dev (Frontend) | Stage schedule builder, participant roster UI, template loader. Depends on E6.1 API. |
| **6.3** | Frontend — Project List Enhancement | 3 | @dev (Frontend) | Current stage badge, create button, project_type label. Quick win, can do in parallel with 6.2. |
| **7.1** | Backend — Source Entity & Ingestion Queue | 8 | @dev (Backend) | Source table, ingestion_status enum, Tactiq webhook updated, AI summaries generated. |
| ~~**7.2**~~ | ~~Frontend — Ingestion Approval Page~~ | ~~8~~ | ~~@dev (Frontend)~~ | **DEFERRED TO SPRINT 4** — Keep focus on 6.2/6.3/7.1 to ensure quality |

### Parallel Tracks
✅ **6.2 & 6.3 together** — Frontend can work in parallel (same component library)
✅ **7.1 in parallel with 6.x** — Backend unblocked, ready for 7.2/7.3 in Sprint 4
⚠️ **7.1 is prerequisite** for 7.2, 7.3, 7.4 — Must complete on schedule

### Gate Criteria (Before Sprint 4)
- [ ] Project form creates projects with stage schedules
- [ ] Date validation prevents overlapping stages
- [ ] Participant roster add/edit/delete working
- [ ] Stage templates load and populate form
- [ ] Project list shows current stage badge
- [ ] "Create Project" button navigates to form
- [ ] Tactiq webhook creates Source records (status: pending)
- [ ] AI one-line summaries generated for sources
- [ ] Ingestion Approval page displays meetings/emails/docs with approve/reject toggle
- [ ] Admin-only access control enforced

---

## ⭐ SPRINT 4: Milestone Timeline MVP + Manual Input
**Duration:** 2 weeks
**Story Points:** 33 (7.2 + 7.3 + 8.1-8.3)
**Deliverable:** Milestone Timeline renders, manual item creation working, filters functional
**Status:** ✅ Sprint 3 overflow incorporated + highest client value

### Stories in Sprint

| ID | Title | SP | Assign | Notes |
|----|-------|----|----|-------|
| **7.2** | Frontend — Ingestion Approval Page | 8 | @dev (Frontend) | Moved from Sprint 3. Bulk actions, filters, status indicators. |
| **7.3** | Manual Input — Create Project Item Form | 5 | @dev (Frontend) | Form with type-specific fields, discipline multi-select, owner/due_date for actions. |
| **8.1** | Frontend — Milestone Timeline Component | 13 | @dev (Frontend) | Dot Timeline layout, stage dots (left), milestone dots (right), "Today" marker, responsive. **Highest value to client.** |
| **8.2** | Frontend — Milestone Flag Toggle | 5 | @dev (Frontend) | Star/flag icon on items, toggle calls API. Optimistic UI update. Admin-only. |
| **8.3** | Frontend — Milestone Timeline Filters | 2-3 | @dev (Frontend) | Source type & item type filter chips, active count, "Clear" button, URL persistence. |

### Parallel Tracks
✅ **7.2 & 7.3 together** — Two frontend devs, one on approval page, one on manual input form
✅ **8.1-8.3 in final week** — Focus Timeline component, add toggles/filters after core renders
✅ **8.2 can follow 8.1** — Completion in final days of sprint
✅ **8.3 also follows 8.1** — Lightweight, can batch with 8.2 for final integration

### Gate Criteria (Before Sprint 5)
- [ ] Milestone Timeline displays with accurate stage schedule
- [ ] Stage dots visually distinct from milestone dots
- [ ] Current stage highlighted with accent color and "Current" label
- [ ] "Today" marker visible on timeline
- [ ] Milestone items render with type badge, statement, source icon, disciplines
- [ ] <2 second load time with 50 milestones
- [ ] Manual input form creates items with all required fields
- [ ] Manual items appear in timeline and project history
- [ ] Milestone toggle works from project history and drill-down
- [ ] Filters reduce visible items correctly
- [ ] Empty state message when no milestones: "No milestones yet..."

---

## 🎨 SPRINT 5: Milestone Timeline Completion + Dense Rows Layout
**Duration:** 2 weeks
**Story Points:** 31 (8.4 + 9.1 + 9.2 + partial)
**Deliverable:** Timeline shareable/exportable, Project History Dense Rows layout rendering

### Stories in Sprint

| ID | Title | SP | Assign | Notes |
|----|-------|----|----|-------|
| **8.4** | Milestone Timeline Sharing & Export | 5 | @dev (Frontend/Backend) | Read-only links, PDF/JPEG export, share button, link expiry, access tracking. |
| **9.1** | Component Evolution — Item Type Badges & Source Icons | 5 | @dev (Frontend) | ItemTypeBadge, SourceIcon, DisciplineCircle atoms. Color system to utils.ts. |
| **9.2** | Dense Rows Layout & Visual Layer Separation | 8 | @dev (Frontend) | Date headers (UPPERCASE), source groups (accordion), item rows (32-40px height). Linear/Notion style. |
| **9.3** | Multi-Discipline Circles (PARTIAL) | 5 | @dev (Frontend) | Can start design once 9.1 badges done. Full integration in Sprint 6. |

### Parallel Tracks
✅ **8.4 (Share/Export) & 9.1-9.2 together** — Backend on export logic, frontend on layout components
✅ **9.1 feeds 9.2** — Start 9.1 first (atoms), then 9.2 (molecules)
✅ **9.3 design in parallel** — Can scaffold while 9.1-9.2 in progress

### Gate Criteria (Before Sprint 6)
- [ ] Shared timeline links render without auth, expire after 30 days
- [ ] PDF export legible at A4 size
- [ ] JPEG export renders at presentation quality
- [ ] Export respects current filter state
- [ ] ItemTypeBadge renders all 5 types with distinct colors/icons
- [ ] SourceIcon renders all 4 sources with distinct icons
- [ ] DisciplineCircle renders single-letter colored circles
- [ ] Dense Rows: date headers visually distinct (UPPERCASE, sticky)
- [ ] Source groups collapsible, show item count when collapsed
- [ ] Item rows ~32-40px height, single line with icon + text + disciplines
- [ ] 50+ items render without performance degradation
- [ ] Responsive: mobile view graceful (wider rows, smaller text)

---

## 🏆 SPRINT 6: Project History Completion + Final V2 Polish
**Duration:** 2 weeks
**Story Points:** 24 (9.3 + 9.4 + 9.5)
**Deliverable:** Project History fully enhanced, Timeline → "Project History" rename complete, Phase 3 done

### Stories in Sprint

| ID | Title | SP | Assign | Notes |
|----|-------|----|----|-------|
| **9.3** | Multi-Discipline Circles | 5 | @dev (Frontend) | Renders first 3 circles + "+N", primary discipline ring indicator. Completes 9.1-9.2. |
| **9.4** | Meeting Summary & Advanced Filters | 8 | @dev (Frontend) | Expandable summaries from `ai_summary` field, source/item type filter toggles, AND logic, URL params. |
| **9.5** | Rename & Navigation Update | 3 | @dev (Frontend) | "Timeline" → "Project History" across UI, tab toggle (Milestone/History), default view logic. |

### Parallel Tracks
✅ **9.3-9.4 together** — Separate concerns (circles vs filters), same frontend dev
✅ **9.5 lightweight** — Can finish in parallel or final days

### Gate Criteria (Before Phase 4 Start)
- [ ] Multi-discipline items show stacked circles (first 3 visible)
- [ ] "+N" badge shows for items with >3 disciplines
- [ ] Primary discipline marked with ring/border indicator
- [ ] Meeting summary expands on icon click
- [ ] AI summary text readable and helpful
- [ ] Source type toggles filter correctly
- [ ] Item type toggles filter correctly
- [ ] Filters work in combination (AND logic)
- [ ] Filter state persists in URL
- [ ] No UI reference to "Timeline" remains (checked searchable)
- [ ] Project Detail shows "Milestone Timeline" | "Project History" tabs
- [ ] Default view: Milestone (if stages exist), else History
- [ ] Tab state persists in URL hash
- [ ] Deep linking to each tab works

**Phase 3 COMPLETE:** Gabriela can create projects, approve meetings, view Milestone Timeline + Project History with full visual enhancements.

---

## 📧 SPRINT 7: Email Infrastructure + Extraction
**Duration:** 2 weeks
**Story Points:** 16 (7.4 + 10.1 partial)
**Deliverable:** Gmail poller running, email extraction pipeline ready

### Stories in Sprint

| ID | Title | SP | Assign | Notes |
|----|-------|----|----|-------|
| **7.4** | Backend — Gmail API Poller | 8 | @dev (Backend) | Gmail OAuth2 setup, polling job (APScheduler), email → Source record creation, deduplication, rate limiting. |
| **10.1** | Email Item Extraction Pipeline (PARTIAL) | 8 | @dev (Backend/AI) | extract_email.md prompt, all 5 item types, thread handling, 85%+ accuracy. Can start prompt design once 7.4 defined. |

### Parallel Tracks
✅ **7.4 & 10.1 parallel** — Backend on polling, AI engineer on prompt development
⚠️ **Integration phase** — Final week: test poller + extraction end-to-end

### Gate Criteria (Before Sprint 8)
- [ ] Gmail API authenticated (OAuth2 or service account)
- [ ] Polling job runs every 30 minutes (configurable via env var)
- [ ] New emails create Source records with raw_content populated
- [ ] Thread deduplication by email_thread_id works
- [ ] Rate limiting respects Gmail quotas with exponential backoff
- [ ] extract_email.md prompt achieves 85%+ extraction accuracy on test corpus
- [ ] All 5 item types extractable from emails
- [ ] Thread quoted text handled correctly (no duplication)
- [ ] Approved emails trigger extraction pipeline

---

## 📄 SPRINT 8: Document Handling + Final Integration
**Duration:** 2 weeks
**Story Points:** 16 (10.2 + 10.3)
**Deliverable:** Document upload working, Drive monitoring functional, Phase 4 complete

### Stories in Sprint

| ID | Title | SP | Assign | Notes |
|----|-------|----|----|-------|
| **10.2** | Document Ingestion — PDF & DOCX | 8 | @dev (Backend) | File upload endpoint, PDF/DOCX parsing, Source record creation, Ingestion Approval flow, extract_document.md prompt. |
| **10.3** | Google Drive Folder Monitoring | 8 | @dev (Backend) | Google Drive API setup, folder monitoring, new file detection, deduplication, polling. |

### Sequential Dependency
⚠️ **10.2 before 10.3** — Document extraction pipeline tested before adding Drive monitoring

### Gate Criteria (Before Production Release)
- [ ] File upload endpoint accepts PDF and DOCX
- [ ] Text extraction from PDF/DOCX works correctly
- [ ] Document Source records created with raw_content populated
- [ ] Documents appear in Ingestion Approval for review
- [ ] extract_document.md achieves 85%+ extraction accuracy
- [ ] Google Drive API authenticated (OAuth2)
- [ ] Folder monitoring detects new files every 5 minutes (configurable)
- [ ] File deduplication by Drive file ID works
- [ ] New Drive files create Source records correctly
- [ ] Full end-to-end: email → source → approval → extraction → project history

**Phase 4 COMPLETE:** Full multi-source platform operational. Gabriela can ingest meetings, emails, documents, and manual items. All project information flows through DecisionLog V2.

---

## 📊 SPRINT EFFORT & TIMELINE SUMMARY (WITH @DEV MITIGATIONS)

| Sprint | Weeks | Stories | SP | Phase | Gate | Status |
|--------|-------|---------|----|----|------|--------|
| **1** | 1-2 | E5.1 | 13 | 1 (Foundation) | Migration complete, API working | ✅ 2-week timeline |
| **2** | 2-3 | E5.2-5.5 + E6.1 | 37 | 1 | Frontend types, extraction ready, project CRUD | ✅ As planned |
| **3** | 3-4 | E6.2-6.3 + E7.1 | **20** | 1-2 | Forms ready, ingestion queue running | ✅ Capped per @dev |
| **4** | 4-5 | E7.2-7.3 + E8.1-8.3 | 33 | 2 | **Milestone Timeline MVP ready** | ✅ 7.2 moved from Sprint 3 |
| **5** | 5-6 | E8.4 + E9.1-9.2 + E9.3 | 31 | 2-3 | Share/export, Dense Rows layout | ✅ As planned |
| **6** | 6-7 | E9.3-9.5 | 24 | 3 | **Phase 3 COMPLETE** | ✅ As planned |
| **7** | 8-9 | E7.4 + E10.1 | 16 | 4 | Gmail poller, email extraction ready | ✅ As planned |
| **8** | 9-10 | E10.2-10.3 | 16 | 4 | **Phase 4 COMPLETE** | ✅ As planned |
| **TOTAL** | **10 weeks** | **24 stories** | **166 SP** | - | Ready for Production | ✅ @dev-approved |

**Mitigations Applied:**
1. ✅ Sprint 1: E5.1 = 2 weeks (not 1 week aggressive)
2. ✅ Sprint 3: Capped at 20 SP (defer 7.2 to Sprint 4)
3. ✅ **TDD Enforcement:** All stories must have tests before code review + CodeRabbit pre-commit

---

## ✅ QUALITY GATES & TESTING CHECKLIST

### Per-Sprint Testing Requirements (@dev TDD Enforcement)
- [ ] **Unit Tests (FIRST):** Tests written BEFORE code (TDD pattern). `npm run frontend:test` & backend pytest passing with >80% coverage
- [ ] **Linting:** `npm run frontend:lint` zero errors
- [ ] **Type Safety:** TypeScript compilation zero errors
- [ ] **CodeRabbit Pre-Commit:** ZERO critical issues flagged (light self-healing max 2 iterations)
- [ ] **Integration Tests:** Story acceptance criteria verified end-to-end
- [ ] **Performance:** Load tests for timeline (50+ items <2 sec), ingestion page (100 sources)
- [ ] **Accessibility:** WCAG 2.1 AA compliance for new components
- [ ] **Browser Testing:** Chrome, Firefox, Safari (latest 2 versions)
- [ ] **Mobile Testing:** iPhone, Android (responsive design)

### TDD Enforcement (Critical per @dev)
- ✅ Tests written in parallel with code (NOT after)
- ✅ CodeRabbit pre-commit review before final commit (catch issues early)
- ✅ No refactor debt pushed to post-release (Phase gates enforce quality bar)
- ✅ All stories: test → code → review → gate (not test → code → test → review)

### Per-Phase Gate Criteria
Each phase has a **gate criteria checklist** above. Phase cannot advance until all gate checks are passing.

---

## 👥 TEAM ALLOCATION & CAPACITY

### Assumed Team Structure
- **Backend Developer(s):** 1-2 (E5, E6, E7, E10 owner)
- **Frontend Developer(s):** 2 (E6, E8, E9 owner)
- **AI/ML Engineer:** 1 (E5.4 extractions, prompts)
- **DevOps/Infra:** 0.5 (Gmail API setup, Deploy)

### Critical Path Bottlenecks
1. **E5.1 (Sprint 1):** Must complete on schedule — blocks everything
2. **E8.1 (Sprint 4):** Highest client value, needs focused attention
3. **E7.1 (Sprint 3):** Unblocks all ingestion work downstream

### Velocity Expectations
- Sprint 1: 13 SP (aggressive, single critical story)
- Sprints 2-6: 20-35 SP/sprint (team ramping up then stabilizing)
- Sprints 7-8: 16 SP/sprint (specialized work, fewer parallel ops)
- **Team velocity:** 25-30 SP/sprint sustainable (after Sprint 2)

---

## 🚨 RISK MITIGATION

| Risk | Mitigation | Responsible |
|------|-----------|-------------|
| Data migration corrupts V1 | Pre-migration backup, reversible script, staging test | @dev (Backend) |
| E5.1 overruns (>13 SP) | Daily standup, parallel code review, spike if blockers emerge | @dev (Backend) + @architect |
| AI extraction <99% accuracy | Curated test transcripts, versioned prompts for quick iteration | @dev (AI) + @po review |
| Gmail API rate limits block E7.4 | Configurable poll interval, exponential backoff, quota monitoring | @dev (Backend) |
| Bundle size bloat | Code splitting, lazy load Milestone/Ingestion routes, monitor in CI | @dev (Frontend) |
| Feature scope creep | Enforce Sprint gate criteria strictly, defer post-Phase 4 requests | @sm (Scrum Master) |
| Team context switching | Sprint 2-6 keep same pair on frontend/backend (minimize ramp-up) | @sm + @pm |

---

## 📋 DEVELOPER READINESS CHECKLIST

Before each sprint kickoff, verify:

- [ ] All stories in sprint are in `docs/stories/` with complete AC
- [ ] Dependencies documented and agreed upon
- [ ] API contracts (if backend) defined in story specs
- [ ] Database changes (if applicable) reviewed by @architect
- [ ] UI mockups (if frontend) reviewed by @ux-design-expert
- [ ] Test strategy defined with coverage targets
- [ ] Blockers from previous sprint resolved
- [ ] Team alignment on parallel track assignments
- [ ] CI/CD pipeline ready to run tests
- [ ] Git feature branches named `feature/{EPIC}.{STORY}-kebab-case`
- [ ] Code review process agreed (pair programming or PR reviews)

---

## 📅 CALENDAR VIEW (Weeks 1-10)

```
WEEK 1-2   | Sprint 1: E5.1 (Database Migration - CRITICAL)
WEEK 2-3   | Sprint 2: E5.2-5.5 + E6.1 (Data Model + Project CRUD)
WEEK 3-4   | Sprint 3: E6.2-6.3 + E7.1 + E7.2 (Forms + Ingestion)
WEEK 4-5   | Sprint 4: E7.3 + E8.1-8.3 (Timeline MVP)
WEEK 5-6   | Sprint 5: E8.4 + E9.1-9.2 (Share/Export + Dense Rows)
WEEK 6-7   | Sprint 6: E9.3-9.5 (Polish + Rename) — PHASE 3 COMPLETE
WEEK 8-9   | Sprint 7: E7.4 + E10.1 (Email Infrastructure)
WEEK 9-10  | Sprint 8: E10.2-10.3 (Document Handling) — PHASE 4 COMPLETE

              [Phase 1] [Phase 2]        [Phase 3]        [Phase 4]
              Weeks 1-3 Weeks 4-6        Weeks 7-8        Weeks 9-10
```

---

## 🎯 SUCCESS METRICS (Post-Phase Release)

After each phase completes, measure:

| Metric | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|--------|---------|---------|---------|---------|
| **V1 Compatibility** | 100% backward compat | - | - | - |
| **Bugs in QA** | <5 critical, <10 major | <3 critical | <2 critical | <1 critical |
| **Code Coverage** | >80% | >85% | >85% | >85% |
| **Performance** | <100ms API response | <2s timeline load | - | - |
| **Accessibility** | WCAG AA | WCAG AA | WCAG AA | WCAG AA |
| **Team Velocity** | 13 SP | 30 SP | 27 SP | 16 SP |

---

## 📞 NEXT STEPS

1. **@pm Review:** Validate phase gates and business value alignment
2. **@dev Review:** Validate effort estimates and technical feasibility
3. **@sm Kickoff:** Finalize Sprint 1 story details, assign developers
4. **Day 1:** Create local feature branches, update CLAUDE.md with sprint assignments
5. **Daily:** Standup, blockers, progress updates
6. **Sprint End:** Gate review, prepare next sprint stories

---

## 📌 APPENDIX: STORY FILE LOCATIONS

All 24 V2 stories located in `docs/stories/`:

**E5:** 5.1, 5.2, 5.3, 5.4, 5.5
**E6:** 6.1, 6.2, 6.3
**E7:** 7.1, 7.2, 7.3, 7.4
**E8:** 8.1, 8.2, 8.3, 8.4
**E9:** 9.1, 9.2, 9.3, 9.4, 9.5
**E10:** 10.1, 10.2, 10.3

---

**Created by:** River (Scrum Master) @sm
**Status:** READY FOR PM & DEV REVIEW
**Last Updated:** 2026-02-20

— Removendo obstáculos 🌊
