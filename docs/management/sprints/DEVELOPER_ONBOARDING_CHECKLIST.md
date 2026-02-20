# DecisionLog V2 Developer Onboarding Checklist
**Date:** 2026-02-20
**Version:** 1.0
**For:** Sprint 1 Kickoff + V2 Development
**Duration:** 2-3 hours (per developer)

---

## 📋 PURPOSE

This checklist ensures all developers have:
- ✅ Local environment configured correctly
- ✅ Access to required tools and repositories
- ✅ Understanding of V2 architecture & standards
- ✅ Test suite working locally
- ✅ Git workflow established
- ✅ Communication channels set up

---

## 🔧 PHASE 1: Environment Setup (30 minutes)

### Section 1.1: Repository & Branch Setup

**Note:** You're already in the repo. This section verifies your git setup.

- [ ] Verify you're in the right directory
  ```bash
  pwd  # Should end with: soubim-aios-squads
  ls -la | grep .git  # Should show .git directory
  ```

- [ ] Verify git configuration
  ```bash
  git config user.name  # Should be your name
  git config user.email # Should be your work email
  ```

- [ ] Verify remote origin
  ```bash
  git remote -v  # Should show origin pointing to soubim/aios-squads
  ```

- [ ] Create local feature branch for Sprint 1
  ```bash
  git checkout -b feature/5.1-database-migration-v2
  ```

- [ ] Verify you're on the feature branch
  ```bash
  git branch  # Should show: * feature/5.1-database-migration-v2
  git status  # Should show: On branch feature/5.1-database-migration-v2
  ```

### Section 1.2: Backend Environment Setup

- [ ] Install Python 3.11+
  ```bash
  python3 --version  # Should be 3.11 or higher
  ```

- [ ] Create virtual environment
  ```bash
  cd decision-log-backend
  python3 -m venv venv
  source venv/bin/activate  # On Windows: venv\Scripts\activate
  ```

- [ ] Install backend dependencies
  ```bash
  pip install -r requirements.txt
  pip install -r requirements-dev.txt  # For testing
  ```

- [ ] Create `.env` file from template
  ```bash
  cp .env.example .env
  # Edit .env with your database credentials
  # (Ask @devops for test DB credentials)
  ```

- [ ] Test database connection
  ```bash
  python3 -m pytest tests/test_db_connection.py -v
  # Should pass without errors
  ```

- [ ] Verify pytest is working
  ```bash
  pytest --version  # Should output pytest version
  pytest tests/ -k "test_" --collect-only | head -20
  # Should show list of tests without running them
  ```

### Section 1.3: Frontend Environment Setup

- [ ] Install Node.js 18+ and npm
  ```bash
  node --version   # Should be 18.0.0 or higher
  npm --version    # Should be 9.0.0 or higher
  ```

- [ ] Install frontend dependencies
  ```bash
  cd decision-log-frontend
  npm install
  ```

- [ ] Create `.env` file from template (if exists)
  ```bash
  cp .env.example .env.local  # Or ask for .env setup
  ```

- [ ] Verify Vitest is working
  ```bash
  npm run test:list  # Should list all test files
  npm run test -- --run  # Should run tests once and exit
  ```

- [ ] Verify Vite dev server starts
  ```bash
  npm run dev
  # Should start on localhost:5173
  # Press Ctrl+C to stop
  ```

- [ ] Verify TypeScript compilation
  ```bash
  npm run typecheck
  # Should show "No errors found" if types are clean
  ```

### Section 1.4: Verify CLAUDE.md Understanding

- [ ] Read `.claude/CLAUDE.md` (project-specific rules)
  ```bash
  cat .claude/CLAUDE.md | less
  # Or open in your editor
  ```

- [ ] Understand:
  - ✅ Git commit control rule (ask before committing)
  - ✅ Component structure (common, molecules, organisms, templates)
  - ✅ Story file format and development workflow
  - ✅ Command patterns (`./dev.sh`, `npm run frontend:*`, `npm run backend:*`)

---

## 📚 PHASE 2: Architecture Understanding (45 minutes)

### Section 2.1: Read Key Documentation

