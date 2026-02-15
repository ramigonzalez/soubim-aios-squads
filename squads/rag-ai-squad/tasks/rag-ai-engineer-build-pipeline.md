---
task: Build RAG Pipeline
responsavel: "@rag-ai-engineer"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - architecture_doc: Path to the RAG architecture document or inline architecture specification
  - data_sources: Configured data source connections (file paths, API endpoints, database URIs)
  - config: Pipeline configuration (chunking params, embedding model, VectorDB settings)
  - environment: Target deployment environment (local, staging, production)
Saida: |
  - working_pipeline: Fully functional RAG pipeline with all components wired together
  - integration_tests: Test suite covering ingestion, retrieval, and generation
  - deployment_config: Docker/K8s deployment configuration for target environment
  - documentation: Pipeline documentation with setup instructions and API reference
Checklist:
  - "[ ] Setup project structure and dependencies"
  - "[ ] Implement document loader for each data source"
  - "[ ] Implement chunking strategy with configured parameters"
  - "[ ] Configure embedding model and test embedding generation"
  - "[ ] Setup VectorDB and create collection/index"
  - "[ ] Build retrieval chain with query transformation"
  - "[ ] Add prompt templates for generation"
  - "[ ] Write integration tests for full pipeline"
  - "[ ] Create deployment configuration for target environment"
---

# *build-pipeline

Build a complete, production-ready RAG pipeline from an architecture specification. Atlas scaffolds the project, implements each pipeline stage (ingestion, indexing, retrieval, generation), wires components together, writes integration tests, and produces deployment-ready configuration.

## Usage

```bash
# Interactive mode (recommended)
*build-pipeline

# From existing architecture doc
*build-pipeline --architecture-doc docs/architecture/rag-architecture.md

# Quick setup with defaults
*build-pipeline --mode yolo --environment local

# With explicit configuration
*build-pipeline --config config/pipeline.yaml --environment staging
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `architecture_doc` | string | no | - | Path to architecture document (from `*design-rag`) |
| `data_sources` | list | yes | - | Data source configurations |
| `config` | object/path | no | `{}` | Pipeline configuration overrides |
| `environment` | enum | no | `local` | Target: `local`, `staging`, `production` |
| `mode` | enum | no | `interactive` | Execution mode: `yolo`, `interactive`, `preflight` |
| `framework` | enum | no | `langchain` | Framework: `langchain`, `llamaindex`, `custom` |
| `language` | enum | no | `python` | Implementation language: `python`, `typescript` |
| `include_api` | boolean | no | `true` | Generate FastAPI/Express REST API |
| `include_docker` | boolean | no | `true` | Generate Dockerfile and docker-compose |

## Interactive Flow

### Step 1: Architecture Input

```
Atlas: Let's build your RAG pipeline.

Do you have an existing architecture document?
  1. Yes, from *design-rag (provide path)
  2. No, use defaults and configure as we go
  3. Yes, from external source (paste or provide path)

> [user input]

If no architecture doc:
  Atlas: I'll guide you through component selection.
  (Falls back to inline architecture decisions)
```

### Step 2: Environment Setup

```
Atlas: Let's configure the development environment.

Target environment:
  1. Local development (Docker Compose)
  2. Staging (cloud-hosted, single node)
  3. Production (cloud-hosted, distributed)

> [user input]

Python version:
  1. 3.11 (recommended)
  2. 3.12
  3. 3.10

> [user input]

Package manager:
  1. pip + requirements.txt
  2. poetry (recommended)
  3. uv
  4. conda

> [user input]

Atlas: Setting up project structure...

  rag-pipeline/
  ├── src/
  │   ├── ingestion/
  │   │   ├── __init__.py
  │   │   ├── loaders.py          # Document loaders
  │   │   ├── chunkers.py         # Chunking strategies
  │   │   └── preprocessors.py    # Text preprocessing
  │   ├── indexing/
  │   │   ├── __init__.py
  │   │   ├── embeddings.py       # Embedding model config
  │   │   └── vectorstore.py      # VectorDB operations
  │   ├── retrieval/
  │   │   ├── __init__.py
  │   │   ├── retrievers.py       # Retrieval chains
  │   │   ├── rerankers.py        # Reranking logic
  │   │   └── query_transform.py  # Query transformation
  │   ├── generation/
  │   │   ├── __init__.py
  │   │   ├── chains.py           # Generation chains
  │   │   └── prompts.py          # Prompt templates
  │   ├── api/
  │   │   ├── __init__.py
  │   │   ├── main.py             # FastAPI application
  │   │   ├── routes.py           # API routes
  │   │   └── schemas.py          # Pydantic models
  │   ├── config.py               # Configuration management
  │   └── pipeline.py             # Main pipeline orchestrator
  ├── tests/
  │   ├── conftest.py
  │   ├── test_ingestion.py
  │   ├── test_retrieval.py
  │   ├── test_generation.py
  │   └── test_pipeline_e2e.py
  ├── config/
  │   ├── default.yaml
  │   ├── local.yaml
  │   └── production.yaml
  ├── docker-compose.yaml
  ├── Dockerfile
  ├── pyproject.toml
  └── README.md

Proceed with this structure? [Y/n]
```

### Step 3: Data Source Configuration

```
Atlas: Let's configure your data sources.

For each data source, I need:
  - Type (PDF, HTML, API, database, etc.)
  - Connection details (path, URL, credentials)
  - Update frequency
  - Preprocessing requirements

