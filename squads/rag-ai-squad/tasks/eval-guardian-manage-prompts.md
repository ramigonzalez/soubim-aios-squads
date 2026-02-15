---
task: Manage Prompt Versioning
responsavel: "@eval-guardian"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - prompt_templates: List of prompt templates to manage (paths or LangSmith Hub references)
  - versioning_rules: Rules for version numbering, changelogs, and compatibility
  - rollback_policy: Policy for when and how to rollback prompt versions
Saida: |
  - prompt_registry: Centralized prompt registry with all versions, metadata, and status
  - version_history: Complete version history with diffs, performance comparisons, and changelogs
  - rollback_plan: Documented rollback procedures for each prompt template
  - migration_guide: Guide for migrating between prompt versions safely
Checklist:
  - "[ ] Inventory current prompts"
  - "[ ] Setup versioning scheme"
  - "[ ] Configure LangSmith Hub"
  - "[ ] Implement version tracking"
  - "[ ] Create rollback procedures"
  - "[ ] Test version switching"
  - "[ ] Document prompt catalog"
  - "[ ] Setup approval workflow"
---

# *manage-prompts

Manage prompt versioning, comparisons, A/B testing, and rollbacks for RAG pipeline prompts using LangSmith Hub. This task establishes a disciplined prompt management lifecycle including version control, performance tracking across versions, automated comparison testing, approval workflows, and safe rollback procedures.

## Usage

```
*manage-prompts                                          # Interactive (default)
*manage-prompts prompt_templates="src/prompts/"          # Specify prompts directory
*manage-prompts versioning_rules="semver"                # Use semantic versioning
*manage-prompts rollback_policy="automatic"              # Auto-rollback on quality drop
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt_templates` | string | no | auto-detect | Path to prompts directory or comma-separated LangSmith Hub refs |
| `versioning_rules` | string | no | `semver` | Versioning scheme: `semver`, `sequential`, `date-based` |
| `rollback_policy` | string | no | `manual` | Rollback policy: `manual`, `automatic`, `approval-required` |

## Prompt Versioning Framework

### Version Numbering Schemes

| Scheme | Format | When to Use |
|--------|--------|-------------|
| `semver` | `v1.2.3` (major.minor.patch) | Recommended. Major = breaking change, Minor = new capability, Patch = wording fix |
| `sequential` | `v1`, `v2`, `v3` | Simple, for small teams |
| `date-based` | `v2026-02-09` | When tied to data/model updates |

### Prompt Lifecycle States

```
DRAFT → REVIEW → TESTING → STAGED → ACTIVE → DEPRECATED → ARCHIVED
  │                                     │
  └─────── (rejected) ◄────────────────┘ (rollback)
```

| State | Description |
|-------|-------------|
| `DRAFT` | Initial creation, not yet reviewed |
| `REVIEW` | Under peer review / approval |
| `TESTING` | Running evaluation comparisons |
| `STAGED` | Approved, ready for deployment |
| `ACTIVE` | Currently serving production traffic |
| `DEPRECATED` | Superseded but available for rollback |
| `ARCHIVED` | No longer available |

## Interactive Flow

### Step 1: Prompt Inventory

```
ELICIT: Prompt Discovery

1. How should we discover your prompt templates?
   [1] Scan project directory for prompt files
   [2] Import from LangSmith Hub
   [3] Manual specification
   [4] Both local files and LangSmith Hub

   Your choice? [1/2/3/4]:

→ If [1]:
  Scanning project...
  Found prompts:
  ┌────┬───────────────────────────┬────────────┬─────────────┐
  │ #  │ Prompt                    │ Location   │ Status      │
  ├────┼───────────────────────────┼────────────┼─────────────┤
  │ 1  │ system-prompt             │ src/prompts│ Unversioned │
  │ 2  │ retrieval-qa-prompt       │ src/prompts│ Unversioned │
  │ 3  │ summarization-prompt      │ src/prompts│ Unversioned │
  │ 4  │ groundedness-check-prompt │ src/prompts│ Unversioned │
  └────┴───────────────────────────┴────────────┴─────────────┘

  Select prompts to manage (comma-separated or "all"): _

2. Are there any prompts hardcoded in the codebase? (yes/no)
   → If YES: We recommend extracting them to template files first.
```