- [ ] **V2 PRD** — `docs/management/prd/02_DecisionLog_V2_PRD.md`
  - Focus on: Item Type Taxonomy (5 types), Data Model Evolution, Discipline Enum
  - Time: 15-20 minutes
  - Skim: Full requirements, focus on **Section 8: Data Model Evolution**

- [ ] **V2 Sprint Plan** — `docs/management/sprints/V2_SPRINT_PLAN.md`
  - Focus on: Dependency matrix, Phase gates, Team allocation
  - Time: 10 minutes
  - Key takeaway: E5.1 is critical path, blocks everything

- [ ] **Sprint 1 Detailed Breakdown** — `docs/management/sprints/SPRINT_1_DETAILED_BREAKDOWN.md`
  - Read entire document (this is your task breakdown)
  - Time: 10 minutes
  - Key takeaway: 13 SP split across 6 tasks over 2 weeks

- [ ] **Architecture Docs** (quick scan)
  - `docs/architecture/01-SYSTEM-OVERVIEW.md` — 5 minute skim
  - `docs/architecture/03-DATABASE-SCHEMA.md` — Focus on V2 ProjectItem schema
  - Time: 10 minutes

### Section 2.2: Project File Structure Understanding

- [ ] Backend structure
  ```bash
  cd decision-log-backend
  find . -type d -maxdepth 2 -not -path '*/\.*' | head -20
  # Understand: app/api/routes, app/database, app/services
  ```

- [ ] Frontend structure
  ```bash
  cd decision-log-frontend
  find src -type d -maxdepth 2 | head -20
  # Understand: components/common, components/molecules, components/organisms
  ```

- [ ] Know these key files:
  - Backend: `decision-log-backend/app/database/models.py` (SQLAlchemy)
  - Frontend: `decision-log-frontend/src/types/projectItem.ts` (TypeScript types)
  - Frontend: `decision-log-frontend/src/lib/utils.ts` (utility functions, colors)

### Section 2.3: Understanding V2 Data Model

- [ ] Understand the 5 Item Types
  - [ ] idea — raw creative input
  - [ ] topic — subject under discussion
  - [ ] decision — resolved choice
  - [ ] action_item — concrete deliverable
  - [ ] information — factual statement

- [ ] Understand ProjectItem schema
  ```python
  # From PRD Section 8
  ProjectItem {
    id, project_id,
    statement, who, timestamp,
    item_type, source_type, affected_disciplines,
    is_milestone, is_done,
    why, causation, impacts, consensus,
    owner, source_id, source_excerpt,
    confidence, similar_items, consistency_notes, anomaly_flags, embedding,
    created_at, updated_at, created_by
  }
  ```

- [ ] Understand Discipline Enum (15 values)
  - View: `docs/management/prd/02_DecisionLog_V2_PRD.md` Table in section on Discipline Enum
  - Key: Each discipline has a fixed color (source of truth in PRD)

---

## 🧪 PHASE 3: Testing & Tools Setup (30 minutes)

### Section 3.1: Backend Testing

- [ ] Run backend tests
  ```bash
  cd decision-log-backend
  pytest tests/ -v --tb=short
  # Should see: passed/failed counts
  ```

- [ ] Run with coverage
  ```bash
  pytest tests/ --cov=app --cov-report=term
  # Should show coverage % (target >80%)
  ```

- [ ] Understand test file structure
  ```bash
  find tests/ -name "test_*.py" | head -5
  # Tests mirror src structure: tests/api/test_*.py, tests/services/test_*.py
  ```

### Section 3.2: Frontend Testing

- [ ] Run frontend tests
  ```bash
  cd decision-log-frontend
  npm run test -- --run
  # Should see: passed/failed counts, coverage
  ```

- [ ] Run linting
  ```bash
  npm run lint
  # Should show errors (if any) — pre-existing ESLint TS issues OK for now
  ```

- [ ] Run type checking
  ```bash
  npm run typecheck
  # Should show: "No errors found" or list actual TS errors
  ```

### Section 3.3: CodeRabbit Setup (Critical for Sprint 1)

