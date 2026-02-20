# Sprint 1: Data Model Foundation — DETAILED TASK BREAKDOWN
**Sprint Duration:** 2 weeks (10 business days)
**Story Points:** 13 SP (E5.1 Database Migration)
**Owner:** @dev (Backend lead)
**Status:** Ready for team assignment
**Created:** 2026-02-20

---

## 🎯 SPRINT 1 GOAL

Complete the critical database migration from V1 Decision-only model to V2 Project Item taxonomy. This is the foundation that unblocks all other V2 work. By end of Sprint 1, the entire backend API layer must work with the new schema while maintaining 100% V1 backward compatibility.

---

## 📋 STORY BREAKDOWN

### Story 5.1: Database Migration — Decision to Project Item
**ID:** 5.1
**Story Points:** 13 (full sprint)
**Status:** Ready for Development
**Related Story File:** `docs/stories/5.1-database-migration-decision-to-project-item.md`

---

## 🔧 DETAILED TASKS (Weekly Breakdown)

### WEEK 1: Pre-Migration & Migration Script Development

#### Task 1.1: Pre-Migration Validation & Backup Setup
**Assigned to:** Backend Dev (Sprint Lead)
**Duration:** 1-2 days
**Story Points:** 2

**Subtasks:**
1. [ ] Create pre-migration validation script
   - Count existing decisions table rows
   - Validate data integrity (no nulls in critical fields)
   - Check for orphaned records
   - Output: CSV validation report to `docs/qa/migration-reports/pre-migration-validation.csv`

2. [ ] Create backup procedure
   - `pg_dump` production schema to `backups/pre-migration-{timestamp}.sql`
   - Backup size documented (should be <100MB)
   - Restore test on staging environment
   - Document: `docs/qa/migration-reports/backup-procedure.md`

3. [ ] Staging environment preparation
   - Restore V1 database snapshot to staging
   - Run validation script on staging (verify it works)
   - Document baseline metrics (query times, table size)

**Acceptance Criteria:**
- [ ] Pre-migration validation script produces clean CSV report
- [ ] Backup verified restorable on staging
- [ ] Staging ready with V1 baseline metrics
- [ ] All procedures documented in `docs/qa/migration-reports/`

---

#### Task 1.2: Schema Migration Script Development (Phase 1 — Rename & Extend)
**Assigned to:** Backend Dev (Database specialist)
**Duration:** 2-3 days
**Story Points:** 3

**Subtasks:**
1. [ ] Create migration file: `decision-log-backend/app/database/migrations/001_decisions_to_project_items.py`
   ```python
   # Pseudocode structure
   def upgrade():
       # Phase 1: Rename table
       op.rename_table('decisions', 'project_items')

       # Phase 1: Add new columns with defaults
       op.add_column('project_items', 'item_type', String, default='decision')
       op.add_column('project_items', 'source_type', String, default='meeting')
       op.add_column('project_items', 'is_milestone', Boolean, default=False)
       op.add_column('project_items', 'is_done', Boolean, default=False)
       op.add_column('project_items', 'affected_disciplines', JSON, default='[]')
       op.add_column('project_items', 'owner', String)
       op.add_column('project_items', 'source_id', UUID)

   def downgrade():
       # Reverse steps
       op.drop_column('project_items', 'owner')
       # ... etc
       op.rename_table('project_items', 'decisions')
   ```

2. [ ] Migrate existing data (Phase 2)
   - Populate `affected_disciplines` from single `discipline` field
   - Set `item_type = 'decision'` for all rows
   - Set `source_type = 'meeting'` for all rows
   - SQL: `UPDATE project_items SET affected_disciplines = jsonb_build_array(discipline) WHERE discipline IS NOT NULL;`

