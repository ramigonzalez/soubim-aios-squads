# Wave Execution Protocol — DecisionLog V2 Sprint

> **Created by**: @sm (River) | **Date**: 2026-02-27
> **Purpose**: Entry/exit checklists, quality gates, error handling, commit protocol, and parallel agent rules for WAVE execution.

---

## Wave Entry Checklist

Before launching any wave, the Scrum Master (@sm) verifies ALL of the following:

### Pre-Wave Verification

- [ ] **Prior wave complete**: All stories in the previous wave have status `completed` or `failed` (with cascade handled)
- [ ] **Wave logs written**: Every completed story in the prior wave has a wave log in `docs/sprints/wave-logs/wave-{N-1}/`
- [ ] **Quality gate passed**: Prior wave passed all 3 layers of the quality gate
- [ ] **Git state clean**: `main` branch has the latest wave commit, working tree is clean
- [ ] **`make check` passes** (backend) or equivalent quality command
- [ ] **`npm run frontend:test` passes** (frontend)
- [ ] **`npm run frontend:lint` passes** (frontend)
- [ ] **File ownership map reviewed**: Per-wave assignments are clear, conflicts identified and resolved
- [ ] **Agent prompts filled**: One prompt per story, using the agent prompt template
- [ ] **Dependency cascade checked**: If any prior story failed, downstream dependents are marked `blocked-by-failure`

---

## Wave Exit — 3-Layer Quality Gate

Every wave must pass all 3 layers sequentially before proceeding. **Fail at any layer = wave cannot advance.**

### Layer 1: Automated Quality Gates (every wave)

Run after all parallel agents complete their stories:

| Check | Backend Command | Frontend Command | Pass Criteria |
|-------|----------------|------------------|---------------|
| Linting | `ruff check app/ tests/` | `npm run frontend:lint` | Zero errors |
| Formatting | `ruff format --check app/ tests/` | (included in lint) | All files conform |
| Type checking | `pyright app/` | `tsc --noEmit` | No new type errors |
| Tests | `pytest tests/ --cov --cov-fail-under=60` | `npm run frontend:test` | Zero failures, ≥60% coverage |
| Import verification | `python3 -c "import app; ..."` | Dev server starts without errors | Clean startup |

**Composite command (backend):**
```bash
cd decision-log-backend && ruff check app/ tests/ && ruff format --check app/ tests/ && pyright app/ && pytest tests/ --cov --cov-fail-under=60
```

**Composite command (frontend):**
```bash
cd decision-log-frontend && npm run frontend:lint && npm run frontend:test
```

**Layer 1 FAIL = wave cannot proceed. Fix issues and re-run.**

### Layer 2: Per-Story Agent Review (every wave)

For each story in the wave:

1. Activate the quality gate agent specified in the story (e.g., `@architect`, `@qa`, `@ux-design-expert`)
2. Agent reviews the story's output against its acceptance criteria:
   - [ ] All acceptance criteria checkboxes verified (mark each AC)
   - [ ] Wave log complete and accurate
   - [ ] Code follows existing patterns in the codebase
   - [ ] No regressions in shared files
   - [ ] File ownership respected (no unauthorized modifications)
   - [ ] Tests cover the acceptance criteria
3. Agent writes verdict: `PASS` | `FAIL` | `PASS_WITH_NOTES`
4. **Any FAIL blocks wave exit** — fix and re-submit for review

### Layer 3: Human @architect Review (milestone waves only)

| Checkpoint | After Wave | Focus |
|------------|-----------|-------|
| **MVP Gate** | Wave 3 | End-to-end flow verification, architecture consistency, no critical technical debt, all Must Have stories functional |
| **Final Delivery** | Wave 6 | Polish quality, documentation complete, demo-ready state, security review |

**Layer 3 review scope:**
- Architecture consistency across all delivered stories
- Security review (auth, access control, data exposure)
- Performance sanity (load times, rendering, API response)
- Documentation completeness (stories updated, wave logs complete)
- Integration testing (cross-feature interactions)

---

## Error Handling Protocol

### Story Agent Failure

When a @dev agent encounters an unrecoverable error:

1. **Stop the agent** — do not retry automatically
2. **Log the error** in the wave log with:
   - Error message and stack trace
   - What was completed before failure
   - Files created/modified (partial state)
   - Suggested remediation
3. **Continue other parallel agents** — failure in one story does NOT stop siblings
4. **Mark story as `failed`** in the wave log
5. **Cascade check**: Before Wave N+1, check if any dependent story is blocked by the failure

### Dependency Cascade

```
If Story X fails in Wave N:
  → Find all stories in Wave N+1..N+K that depend on X (directly or transitively)
  → Mark those stories as "blocked-by-failure"
  → Log: "Skipped: blocked by failed Story X"
  → Continue with non-dependent stories in each wave
```

### Cascade Map for this Sprint