- [ ] Verify CodeRabbit CLI installed (WSL)
  ```bash
  wsl bash -c '~/.local/bin/coderabbit --version'
  # Should output version info, not "command not found"
  ```

- [ ] Test CodeRabbit on a small file
  ```bash
  wsl bash -c 'cd /mnt/c/.../@synkra/aios-squads && ~/.local/bin/coderabbit --prompt-only tests/test_sample.py'
  # Should show quality analysis (may take 1-2 minutes)
  ```

- [ ] Understand when to use CodeRabbit
  - Before marking story complete: `*dev run-coderabbit-check`
  - Catches: bugs, security issues, code smells
  - Self-healing: auto-fixes CRITICAL issues (max 2 iterations)

### Section 3.4: Git Workflow

- [ ] Understand git commit control (CRITICAL)
  - READ: `.claude/CLAUDE.md` section "Git & GitHub Integration"
  - Rule: NEVER commit without asking user first
  - Pattern: Stage → Ask for approval → Wait for "yes" → Commit

- [ ] Practice git workflow
  ```bash
  git status  # Should show clean working directory
  echo "test" > test.txt
  git add test.txt
  git status  # Should show "test.txt" staged for commit
  git restore --staged test.txt  # Unstage
  rm test.txt
  git status  # Should be clean again
  ```

- [ ] Understand branch naming
  - Feature: `feature/{EPIC}.{STORY}-kebab-case`
  - Example: `feature/5.1-database-migration-v2`
  - Already created in Section 1.1

---

## 👥 PHASE 4: Team Communication & Context (15 minutes)

### Section 4.1: Understand Roles & Delegation

- [ ] Know who to ask for what
  - **@sm (River)** — Story creation, sprint planning
  - **@dev (Dex)** — Implementation help, code review feedback
  - **@devops (Gage)** — Git push, PR creation (NOT @dev!)
  - **@architect (Aria)** — Technical decisions, design reviews
  - **@qa (Quinn)** — Test feedback, quality issues

- [ ] Know your constraints
  - ✅ Can: Create local branches, commit locally, write code, run tests
  - ❌ Cannot: Push to remote, create PRs, merge PRs
  - Redirect: "Activate @github-devops for push operations"

### Section 4.2: Sprint 1 Team Assignment

Ask in your standup or onboarding message:
- [ ] **Who is working on Task 1.1** (Pre-migration validation)?
- [ ] **Who is working on Task 1.2** (Migration script development)?
- [ ] **Who is working on Task 1.3** (Data integrity check)?
- [ ] **Who is working on Task 2.1** (API integration)?
- [ ] **Who is working on Task 2.2** (Frontend type migration)?
- [ ] **Who is working on Task 2.3** (Seed data & tests)?

### Section 4.3: Daily Standup Practice

- [ ] Know the daily standup format
  - 9:00 AM: Quick sync (10-15 minutes)
  - Topics: Blockers, progress, help needed
  - Where: Slack #dev-sprint-1 or Zoom (ask organizer)

- [ ] Prepare for first standup
  - Ready to say: "I'm assigned to Task 1.1, about to start pre-migration validation"
  - Ask: "Any blockers from database access setup?"

---

## 📖 PHASE 5: Story Understanding & Acceptance Criteria (20 minutes)

### Section 5.1: Read Story 5.1 Complete File

- [ ] Open: `docs/stories/5.1-database-migration-decision-to-project-item.md`

- [ ] Read all sections:
  - ✅ Story (user story format)
  - ✅ Acceptance Criteria (what "done" means)
  - ✅ Dev Notes (implementation guidance)
  - ✅ Tasks (breakdown of work)
  - ✅ Testing Strategy (how to validate)

- [ ] Understand acceptance criteria
  - There are 8 specific checkboxes that MUST pass
  - These determine if story is complete
  - Document: `docs/stories/5.1-database-migration-decision-to-project-item.md` section "Acceptance Criteria"

- [ ] Know the file checklist
  - File List section shows all files you'll create/modify
  - Update this as you work
  - At end: all files listed, all changes tracked

---

## ✅ FINAL VERIFICATION CHECKLIST