3. [ ] Create new tables (Phase 3)
   - `sources` table with: id, project_id, source_type, title, occurred_at, ingestion_status, raw_content, etc.
   - `project_stages` table with: id, project_id, stage_name, stage_from, stage_to, sort_order, is_current
   - `project_participants` table with: id, project_id, name, email, discipline
   - SQL files in: `decision-log-backend/app/database/migrations/`

4. [ ] Test migration script on staging
   - Run upgrade on staging database
   - Verify all columns created
   - Verify data populated correctly (spot check 10 rows)
   - Run downgrade, verify table restored to `decisions`
   - Run upgrade again, verify idempotent

**Acceptance Criteria:**
- [ ] Migration script runs without errors on staging
- [ ] All new columns created with correct types
- [ ] `affected_disciplines` populated correctly (verify 100% of rows)
- [ ] Existing foreign keys preserved
- [ ] Downgrade script reverses migration cleanly
- [ ] Migration idempotent (can run multiple times safely)

---

#### Task 1.3: Post-Migration Data Integrity Check
**Assigned to:** Backend Dev (QA focus)
**Duration:** 1 day
**Story Points:** 2

**Subtasks:**
1. [ ] Create post-migration validation script
   - Count rows: should match pre-migration count
   - Verify `affected_disciplines` populated for ALL rows (100%)
   - Verify `item_type = 'decision'` for all rows
   - Verify `source_type = 'meeting'` for all rows
   - Check: no null values in critical fields (statement, who, timestamp)
   - Output: CSV validation report

2. [ ] Link existing transcripts to sources table
   - For each existing meeting, create `Source` record
   - Populate `raw_content` from transcript text
   - Create foreign key links: `project_items.source_id` → `sources.id`
   - SQL: `INSERT INTO sources (id, project_id, source_type, title, raw_content, ...) SELECT gen_random_uuid(), project_id, 'meeting', meeting_title, transcript_text, ... FROM transcripts;`

3. [ ] Performance benchmarking
   - Test query time: `SELECT * FROM project_items WHERE project_id = {id}` (should be <100ms)
   - Test vector search: semantic search should work on existing embeddings
   - Document: baseline vs. post-migration query times
   - Compare table sizes (before/after)

**Acceptance Criteria:**
- [ ] Post-migration row count matches pre-migration count
- [ ] `affected_disciplines` populated on 100% of rows
- [ ] All foreign key constraints intact
- [ ] Vector search still functional
- [ ] Query performance baseline established

---

### WEEK 2: API Integration & Final Testing

#### Task 2.1: Backend API Integration — Project Items CRUD Endpoints
**Assigned to:** Backend Dev (API specialist)
**Duration:** 2-3 days
**Story Points:** 3

**Subtasks:**
1. [ ] Create Pydantic models for ProjectItem
   - File: `decision-log-backend/app/api/models/project_item.py`
   - Models: `ProjectItemRequest`, `ProjectItemResponse`, `ProjectItemDetail`
   - Include: `affected_disciplines: List[Discipline]`, `impacts: Optional[ImpactSchema]`, `consensus: Optional[ConsensusSchema]`
   - Validation: `affected_disciplines` not empty, all values are valid `Discipline` enum

2. [ ] Implement `/api/projects/{id}/items` endpoint
   - GET with full filter support: `?item_type=decision,topic&source_type=meeting&discipline=structural&is_milestone=true&date_from=2026-01-01&search=concrete`
   - POST for manual input (handled in later story)
   - Query optimization: use appropriate indexes
   - Pagination: `?limit=50&offset=0`

3. [ ] Implement `/api/projects/{id}/items/{item_id}` endpoint
   - GET: return full item detail including `impacts`, `consensus`, `affected_disciplines`
   - PATCH: support milestone toggle and is_done toggle
   - Return: `ProjectItemDetail` with all fields

4. [ ] Backward compatibility endpoint: `/api/projects/{id}/decisions`
   - Proxy to `/items?item_type=decision` (for V1 frontend compatibility)
   - Return: same field names as V1 (translate `affected_disciplines` → `discipline` for first item if needed)
   - TEST: Existing V1 frontend queries should work unchanged

