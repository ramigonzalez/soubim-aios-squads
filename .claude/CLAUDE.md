# Synkra AIOS Development Rules for Claude Code

You are working with Synkra AIOS, an AI-Orchestrated System for Full Stack Development.

## Core Framework Understanding

Synkra AIOS is a meta-framework that orchestrates AI agents to handle complex development workflows. Always recognize and work within this architecture.

## Agent System

### Agent Activation
- Agents are activated with @agent-name syntax: @dev, @qa, @architect, @pm, @po, @sm, @analyst
- The master agent is activated with @aios-master
- Agent commands use the * prefix: *help, *create-story, *task, *exit

### Agent Context
When an agent is active:
- Follow that agent's specific persona and expertise
- Use the agent's designated workflow patterns
- Maintain the agent's perspective throughout the interaction

## Development Methodology

### Story-Driven Development
1. **Work from stories** - All development starts with a story in `docs/stories/`
2. **Update progress** - Mark checkboxes as tasks complete: [ ] → [x]
3. **Track changes** - Maintain the File List section in the story
4. **Follow criteria** - Implement exactly what the acceptance criteria specify

### Adding a New Feature (Step-by-Step)
1. Find or create story in `docs/stories/` (format: `{epic}.{story}-kebab-case.md`)
2. Read the AC and check `Blocked By` dependencies
3. Create files following naming conventions (see Naming Conventions section)
4. Write tests in `src/tests/` mirroring the source structure
5. Update story checkboxes `[x]` and File List section
6. Run `npm run frontend:test` and `npm run frontend:lint`

### Code Standards
- Write clean, self-documenting code
- Follow existing patterns in the codebase
- Include comprehensive error handling
- Add unit tests for all new functionality
- Use TypeScript/JavaScript best practices

### Testing Requirements
- Run all tests before marking tasks complete
- Ensure linting passes: `npm run lint`
- Verify type checking: `npm run typecheck`
- Add tests for new features
- Test edge cases and error scenarios

## AIOS Framework Structure

```
.aios-core/
├── development/
│   ├── agents/       # Agent persona definitions (12 agents)
│   ├── tasks/        # Executable task workflows
│   ├── workflows/    # Multi-step workflow definitions
│   ├── templates/    # Document and code templates
│   └── checklists/   # Validation and review checklists
├── core/             # Framework runtime (elicitation, config, orchestration)
├── product/          # Product-level checklists and templates
├── infrastructure/   # Deployment scripts and schemas
└── core-config.yaml  # Framework configuration

docs/
├── architecture/   # Technical specs (numbered 01-07)
├── management/     # Brief, PRD, epics, product-stories, sprints
├── stories/        # Individual dev stories ({epic}.{story}-name.md)
├── qa/             # Spec critiques, test suite reports
└── ux/             # UX research, design system analysis
```

## DecisionLog Project Structure

```
soubim-aios-squads/
├── decision-log-backend/    # FastAPI + SQLAlchemy (Python)
│   └── app/
│       ├── api/routes/      # Endpoint handlers
│       ├── api/models/      # Pydantic models
│       ├── api/middleware/   # Auth middleware
│       ├── database/        # SQLAlchemy models, seeds
│       ├── services/        # Business logic
│       └── utils/           # Shared utilities
├── decision-log-frontend/   # React + Vite + TypeScript + Tailwind
│   └── src/
│       ├── components/
│       │   ├── common/      # Shared (Navigation, ProjectCard)
│       │   ├── molecules/   # Composed display (DecisionCard, DisciplineBadge)
│       │   ├── organisms/   # Complex w/ state (Timeline, FiltersSidebar)
│       │   └── templates/   # Page layouts
│       ├── pages/           # Route components
│       ├── hooks/           # Custom hooks (useDecisions, useAuth)
│       ├── store/           # Zustand stores
│       ├── services/        # API client layer
│       ├── types/           # TypeScript definitions
│       ├── lib/             # Utils (cn(), color maps)
│       └── tests/           # Vitest + RTL tests
└── docs/                    # See AIOS Framework Structure above
```

## Naming Conventions

- **Stories:** `{epic}.{story}-kebab-case.md` (e.g., `3.5-decision-timeline-component.md`)
- **Architecture docs:** `{NN}-UPPER-KEBAB.md` (e.g., `01-SYSTEM-OVERVIEW.md`)
- **Frontend components:** `PascalCase.tsx`
- **Hooks:** `useFeatureName.ts`
- **Stores:** `featureStore.ts`
- **Backend routes/services:** `snake_case.py`
- **Tests:** mirror `src/` structure in `src/tests/`

## Frontend Component Architecture