### Backend Dev
- [ ] Python 3.11+ installed and verified
- [ ] Virtual environment created and activated
- [ ] Backend dependencies installed
- [ ] Database connection working
- [ ] `pytest tests/` passing (or shows expected failures)
- [ ] `.env` configured with correct DB credentials
- [ ] On feature branch: `feature/5.1-database-migration-v2` (created locally)

### Frontend Dev
- [ ] Node.js 18+ installed and verified
- [ ] Frontend dependencies installed (`npm install` complete)
- [ ] `npm run test -- --run` passing
- [ ] `npm run typecheck` shows zero TypeScript errors
- [ ] `npm run dev` starts dev server on localhost:5173
- [ ] On feature branch: `feature/5.1-database-migration-v2` (created locally)

### All Developers
- [ ] Read `.claude/CLAUDE.md` completely
- [ ] Read PRD V2 Section 8 (Data Model Evolution)
- [ ] Read Sprint 1 Detailed Breakdown (this document)
- [ ] Understand 5 item types (idea, topic, decision, action_item, information)
- [ ] Understand Discipline enum (15 values, colors defined in PRD)
- [ ] Know your role in Sprint 1 tasks
- [ ] Know git workflow (ask before committing)
- [ ] Know CodeRabbit requirement (pre-commit review)
- [ ] Know delegation: @devops for push, @qa for feedback

---

## 🚀 KICKOFF MEETING AGENDA (1 hour)

**Before meeting, all developers should:**
- ✅ Complete all sections above (Phases 1-5)
- ✅ Run tests successfully
- ✅ Feature branch created locally
- ✅ Have questions ready

**Meeting Topics (1 hour):**
1. **Introduction** (5 min) — Team introductions, roles
2. **Architecture Overview** (10 min) — V2 data model & design
3. **Sprint 1 Goals** (5 min) — What we're delivering
4. **Task Breakdown** (15 min) — Who does what, dependencies
5. **Tools & Workflow** (10 min) — Git, CodeRabbit, testing
6. **Q&A** (10 min) — Questions from team
7. **First Day Plan** (5 min) — Who starts what task

---

## 📞 HELP & BLOCKERS

### If You Get Stuck

**Database issues?**
- Contact: @devops (ask for test DB credentials)
- Verify: `.env` file has correct `DATABASE_URL`
- Test: `pytest tests/test_db_connection.py`

**Python/Node issues?**
- Contact: Team lead (version mismatches)
- Verify: `python3 --version` (3.11+), `node --version` (18+)

**Git/Branch issues?**
- Contact: @devops (for merge conflicts, rebase help)
- Read: `.claude/CLAUDE.md` git section

**CodeRabbit not working?**
- Contact: @devops (installation/auth)
- Verify: `wsl bash -c '~/.local/bin/coderabbit auth status'`

**Story understanding?**
- Refer: `docs/stories/5.1-database-migration-decision-to-project-item.md`
- Ask: @sm (River) for clarification
- Check: Dev Notes section in story file

---

## 🎯 SUCCESS CRITERIA

By end of onboarding (2-3 hours), you should be able to:
- ✅ Run tests locally (backend & frontend)
- ✅ Create local git branches
- ✅ Understand Sprint 1 task breakdown
- ✅ Know your assigned task(s)
- ✅ Know what "done" means (acceptance criteria)
- ✅ Know how to test your work
- ✅ Know how to ask for help

**You're ready for Sprint 1 kickoff!** 🎉

---

## 📋 SIGN-OFF TEMPLATE

After completing onboarding, post in #dev-sprint-1 Slack:

```
✅ ONBOARDING COMPLETE
Name: [Your Name]
Role: [Backend / Frontend / Fullstack]
Assigned Tasks: [e.g., Task 1.2 - Migration Script Development]
Environment Status: ✅ All tests passing
Ready for: Sprint 1 Kickoff (2026-02-20)

Questions or blockers: [None / List here]
```

---

**Onboarding Guide Version:** 1.0
**Created:** 2026-02-20
**For:** Sprint 1 (E5.1 Database Migration)
**Status:** ✅ Ready for Team Kickoff

— River (Scrum Master) 🌊
