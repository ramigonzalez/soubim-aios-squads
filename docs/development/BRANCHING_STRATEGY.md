# DecisionLog V2: Git Branching Strategy

**Version:** 1.0
**Date:** 2026-02-20
**Status:** Active
**Applies to:** All V2 development (Sprints 1-8)

---

## PURPOSE

This document establishes the authoritative branching model for DecisionLog V2 development. It ensures:
- ✅ Clear naming conventions for features
- ✅ Parallel development without conflicts
- ✅ Controlled merge workflow
- ✅ Traceability to stories
- ✅ Separation of responsibilities (@dev vs @github-devops)

---

## BRANCH MODEL

### Overview

```
main (production branch)
  ↑
  └─ feature/{EPIC}.{STORY}-kebab-case
     ├─ feature/5.1-database-migration-v2
     ├─ feature/5.2-backend-api-project-items-crud
     ├─ feature/6.2-frontend-project-create-edit-form
     └─ [continues for all 24 V2 stories]
```

**Key Principle:** One feature branch per story, short-lived (1-2 weeks max), deleted after merge.

---

## BRANCH NAMING CONVENTION

### Format

```
feature/{EPIC}.{STORY}-kebab-case
```

### Components

| Part | Source | Rules |
|------|--------|-------|
| **Prefix** | Fixed | Always `feature/` (lowercase) |
| **EPIC** | Story ID | Single digit: 5, 6, 7, 8, 9, 10 |
| **STORY** | Story ID | Single digit: 1, 2, 3, 4, 5... |
| **Description** | Filename | Full kebab-case story title (without numbers) |

### Examples

```
✅ CORRECT:
feature/5.1-database-migration-v2
feature/5.2-backend-api-project-items-crud
feature/5.3-frontend-types-hooks-migration
feature/5.4-ai-extraction-prompt-evolution
feature/5.5-seed-data-test-suite-update
feature/6.1-backend-project-crud-stages-participants
feature/6.2-frontend-project-create-edit-form
feature/6.3-frontend-project-list-enhancement
feature/7.1-backend-source-entity-ingestion-queue
feature/7.2-frontend-ingestion-approval-page
feature/7.3-manual-input-create-project-item-form
feature/7.4-backend-gmail-api-poller
feature/8.1-frontend-milestone-timeline-component
feature/8.2-frontend-milestone-flag-toggle
feature/8.3-frontend-milestone-timeline-filters
feature/8.4-milestone-timeline-sharing-export
feature/9.1-component-evolution-item-type-badges-source-icons
feature/9.2-dense-rows-layout-visual-separation
feature/9.3-multi-discipline-circles
feature/9.4-meeting-summary-advanced-filters
feature/9.5-rename-navigation-update
feature/10.1-email-item-extraction-pipeline
feature/10.2-document-ingestion-pdf-docx
feature/10.3-google-drive-folder-monitoring

❌ INCORRECT:
bugfix/5.1-migration           (wrong prefix)
feature/5-migration-v2         (missing story number)
feature/5.1_database_migration (wrong separator, should be hyphen)
feature/5.1                    (missing description)
feature/database-migration     (missing epic and story numbers)
```

---

## WORKFLOW

### Phase 1: Create Feature Branch

**When:** Story status = "Ready for Dev" (by @sm)
**Who:** @dev (developer)
**Commands:**

```bash
# Ensure you're on main and up to date
git checkout main
git pull origin main

# Create feature branch (local only)
git checkout -b feature/5.1-database-migration-v2

# Verify you're on the new branch
git branch
# Output should show: * feature/5.1-database-migration-v2
```

**Important:**
- ✅ Branch created LOCALLY (not pushed yet)
- ✅ Branch created FROM latest main
- ✅ One branch per story
- ✅ Branch name matches story exactly

---

### Phase 2: Development & Local Commits

**When:** Throughout story implementation (1-2 weeks)
**Who:** @dev (developer)
**Process:**

```
1. Write code in feature branch
2. Stage changes:   git add <files>
3. Ask approval:   "Ready to commit. Should I proceed?"
4. Wait for YES
5. Commit:         git commit -m "{message}"
6. Repeat until story complete
```

#### Commit Message Format