Data source 1:
  Type: [user input]
  Path/URL: [user input]
  Update frequency: [user input]

Add another data source? [y/N]
```

### Step 4: Component Configuration

```
Atlas: Configuring pipeline components.

Chunking:
  - Strategy: {from architecture or select}
  - Chunk size: {default: 512 tokens}
  - Overlap: {default: 50 tokens}
  Confirm? [Y/n]

Embeddings:
  - Model: {from architecture or select}
  - Dimensions: {auto-detected}
  - Batch size: {default: 100}
  Confirm? [Y/n]

VectorDB:
  - Engine: {from architecture or select}
  - Collection name: {default: from use_case}
  - Distance metric: {default: cosine}
  Confirm? [Y/n]

Retrieval:
  - Strategy: {from architecture or select}
  - Top-k: {default: 5}
  - Reranking: {from architecture or select}
  Confirm? [Y/n]

LLM:
  - Model: {from architecture or select}
  - Temperature: {default: 0.0}
  - Max tokens: {default: 1024}
  Confirm? [Y/n]
```

### Step 5: Build and Test

```
Atlas: Building pipeline...

  [1/9] Setting up project structure...          done
  [2/9] Installing dependencies...               done
  [3/9] Implementing document loaders...          done
  [4/9] Implementing chunking strategy...         done
  [5/9] Configuring embedding model...            done
  [6/9] Setting up VectorDB...                    done
  [7/9] Building retrieval chain...               done
  [8/9] Adding prompt templates...                done
  [9/9] Writing integration tests...              done

Running tests...
  test_document_loading .................. PASSED
  test_chunking_output ................... PASSED
  test_embedding_generation .............. PASSED
  test_vectordb_operations ............... PASSED
  test_retrieval_chain ................... PASSED
  test_end_to_end_pipeline ............... PASSED

  6 passed, 0 failed

Pipeline built successfully!
```

## Output

### 1. Working Pipeline
- Complete Python/TypeScript project with all pipeline stages
- Configuration-driven design (swap components via config)
- Health checks and readiness probes
- Structured logging with LangSmith integration

### 2. Integration Tests
- Document loading tests per source type
- Chunking output validation
- Embedding dimension and quality checks
- VectorDB CRUD operations
- End-to-end retrieval accuracy tests
- API endpoint tests

### 3. Deployment Configuration
- `Dockerfile` with multi-stage build
- `docker-compose.yaml` with VectorDB and dependencies
- Environment variable templates
- Health check endpoints
- Resource limit recommendations

### 4. Documentation
- Setup and installation guide
- API reference (auto-generated from FastAPI)
- Configuration reference
- Troubleshooting guide

## Error Handling

| Error | Cause | Resolution | Recovery |
|-------|-------|------------|----------|
| Architecture Doc Not Found | Invalid path to architecture document | Prompt for correct path or start fresh | Offer to run `*design-rag` first |
| Dependency Installation Failed | Package conflicts or network issues | Show error log, suggest version pinning | Retry with `--no-cache` or alternative versions |
| VectorDB Connection Failed | Database not running or wrong credentials | Check connection string, verify service is up | Offer to start local instance via Docker |
| Embedding Model Unavailable | API key missing or model deprecated | Verify API key, suggest alternative models | Fall back to local embedding model |
| Data Source Inaccessible | File not found, API unreachable, auth failure | Validate paths and credentials | Offer mock data for development |
| Test Failures | Component misconfiguration or bugs | Show failing test details and stack trace | Fix configuration and re-run affected tests |
| Port Already in Use | Another service on the same port | Suggest alternative port or kill conflicting process | Auto-increment port number |
| Insufficient Disk Space | VectorDB or embeddings exceed disk | Warn about space requirements before build | Suggest smaller test dataset |

## Pre-Conditions

```yaml
pre-conditions:
  - "[ ] Python/Node.js runtime available at required version"
  - "[ ] API keys configured for embedding model and LLM"
  - "[ ] Data sources accessible (files exist, APIs reachable)"
  - "[ ] VectorDB available or Docker installed for local instance"
```

## Post-Conditions

```yaml
post-conditions:
  - "[ ] All pipeline stages functional and connected"
  - "[ ] Integration tests pass with >90% success rate"
  - "[ ] API endpoints respond correctly"
  - "[ ] Documentation generated and accurate"
```

## Acceptance Criteria

```yaml
acceptance-criteria:
  - "[ ] Pipeline ingests documents from all configured data sources"
  - "[ ] Queries return relevant results with source citations"
  - "[ ] All integration tests pass"
  - "[ ] Pipeline deployable via Docker with single command"
  - "[ ] Configuration allows swapping components without code changes"
```

## Performance

```yaml
duration_expected: 20-45 min (interactive), 10-20 min (yolo)
cost_estimated: $0.02-0.10
token_usage: ~10,000-30,000 tokens
```

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies:
  - design-rag
  - choose-chunking
  - implement-retrieval
tags:
  - pipeline
  - rag
  - implementation
  - build
updated_at: 2026-02-09
```

## Related

- **Agent:** @rag-ai-engineer (Atlas)
- **Upstream Tasks:** `*design-rag` (architecture input)
- **Downstream Tasks:** `*choose-chunking`, `*implement-retrieval`, `*build-agent`
- **Collaborators:** @vectordb-advisor (Vex) for VectorDB setup, @prompt-engineer (Lyra) for prompt templates, @eval-guardian (Sage) for test strategy
- **Checklists:** `production-readiness.md`, `rag-pipeline-review.md`