5. [ ] Test all endpoints
   - Unit tests: `tests/api/test_project_items.py` (>80% coverage)
   - Integration tests: Create item, read, filter, verify results
   - Backward compat test: V1 client queries work unchanged

**Acceptance Criteria:**
- [ ] All CRUD endpoints operational
- [ ] Filter parameters working correctly
- [ ] Backward-compatible `/decisions` endpoint works
- [ ] All tests passing (>80% coverage)
- [ ] No database N+1 queries (verified with slow query log)
- [ ] CodeRabbit pre-commit: zero critical issues

---

#### Task 2.2: Frontend Type & Hook Migration
**Assigned to:** Frontend Dev (in parallel with Task 2.1)
**Duration:** 2-3 days
**Story Points:** 2

**Subtasks:**
1. [ ] Migrate TypeScript types
   - Rename: `src/types/decision.ts` → `src/types/projectItem.ts`
   - Create types: `ProjectItem`, `ItemType` (enum), `SourceType` (enum), `Discipline` (enum)
   - Create schemas: `ImpactSchema`, `ConsensusSchema`
   - Export: all types from `src/types/index.ts`

2. [ ] Update React Query hooks
   - Rename: `useDecisions` → `useProjectItems`
   - Update parameters: add filters for `item_type`, `source_type`
   - Signature: `useProjectItems(projectId, filters: {item_type?, source_type?, discipline?, is_milestone?, dateFrom?, dateTo?, search?})`
   - Return: `{ data: ProjectItem[], isLoading, error }`

3. [ ] Create new hook: `useMilestones`
   - Filter by `is_milestone=true`
   - Signature: `useMilestones(projectId)` → returns `{ data: ProjectItem[], ... }`

4. [ ] Update filter store
   - File: `src/store/filterStore.ts`
   - Add: `itemTypeFilter: ItemType[]`, `sourceTypeFilter: SourceType[]`
   - Actions: `setItemTypeFilter`, `setSourceTypeFilter`

5. [ ] Update all component imports
   - Find all: `import { Decision } from 'types/decision'`
   - Replace with: `import { ProjectItem } from 'types/projectItem'`
   - Update component props from `Decision` to `ProjectItem`
   - Verify: no broken references (TypeScript compilation clean)

6. [ ] Test type migration
   - Unit tests: `src/tests/types/projectItem.test.ts`
   - Hook tests: `src/tests/hooks/useProjectItems.test.ts`
   - Integration test: render component with new hook, verify data loads
   - TypeScript compilation: zero errors

**Acceptance Criteria:**
- [ ] All type references updated
- [ ] Hooks renamed and signatures updated
- [ ] Filter store extends with new dimensions
- [ ] All imports updated
- [ ] TypeScript compilation: zero errors
- [ ] Tests passing (>80% coverage)
- [ ] Existing components render correctly with new types

---

#### Task 2.3: Seed Data & Test Suite Update
**Assigned to:** Fullstack Dev
**Duration:** 1 day
**Story Points:** 1

**Subtasks:**
1. [ ] Update seed data
   - File: `decision-log-backend/app/database/seeds/projects_and_items.py`
   - Create: 3+ items of each type (idea, topic, decision, action_item, information)
   - Add: `affected_disciplines` arrays with 1-3 disciplines per item
   - Add: 5+ milestones (`is_milestone=true`)
   - Add: `ProjectParticipant` records for at least 2 projects (5+ participants)
   - Add: structured `impacts` and `consensus` JSON for decision items

2. [ ] Update all existing tests
   - Find: all test files referencing `decisions` table or `Decision` type
   - Update: table references to `project_items`
   - Update: type references to `ProjectItem`
   - Update: SQL queries to use new schema