```
{type}: {summary} [Story {EPIC}.{STORY}]

{optional body explaining why}

Types: feat, fix, test, refactor, docs, chore
```

#### Examples

```
feat: migrate decisions to project_items table [Story 5.1]

- Rename decisions → project_items
- Add new columns: item_type, affected_disciplines, etc.
- Migrate existing data with defaults

fix: populate affected_disciplines array correctly [Story 5.1]

- Handle null discipline values
- Ensure 100% data coverage post-migration

test: add migration validation test cases [Story 5.1]

refactor: rename useDecisions hook to useProjectItems [Story 5.3]

- Update all component imports
- Update filter store to use new hook
```

#### Commit Control (CRITICAL)

**Never commit without asking the user first.**

Pattern:
```
1. git add <files>
2. "Ready to commit. Should I proceed?"
3. Wait for user: "yes" / "go ahead" / "approved"
4. ONLY THEN: git commit
```

Exception: Only auto-commit if user explicitly activates `*yolo mode`.

**Why:** Maintains user control over what enters the codebase.

---

### Phase 3: Story Completion

**When:** All acceptance criteria met
**Who:** @dev (developer)
**Checklist:**

- [ ] All task checkboxes marked [x]
- [ ] All acceptance criteria verified
- [ ] >80% test coverage
- [ ] `npm run frontend:test` passing
- [ ] `npm run frontend:lint` zero errors (or pre-existing)
- [ ] `npm run typecheck` zero errors
- [ ] CodeRabbit pre-commit review: ZERO critical issues
- [ ] Story file updated: File List, Dev Notes, Status → "Ready for Review"

```bash
# Final verification
npm run frontend:test -- --run
npm run typecheck
npm run lint

# Optionally: verify commits on this branch
git log main..HEAD --oneline
# Should show all commits for this story
```

**Status Update:**
- Update story file: Status section → "Ready for Review"
- Ready for @github-devops to push

---

### Phase 4: Push & Merge (via @github-devops)

**When:** Story status = "Ready for Review"
**Who:** @github-devops (Gage)
**Gage Workflow:**

```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Push feature branch to remote
git push origin feature/5.1-database-migration-v2

# Create pull request
gh pr create \
  --title "feat: Database migration — Decision to Project Item [Story 5.1]" \
  --body "Acceptance criteria: ... (from story file)" \
  --base main

# Optional: Wait for reviews, then merge
gh pr merge --squash
# Branch auto-deletes on GitHub
```

**PR Template (from story):**
- ✅ Title includes story reference
- ✅ Body includes acceptance criteria
- ✅ Linked to story file
- ✅ References epic/phase

---

### Phase 5: Cleanup

**When:** PR merged to main
**Who:** @dev (developer)
**Commands:**

```bash
# Switch back to main
git checkout main

# Fetch latest (includes merged commit)
git pull origin main

# Delete local feature branch
git branch -d feature/5.1-database-migration-v2

# Verify deletion
git branch
# feature/5.1-... should no longer appear
```

**Note:** Remote branch deleted automatically by GitHub after merge.

---

## RESPONSIBILITIES

### @dev (Developer)

✅ **Can do:**
- Create local feature branches
- Switch branches locally
- Commit code locally (after asking user)
- View commit history
- Merge branches locally (if resolving conflicts)
- Delete local branches
- Stage files for commit

❌ **Cannot do:**
- Push to remote (use @github-devops)
- Create pull requests
- Merge to main
- Force push
- Delete remote branches

### @github-devops (Gage)

✅ **Handles:**
- Push feature branches to remote
- Create pull requests on GitHub
- Code review (if required)
- Merge PRs to main
- Delete remote branches
- Handle merge conflicts
- Rebase feature branches on main

**Activation:** "Ready to push. Activate @github-devops to push changes."

---

## CONCURRENT DEVELOPMENT

### Multiple Features in Parallel

Each story gets its own branch. No conflicts if following naming convention:

```
Sprint 4 Example (4 developers, 4 stories):

Developer 1: feature/7.2-frontend-ingestion-approval-page
  └─ Commits: frontend UI components

Developer 2: feature/7.3-manual-input-create-project-item-form
  └─ Commits: form logic and validation

Developer 3: feature/8.1-frontend-milestone-timeline-component
  └─ Commits: timeline component (NEW)

Developer 4: feature/8.2-frontend-milestone-flag-toggle
  └─ Commits: toggle button (depends on 8.1)
```