Hybrid atomic + feature-based pattern:
- `common/` — shared across pages (Navigation, ProjectCard)
- `molecules/` — composed display components (DecisionCard, DisciplineBadge)
- `organisms/` — complex components with state/API (Timeline, FiltersSidebar)
- `templates/` — page layout wrappers

**State management:** React Query (server state) + Zustand (client state)
**Utils:** centralized in `src/lib/utils.ts` (`cn()`, discipline color maps)

### Where to place new components
- Used across multiple pages? → `common/`
- Pure display, no side effects? → `molecules/`
- Has internal state, API calls, or complex logic? → `organisms/`
- Wraps a page layout? → `templates/`

## Workflow Execution

### Task Execution Pattern
1. Read the complete task/workflow definition
2. Understand all elicitation points
3. Execute steps sequentially
4. Handle errors gracefully
5. Provide clear feedback

### Interactive Workflows
- Workflows with `elicit: true` require user input
- Present options clearly
- Validate user responses
- Provide helpful defaults

## Best Practices

### When implementing features:
- Check existing patterns first
- Reuse components and utilities
- Follow naming conventions
- Keep functions focused and testable
- Document complex logic

### When working with agents:
- Respect agent boundaries
- Use appropriate agent for each task
- Follow agent communication patterns
- Maintain agent context

### When handling errors:
```javascript
try {
  // Operation
} catch (error) {
  console.error(`Error in ${operation}:`, error);
  // Provide helpful error message
  throw new Error(`Failed to ${operation}: ${error.message}`);
}
```

## Git & GitHub Integration

### Commit Conventions
- Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, etc.
- Reference story ID: `feat: implement IDE detection [Story 2.1]`
- Keep commits atomic and focused

### GitHub CLI Usage
- Ensure authenticated: `gh auth status`
- Use for PR creation: `gh pr create`
- Check org access: `gh api user/memberships`

## AIOS-Specific Patterns

### Working with Templates
```javascript
const template = await loadTemplate('template-name');
const rendered = await renderTemplate(template, context);
```

### Agent Command Handling (Conceptual Pattern)
Agent commands work via the `*` prefix in conversation (e.g., `*help`, `*create-story`).
Stories are loaded from `docs/stories/` by convention (configured in `core-config.yaml` as `devStoryLocation`).
```javascript
// Conceptual — not a callable API
if (command.startsWith('*')) {
  const agentCommand = command.substring(1);
  await executeAgentCommand(agentCommand, args);
}
```

## Environment Setup

### Required Tools
- Node.js 18+ 
- GitHub CLI
- Git
- Your preferred package manager (npm/yarn/pnpm)

### Configuration Files
- `.aios-core/core-config.yaml` - Framework configuration
- `.env` - Root environment variables
- `decision-log-backend/.env` - Backend config (DB, JWT, CORS)
- `decision-log-frontend/vite.config.ts` - Vite bundler config

## Common Commands

### AIOS Master Commands
- `*help` - Show available commands
- `*create-story` - Create new story
- `*task {name}` - Execute specific task
- `*workflow {name}` - Run workflow

### Development Commands
- `./dev.sh` - Start both frontend + backend servers
- `npm run dev` - Same via concurrently
- `npm run frontend:dev` - Frontend only (localhost:5173)
- `npm run backend:dev` - Backend only (localhost:8000)
- `npm run frontend:test` - Vitest test suite
- `npm run frontend:lint` - ESLint check
- Use `python3` not `python` on this machine

## Debugging

### Debug Log (configured in core-config.yaml, created on first use)
- `.ai/debug-log.md` - Dev debug log
- `.ai/decision-logs-index.md` - Decision log index

### Enable Debug Mode
```bash
export AIOS_DEBUG=true
```

## Claude Code Specific Configuration

### Performance Optimization
- Prefer batched tool calls when possible for better performance
- Use parallel execution for independent operations
- Cache frequently accessed data in memory during sessions

### Tool Usage Guidelines
- Always use the Grep tool for searching, never `grep` or `rg` in bash
- Use the Task tool for complex multi-step operations
- Batch file reads/writes when processing multiple files
- Prefer editing existing files over creating new ones

### Session Management
- Track story progress throughout the session
- Update checkboxes immediately after completing tasks
- Maintain context of the current story being worked on
- Save important state before long-running operations

### Error Recovery
- Always provide recovery suggestions for failures
- Include error context in messages to user
- Suggest rollback procedures when appropriate
- Document any manual fixes required

### Testing Strategy
- Run tests incrementally during development
- Always verify lint and typecheck before marking complete
- Test edge cases for each new feature
- Document test scenarios in story files

### Documentation
- Update relevant docs when changing functionality
- Include code examples in documentation
- Keep README synchronized with actual behavior
- Document breaking changes prominently

---
*Synkra AIOS Claude Code Configuration v2.0* 