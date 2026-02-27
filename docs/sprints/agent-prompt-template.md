# Agent Prompt Template — DecisionLog V2 Sprint

> **Created by**: @sm (River) | **Date**: 2026-02-27
> **Purpose**: Standard prompt structure for each @dev agent executing a story within a WAVE.

---

## Template

Copy and fill this template for each @dev agent instance in a wave.

---

```markdown
# Story Agent: {story_id} — {story_name}

## Wave Context
- **Wave**: {wave_number}
- **Parallel siblings**: {list of other stories running in this wave}
- **Sequential dependency**: {if this story must wait for another in-wave story, specify here. Otherwise: "None — fully parallel"}
- **File ownership**: See "File Ownership" section below

## Pre-Work Requirements
Before writing any code, read these documents in order:
1. `.claude/CLAUDE.md` — Project rules & standards
2. `docs/development/BRANCHING_STRATEGY.md` — Git branching workflow
3. This prompt (complete)
4. The story file: `docs/stories/{story_id}-{story-slug}.md`

## Story Specification
{paste full story content from docs/stories/{X.Y}-{story-name}.md}

## Dependency Outputs
The following stories have already been completed in prior waves:

### Story {dep_id} — {dep_name} (Wave {dep_wave})
- **Files created**: {list from wave log}
- **Key decisions**: {from wave log}
- **Deviations from spec**: {from wave log, if any}
- **Warnings for downstream**: {from wave log, if any}

{repeat for each dependency}

## File Ownership

### Files YOU own (create/modify freely):
{list from file-ownership-map.md for this story}

### Files you must NOT modify (owned by parallel agents):
{files owned by sibling stories in this wave — list explicitly}

### Files you may READ but not WRITE:
{files from prior waves that you depend on but do not own}

## Decision Log Requirement
**MANDATORY**: Before completing, create a wave log at:
`docs/sprints/wave-logs/wave-{N}/{X.Y}-{story-name-slug}.md`

Use the Wave Log Template (see below).

## Execution Rules
1. Read the COMPLETE story spec before writing any code
2. Create your feature branch: `git checkout -b feature/{X.Y}-{story-slug}`
3. Check file ownership — only modify files you own
4. Follow existing code patterns in the codebase
5. Write tests for all new functionality
6. Run quality checks:
   - Backend: `cd decision-log-backend && ruff check app/ tests/ && pytest tests/ -v`
   - Frontend: `cd decision-log-frontend && npm run frontend:lint && npm run frontend:test`
7. Update story checkboxes `[x]` as you complete each AC
8. Write your wave log BEFORE signaling completion
9. If unresolvable error after 3 attempts, STOP and log as `failed`
10. Do NOT modify files outside your ownership list
11. Do NOT skip acceptance criteria
12. Do NOT push to remote — only local commits (ask user before committing)

## Git Commit Convention
```
{type}: {description} [Story {X.Y}]
```
Types: feat, fix, test, docs, chore, refactor

## Completion Signal
When done, confirm:
- [ ] All acceptance criteria met
- [ ] All files from File List created/modified
- [ ] Tests passing
- [ ] Lint passing
- [ ] Wave log written
- [ ] Story checkboxes updated
```

---

## Wave Log Template

Every story agent **MUST** create a log at `docs/sprints/wave-logs/wave-{N}/{X.Y}-{story-name-slug}.md`:

```markdown
# Wave Log: Story {X.Y} — {Story Name}

## Wave: {N}
## Status: {completed | failed | partial}
## Agent: @dev

## Files Created
| File | Lines | Description |
|------|-------|-------------|
| path/to/file.py | ~N | Brief description |

## Files Modified
| File | Changes | Description |
|------|---------|-------------|
| path/to/file.py | Added function X | Brief description |

## Key Decisions
| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Used X pattern | Because Y | Could have done Z |

## Deviations from Story Spec
{List deviations with justification, or "None"}

## Test Results
```
{paste test output summary — number of tests, pass/fail, coverage %}
```

## Quality Check Results
```
{paste lint/format/typecheck output summary}
```

## Warnings for Downstream Stories
{List anything downstream agents should know, or "None"}

## Blockers Encountered
{List blockers and resolutions, or "None"}

## Quality Gate Review
- **Reviewer**: {agent — filled after review}
- **Date**: {date}
- **Verdict**: {PASS | FAIL | PASS_WITH_NOTES}

### AC Verification
| AC# | Description | Result |
|-----|-------------|--------|
| 1 | ... | PASS/FAIL |
| 2 | ... | PASS/FAIL |
```

---

## Example: Filled Prompt for Story 5.2 (Wave 0)

```markdown
# Story Agent: 5.2 — Backend API — Project Items CRUD

## Wave Context
- **Wave**: 0
- **Parallel siblings**: 6.1 (Backend — Project CRUD, Stages, Participants)
- **Sequential dependency**: None — fully parallel
- **File ownership**: See below

## Pre-Work Requirements
1. `.claude/CLAUDE.md`
2. `docs/development/BRANCHING_STRATEGY.md`
3. This prompt
4. `docs/stories/5.2-backend-api-project-items-crud.md`

## Story Specification
{full content of docs/stories/5.2-backend-api-project-items-crud.md}

## Dependency Outputs
### Story 5.1 — Database Migration (Completed, merged to main)
- **Files created**: Migration 002 (project_items, sources, project_participants tables)
- **Key decisions**: Used JSONB for affected_disciplines, consensus, impacts
- **Deviations**: None
- **Warnings**: ProjectItem model uses UUID primary keys; Source has ingestion_status enum

## File Ownership

### Files YOU own (create/modify freely):
- `decision-log-backend/app/api/models/project_item.py` (NEW)
- `decision-log-backend/app/api/routes/project_items.py` (NEW)
- `decision-log-backend/tests/unit/test_project_items_api.py` (NEW)
- `decision-log-backend/app/api/routes/decisions.py` (MODIFY — backward compat)
- `decision-log-backend/app/main.py` (MODIFY — register items router only)

### Files you must NOT modify (owned by 6.1):
- `decision-log-backend/app/database/models.py` (6.1 adds ProjectStage, StageTemplate)
- `decision-log-backend/app/api/routes/stages.py` (6.1 creates this)
- `decision-log-backend/app/api/routes/participants.py` (6.1 creates this)
- `decision-log-backend/app/api/models/project.py` (6.1 creates extended models)

### Files you may READ but not WRITE:
- `decision-log-backend/app/database/models.py` (read ProjectItem model definition from 5.1)
- `decision-log-backend/app/api/routes/projects.py` (read existing patterns)

## Decision Log Requirement
Create: `docs/sprints/wave-logs/wave-0/5.2-backend-api-project-items-crud.md`

## Execution Rules
{standard rules as above}
```

---

## Per-Wave Prompt Preparation Checklist

For each wave, @sm must:

- [ ] Read all wave logs from the previous wave
- [ ] Extract key decisions, deviations, and warnings
- [ ] Fill one prompt template per story in the current wave
- [ ] Include relevant dependency outputs from wave logs
- [ ] Specify exact file ownership boundaries from `file-ownership-map.md`
- [ ] Note any sequential overrides for stories with shared files
- [ ] Review with @pm before launching agents

---

*Agent Prompt Template v1.0.0 — WAVE Parallel Development Methodology*
*@sm (River)*
