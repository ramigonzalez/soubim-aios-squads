# DecisionLog MVP: Sprint Planning (8 Weeks)

**Project:** DecisionLog MVP
**Total Duration:** 8 weeks (Feb 10 - April 4, 2026)
**Sprint Duration:** 2 weeks
**Total Sprints:** 4 (Sprint 1-4)
**Team Size:** 3-4 developers (Frontend, Backend, Database)

---

## SPRINT OVERVIEW

```
Sprint 1 (Feb 10-23): Backend Foundation + Frontend Setup
Sprint 2 (Feb 24 - Mar 9): Extraction Pipeline + Dashboard Layout
Sprint 3 (Mar 10-23): Agent Tools + Dashboard Components + Auth
Sprint 4 (Mar 24 - Apr 4): Polish + Testing + Launch
```

---

## SPRINT 1: Backend Foundation + Frontend Setup
**Dates:** Feb 10-23 (Week 1-2)
**Goal:** Database ready, API structure, frontend project scaffolded

### Stories Included

#### Backend (Epic 1)
- **1.2: Transcript Storage Schema** (3 pts) - Database
- **1.4: Decision Storage Schema** (5 pts) - Database
- **1.1: Tactiq Webhook Endpoint** (5 pts) - API

#### Frontend (Epic 3)
- **3.1: Frontend Project Setup** (5 pts) - Frontend
- **3.2: API Service Layer** (3 pts) - Frontend

#### Auth (Epic 4)
- **4.1: User Management Schema** (3 pts) - Database
- **4.2: JWT Authentication Endpoint** (5 pts) - API

### Sprint 1 Totals
- **Total Points:** 29
- **Estimated Velocity:** 8-10 pts/person/week (3-4 developers)
- **Risk:** Database design complexity

### Sprint 1 Deliverables
✅ PostgreSQL schemas (transcripts, decisions, users)
✅ Tactiq webhook endpoint ready (testing)
✅ Frontend React project scaffolded
✅ API service layer
✅ JWT login endpoint
✅ Team knows system architecture

### Sprint 1 Success Criteria
- [ ] Database schemas created and indexed
- [ ] Webhook endpoint receives test payloads
- [ ] Frontend builds without errors
- [ ] API service layer functional
- [ ] User can log in

---

## SPRINT 2: Extraction Pipeline + Dashboard Layout
**Dates:** Feb 24 - Mar 9 (Week 3-4)
**Goal:** Decisions being extracted, dashboard UI layout, error handling

### Stories Included

#### Backend (Epic 1)
- **1.3: LLM Extraction Service Setup** (8 pts) - Backend/LLM
- **1.11: Error Handling & Logging** (3 pts) - Backend

#### Frontend (Epic 3)
- **3.3: Authentication & Login** (5 pts) - Frontend
- **3.4: Projects List View** (5 pts) - Frontend
- **3.5: Decision Timeline Component** (8 pts) - Frontend
- **3.10: Styling & Responsive Design** (5 pts) - Frontend

#### Vector Search (Epic 2)
- **2.1: Sentence-Transformers Setup** (5 pts) - Backend

#### Auth (Epic 4)
- **4.3: JWT Middleware & Token Validation** (3 pts) - API

### Sprint 2 Totals
- **Total Points:** 42
- **Team Split:**
  - Backend/LLM: 1 developer (extraction)
  - Frontend: 2 developers (UI layout + styling)
  - Database/API: 1 developer (middleware, auth)
- **Risk:** LLM prompt engineering, frontend layout complexity

### Sprint 2 Deliverables
✅ Claude integration working
✅ Decisions being extracted from transcripts
✅ Frontend login page
✅ Projects list view
✅ Basic timeline layout (no interactivity yet)
✅ Error logging in place

### Sprint 2 Success Criteria
- [ ] Extract test decisions from sample transcript
- [ ] 80%+ extraction accuracy (manual audit)
- [ ] Frontend builds and runs
- [ ] Login flow works end-to-end
- [ ] Timeline displays decisions (static)
- [ ] Error logs readable

---

## SPRINT 3: Agent Tools + Dashboard Components + Access Control
**Dates:** Mar 10-23 (Week 5-6)
**Goal:** Agent enrichment working, filters/search, full access control

### Stories Included

#### Backend (Epic 1)
- **1.5: Agent Tools - Similar Decisions Retriever** (5 pts) - Backend/Agent
- **1.6: Agent Tools - Consistency Validator** (5 pts) - Backend/Agent
- **1.7: Agent Tools - Confidence Scorer** (3 pts) - Backend/Agent
- **1.8: Agent Tools - Anomaly Flagger** (5 pts) - Backend/Agent
- **1.9: LangGraph Agent Orchestration** (8 pts) - Backend/Agent
- **1.10: Extraction Pipeline Scheduler** (3 pts) - Backend