### Step 2: Versioning Scheme

```
ELICIT: Version Configuration

1. Which versioning scheme do you want to use?
   [1] Semantic Versioning (v1.0.0) - recommended
       Major = behavior change, Minor = new feature, Patch = wording fix
   [2] Sequential (v1, v2, v3)
       Simple incrementing numbers
   [3] Date-based (v2026-02-09)
       Tied to update dates

   Your choice? [1/2/3]:

2. Version metadata to track:
   [ ] Author (who made the change)
   [ ] Reason (why the change was made)
   [ ] Evaluation scores (performance at time of creation)
   [ ] Model compatibility (which LLM models tested with)
   [ ] Token count (prompt token usage)
   [ ] A/B test results (if applicable)

   Select metadata fields (comma-separated): _

3. Changelog format:
   [1] Structured YAML
   [2] Markdown diff
   [3] Both

   Your choice? [1/2/3]:
```

### Step 3: LangSmith Hub Configuration

```
ELICIT: LangSmith Hub Setup

1. Push prompts to LangSmith Hub? (yes/no)

→ If YES:
  Organization: {auto-detected}
  Hub namespace: _

  Sync strategy:
  [1] Push only (local → Hub)
  [2] Pull only (Hub → local)
  [3] Bi-directional sync
  [4] Hub as source of truth

  Your choice? [1/2/3/4]:

2. Access control:
   [1] Private (team only)
   [2] Organization-wide
   [3] Public (share with community)

   Your choice? [1/2/3]:

3. Auto-sync on git commit? (yes/no)
```

### Step 4: Version Tracking Implementation

```
ELICIT: Tracking Implementation

1. Where should version metadata be stored?
   [1] Alongside prompt files (prompt-name.meta.yaml)
   [2] Central registry file (prompts/registry.yaml)
   [3] LangSmith Hub metadata only
   [4] Both local registry and LangSmith Hub

   Your choice? [1/2/3/4]:

2. Setting up initial versions...
   Tagging all current prompts as v1.0.0...

   ┌───────────────────────────┬─────────┬────────┬────────────┐
   │ Prompt                    │ Version │ Tokens │ State      │
   ├───────────────────────────┼─────────┼────────┼────────────┤
   │ system-prompt             │ v1.0.0  │ 245    │ ACTIVE     │
   │ retrieval-qa-prompt       │ v1.0.0  │ 180    │ ACTIVE     │
   │ summarization-prompt      │ v1.0.0  │ 312    │ ACTIVE     │
   │ groundedness-check-prompt │ v1.0.0  │ 420    │ ACTIVE     │
   └───────────────────────────┴─────────┴────────┴────────────┘

   Confirm initial tagging? (yes/no):
```

### Step 5: Rollback Procedures

```
ELICIT: Rollback Configuration

1. When should a rollback be triggered?
   [ ] Faithfulness score drops below threshold
   [ ] Answer relevancy drops below threshold
   [ ] Error rate increases above threshold
   [ ] User feedback drops below threshold
   [ ] Manual trigger only

   Select triggers (comma-separated): _

2. Rollback policy:
   [1] Manual     - Alert team, require manual approval
   [2] Automatic  - Auto-rollback when triggers fire, notify team
   [3] Approval   - Auto-detect, create rollback request, wait for approval

   Your choice? [1/2/3]:

3. Rollback target:
   [1] Always rollback to previous version (N-1)
   [2] Rollback to last known good version
   [3] Rollback to specific version (manual selection)

   Your choice? [1/2/3]:

4. Rollback verification:
   After rollback, automatically run evaluation to verify? (yes/no)
```

### Step 6: Version Switching Test

```
ELICIT: Version Switch Test

Testing version switching mechanism...

1. Creating test version (v1.0.1) of system-prompt...
2. Switching to v1.0.1... [OK]
3. Running quick evaluation (5 queries)... [OK]
4. Rolling back to v1.0.0... [OK]
5. Verifying original version restored... [OK]
6. Cleaning up test version... [OK]

All version switching tests passed.

Proceed to documentation? (yes/no):
```

### Step 7: Approval Workflow