3. [ ] Add new test cases
   - Test: filter by `item_type`
   - Test: filter by `source_type`
   - Test: filter by `affected_disciplines` (multiple)
   - Test: toggle `is_milestone`
   - Test: toggle `is_done` for action items
   - Test: backward compatibility (`/decisions` endpoint)

**Acceptance Criteria:**
- [ ] Seed data includes all 5 item types with realistic content
- [ ] At least 5+ items marked as milestones
- [ ] `affected_disciplines` populated (1-3 per item)
- [ ] `ProjectParticipant` records exist for testing
- [ ] All existing tests pass with updated schema
- [ ] New test cases passing (filter, toggle, compat)
- [ ] `npm run frontend:test` and backend pytest passing

---

## 📊 SPRINT 1 SUMMARY

| Task | Day | Duration | SP | Owner | Status |
|------|-----|----------|----|----|--------|
| 1.1: Pre-Migration Validation | 1-2 | 1-2d | 2 | Backend Lead | Ready |
| 1.2: Migration Script Dev | 3-5 | 2-3d | 3 | DB Specialist | Ready |
| 1.3: Data Integrity Check | 6 | 1d | 2 | QA Focus | Ready |
| 2.1: API Integration | 7-9 | 2-3d | 3 | API Specialist | Ready |
| 2.2: Frontend Type Migration | 7-9 | 2-3d | 2 | Frontend Dev | Ready |
| 2.3: Seed Data & Tests | 10 | 1d | 1 | Fullstack | Ready |
| **TOTAL** | **10 days** | **2 weeks** | **13 SP** | **2 devs** | **Ready for Kickoff** |

---

## 🔒 CRITICAL SUCCESS FACTORS

1. ✅ **Zero data loss** — Pre-migration validation + backup + post-migration verification
2. ✅ **Backward compatibility** — V1 frontend queries work unchanged on `/decisions` endpoint
3. ✅ **Migration reversibility** — Down script tested and verified
4. ✅ **Performance baseline** — Query times documented before/after
5. ✅ **Test coverage >80%** — All new code tested before merge
6. ✅ **CodeRabbit clean** — Zero critical issues before final commit

---

## 🛑 BLOCKERS & ESCALATION

**If blocked on:**
- Database access/permissions → Escalate to @devops
- Unclear requirements → Refer to `docs/stories/5.1-database-migration-decision-to-project-item.md`
- Missing dependencies → @architect approval needed
- Performance regression → Profile & spike required

---

## 🎯 GATE CRITERIA (Must Pass Before Sprint 2)

All items in **Sprint 1 Gate Criteria** section of `V2_SPRINT_PLAN.md` must be **checked off**:
- ✅ Migration complete, data verified
- ✅ API endpoints functional + backward compatible
- ✅ Frontend types migrated + compilation clean
- ✅ All tests passing (>80% coverage)
- ✅ CodeRabbit pre-commit: ZERO critical issues
- ✅ Performance baseline documented

---

## 📞 DAILY STANDUP TOPICS

**Daily Questions for Sprint 1 Team:**
1. Migration script development: blockers or on track?
2. Data validation results: any integrity issues found?
3. API implementation: endpoint completeness status?
4. Frontend type migration: import/reference cleanup progress?
5. Test coverage: heading toward 80% target?
6. CodeRabbit pre-review: any issues to address early?

---

## 📚 REFERENCE FILES

- Story Details: `docs/stories/5.1-database-migration-decision-to-project-item.md`
- PRD Data Model: `docs/management/prd/02_DecisionLog_V2_PRD.md` (sections 7-9)
- Database Schema: `docs/architecture/03-DATABASE-SCHEMA.md`
- Migration Reports: `docs/qa/migration-reports/` (created during Sprint)
- Test Files: `decision-log-backend/tests/`, `decision-log-frontend/src/tests/`

---

**Sprint Master:** River (@sm)
**Created:** 2026-02-20
**Last Updated:** 2026-02-20
**Status:** ✅ Ready for Team Kickoff

— Removendo obstáculos 🌊