**Independence:** Each branch is independent until merge.
**Merge Order:** Pushed/merged in sequence to main.
**Rebase:** If branch falls behind main, @github-devops rebases before merge.

---

## HANDLING CONFLICTS

### Conflict Scenario

```
Developer A: feature/6.2-frontend-project-create-edit-form
  └─ Modifies: src/components/molecules/FilterBar.tsx

Developer B: feature/6.3-frontend-project-list-enhancement
  └─ Also modifies: src/components/molecules/FilterBar.tsx

Merge Sequence:
1. A's PR merged first → main updated
2. B's branch is behind → needs rebase
3. B has conflict in FilterBar.tsx
```

### Resolution (by @github-devops)

```bash
# @github-devops:
git checkout feature/6.3-frontend-project-list-enhancement
git rebase main
# Resolve conflicts in FilterBar.tsx
git add src/components/molecules/FilterBar.tsx
git rebase --continue
git push origin feature/6.3-frontend-project-list-enhancement --force-with-lease
```

**For @dev:**
- If rebasing causes issues, ask @github-devops to handle it
- Do NOT attempt force push yourself

---

## BRANCH PROTECTION RULES (on `main`)

These rules are enforced by GitHub:

- ✅ **Require pull request:** No direct commits to main
- ✅ **Require review:** Code review before merge (configurable)
- ✅ **Require status checks:** Tests, lint, typecheck must pass
- ✅ **Dismiss stale reviews:** Old approvals invalidated if commits added
- ✅ **Require branches up to date:** Must rebase on latest main
- ✅ **Squash on merge:** Keeps history clean (1 commit per story)

---

## SPRINT-SPECIFIC BRANCHING

### Sprint 1 (Single Story)

```
One story, one branch, all team members commit to same branch:

main
  ↑
  └─ feature/5.1-database-migration-v2
     ├─ Task 1.1: Commits from Backend Dev
     ├─ Task 1.2: Commits from DB Specialist
     ├─ Task 1.3: Commits from QA Dev
     ├─ Task 2.1: Commits from API Dev
     ├─ Task 2.2: Commits from Frontend Dev
     └─ Task 2.3: Commits from Fullstack Dev

Merge: After all tasks complete + gate criteria met
```

### Sprint 3 (Three Stories)

```
Three independent features, three branches:

main
  ├─ feature/6.2-frontend-project-create-edit-form
  ├─ feature/6.3-frontend-project-list-enhancement
  └─ feature/7.1-backend-source-entity-ingestion-queue

Each branch: independent commits, merged in sequence
```

### Sprint 4 (Four Stories)

```
Four independent features, four branches (two frontend, one backend, one frontend):

main
  ├─ feature/7.2-frontend-ingestion-approval-page
  ├─ feature/7.3-manual-input-create-project-item-form
  ├─ feature/8.1-frontend-milestone-timeline-component
  └─ feature/8.2-frontend-milestone-flag-toggle

Parallel development, sequential merges
```

---

## COMMON SCENARIOS & SOLUTIONS

### Scenario 1: Forgot to Create Feature Branch, Committed to Main

**Problem:** Accidentally committed to main before branching.

**Solution:**
```bash
# Don't panic. You can recover:
git log main -5              # Find your commit hash
git branch feature/5.1-database-migration-v2 {commit-hash}
git reset --hard origin/main # Revert main to origin
# Your commits are now on feature/5.1-... branch
```

**Prevention:** Always verify `git branch` shows feature branch before committing.

---

### Scenario 2: Feature Branch Falls Behind Main

**Problem:** Main has new commits, your branch is behind.

**Solution (for @github-devops):**
```bash
git checkout feature/5.1-database-migration-v2
git rebase main
# Resolve any conflicts
git push origin feature/5.1-database-migration-v2 --force-with-lease
```

**For @dev:** Ask @github-devops to rebase your branch on main.

---

### Scenario 3: Need to Switch Between Stories Mid-Sprint

**Problem:** Need to work on a different story while first story is in progress.