#### Frontend (Epic 3)
- **3.6: Filters & Search Sidebar** (8 pts) - Frontend
- **3.7: Decision Drill-Down Modal** (8 pts) - Frontend
- **3.8: Gabriela's Executive Digest View** (5 pts) - Frontend
- **3.9: API Endpoints - Timeline & Digest** (8 pts) - Backend API

#### Vector Search (Epic 2)
- **2.2: pgvector Extension Setup** (3 pts) - Database
- **2.3: Embedding Generation Pipeline** (5 pts) - Backend
- **2.4: Semantic Search API** (5 pts) - Backend API

#### Auth (Epic 4)
- **4.4: Role-Based Authorization** (5 pts) - Backend API
- **4.5: Project-Level Access Control** (5 pts) - Backend API

### Sprint 3 Totals
- **Total Points:** 92 (LARGE SPRINT - consider splitting)
- **Team Split:**
  - Backend/Agent: 2 developers (agent tools, embeddings)
  - Frontend: 2 developers (filters, drill-down, digest)
  - Backend API: 1 developer (endpoints, auth)
- **Risk:** LangGraph complexity, large amount of frontend work, agent tools interdependencies

### Alternative: Split Sprint 3A & 3B (2-week each)

**Sprint 3A: Agent Foundation + Basic Dashboard**
- 1.5, 1.6, 1.7, 1.8: Agent tools (21 pts)
- 3.6: Filters (8 pts)
- 2.3, 2.4: Embeddings (10 pts)
- 4.4, 4.5: Access control (10 pts)
**Total: 49 pts**

**Sprint 3B: Complete Dashboard + Agent Integration**
- 1.9, 1.10: Agent orchestration (11 pts)
- 3.7, 3.8, 3.9: Drill-down, digest, API (21 pts)
- 2.2: pgvector (3 pts)
- 4.3 (if not done): Auth (3 pts)
**Total: 38 pts**

### Sprint 3 Deliverables
✅ Full agent enrichment (5 tools + orchestration)
✅ Filters and search functional
✅ Drill-down modal working
✅ Gabriela's digest view
✅ Semantic search working
✅ Full access control implemented

### Sprint 3 Success Criteria
- [ ] Agent processes decisions <15 sec
- [ ] Consistency scores computed
- [ ] Confidence scores working
- [ ] Anomaly flags detected
- [ ] Filters work independently + combined
- [ ] Drill-down shows transcript excerpt
- [ ] Semantic search returns relevant results
- [ ] Access control enforced (directors see all, architects see assigned)

---

## SPRINT 4: Polish + Testing + Launch
**Dates:** Mar 24 - Apr 4 (Week 7-8)
**Goal:** MVP complete, tested, deployed, user ready

### Stories Included

#### Backend (Epic 2)
- **2.5: Discipline Assignment & Tagging** (3 pts) - Backend
- **2.6: Vector Quality Validation** (5 pts) - Backend/QA
- **2.7: Search Performance Optimization** (5 pts) - Backend

#### Auth (Epic 4)
- **4.6: Password Security & Hashing** (3 pts) - Backend API
- **4.7: Logout & Session Management** (3 pts) - Backend API
- **4.8: CORS & Security Headers** (3 pts) - Backend API
- **4.9: Rate Limiting** (3 pts) - Backend API

#### Testing & Polish (All)
- Testing: Unit tests, integration tests, E2E tests (15 pts est.)
- Bug fixes & performance optimization (10 pts est.)
- User testing with Gabriela + architects (5 pts est.)
- Documentation & deployment runbooks (5 pts est.)

### Sprint 4 Totals
- **Total Points:** 60
- **Team Split:**
  - Backend: 1 developer (final touches, security)
  - Frontend: 1 developer (polish, responsive fixes)
  - QA: 1 developer (testing, validation)
  - DevOps: 1 developer (deployment, monitoring)
- **Risk:** Last-minute bugs, deployment issues, user feedback

### Sprint 4 Deliverables
✅ All features complete and tested
✅ Security hardening complete
✅ Performance optimized (<2 sec dashboard)
✅ User tested with Gabriela + team
✅ Deployed to production
✅ Monitoring + error tracking in place

### Sprint 4 Success Criteria
- [ ] 95%+ test coverage on critical paths
- [ ] Gabriela can catch up in <30 min
- [ ] Dashboard loads <2 sec (200 decisions)
- [ ] Zero critical bugs
- [ ] Semantic search finds relevant results
- [ ] Access control enforced
- [ ] Ready for production use

---

## CROSS-SPRINT DEPENDENCIES

