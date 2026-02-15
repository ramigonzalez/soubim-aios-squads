---
task: Setup LangSmith Observability
responsavel: "@eval-guardian"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - project_name: Name for the LangSmith project (e.g., "rag-production", "rag-staging")
  - tracing_config: Tracing configuration options (sampling rate, log level, tag strategy)
  - environment: Target environment (development, staging, production)
Saida: |
  - langsmith_project: Configured LangSmith project with metadata
  - trace_setup: Tracing callback integration code and configuration
  - api_keys: Securely stored API key references (.env entries)
  - dashboard_url: URL to the LangSmith project dashboard
Checklist:
  - "[ ] Create LangSmith project"
  - "[ ] Configure API keys"
  - "[ ] Setup tracing callbacks"
  - "[ ] Configure run metadata"
  - "[ ] Setup custom evaluators"
  - "[ ] Test trace capture"
  - "[ ] Verify dashboard"
  - "[ ] Document setup"
---

# *setup-langsmith

Setup LangSmith observability for a RAG pipeline, including project creation, API key configuration, tracing callback integration, run metadata tagging, custom evaluator registration, and dashboard verification. This is the foundational task for all eval-guardian observability capabilities.

## Usage

```
*setup-langsmith                              # Interactive setup (default)
*setup-langsmith project_name="rag-prod"      # With project name
*setup-langsmith environment="staging"        # For specific environment
*setup-langsmith project_name="rag-prod" environment="production" tracing_config="full"
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `project_name` | string | yes | — | LangSmith project name. Convention: `{app}-{env}` (e.g., `rag-prod`) |
| `tracing_config` | string | no | `standard` | Tracing profile: `minimal` (errors only), `standard` (all chains), `full` (all + intermediate steps) |
| `environment` | string | no | `development` | Target environment: `development`, `staging`, `production` |

## Interactive Flow

### Step 1: Environment Check

```
ELICIT: LangSmith Prerequisites

Checking LangSmith prerequisites...

1. Do you have a LangSmith account? (yes/no)
   → If NO: Guide to https://smith.langchain.com signup
   → If YES: Continue

2. Do you have a LangSmith API key?
   → If NO: Guide to Settings → API Keys → Create New Key
   → If YES: Continue

3. Which environment are you setting up?
   Options:
   [1] Development (local, full tracing, no sampling)
   [2] Staging (remote, full tracing, 50% sampling)
   [3] Production (remote, standard tracing, 10-25% sampling)

   Your choice? [1/2/3]:
```

### Step 2: Project Configuration

```
ELICIT: Project Setup

1. What is the project name?
   Convention: {application}-{environment}
   Examples: "rag-chatbot-dev", "doc-search-prod", "support-bot-staging"

   Project name: _

2. What tracing level do you need?
   [1] Minimal  - Errors and exceptions only (lowest cost)
   [2] Standard - All chain runs, inputs/outputs (recommended)
   [3] Full     - All runs including intermediate steps, embeddings, retrievals

   Your choice? [1/2/3]:

3. Do you want to configure run metadata tags? (yes/no)
   → If YES: Collect tag categories (model, version, feature, user_segment)
   → If NO: Use defaults (environment, timestamp, chain_type)
```

### Step 3: API Key Configuration

```
ELICIT: API Key Setup

Configuring API keys securely...

1. Paste your LangSmith API key (will be stored in .env):
   API Key: _

2. Do you have a separate endpoint URL? (yes/no)
   → Default: https://api.smith.langchain.com
   → Custom: Enter URL

3. Configure environment variables:
   LANGCHAIN_TRACING_V2=true
   LANGCHAIN_API_KEY=<your-key>
   LANGCHAIN_PROJECT=<project-name>
   LANGCHAIN_ENDPOINT=<endpoint-url>

   Write to .env file? (yes/no):
```

### Step 4: Tracing Callback Setup

```
ELICIT: Tracing Integration

1. What is your LLM framework?
   [1] LangChain (Python)
   [2] LangChain.js (TypeScript/JavaScript)
   [3] LlamaIndex
   [4] Custom (manual instrumentation)

   Your choice? [1/2/3/4]:

2. Where should the tracing callback be integrated?
   [1] Global (all chains automatically traced)
   [2] Per-chain (selective tracing)
   [3] Both (global + additional per-chain metadata)

   Your choice? [1/2/3]:
```

### Step 5: Custom Evaluator Registration

```
ELICIT: Custom Evaluators

Do you want to register custom evaluators in LangSmith? (yes/no)

