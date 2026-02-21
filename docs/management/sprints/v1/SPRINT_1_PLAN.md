# Sprint 1 Plan - DecisionLog MVP Foundation

**Sprint Duration:** Week 1 (5 working days)
**Sprint Goal:** Complete foundational backend and frontend for user authentication and project browsing
**Team:** @dev (Dex the Builder)
**Status:** Planning

---

## Sprint Overview

Sprint 1 focuses on the critical foundation: database schema, authentication, and basic UI for login and projects. All stories are blockers for future features.

**Total Story Points:** 28 points
**Target Velocity:** 25-30 points/week
**Confidence:** High (infrastructure already scaffolded)

---

## Sprint Stories (Ordered by Dependency)

### Story 1.1: Backend Database Schema (8 pts)
**Assignee:** @dev
**Priority:** P0 (Blocker)
**Estimated:** 2 days
**Status:** Draft

Create PostgreSQL schema with all 7 tables, pgvector extension, and indexes. Foundation for entire system.

**Tasks:**
- [ ] Alembic migration with 7 tables
- [ ] pgvector extension enabled
- [ ] All indexes created and verified
- [ ] Soft delete logic tested
- [ ] Seed test data (user, project)
- [ ] Tests: `pytest tests/unit/test_database.py`

**Success Criteria:**
- All 7 tables exist in database
- pgvector working (384-dim vectors)
- Alembic upgrade/downgrade tested
- Test user seeded: test@example.com / password
- 80%+ test coverage

**Dependencies:** None (can start immediately)
**Blocks:** 1.2, 1.3, 1.4, 1.5

---

### Story 1.2: Backend Authentication (5 pts)
**Assignee:** @dev
**Priority:** P0 (Blocker)
**Estimated:** 1.5 days
**Status:** Draft

Implement login, me, logout endpoints. JWT tokens with bcrypt hashing.

**Tasks:**
- [ ] Auth service (authenticate_user, create_token)
- [ ] POST /api/auth/login (email + password)
- [ ] GET /api/auth/me (JWT validation)
- [ ] POST /api/auth/logout
- [ ] JWT middleware (extract + validate token)
- [ ] Tests: `pytest tests/unit/test_auth.py`

**Success Criteria:**
- Login returns JWT token + user
- Me endpoint requires valid token (401 if invalid)
- Logout returns 204
- Middleware validates token
- Password hashed with bcrypt (cost=12)
- 80%+ test coverage

**Dependencies:** 1.1 (database schema)
**Blocks:** 1.3, 1.4, 1.5

---

### Story 1.3: Backend Project Endpoints (5 pts)
**Assignee:** @dev
**Priority:** P0 (Blocker)
**Estimated:** 1.5 days
**Status:** Draft

Implement GET /projects and GET /projects/{id}. Support pagination, filtering, and RBAC.

**Tasks:**
- [ ] Project service (get_projects, get_project)
- [ ] GET /api/projects (paginated list)
- [ ] GET /api/projects/{project_id} (detail + stats)
- [ ] RBAC logic (director sees all, architect sees assigned)
- [ ] Calculate statistics (decisions by discipline, etc.)
- [ ] Tests: `pytest tests/unit/test_projects.py`

**Success Criteria:**
- List projects with pagination (limit, offset)
- Detail endpoint returns stats
- RBAC working (403 for unauthorized)
- 404 for missing project
- 80%+ test coverage

**Dependencies:** 1.1 (database), 1.2 (auth)
**Blocks:** 1.5

---

### Story 1.4: Frontend Login Page (5 pts)
**Assignee:** @dev
**Priority:** P0 (Blocker)
**Estimated:** 1.5 days
**Status:** Draft

Complete login form with authentication flow, token storage, and error handling.

**Tasks:**
- [ ] Login form with email/password
- [ ] Form validation
- [ ] POST /api/auth/login integration
- [ ] Token storage (Zustand + localStorage)
- [ ] Error messages (401, network errors)
- [ ] Loading spinner
- [ ] Redirect on success
- [ ] Tests: `npm test`

**Success Criteria:**
- Form submits and calls backend
- Valid credentials → redirect to /projects
- Invalid credentials → error message
- Token stored in auth store
- Loading state shown during request
- 80%+ test coverage

**Dependencies:** 1.2 (auth endpoint)
**Blocks:** 1.5, other frontend stories

---

### Story 1.5: Frontend Projects List (5 pts)
**Assignee:** @dev
**Priority:** P0 (Blocker)
**Estimated:** 1.5 days
**Status:** Draft

Display projects with React Query, pagination, and navigation. Cards with project metadata.

**Tasks:**
- [ ] useProjects hook (React Query)
- [ ] Projects page refactor
- [ ] Project card component
- [ ] Navigation bar + logout
- [ ] Pagination (limit, offset)
- [ ] Error/loading states
- [ ] Click → navigate to project detail
- [ ] Tests: `npm test`

**Success Criteria:**
- Projects load from API
- Displayed in grid layout
- Pagination working
- Click project card → navigate
- React Query caching working (5min stale)
- 80%+ test coverage

**Dependencies:** 1.3 (projects API), 1.4 (login working)
**Blocks:** Sprint 2 (decision timeline)

---

## Sprint Timeline

### Day 1 (Mon) - Backend Foundation
**Goal:** Complete Story 1.1
- Morning: Alembic migration + table creation
- Afternoon: Indexes + pgvector setup + seed data
- EOD: All tables created, tests passing

**Deliverable:** `decision-log-backend/` with working database

### Day 2 (Tue) - Authentication
**Goal:** Complete Stories 1.2 + partial 1.3
- Morning: Auth service + login endpoint
- Afternoon: Me endpoint + middleware + tests
- EOD: Full auth flow working in Postman