**Solution:**
```bash
# Currently on feature/5.1-...
git stash          # Save uncommitted changes temporarily
git checkout main
git pull origin main

# Switch to new story branch
git checkout -b feature/5.2-backend-api-project-items-crud
# Work on 5.2...
git add files
git commit

# Later, switch back to 5.1:
git checkout feature/5.1-database-migration-v2
git stash pop      # Restore changes from 5.1
```

**Better:** Commit often. Avoid stashing if possible.

---

### Scenario 4: Multiple People on Same Feature Branch (Sprint 1)

**Problem:** 4 developers working on same story (5.1), same branch.

**Solution:**
```bash
# Developer A completes Task 1.1
git commit -m "feat: pre-migration validation [Story 5.1]"
git push origin feature/5.1-database-migration-v2

# Developer B pulls latest
git pull origin feature/5.1-database-migration-v2
# Now has A's commits
# Develops Task 1.2
git commit -m "feat: migration script development [Story 5.1]"
git push origin feature/5.1-database-migration-v2

# Developer C pulls latest
git pull origin feature/5.1-database-migration-v2
# Has A and B's commits
# Continues with their task...
```

**Coordination:** Use Slack #dev-sprint-1 to announce pushes.

---

## SPECIAL CASES

### Hotfix to Main (Emergency)

If a critical bug is found in production (after V1):

```bash
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug-fix
# Fix the bug
git commit -m "fix: critical production bug"
# Ask @github-devops to review and merge
```

**Note:** Hotfixes are rare. V2 in development doesn't need this yet.

---

### Release Branch (After Phase 4)

After V2 complete (end of Sprint 8):

```bash
git checkout main
git pull origin main
git checkout -b release/v2-dec-2026
# Version bump, release notes
git commit -m "release: DecisionLog V2 [Story 9.5]"
git tag v2.0.0
# @github-devops merges and tags
```

---

## VERIFICATION COMMANDS

### Check Current Branch

```bash
git branch
# Output: * feature/5.1-database-migration-v2
```

### View Commits on This Branch

```bash
git log main..HEAD --oneline
# Shows commits unique to this branch (not on main)
```

### View All Local Branches

```bash
git branch
# Lists all local branches
```

### View Remote Branches

```bash
git branch -r
# Shows remote branches (origin/main, origin/feature/...)
```

### Verify Branch is Ahead of Main

```bash
git log --oneline main..HEAD | wc -l
# Shows number of commits ahead of main
```

### Compare Branch to Main

```bash
git diff main...HEAD
# Shows all changes on this branch vs main
```

---

## GIT CONFIG FOR THIS PROJECT

Recommended local git config:

```bash
# Set commit template (optional)
git config core.editor "vim"  # or your editor

# Avoid accidental force pushes
git config push.default simple

# Auto-rebase when pulling (keeps history clean)
git config pull.rebase true
```

---

## TROUBLESHOOTING

| Issue | Cause | Solution |
|-------|-------|----------|
| "fatal: branch already exists" | Branch name taken | Use unique name or check if branch exists: `git branch -a` |
| "Detached HEAD" | Checked out a commit instead of branch | `git checkout feature/5.1-...` |
| "Changes not staged for commit" | Modified files not staged | `git add <files>` then `git commit` |
| "Your branch is ahead of origin" | Local commits not pushed | Ask @github-devops: "Ready to push" |
| "Merge conflict in FilterBar.tsx" | Multiple edits same file | Ask @github-devops for rebase |
| "Cannot delete branch (not merged)" | Trying to delete unmerged branch | Use `-D` to force: `git branch -D branch-name` |

---

## REFERENCES

- **CLAUDE.md** — Project development rules (see "Git & GitHub Integration" section)
- **V2_SPRINT_PLAN.md** — Sprint structure and story breakdown
- **Story Files** — `docs/stories/{epic}.{story}-kebab-case.md`

---

## VERSION HISTORY

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-20 | Initial formal strategy document |

---

## SIGN-OFF

**Approved by:**
- 🌊 River (Scrum Master) @sm
- 📋 Morgan (Product Manager) @pm
- 💻 Dex (Lead Developer) @dev

**Effective:** Sprint 1 Kickoff (2026-02-24)
**Status:** Active

---

**Last Updated:** 2026-02-20
**Maintained by:** @sm (River)

— Removendo obstáculos 🌊