→ If YES:
  Available evaluator types:
  [1] Faithfulness checker (response grounded in context?)
  [2] Relevance scorer (response relevant to query?)
  [3] Toxicity detector (response contains harmful content?)
  [4] Custom LLM-as-judge (define your own criteria)
  [5] All of the above

  Select evaluators (comma-separated): _

→ If NO: Skip, can be added later via *run-evaluation
```

### Step 6: Verification

```
ELICIT: Verification

Running setup verification...

1. Testing API connectivity... [OK/FAIL]
2. Sending test trace... [OK/FAIL]
3. Verifying project exists... [OK/FAIL]
4. Checking dashboard access... [OK/FAIL]
5. Validating evaluator registration... [OK/FAIL]

All checks passed? Proceed to generate documentation? (yes/no):
```

## Output

On successful completion:

```
Setup Complete: LangSmith Observability

Project:     {project_name}
Environment: {environment}
Dashboard:   https://smith.langchain.com/o/{org}/projects/p/{project_id}
Tracing:     {tracing_config} mode
Evaluators:  {count} registered

Files Created/Modified:
  .env                          - API keys added
  src/observability/tracer.ts   - Tracing callback module
  src/observability/evaluators.ts - Custom evaluator definitions
  src/observability/metadata.ts  - Run metadata configuration
  docs/observability-setup.md   - Setup documentation

Environment Variables:
  LANGCHAIN_TRACING_V2=true
  LANGCHAIN_API_KEY=ls_****...
  LANGCHAIN_PROJECT={project_name}
  LANGCHAIN_ENDPOINT={endpoint}

Next Steps:
  1. Run *create-eval-dataset to create evaluation datasets
  2. Run *run-evaluation to validate pipeline quality
  3. Run *monitor-production to setup production monitoring
```

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `LANGSMITH_AUTH_FAILED` | Invalid or expired API key | Regenerate API key at smith.langchain.com Settings |
| `LANGSMITH_PROJECT_EXISTS` | Project name already taken in org | Choose a different name or use existing project |
| `LANGSMITH_QUOTA_EXCEEDED` | Trace quota exceeded for current plan | Upgrade plan or reduce sampling rate |
| `LANGSMITH_NETWORK_ERROR` | Cannot reach LangSmith API endpoint | Check network connectivity and firewall rules |
| `ENV_FILE_MISSING` | No .env file found in project root | Create .env file or specify alternate path |
| `ENV_KEY_CONFLICT` | LANGCHAIN_* variables already exist in .env | Prompt to overwrite or create environment-specific .env |
| `FRAMEWORK_NOT_DETECTED` | Could not auto-detect LLM framework | Manually specify framework in tracing config |
| `EVALUATOR_REGISTRATION_FAILED` | Custom evaluator failed to register | Check evaluator function signature and dependencies |

## Implementation Details

### LangChain Python Integration

```python
import os
from langsmith import Client
from langchain.callbacks import LangChainTracer

# Initialize LangSmith client
client = Client(
    api_url=os.getenv("LANGCHAIN_ENDPOINT", "https://api.smith.langchain.com"),
    api_key=os.getenv("LANGCHAIN_API_KEY"),
)

# Create project if not exists
project_name = os.getenv("LANGCHAIN_PROJECT", "default")
client.create_project(project_name, exists_ok=True)

# Configure tracer with metadata
tracer = LangChainTracer(
    project_name=project_name,
    client=client,
    tags=["environment:production", "version:1.0.0"],
)
```

### LangChain.js Integration

```typescript
import { Client } from "langsmith";
import { LangChainTracer } from "@langchain/core/tracers/langchain";

const client = new Client({
  apiUrl: process.env.LANGCHAIN_ENDPOINT,
  apiKey: process.env.LANGCHAIN_API_KEY,
});

const tracer = new LangChainTracer({
  projectName: process.env.LANGCHAIN_PROJECT,
  client,
});
```

### Sampling Configuration by Environment

```yaml
development:
  sampling_rate: 1.0        # Trace everything
  log_level: debug
  include_intermediate: true

staging:
  sampling_rate: 0.5        # Trace 50%
  log_level: info
  include_intermediate: true

production:
  sampling_rate: 0.1        # Trace 10%
  log_level: warn
  include_intermediate: false
```

## Related

- **Agent:** @eval-guardian (Sage)
- **Next Tasks:** *create-eval-dataset, *run-evaluation, *monitor-production
- **Prerequisites:** LangSmith account, API key
- **Collaborates With:** @rag-architect (pipeline architecture), @llm-orchestrator (chain configuration)
