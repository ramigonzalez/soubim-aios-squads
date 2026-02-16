# DecisionLog Documentation

Navigation hub for all project documentation.

## Directory Structure

| Directory | Contents | README |
|-----------|----------|--------|
| `architecture/` | Technical specs (01-10) | [architecture/README.md](architecture/README.md) |
| `management/` | Brief, PRD, epics, product-stories, sprints, handoffs | [management/README.md](management/README.md) |
| `stories/` | Individual dev stories (`{epic}.{story}-name.md`) | [STORY_CREATION_PROGRESS.md](stories/STORY_CREATION_PROGRESS.md) |
| `qa/` | Spec critiques, test suite reports | — |
| `ux/` | UX research, design system analysis | [ux/README.md](ux/README.md) |

## Key Distinction

- **`stories/`** — Dev stories: one file per implementable story (e.g., `3.5-decision-timeline-component.md`). This is the primary working directory referenced by `core-config.yaml`.
- **`management/product-stories/`** — Product stories: epic-level user story collections (e.g., `03_EPIC_3_User_Stories.md`). Used for planning, not implementation.

## Onboarding Reading Order

1. `management/briefs/01_DecisionLog_Project_Brief.md` — What and why
2. `management/prd/01_DecisionLog_PRD.md` (sections 1-2) — Product spec
3. `architecture/01-SYSTEM-OVERVIEW.md` — Technical architecture
4. `management/sprints/SPRINT_PLAN.md` — Timeline and velocity
5. Pick a story from `stories/` — Start building

## Development Workflow

See [CLAUDE.md](../.claude/CLAUDE.md) for dev commands, naming conventions, and component architecture.