```
Sprint 1 (Database + Auth foundation)
  ↓ (needs database schemas)
Sprint 2 (Extraction pipeline + UI layout)
  ↓ (needs extraction working, layout done)
Sprint 3 (Agent + Dashboard completion)
  ↓ (needs all features built)
Sprint 4 (Testing + Polish + Launch)
  ↓
🚀 LAUNCH
```

---

## TEAM ALLOCATION

### Recommended Team (3-4 people)

**Developer 1 (Backend/LLM - Lead)**
- Sprint 1: Database design (1.2, 1.4)
- Sprint 2: LLM extraction (1.3)
- Sprint 3: Agent tools (1.5-1.8, 1.9)
- Sprint 4: Vector polish (2.5, 2.6, 2.7)

**Developer 2 (Frontend - Lead)**
- Sprint 1: Frontend setup (3.1, 3.2)
- Sprint 2: Login + projects list (3.3, 3.4, 3.10)
- Sprint 3: Timeline + filters + drill-down (3.5, 3.6, 3.7, 3.8)
- Sprint 4: Polish + testing

**Developer 3 (Backend API/Database)**
- Sprint 1: Webhook endpoint (1.1), Auth (4.1, 4.2)
- Sprint 2: Error logging (1.11), Middleware (4.3)
- Sprint 3: API endpoints (3.9), Access control (4.4, 4.5)
- Sprint 4: Security (4.6, 4.7, 4.8, 4.9)

**Developer 4 (QA/DevOps - Optional)**
- Sprint 4: Testing, deployment, monitoring

---

## VELOCITY TRACKING

### Sprint Velocity Targets

| Sprint | Target Velocity | Team Size | Notes |
|--------|-----------------|-----------|-------|
| 1 | 25-30 pts | 3 devs | Foundation, lower complexity |
| 2 | 40-45 pts | 3 devs | Moderate complexity |
| 3 | 70-80 pts | 3-4 devs | High complexity, parallel work |
| 4 | 50-60 pts | 4 devs | Testing + polish + launch |

**Total MVP Effort:** ~200-220 story points

---

## RISK MITIGATION

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| **LLM extraction accuracy <90%** | Low | Medium | Test early (Sprint 2), audit results, adjust prompts |
| **Agent complexity delays Sprint 3** | Medium | High | Break Sprint 3 into 3A + 3B if needed, pair programming |
| **Frontend performance issues** | Medium | High | Virtual scrolling tested early, performance monitoring Sprint 4 |
| **Scope creep (Phase 2 features leak)** | High | High | Strict scope enforcement, move Phase 2 items to backlog |
| **Team velocity lower than expected** | Medium | Medium | Build in 20% buffer, cut lowest-priority features |
| **User testing reveals major issues** | Low | High | Early feedback (Sprint 2), iterate in Sprint 4 |
| **Deployment/infrastructure issues** | Low | Medium | Infrastructure ready Week 1, staging environment |

---

## SPRINT CHECKLIST TEMPLATE

**End of Each Sprint:**
- [ ] All committed stories completed
- [ ] Code reviewed and merged
- [ ] Tests passing (unit + integration)
- [ ] No critical bugs
- [ ] Documentation updated
- [ ] Stakeholder update sent
- [ ] Velocity recorded
- [ ] Retrospective conducted
- [ ] Next sprint planned

---

## SUCCESS METRICS (WEEK 8)

✅ All 37 user stories completed
✅ 4 epics delivered
✅ 95%+ test coverage
✅ <2 second dashboard load time
✅ Gabriela can catch up in <30 min per project
✅ 8+ of 9 architects using system 3+ times/week
✅ Zero critical bugs
✅ Deployed to production
✅ Team feeling confident about handoff

---

## GO-LIVE DECISION (END OF SPRINT 4)

**Decision Point:** Can we launch with MVP features complete?

**GO criteria:**
- ✅ All 10 features working
- ✅ 95%+ decision extraction accuracy
- ✅ <2 second dashboard load
- ✅ Zero critical bugs
- ✅ User testing passed

**NO-GO criteria:**
- ❌ Critical features not working
- ❌ Extraction accuracy <85%
- ❌ Performance issues (<2 sec)
- ✅ Known bugs marked as "Phase 2"

---

## BACKLOG (Phase 2+)

Stories not in MVP but planned for Phase 2+:

**Phase 1.5 (Quick wins if time permits):**
- Email digest delivery
- PDF export
- Basic analytics

**Phase 2 (Months 3-6):**
- Real-time extraction during calls
- Decision impact simulation
- Custom ML fine-tuning
- Cross-project knowledge search
- Client-facing dashboard
- Monday.com integration

**Phase 3+ (1+ year):**
- Multi-platform support (Zoom, Teams)
- Industry benchmarking
- Advanced analytics

---

**END OF SPRINT PLAN**

Team can execute this plan with clarity on priorities, dependencies, and success criteria.