**Deliverable:** `/api/auth/*` endpoints working

### Day 3 (Wed) - Projects API + Frontend Login
**Goal:** Complete Stories 1.3 + 1.4
- Morning: Project service + GET /projects endpoints
- Afternoon: Frontend login page implementation
- EOD: Login → redirect to projects

**Deliverable:** Full auth + login functional

### Day 4 (Thu) - Frontend Projects
**Goal:** Complete Story 1.5
- Morning: Projects page with React Query
- Afternoon: Navigation + styling
- EOD: Full project list page working

**Deliverable:** User can login → see projects → navigate

### Day 5 (Fri) - Testing + Polish
**Goal:** Test coverage + bug fixes
- Morning: Write remaining tests for coverage
- Afternoon: Bug fixes + performance tuning
- EOD: All tests passing, ready for QA

**Deliverable:** Sprint 1 complete, all tests passing

---

## Dependencies & Blocking

```
1.1 (Database) [Day 1]
├─ 1.2 (Auth) [Day 2] ─┐
│                      ├─ 1.3 (Projects API) [Day 3] ─┐
│                      │                               ├─ 1.5 (Frontend Projects) [Day 4]
│                      └─ 1.4 (Frontend Login) [Day 3] ┘
```

**Critical Path:** 1.1 → 1.2 → 1.3 → 1.5 (3.5 days)

**Parallel Work:** 1.2 → 1.4 can happen simultaneously (1.2 blocking 1.4)

---

## Resource Allocation

**Developer:** @dev (Dex)
- Distributed across both backend and frontend
- Backend: 18 points (Days 1-3)
- Frontend: 10 points (Days 3-4)

**Ideal Progression:**
- Mon-Tue: Backend focused
- Wed: Mix (API completion + frontend start)
- Thu-Fri: Frontend focused + testing

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Database migration issues | Low | High | Test locally first with docker-compose |
| Supabase pgvector limits | Low | High | Use local PostgreSQL for MVP |
| JWT token expiration bugs | Medium | Medium | Comprehensive token tests |
| API/Frontend integration issues | Medium | Medium | Test with Postman before frontend |
| Time estimate too short | Medium | High | Have Day 5 as buffer |

---

## Acceptance Criteria for Sprint Completion

✅ **Backend Foundation**
- [ ] Story 1.1: Database schema complete, tests passing
- [ ] Story 1.2: Auth endpoints working, tokens valid
- [ ] Story 1.3: Project endpoints returning correct data

✅ **Frontend Foundation**
- [ ] Story 1.4: Login page functional, auth flow complete
- [ ] Story 1.5: Projects list page displays data correctly

✅ **Quality**
- [ ] All 5 stories at "Done" (tests passing)
- [ ] 80%+ code coverage for critical paths
- [ ] No failing tests or linting errors
- [ ] API documentation (Postman collection)

✅ **Documentation**
- [ ] Each story has completion notes
- [ ] File list updated
- [ ] README updated with setup instructions

---

## Sprint Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Story Completion | 100% (5/5) | Pending |
| Test Coverage | 80%+ | Pending |
| Bugs Found | <2 | Pending |
| Code Quality | A (lint + format) | Pending |
| Velocity | 25-30 pts | 28 pts planned |

---

## Sprint Notes

### What's Included (MVP)
✅ Database schema with 7 tables
✅ User authentication (login, JWT)
✅ Project CRUD (read only for MVP)
✅ Basic UI (login, projects list)
✅ Testing infrastructure
✅ CI/CD pipelines

### What's NOT Included (Phase 2)
❌ Decision extraction (LangGraph)
❌ Timeline dashboard
❌ Filters and search
❌ Webhooks
❌ Executive digest
❌ Password reset
❌ Token refresh

### Assumptions
- Backend scaffolding complete (✅ done in setup phase)
- Frontend scaffolding complete (✅ done in setup phase)
- Docker + PostgreSQL available locally
- Developer has Python 3.11+ and Node.js 18+
- GitHub Actions environment configured

---

## Definition of Done

For each story:
- [ ] Code written and working
- [ ] Tests written (80%+ coverage)
- [ ] Tests passing: `pytest` (backend) / `npm test` (frontend)
- [ ] Linting passing: `ruff`, `black`, `eslint`
- [ ] Type checking passing: `mypy`, `npm run typecheck`
- [ ] Story file updated (completion notes, file list, change log)
- [ ] No console errors or warnings
- [ ] Documented in story file

---

## Rollout Plan (After Sprint)

1. **Manual Testing (Friday PM)**
   - Test login flow end-to-end
   - Test project list display
   - Test RBAC with different user roles

2. **QA Review (Friday EOD)**
   - Sign off on acceptance criteria
   - Report any blocking issues

3. **Staging Deployment (Next Monday)**
   - Deploy backend to Railway/Render
   - Deploy frontend to Vercel
   - Smoke test in staging

4. **Sprint Retrospective**
   - What went well
   - What could improve
   - Velocity for next sprint

---

## Sprint 2 Preview (Tentative)

**Stories 2.1-2.5: Decision Data Layer**
- Decision CRUD endpoints
- Filtering and search
- Vector embeddings
- Pagination
- Frontend decision list

**Estimated Points:** 30-35

---

**Sprint Plan Created:** 2026-02-07
**Sprint Status:** Ready to begin
**Next Action:** @dev picks Story 1.1 and begins

---

*Est. Sprint Duration: 5 days (Mon-Fri)*
*Est. Daily Standup: 15 min (9:30 AM)*
*Est. Sprint Review: Fri 4 PM*
