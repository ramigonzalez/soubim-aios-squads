---
task: Design RAG Pipeline Architecture
responsavel: "@rag-ai-engineer"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - use_case: Description of the business use case and end-user goals for the RAG system
  - data_sources: List of data sources (PDFs, APIs, databases, transcripts, web pages, etc.)
  - requirements: Non-functional requirements (latency, accuracy, availability, compliance)
  - scale_expectations: Expected data volume, query throughput, and growth projections
Saida: |
  - architecture_doc: Comprehensive RAG architecture document with component specifications
  - component_diagram: Visual diagram of pipeline components and data flow
  - tech_decisions: Technology decision records for each component choice
  - cost_estimate: Monthly cost projection based on scale expectations
Checklist:
  - "[ ] Gather requirements from stakeholders"
  - "[ ] Analyze data sources and document types"
  - "[ ] Select chunking strategy based on data characteristics"
  - "[ ] Choose embedding model based on accuracy and cost tradeoffs"
  - "[ ] Select VectorDB based on scale, features, and budget"
  - "[ ] Design retrieval strategy (semantic, hybrid, multi-stage)"
  - "[ ] Define agent workflow and orchestration pattern"
  - "[ ] Document complete architecture with rationale"
  - "[ ] Review architecture with stakeholders"
---

# *design-rag

Design a production-grade RAG (Retrieval-Augmented Generation) pipeline architecture tailored to specific use cases, data sources, and scale requirements. Atlas analyzes the problem space, evaluates technology options, and produces a comprehensive architecture document with component diagrams, technology decisions, and cost estimates.

## Usage

```bash
# Interactive mode (recommended for new projects)
*design-rag

# With initial parameters
*design-rag --use-case "customer support chatbot" --scale "10K queries/day"

# Quick mode for experienced users
*design-rag --mode yolo --use-case "internal knowledge base"
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `use_case` | string | yes | - | Business use case description |
| `data_sources` | list | yes | - | Data sources to be indexed |
| `requirements` | object | no | `{}` | Non-functional requirements (latency, accuracy, compliance) |
| `scale_expectations` | object | no | `{ queries_per_day: 1000 }` | Expected scale and growth |
| `mode` | enum | no | `interactive` | Execution mode: `yolo`, `interactive`, `preflight` |
| `output_format` | enum | no | `markdown` | Output format: `markdown`, `json`, `yaml` |
| `budget_constraint` | string | no | - | Monthly budget ceiling for infrastructure |

## Interactive Flow

### Step 1: Use Case Discovery

```
Atlas: What problem are you solving with RAG?

Please describe your use case:
  1. Customer support / FAQ chatbot
  2. Internal knowledge base search
  3. Document Q&A (contracts, legal, technical)
  4. Call transcript analysis and extraction
  5. Code documentation assistant
  6. Multi-modal RAG (text + images + tables)
  7. Custom (describe your use case)

> [user input]

Follow-up: Who are the end users?
  - Internal employees
  - External customers
  - Developers / technical users
  - Mixed audience

> [user input]
```

### Step 2: Data Source Analysis

```
Atlas: Let's understand your data landscape.

What data sources will feed the RAG pipeline?
  (select all that apply)

  [ ] PDF documents
  [ ] HTML / web pages
  [ ] Markdown / text files
  [ ] Code repositories
  [ ] Call transcripts (audio/text)
  [ ] Database records (SQL/NoSQL)
  [ ] API responses (JSON/XML)
  [ ] Confluence / Notion / Wiki pages
  [ ] Slack / Teams messages
  [ ] Email archives
  [ ] Spreadsheets (CSV/Excel)
  [ ] Other: ___________

> [user selection]

Follow-up questions per source:
  - Approximate volume? (number of documents, total size)
  - Update frequency? (static, daily, real-time)
  - Document structure? (structured, semi-structured, unstructured)
  - Average document length?
  - Languages present?
```

### Step 3: Scale and Performance

```
Atlas: Let's size the system.

Expected query volume:
  - Queries per day: ___
  - Peak queries per second: ___
  - Expected growth rate: ___

Latency requirements:
  1. Real-time (< 1 second end-to-end)
  2. Near real-time (1-3 seconds)
  3. Batch-friendly (3-10 seconds acceptable)
  4. Offline processing (minutes acceptable)

> [user input]

Data freshness requirements:
  1. Real-time indexing (seconds)
  2. Near real-time (minutes)
  3. Periodic refresh (hourly/daily)
  4. Static corpus (indexed once)

> [user input]
```

### Step 4: Accuracy and Quality

```
Atlas: Let's define quality expectations.

Accuracy requirements:
  1. Best-effort (acceptable for general Q&A)
  2. High accuracy (enterprise knowledge base)
  3. Critical accuracy (legal, medical, compliance)
  4. Exact match required (regulatory, audit)

