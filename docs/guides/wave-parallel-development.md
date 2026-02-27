# WAVE Parallel Development Methodology

> **Version**: 1.0.0 | **Authors**: @pm (Bob) + @sm (River)
> **Purpose**: Comprehensive guide to the WAVE methodology for accelerating development cycles through parallelized, non-blocking, non-conflictive units of work executed by multiple @dev agent instances.

---

## Table of Contents

1. [Overview](#overview)
2. [Core Concepts](#core-concepts)
3. [Wave Planning](#wave-planning)
4. [Execution Infrastructure](#execution-infrastructure)
5. [Agent Coordination](#agent-coordination)
6. [Quality Gates](#quality-gates)
7. [Wave Logs (Decision Persistence)](#wave-logs-decision-persistence)
8. [Conflict Prevention](#conflict-prevention)
9. [Error Handling](#error-handling)
10. [AIOS Framework Integration](#aios-framework-integration)
11. [Step-by-Step: Applying WAVEs to a New Epic](#step-by-step-applying-waves-to-a-new-epic)
12. [Case Study: Vendor Research Tool](#case-study-vendor-research-tool)
13. [CLAUDE.md Integration](#claudemd-integration)
14. [Reference: Document Templates](#reference-document-templates)

---

## Overview

### What Are WAVEs?

WAVEs are a **dependency-based parallel execution pattern** that organizes development stories into sequential layers (waves). Within each wave, stories execute **in parallel** via multiple @dev agent instances. Between waves, **quality gates** enforce integration before the next wave begins.

### Why WAVEs?

Traditional sequential development processes a backlog one story at a time. WAVEs exploit the fact that in any dependency graph, **many stories have no dependency on each other** and can be executed simultaneously.

```
Sequential:  [A] → [B] → [C] → [D] → [E] → [F]     = 6 units of time

WAVEs:       Wave 0: [A] ∥ [B]                        = 1 unit
             Wave 1: [C] ∥ [D]  (depend on A or B)    = 1 unit
             Wave 2: [E] ∥ [F]  (depend on C or D)    = 1 unit
                                                       = 3 units of time (50% faster)
```

### Core Principle

> **Maximize parallelism. Minimize conflict. Ensure quality at every gate.**

The development cycle is accelerated by:
1. **Identifying independent work units** (stories with no mutual dependencies)
2. **Running them in parallel** via multiple @dev agent instances
3. **Preventing file conflicts** through pre-planned ownership maps
4. **Propagating context** through mandatory wave logs (decision persistence)
5. **Enforcing quality** with automated + agent + human review gates

---

## Core Concepts

### Terminology

| Term | Definition |
|------|-----------|
| **Wave** | A group of stories that can execute in parallel (no inter-dependencies within the group) |
| **Wave Gate** | Quality checkpoint between waves — all 3 layers must pass before advancing |
| **Wave Log** | Mandatory decision log written by each @dev agent after completing a story |
| **File Ownership Map** | Pre-planned assignment of which story "owns" which files per wave |
| **Primary Owner** | When 2 stories in the same wave touch the same file, the primary writes first |
| **Dependency Graph** | DAG (Directed Acyclic Graph) of story dependencies that determines wave grouping |
| **Critical Path** | The longest dependency chain through the waves — determines minimum total time |
| **MVP Cut Line** | The wave after which all Must Have stories are complete |

### Wave Lifecycle

```
Wave N Entry Check → Launch Parallel @dev Agents → Agent Completion → 3-Layer Exit Gate → Git Commit → Wave N+1
```

### Key Rules

1. **Within a wave**: Stories run in parallel (no inter-dependencies)
2. **Between waves**: Sequential execution (Wave N must complete before Wave N+1 starts)
3. **Agents don't talk to each other**: All communication flows through wave logs
4. **One failure doesn't stop siblings**: Failed story blocks downstream dependents, not parallel siblings
5. **No mid-wave commits**: Only commit after the full wave passes quality gates

---

## Wave Planning

### Step 1: Map Dependencies

Start with your story backlog and identify what each story depends on:

```
Story 1.1: depends on nothing
Story 1.2: depends on 1.1
Story 2.1: depends on nothing
Story 2.2: depends on 2.1
Story 2.3: depends on 2.2 and 1.2
```

### Step 2: Build the Dependency Graph

```
[1.1] ──→ [1.2] ──┐
                    ├──→ [2.3]
[2.1] ──→ [2.2] ──┘
```

### Step 3: Group into Waves (Topological Sort)

Use **Kahn's algorithm** (built into the AIOS Wave Analyzer) to group stories by dependency depth:

```
Wave 0: [1.1] ∥ [2.1]    (no dependencies)
Wave 1: [1.2] ∥ [2.2]    (depend on Wave 0)
Wave 2: [2.3]             (depends on both Wave 1 stories)
```

### Step 4: Identify Parallelism and Conflicts

For each wave, check:
- **Max parallel agents**: How many stories can run simultaneously?
- **File conflicts**: Do any parallel stories touch the same file?
- **Sequential overrides**: Should any stories within a wave run in order?

### Step 5: Set MVP Cut Line

Determine which wave completes all Must Have stories. Everything after is enhancement.

### Sprint Plan Format

Create `docs/sprints/sprint-plan.md` with this structure per wave:

```markdown
## Wave N — [Goal Description] (X stories, Y pts)

> **Goal**: [One-line description of what this wave achieves]

| Story | Name | Pts | MoSCoW | Depends On |
|-------|------|-----|--------|------------|
| X.Y | Story Name | N | Must/Should/Could | dependency list |

**Parallelism**: `A ∥ B ∥ C` — [explanation of why they're parallel]

**Exit criteria**: [specific testable criteria for this wave]
```

---

## Execution Infrastructure

### Required Documents

Every wave-based sprint requires 4 documents in `docs/sprints/`:

| Document | Created By | Purpose |
|----------|-----------|---------|
| `sprint-plan.md` | @pm | Wave structure, dependency graph, parallelism per wave, MoSCoW |
| `wave-execution-protocol.md` | @sm | Entry/exit checklists, quality gates, error handling, commit protocol |
| `agent-prompt-template.md` | @sm | Standard prompt for each @dev agent with wave context |
| `file-ownership-map.md` | @sm + @architect | Per-wave file ownership, conflict analysis, resolution strategies |

### Wave Log Directory

```
docs/sprints/wave-logs/
├── wave-0/
│   ├── X.Y-story-name.md
│   └── X.Y-story-name.md
├── wave-1/
│   └── ...
└── wave-N/
    └── ...
```

---

## Agent Coordination

### How Parallel @dev Agents Work

Each @dev agent instance receives a **filled agent prompt template** containing:

1. **Wave Context** — which wave, parallel siblings, sequential dependencies
2. **Story Specification** — full story content from `docs/stories/`
3. **Dependency Outputs** — from prior wave logs (files created, decisions, deviations, warnings)
4. **File Ownership** — what this agent CAN modify, CANNOT modify, and CAN read
5. **Decision Log Requirement** — mandatory wave log before completion

### Agent Prompt Template

```markdown
# Story Agent: {story_id} — {story_name}

## Wave Context
- **Wave**: {wave_number}
- **Parallel siblings**: {list of other stories running in this wave}
- **Sequential dependency**: {if this story must wait for another in-wave story}

## Story Specification
{full story content from docs/stories/X.Y.story-name.md}

## Dependency Outputs
The following stories have already been completed:

### Story {dep_id} — {dep_name} (Wave {dep_wave})
- **Files created**: {list from wave log}
- **Key decisions**: {from wave log}
- **Deviations**: {from wave log, if any}
- **Warnings for downstream**: {from wave log, if any}

## File Ownership

### Files YOU own (create/modify freely):
{list from file-ownership-map.md}

### Files you must NOT modify (owned by parallel agents):
{files owned by sibling stories in this wave}

### Files you may READ but not WRITE:
{files from prior waves that you depend on}

## Decision Log Requirement
**MANDATORY**: Before completing, create a wave log at:
`docs/sprints/wave-logs/wave-{N}/{X.Y}-{story-name-slug}.md`

## Execution Rules
1. Read the COMPLETE story spec before writing any code
2. Check file ownership — only modify files you own
3. Run quality checks: `make check`
4. Write your wave log BEFORE signaling completion
5. If unresolvable error after 3 attempts, STOP and log as `failed`
6. Do NOT modify files outside your ownership list
7. Do NOT skip acceptance criteria
8. Follow existing code patterns (check prior wave outputs)
```

### Communication Pattern

```
Wave N-1 Agents → Write Wave Logs → Wave N Agents Read Logs → Execute → Write Logs → ...
```

Agents **never communicate directly**. All inter-agent information flows through wave log files. This is what makes the pattern scalable — agents are fully independent within their wave.

---

## Quality Gates

### 3-Layer Quality Gate (Fail-Fast)

Every wave must pass all 3 layers sequentially before proceeding:

```
Layer 1 (Automated) → Layer 2 (Agent Review) → Layer 3 (Human Review, milestone only)
```

### Layer 1: Automated Quality Gates (every wave)

Single command: `make check` — runs lint, format, typecheck, tests sequentially with fail-fast.

| Check | Command | Pass Criteria |
|-------|---------|---------------|
| Linting | `ruff check app/ tests/` | Zero errors |
| Formatting | `ruff format --check app/ tests/` | All files conform |
| Type checking | `pyright app/` | No new type errors |
| Tests + coverage | `pytest tests/ --cov --cov-fail-under=60` | Zero failures, >= 60% coverage |
| Import verification | `python -c "import app; ..."` | Clean startup |

**Layer 1 FAIL = wave cannot proceed. Fix and re-run.**

### Layer 2: Per-Story Agent Review (every wave)

For each story in the wave:

1. Read the story's `quality_gate` field (e.g., `@architect`, `@qa`)
2. Activate the quality gate agent to review the story's output
3. Agent verifies:
   - All acceptance criteria met (checkbox each AC)
   - Wave log complete and accurate
   - Code follows existing patterns
   - No regressions in shared files
4. Agent writes verdict: `PASS` | `FAIL` | `PASS_WITH_NOTES`
5. **FAIL blocks wave exit**

### Layer 3: Human @architect Review (milestone waves only)

Triggers only at key milestones to keep velocity high:

| Checkpoint | After Wave | Focus |
|------------|-----------|-------|
| MVP Gate | Wave with last Must Have story | End-to-end flow, architecture, no critical debt |
| Final Delivery | Last wave | Polish quality, docs complete, demo-ready |

**Layer 3 review includes**: architecture consistency, security review, performance sanity, documentation completeness.

---

## Wave Logs (Decision Persistence)

### Why Wave Logs Matter

Wave logs are the **communication backbone** of the WAVE methodology. Since parallel agents cannot talk to each other, and downstream agents need to know what happened in prior waves, wave logs serve as the persistent record of:
- What was built and why
- What decisions were made and what alternatives were considered
- What deviations occurred from the spec
- What downstream agents should watch out for

### Wave Log Template

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
{paste pytest output summary}
```

## Quality Check Results
```
{paste make check output}
```

## Warnings for Downstream Stories
{List anything downstream agents should know, or "None"}

## Blockers Encountered
{List blockers and resolutions, or "None"}

## Quality Gate Review
- **Reviewer**: {agent}
- **Date**: {date}
- **Verdict**: {PASS | FAIL | PASS_WITH_NOTES}

### AC Verification
| AC# | Description | Result |
|-----|-------------|--------|
| 1 | ... | PASS/FAIL |
```

---

## Conflict Prevention

### File Ownership Map

The file ownership map (`docs/sprints/file-ownership-map.md`) pre-analyzes every wave to identify file conflicts:

```markdown
## Wave N — [Wave Name]

| Story | Files Created | Files Modified |
|-------|--------------|----------------|
| X.Y | file1.py, file2.py | file3.py (added function X) |
| X.Z | file4.py | file3.py (added function Y) |

**Conflicts**: X.Y and X.Z both modify file3.py
**Resolution**: X.Y is primary owner. Run X.Y first, then X.Z appends.
```

### Conflict Resolution Strategies

| Strategy | When to Use |
|----------|-------------|
| **Independent sections** | Both agents add distinct, non-overlapping content to the same file |
| **Primary/secondary owner** | One agent creates the file, the other appends to it |
| **Sequential override** | Run specific stories in order within the wave (reduces parallelism but prevents conflict) |
| **Reconciliation** | A later story in the wave or next wave resolves merge issues |

### Rules for Parallel Agents

1. Each agent ONLY modifies files assigned to it in the ownership map
2. If an agent needs to modify a file it doesn't own, document it in the wave log and defer
3. Primary owner writes first when shared files exist
4. Secondary owner appends/extends after primary completes
5. When in doubt, run stories sequentially within the wave

---

## Error Handling

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
  → Continue with non-dependent stories
```

### Recoverable Errors

For transient issues (network timeouts, API rate limits):
- Retry up to 2 times with exponential backoff
- If still failing after retries, treat as unrecoverable

### Wave Gate Failure

If the 3-layer quality gate fails:
1. Identify failing stories/integrations
2. Create fix tasks for specific issues
3. Re-run development-cycle for affected stories
4. Re-submit for gate review
5. Max 2 retries before escalating to human

---

## AIOS Framework Integration

### Built-in Tooling

The WAVE methodology is integrated into the Synkra AIOS framework:

| Component | Location | Purpose |
|-----------|----------|---------|
| Epic Orchestration Workflow | `.aios-core/development/workflows/epic-orchestration.yaml` | Reusable wave orchestration template |
| Wave Analyzer Engine | `.aios-core/workflow-intelligence/engine/wave-analyzer.js` | Kahn's algorithm, critical path, optimization metrics |
| Wave Executor | `.aios-core/core/execution/wave-executor.js` | Runtime executor for parallel agents |
| `*waves` Task | `.aios-core/development/tasks/waves.md` | CLI command for wave analysis |

### `*waves` Command

```bash
# Analyze current workflow
*waves

# Analyze specific workflow with visual output
*waves story_development --visual

# JSON output for programmatic use
*waves story_development --json
```

Output includes:
- Wave structure with task groupings
- Sequential vs parallel time comparison
- Optimization gain percentage
- Critical path analysis

### Epic Orchestration Workflow

The `epic-orchestration.yaml` workflow provides:

**3 Execution Modes:**
| Mode | Description | Human Interaction |
|------|-------------|------------------|
| `yolo` | Autonomous — checkpoints auto-GO | 0-2 prompts |
| `interactive` | Human checkpoints between waves (default) | 5-10 prompts |
| `preflight` | Full dependency analysis before execution | 10-15 prompts |

**Wave Pattern:**
```
For each WAVE:
  ┌──────────────────────────────────────────────┐
  │  Story A → development-cycle → branch pushed  │
  │  Story B → development-cycle → branch pushed  │  PARALLEL
  │  Story C → development-cycle → branch pushed  │
  └──────────────────┬───────────────────────────┘
                     │
  ┌──────────────────▼───────────────────────────┐
  │  WAVE GATE (integration review)               │
  │  @devops: merge branches → main               │
  └──────────────────┬───────────────────────────┘
                     │
  ┌──────────────────▼───────────────────────────┐
  │  CHECKPOINT: [ GO ] [ PAUSE ] [ REVIEW ] [ ABORT ] │
  └──────────────────┬───────────────────────────┘
                     │
               Next Wave...
```

**Inner Workflow per Story:**
```
Phase 1: @po validates story (validate-story-draft)
Phase 2: @dev develops (dynamic executor)
Phase 3: @dev self-healing (conditional fix loop)
Phase 4: Quality gate agent reviews (agent != executor)
Phase 5: @devops push & PR
Phase 6: @po checkpoint
```

### State Persistence

Workflow state is saved to `.aios/workflow-state/{epicId}-pipeline.json`:
- Current wave number
- Per-wave status
- Per-story status
- Gate verdicts
- Timestamps

This enables **recovery from interruptions** — the orchestrator can resume from the last completed wave.

---

## Step-by-Step: Applying WAVEs to a New Epic

### Phase 1: Planning (@pm + @architect)

1. **Write the PRD** in `docs/prd/`
2. **Break into epics** with story decomposition
3. **Write stories** in `docs/stories/` with acceptance criteria
4. **Map dependencies** between stories
5. **Run `*waves`** to auto-analyze the dependency graph
6. **Create `docs/sprints/sprint-plan.md`** with wave structure

### Phase 2: Execution Infrastructure (@sm)

7. **Create `docs/sprints/wave-execution-protocol.md`**
   - Entry/exit checklists per wave
   - Quality gate configuration
   - Commit protocol
8. **Create `docs/sprints/file-ownership-map.md`**
   - Per-wave file assignments
   - Conflict analysis and resolution
9. **Create `docs/sprints/agent-prompt-template.md`**
   - Standard prompt structure
   - Wave context injection
   - Decision log requirement
10. **Create `docs/sprints/wave-logs/`** directory structure

### Phase 3: Execution (Wave by Wave)

For each wave:

11. **Entry Check** — verify prior wave complete, files exist, `make check` passes
12. **Fill Agent Prompts** — one per story, using the template + prior wave logs
13. **Launch Parallel @dev Agents** — one instance per story in the wave
14. **Wait for Completion** — all agents finish their stories
15. **Layer 1 Gate** — run `make check` (automated)
16. **Layer 2 Gate** — quality gate agent reviews each story
17. **Layer 3 Gate** — human review (milestone waves only)
18. **Git Commit** — `feat: complete Wave N — [description]`
19. **Advance to Next Wave**

### Phase 4: Delivery

20. **Final review** after last wave
21. **Update README** and documentation
22. **Create session handoff** in `docs/sessions/`

---

## Case Study: Vendor Research Tool

### Project Metrics

| Metric | Value |
|--------|-------|
| Total stories | 25 |
| Total points | 61 |
| Total waves | 9 (Wave 0–8) |
| Max parallelism | 4 agents (Waves 1 and 4) |
| Wave logs produced | 26 |
| Same-wave file conflicts | 5 (all pre-resolved) |
| MVP cut line | After Wave 6 |
| Time constraint | 2–3 hour prototype |

### Wave Structure

```
Wave 0:  [5.1] ∥ [2.1]                     → 2 parallel  (Foundation)
Wave 1:  [3.1] ∥ [1.1] ∥ [1.5] ∥ [2.4]    → 4 parallel  (Persistence + Pipeline Entry)
Wave 2:  [3.2] ∥ [1.2] → then [1.3]        → 2→1 serial  (Repository + Search + Evidence)
Wave 3:  [1.4] ∥ [2.2] → then [2.3]        → 2→1 serial  (Gap Analysis + Scoring Core)
Wave 4:  [2.5] ∥ [3.4] ∥ [3.6] ∥ [3.5]    → 4 parallel  (Rankings + API Endpoints)
Wave 5:  [3.3] ∥ [4.4-backend]             → 2 parallel  (SSE + Pipeline Assembly)
Wave 6:  [4.1] ∥ [4.5]                     → 2 parallel  (Frontend Core) ← MVP
Wave 7:  [4.2] ∥ [4.3] ∥ [4.4-frontend]   → 3 parallel  (Frontend Enhancements)
Wave 8:  [5.2] ∥ [5.3] ∥ [5.4]            → 3 parallel  (Polish & Delivery)
```

### Dependency Graph

```
Wave 0:  [5.1] ─────────────────────────────────────────────────────────┐
         [2.1] ──┬──────────────┬──────────┬─────────────────────┐      │
                 │              │          │                     │      │
Wave 1:  [3.1]  [1.5]        [2.4]      [1.1] ◄────────────────┼──────┘
           │      │              │          │
Wave 2:  [3.2] ◄─┼──────────  [1.2] ◄─────┘
           │      │              │
           └──────┼─────► [1.3] ◄┘
                  │         │
Wave 3:           │       [1.4]   [2.2] ◄── (1.3)
                  │                 │
                  │               [2.3]
                  │                 │
Wave 4:           │    [2.5] ◄─── (2.3 + 2.4)   [3.4] [3.6] [3.5]
                  │      │
Wave 5:         [3.3] ◄─┘    [4.4 backend]
                  │
Wave 6:         [4.1]        [4.5]
                  │
Wave 7:  [4.2]  [4.3]  [4.4 frontend]

Wave 8:  [5.2]  [5.3]  [5.4]
```

### File Conflicts Resolved

| Wave | File | Stories | Resolution |
|------|------|---------|------------|
| 3 | `app/graph/nodes.py` | 1.4, 2.2 | Independent function additions; both append |
| 4 | `app/api/router.py` | 3.4, 3.5 | 3.4 creates, 3.5 appends. Run 3.4 first |
| 6 | `static/index.html` | 4.1, 4.5 | 4.1 primary. Independent sections |
| 7 | `static/index.html` | 4.2, 4.3, 4.4 | Sequential: 4.4 → 4.2 → 4.3 |
| 8 | `static/index.html` | 5.2, 5.4 | 5.2 primary. Run 5.4 after |

### Wave Log Directory (26 logs)

```
docs/sprints/wave-logs/
├── wave-0/  (2 logs: 5.1-project-setup, 2.1-pydantic-domain-models)
├── wave-1/  (4 logs: 3.1-sqlite-schema, 1.1-query-generation, 1.5-sse-progress, 2.4-confidence)
├── wave-2/  (3 logs: 3.2-repository-pattern, 1.2-parallel-search, 1.3-evidence-extraction)
├── wave-3/  (3 logs: 1.4-gap-analysis, 2.2-llm-capability-assessment, 2.3-score-computation)
├── wave-4/  (4 logs: 2.5-weighted-ranking, 3.4-get-results, 3.6-static-file-serving, 3.5-job-listing)
├── wave-5/  (2 logs: 3.3-fastapi-sse-endpoint, 4.4-executive-summary-pipeline)
├── wave-6/  (2 logs: 4.1-comparison-matrix, 4.5-progress-display)
├── wave-7/  (3 logs: 4.2-confidence-viz, 4.3-evidence-drill-down, 4.4-executive-summary-frontend)
└── wave-8/  (3 logs: 5.2-ui-styling, 5.3-readme-documentation, 5.4-job-history-page)
```

---

## CLAUDE.md Integration

The following section should be added to `CLAUDE.md` to ensure every Claude Code session is aware of the WAVE methodology. This enables any new session to automatically follow WAVE patterns when working on epics.

### Recommended CLAUDE.md Addition

```markdown
<!-- AIOS-MANAGED-START: wave-methodology -->
## WAVE Parallel Development

### Overview
WAVEs organize stories into dependency-based layers for parallel execution.
Within each wave, multiple @dev agents work simultaneously on non-conflictive stories.
Between waves, quality gates validate integration before advancing.

### Key Documents (per sprint)
- `docs/sprints/sprint-plan.md` — Wave structure and dependency graph
- `docs/sprints/wave-execution-protocol.md` — Entry/exit checklists and quality gates
- `docs/sprints/file-ownership-map.md` — Per-wave file ownership and conflict resolution
- `docs/sprints/agent-prompt-template.md` — Standard prompt for parallel @dev agents
- `docs/sprints/wave-logs/` — Decision persistence (mandatory per story)

### Wave Execution Rules
1. **Within a wave**: Stories run in parallel (no inter-dependencies)
2. **Between waves**: Sequential — Wave N must complete before Wave N+1 starts
3. **File ownership**: Each agent ONLY modifies files assigned to it
4. **Communication**: Agents communicate through wave logs, never directly
5. **Quality gates**: 3 layers — automated (`make check`), agent review, human review (milestones)
6. **Error handling**: One story failure doesn't stop siblings; blocks downstream dependents
7. **Commits**: Only after full wave passes all quality gates

### Wave Log Requirement
Every story agent MUST create a log at:
`docs/sprints/wave-logs/wave-{N}/{X.Y}-{story-name}.md`

Containing: status, files created/modified, key decisions, deviations, test results,
warnings for downstream stories, and quality gate verdict.

### Full Documentation
See `docs/guides/wave-parallel-development.md` for comprehensive methodology guide.
<!-- AIOS-MANAGED-END: wave-methodology -->
```

---

## Reference: Document Templates

### Sprint Plan Template

```markdown
# [Project Name] — Sprint Plan

> **Created by**: @sm | **Date**: YYYY-MM-DD
> **Total Stories**: N | **Total Points**: N

## Wave Structure
Stories organized into waves based on dependency resolution.

## Wave 0 — [Goal] (N stories, N pts)
> **Goal**: [description]

| Story | Name | Pts | MoSCoW | Depends On |
|-------|------|-----|--------|------------|

**Parallelism**: `A ∥ B` — [why parallel]
**Exit criteria**: [testable criteria]

## Summary
| Wave | Stories | Points | Parallelism |
|------|---------|--------|-------------|

## MVP Cut Line
After Wave N.

## Dependency Graph (Visual)
```

### Wave Execution Protocol Template

```markdown
# Wave Execution Protocol

## Wave Entry Checklist
1. Prior wave completion verified
2. File existence verified
3. `make check` passes

## Wave Exit — 3-Layer Quality Gate
### Layer 1: Automated (`make check`)
### Layer 2: Per-Story Agent Review
### Layer 3: Human Review (milestones)

## Error Handling Protocol
## Commit Protocol
## Parallel Agent Rules
```

### File Ownership Map Template

```markdown
# File Ownership Map

## Wave N — [Name]
| Story | Files Created | Files Modified |
|-------|--------------|----------------|

**Conflicts**: [analysis]
**Resolution**: [strategy]

## Summary: Same-Wave File Conflicts
| Wave | File | Stories | Resolution |
|------|------|---------|------------|
```

---

*WAVE Parallel Development Methodology v1.0.0 — Synkra AIOS*
*@pm (Bob) + @sm (River)*