| If This Fails | These Are Blocked |
|---------------|-------------------|
| 5.2 | 5.3, 5.4, 5.5, 7.3, 8.2 + all downstream |
| 6.1 | 6.2, 6.3, 7.3, 8.1 + all downstream |
| 5.3 | 9.1, 7.3, 8.1, 8.2, 8.3 + all E9 downstream |
| 5.4 | 7.1, 10.1 + all E7/E10 downstream |
| 7.1 | 7.2, 7.4, 10.1, 10.2, 10.3 |
| 9.1 | 9.2, 9.3, 9.4, 9.5 |
| 8.1 | 8.2, 8.3, 8.4, 9.3, 9.5 |
| 9.2 | 9.3, 9.4, 9.5 |

### Recoverable Errors

For transient issues (network timeouts, API rate limits):
- Retry up to 2 times with exponential backoff (1s → 3s → 10s)
- If still failing after retries, treat as unrecoverable

### Wave Gate Failure

If the 3-layer quality gate fails:
1. Identify failing stories/integrations
2. Create targeted fix tasks for specific issues
3. Re-run development cycle for affected stories only
4. Re-submit for gate review
5. **Max 2 retries** before escalating to human @architect for guidance

---

## Commit Protocol

### Branch Strategy

Each story develops on a feature branch following the project's branching strategy:

```
Branch format: feature/{EPIC}.{STORY}-kebab-case
Example:       feature/5.2-backend-api-project-items-crud
```

### During Wave Execution

1. Each @dev agent works on its own feature branch
2. Commits are made locally following conventional commit format
3. **No pushing during wave execution** — only local commits
4. Wave log written before signaling completion

### After Wave Gate Passes

1. All feature branches merged to `main` (or integration branch)
2. Single integration commit message:
   ```
   feat: complete Wave {N} — {wave goal description}

   Stories completed:
   - {X.Y} {story name}
   - {X.Y} {story name}
   ...
   ```
3. @github-devops handles the push and PR creation
4. Tags optional: `wave-{N}-complete`

### Commit Message Format

Individual story commits during development:
```
{type}: {description} [Story {EPIC}.{STORY}]

{optional body with details}
```

Examples:
```
feat: add project items CRUD endpoints [Story 5.2]
feat: create ProjectItem TypeScript types and hooks [Story 5.3]
fix: resolve discipline filter OR logic for arrays [Story 9.3]
test: add milestone toggle optimistic update tests [Story 8.2]
```

---

## Parallel Agent Rules

### Communication

1. **Agents never communicate directly** — all information flows through wave logs
2. If an agent needs information from a parallel sibling, it MUST be available in the file ownership map or prior wave logs
3. Questions about shared interfaces resolved BEFORE wave launch via the agent prompt template

### File Boundaries

1. Each agent ONLY modifies files assigned to it in `file-ownership-map.md`
2. If an agent discovers it needs to modify an unowned file:
   - Document the need in the wave log under "Warnings for Downstream Stories"
   - Continue with available scope
   - Do NOT modify the file
3. Primary owner writes first when shared files exist
4. Secondary owner appends/extends after primary completes
5. **Sequential overrides** within a wave are enforced when specified in the file ownership map

### Quality Standards

1. Read the COMPLETE story spec before writing any code
2. Check file ownership — only modify files you own
3. Run quality checks before signaling completion
4. Write your wave log BEFORE signaling completion
5. If unresolvable error after 3 attempts, STOP and log as `failed`
6. Do NOT skip acceptance criteria
7. Follow existing code patterns (check prior wave outputs via wave logs)
8. Do NOT introduce new dependencies without documenting in the wave log

### Agent Self-Check Before Completion

Each @dev agent must verify before marking a story as complete:

- [ ] All acceptance criteria addressed (checkboxes in story)
- [ ] All files listed in story's "File List" section created/modified
- [ ] Tests written and passing for new functionality
- [ ] No lint errors introduced
- [ ] No type errors introduced
- [ ] Wave log created at `docs/sprints/wave-logs/wave-{N}/{X.Y}-{story-name-slug}.md`
- [ ] No unauthorized file modifications outside ownership map
- [ ] Story file checkboxes updated to `[x]`

---

## Wave Execution Checklist (SM Quick Reference)

### For each wave:

```
□ 1. ENTRY CHECK
  □ Prior wave complete
  □ Wave logs from prior wave reviewed
  □ make check / npm test passes on main
  □ File ownership map reviewed for this wave

□ 2. PREPARE AGENT PROMPTS
  □ Fill template for each story
  □ Include prior wave log outputs as context
  □ Specify file ownership boundaries
  □ Note sequential overrides (if any)

□ 3. LAUNCH PARALLEL AGENTS
  □ One @dev instance per story
  □ All agents receive filled prompt template

□ 4. MONITOR COMPLETION
  □ Track agent completion status
  □ Handle failures (cascade check)

□ 5. QUALITY GATE
  □ Layer 1: make check + npm test (automated)
  □ Layer 2: Per-story agent review
  □ Layer 3: Human review (Waves 3 and 6 only)

□ 6. COMMIT & ADVANCE
  □ Merge feature branches
  □ Create wave completion commit
  □ Push (via @github-devops)
  □ Advance to next wave
```

---

*Wave Execution Protocol v1.0.0 — WAVE Parallel Development Methodology*
*@sm (River)*