> [user input]

Hallucination tolerance:
  1. Low tolerance - must cite sources, flag uncertainty
  2. Medium tolerance - general accuracy sufficient
  3. Zero tolerance - only return verbatim excerpts

> [user input]

Do you need:
  [ ] Source citation with every answer
  [ ] Confidence scores
  [ ] Groundedness verification
  [ ] Answer traceability / audit trail
  [ ] Multi-language support
```

### Step 5: Architecture Review

```
Atlas: Here is the proposed architecture.

=== RAG Pipeline Architecture ===

[Data Sources] --> [Document Loader] --> [Chunking]
                                              |
                                    [Embedding Model]
                                              |
                                       [VectorDB]
                                              |
[User Query] --> [Query Transform] --> [Retriever]
                                              |
                                      [Reranker]
                                              |
                                   [Prompt Template]
                                              |
                                       [LLM] --> [Response]

Component Decisions:
  - Chunking: {strategy} ({rationale})
  - Embeddings: {model} ({rationale})
  - VectorDB: {database} ({rationale})
  - Retrieval: {strategy} ({rationale})
  - Reranking: {model} ({rationale})
  - LLM: {model} ({rationale})

Estimated Monthly Cost:
  - Embeddings: ${amount}/month
  - VectorDB: ${amount}/month
  - LLM inference: ${amount}/month
  - Infrastructure: ${amount}/month
  - Total: ${total}/month

Proceed with this architecture? [Y/n]
```

## Output

The task produces the following artifacts:

### 1. Architecture Document (`docs/architecture/rag-architecture.md`)
- Executive summary
- Use case description
- Data flow diagram
- Component specifications with rationale
- Technology decision records (ADRs)
- Scaling strategy
- Security considerations
- Monitoring and observability plan

### 2. Component Diagram
- Mermaid or ASCII diagram showing data flow
- Component interactions and dependencies
- External service integrations

### 3. Technology Decisions
- Embedding model selection with benchmarks
- VectorDB comparison matrix
- Chunking strategy rationale
- Retrieval strategy evaluation
- LLM selection and cost analysis

### 4. Cost Estimate
- Per-component cost breakdown
- Scale-based projections (current, 3-month, 12-month)
- Cost optimization recommendations

## Error Handling

| Error | Cause | Resolution | Recovery |
|-------|-------|------------|----------|
| Incomplete Requirements | User skips critical inputs | Re-prompt for missing required fields | Show which fields are missing and why they matter |
| Incompatible Choices | Selected components conflict | Alert user to conflicts and suggest alternatives | Present compatible option matrix |
| Budget Exceeded | Architecture cost exceeds constraint | Propose cost-optimized alternatives | Show tradeoff analysis (cost vs quality vs latency) |
| Unsupported Data Source | Data source type not handled | Suggest preprocessing steps or custom loaders | Recommend data transformation pipeline |
| Scale Mismatch | Requirements exceed component limits | Recommend distributed architecture | Present scaling tiers with component swaps |
| Missing Dependencies | Required tools or APIs unavailable | List prerequisites and installation steps | Provide setup script or link to documentation |

## Pre-Conditions

```yaml
pre-conditions:
  - "[ ] Use case description provided or elicited"
  - "[ ] At least one data source identified"
  - "[ ] Scale expectations defined (even rough estimates)"
```

## Post-Conditions

```yaml
post-conditions:
  - "[ ] Architecture document generated with all sections"
  - "[ ] All component choices documented with rationale"
  - "[ ] Cost estimate produced within budget constraints"
  - "[ ] Architecture reviewed and approved by stakeholders"
```

## Acceptance Criteria

```yaml
acceptance-criteria:
  - "[ ] Architecture covers ingestion, indexing, retrieval, and generation stages"
  - "[ ] Every technology choice includes rationale and alternatives considered"
  - "[ ] Cost estimate is realistic and within stated budget constraints"
  - "[ ] Architecture supports stated scale expectations"
  - "[ ] Security and compliance requirements are addressed"
```

## Performance

```yaml
duration_expected: 15-30 min (interactive), 5-10 min (yolo)
cost_estimated: $0.01-0.05
token_usage: ~5,000-15,000 tokens
```

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies:
  - choose-chunking
  - implement-retrieval
tags:
  - architecture
  - rag
  - design
  - planning
updated_at: 2026-02-09
```

## Related

- **Agent:** @rag-ai-engineer (Atlas)
- **Downstream Tasks:** `*build-pipeline`, `*choose-chunking`, `*implement-retrieval`
- **Collaborators:** @vectordb-advisor (Vex) for VectorDB selection, @eval-guardian (Sage) for evaluation strategy, @prompt-engineer (Lyra) for prompt design
- **Templates:** `rag-architecture-doc.md`
- **Checklists:** `production-readiness.md`, `rag-pipeline-review.md`