```
ELICIT: Approval Workflow

1. Who needs to approve prompt changes?
   [1] No approval needed (developer autonomy)
   [2] Peer review (one team member)
   [3] Lead approval (team lead or PM)
   [4] Evaluation gate (must pass evaluation thresholds)
   [5] Combined (peer review + evaluation gate)

   Your choice? [1/2/3/4/5]:

2. Approval channels:
   [1] GitHub PR (prompt change as code change)
   [2] LangSmith Hub approval workflow
   [3] Slack approval (react to approve)
   [4] Custom webhook

   Your choice? [1/2/3/4]:
```

## Output

On successful completion:

```
Prompt Versioning Setup Complete

Prompts Managed:  {count}
Version Scheme:   {scheme}
Hub Integration:  {enabled/disabled}
Rollback Policy:  {policy}
Approval Workflow: {workflow}

Prompt Registry:
  ┌───────────────────────────┬─────────┬────────┬────────────┬───────────┐
  │ Prompt                    │ Version │ Tokens │ State      │ Hub Sync  │
  ├───────────────────────────┼─────────┼────────┼────────────┼───────────┤
  │ system-prompt             │ v1.0.0  │ 245    │ ACTIVE     │ Synced    │
  │ retrieval-qa-prompt       │ v1.0.0  │ 180    │ ACTIVE     │ Synced    │
  │ summarization-prompt      │ v1.0.0  │ 312    │ ACTIVE     │ Synced    │
  │ groundedness-check-prompt │ v1.0.0  │ 420    │ ACTIVE     │ Synced    │
  └───────────────────────────┴─────────┴────────┴────────────┴───────────┘

Files Created:
  src/prompts/registry.yaml              - Central prompt registry
  src/prompts/changelog.md               - Version changelog
  config/prompt-versioning.yaml          - Versioning configuration
  config/rollback-policy.yaml            - Rollback rules and triggers
  docs/prompt-catalog.md                 - Prompt documentation catalog
  docs/prompt-migration-guide.md         - Version migration guide
  scripts/prompt-rollback.sh             - Rollback utility script
  scripts/prompt-compare.sh              - Version comparison utility

Usage Examples:
  # Create new version
  *manage-prompts action="create-version" prompt="system-prompt" version="v1.1.0"

  # Compare versions
  *manage-prompts action="compare" prompt="system-prompt" versions="v1.0.0,v1.1.0"

  # Rollback
  *manage-prompts action="rollback" prompt="system-prompt" target="v1.0.0"

Next Steps:
  1. Run *run-evaluation to establish baseline scores for v1.0.0 prompts
  2. Share prompt catalog with team
  3. Setup CI/CD integration for prompt changes
  4. Schedule prompt review cadence (weekly/bi-weekly)
```

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `PROMPT_NOT_FOUND` | Specified prompt file does not exist | Verify prompt path and filename |
| `VERSION_CONFLICT` | Version number already exists for this prompt | Increment version or use force flag |
| `HUB_PUSH_FAILED` | Failed to push prompt to LangSmith Hub | Check Hub API key, permissions, and network |
| `HUB_PULL_FAILED` | Failed to pull prompt from LangSmith Hub | Verify Hub namespace and prompt name |
| `ROLLBACK_TARGET_MISSING` | Target rollback version not found | Check version history, use available version |
| `APPROVAL_TIMEOUT` | Approval request timed out | Re-submit approval or escalate |
| `SYNC_CONFLICT` | Local and Hub versions diverged | Resolve conflict manually, choose source of truth |
| `TOKEN_COUNT_EXCEEDED` | Prompt exceeds model context window | Reduce prompt length or switch to larger context model |
| `REGISTRY_CORRUPTED` | Prompt registry file is malformed | Rebuild registry from prompt files and Hub |

## Related

- **Agent:** @eval-guardian (Sage)
- **Depends On:** *setup-langsmith (Hub integration)
- **Used By:** *run-evaluation (evaluates specific prompt versions), *regression-test (compares prompt versions)
- **Complements:** *track-costs (prompt token cost tracking)
- **Collaborates With:** @prompt-engineer (prompt creation and optimization), @llm-orchestrator (prompt integration in chains)
