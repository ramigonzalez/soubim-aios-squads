# Task: Select Embedding Model

**Purpose**: Evaluate, benchmark, and select the optimal embedding model for a RAG pipeline based on use case, language requirements, domain specificity, and performance/cost tradeoffs

**Elicit**: true

---

## Execution Modes

**Choose your execution mode:**

### 1. YOLO Mode - Fast, Autonomous (0-1 prompts)
- Autonomous decision making with logging
- Minimal user interaction
- **Best for:** Standard English use case with known constraints

### 2. Interactive Mode - Balanced, Educational (5-10 prompts) **[DEFAULT]**
- Explicit decision checkpoints
- Educational explanations at each stage
- **Best for:** Learning embedding tradeoffs, multi-language scenarios

### 3. Pre-Flight Planning - Comprehensive Upfront Planning
- Task analysis phase (identify all ambiguities)
- Zero ambiguity execution
- **Best for:** Production embedding selection, cost-sensitive deployments

**Parameter:** `mode` (optional, default: `interactive`)

---

## Task Definition (AIOS Task Format V1.0)

```yaml
task: selectEmbeddings()
responsavel: "@vectordb-advisor"
responsavel_type: agent
atomic_layer: task
elicit: true

**Entrada:**
- campo: use_case
  tipo: string
  origem: User Input
  obrigatorio: true
  validacao: |
    RAG use case description - what queries will users make,
    what documents are being searched, accuracy requirements

- campo: languages
  tipo: array
  origem: User Input
  obrigatorio: true
  validacao: |
    Languages present in corpus and queries (e.g., English, multilingual, code)

- campo: domain
  tipo: string
  origem: User Input
  obrigatorio: true
  validacao: |
    Domain of the corpus (general, legal, medical, financial, technical, code)

- campo: constraints
  tipo: object
  origem: User Input
  obrigatorio: false
  validacao: |
    Constraints including budget, latency requirements, hosting preferences (API vs self-hosted)

**Saida:**
- campo: model_recommendation
  tipo: object
  destino: File (embedding-model-recommendation.md)
  persistido: true

- campo: dimension_config
  tipo: object
  destino: File (embedding-config.yaml)
  persistido: true

- campo: benchmark_results
  tipo: object
  destino: File (embedding-benchmark-report.md)
  persistido: true
```

---

## Pre-Conditions

**Purpose:** Validate prerequisites BEFORE task execution (blocking)

**Checklist:**

```yaml
pre-conditions:
  - "[ ] Sample corpus is available for benchmarking"
    tipo: pre-condition
    blocker: false
    validacao: |
      Check that sample documents exist for embedding quality testing
    error_message: "Warning: No sample corpus - recommendation will be based on general benchmarks only"
  - "[ ] Use case and query patterns are defined"
    tipo: pre-condition
    blocker: true
    validacao: |
      Check that the RAG use case is clearly articulated
    error_message: "Pre-condition failed: Define your use case before selecting embeddings"
```

---

## Post-Conditions

**Purpose:** Validate execution success AFTER task completes

**Checklist:**

```yaml
post-conditions:
  - "[ ] Embedding model selected with documented rationale"
    tipo: post-condition
    blocker: true
    validacao: |
      Verify a model has been chosen with clear justification
    error_message: "Post-condition failed: No embedding model selected"
  - "[ ] Dimension configuration documented"
    tipo: post-condition
    blocker: true
    validacao: |
      Verify embedding dimensions and configuration are specified
    error_message: "Post-condition failed: Embedding dimensions not configured"
```

---

## Acceptance Criteria

**Purpose:** Definitive pass/fail criteria for task completion

**Checklist:**

```yaml
acceptance-criteria:
  - "[ ] Model recommendation includes rationale and alternatives"
    tipo: acceptance-criterion
    blocker: true
    validacao: |
      Assert recommendation is documented with reasoning
    error_message: "Acceptance criterion not met: No rationale provided"
  - "[ ] Cost estimate provided for expected query volume"
    tipo: acceptance-criterion
    blocker: true
    validacao: |
      Assert cost projections are calculated
    error_message: "Acceptance criterion not met: No cost estimate"
  - "[ ] Configuration ready for VectorDB integration"
    tipo: acceptance-criterion
    blocker: true
    validacao: |
      Assert embedding config is compatible with chosen VectorDB
    error_message: "Acceptance criterion not met: Config not VectorDB-compatible"
```

---

## Tools

**External/shared resources used by this task:**

- **Tool:** embedding-benchmarker
  - **Purpose:** Run embedding quality benchmarks on sample corpus
  - **Source:** squads/rag-ai-squad/tools/embedding-benchmarker.py

- **Tool:** mteb-leaderboard
  - **Purpose:** Reference MTEB (Massive Text Embedding Benchmark) scores
  - **Source:** https://huggingface.co/spaces/mteb/leaderboard

---

## Scripts

**Agent-specific code for this task:**

- **Script:** select-embeddings.py
  - **Purpose:** Benchmark and compare embedding models
  - **Language:** Python
  - **Location:** squads/rag-ai-squad/scripts/select-embeddings.py

---

## Error Handling

**Strategy:** fallback

**Common Errors:**

1. **Error:** API Rate Limit During Benchmarking
   - **Cause:** Too many embedding requests during model comparison
   - **Resolution:** Add rate limiting and batch embedding requests
   - **Recovery:** Use smaller sample size or benchmark models sequentially

2. **Error:** Model Not Available in Region
   - **Cause:** Some embedding APIs have regional restrictions
   - **Resolution:** Check model availability for deployment region
   - **Recovery:** Use self-hosted alternative or different provider

3. **Error:** Dimension Mismatch with VectorDB
   - **Cause:** Chosen embedding dimensions incompatible with existing index
   - **Resolution:** Verify VectorDB supports the dimension size
   - **Recovery:** Use Matryoshka dimension reduction or re-create index

4. **Error:** Domain-Specific Quality Issues
   - **Cause:** General-purpose model underperforms on domain-specific content
   - **Resolution:** Fine-tune embeddings or use domain-specific model
   - **Recovery:** Test with domain-specific evaluation dataset

---

## Performance

**Expected Metrics:**

```yaml
duration_expected: 15-30 min (estimated)
cost_estimated: $0.005-0.030
token_usage: ~5,000-12,000 tokens
```

**Optimization Notes:**
- Batch sample embeddings; cache benchmark results; compare no more than 4-5 models to avoid cost bloat

---

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies: []
tags:
  - embeddings
  - model-selection
  - benchmarking
  - vectordb
updated_at: 2026-02-10
```

---

## Elicitation

### Step 1: Use Case and Domain

```
Tell me about your RAG use case:

1. **Domain**: What type of content are you searching?
   [1] General knowledge (Wikipedia, web content)
   [2] Technical documentation (APIs, manuals, code docs)
   [3] Legal (contracts, regulations, case law)
   [4] Medical / Scientific (papers, clinical data)
   [5] Financial (reports, filings, market data)
   [6] Customer support (tickets, FAQ, knowledge base)
   [7] Code / Engineering (source code, PRs, issues)
   [8] Mixed / Multiple domains

   Domain? [1-8]:

2. **Query type**: How will users search?
   [1] Short keyword queries (2-5 words)
   [2] Natural language questions (full sentences)
   [3] Long-form queries (paragraphs, detailed descriptions)
   [4] Code snippets or technical patterns
   [5] Mixed query lengths

   Query type? [1-5]:

3. **Accuracy priority**: What matters most?
   [1] Maximum retrieval quality (cost secondary)
   [2] Balance quality and cost
   [3] Minimize cost (acceptable quality)

   Priority? [1-3]:
```

**Capture:** `{use_case}`

### Step 2: Language Requirements

```
What languages are in your corpus and queries?

1. **English only**
   - Largest model selection, best benchmarks

2. **Multilingual (specify)**
   - Requires multilingual embedding model
   - Languages: ___

3. **Code + English**
   - Code-optimized embeddings recommended

4. **Code + Multilingual**
   - Specialized multilingual code models

Language setup? [1-4]:
```

**Capture:** `{languages}`

### Step 3: Hosting Preference

```
How do you want to host the embedding model?

1. **API-based** (OpenAI, Cohere, Voyage AI)
   - Pros: No infrastructure, always latest models, easy scaling
   - Cons: Per-token cost, data leaves your environment, API latency
   - Best for: Most production deployments

2. **Self-hosted** (HuggingFace, Ollama, vLLM)
   - Pros: No per-token cost, data stays local, full control
   - Cons: Infrastructure cost, maintenance, GPU required
   - Best for: Privacy requirements, high volume, on-prem

3. **Hybrid** (API for production, self-hosted for dev/test)
   - Best of both worlds
   - Best for: Cost optimization with flexibility

Hosting? [1-3]:
```

**Capture:** `{hosting_preference}`

### Step 4: Constraints

```
Any constraints to consider?

1. **Max embedding dimensions**: ___  (leave blank for no limit)
   - Lower dimensions = less storage, faster search
   - Higher dimensions = better quality (usually)
   - Common: 256, 384, 768, 1024, 1536, 3072

2. **Max latency per embedding**: ___  (ms, leave blank for no limit)

3. **Monthly budget for embeddings**: $___  (leave blank for no limit)

4. **Data privacy requirements**:
   [1] No restrictions (API is fine)
   [2] Data should not leave cloud region
   [3] Must be self-hosted (no external APIs)
   [4] HIPAA / SOC2 / GDPR compliance required

   Privacy? [1-4]:
```

**Capture:** `{constraints}`

---

## Process

### Embedding Model Knowledge Base

#### Current Top Embedding Models (2025-2026)

| Model | Provider | Dimensions | Context | MTEB Score | Price (per 1M tokens) |
|-------|----------|------------|---------|------------|----------------------|
| text-embedding-3-large | OpenAI | 3072 (configurable) | 8191 | 64.6 | $0.13 |
| text-embedding-3-small | OpenAI | 1536 (configurable) | 8191 | 62.3 | $0.02 |
| embed-v4 | Cohere | 1024 | 512 | 66.3 | $0.10 |
| voyage-3 | Voyage AI | 1024 | 32000 | 67.2 | $0.06 |
| voyage-code-3 | Voyage AI | 1024 | 16000 | 66.8 (code) | $0.06 |
| jina-embeddings-v3 | Jina AI | 1024 | 8192 | 66.0 | $0.02 |
| BGE-M3 | BAAI | 1024 | 8192 | 65.1 | Free (self-hosted) |
| E5-Mistral-7B | Microsoft | 4096 | 32000 | 66.6 | Free (self-hosted) |
| nomic-embed-text | Nomic AI | 768 | 8192 | 62.4 | Free (self-hosted) |
| all-MiniLM-L6-v2 | SBERT | 384 | 512 | 56.3 | Free (self-hosted) |

#### Matryoshka Embeddings (Dimension Reduction)

Some models support Matryoshka Representation Learning (MRL), allowing you to truncate embedding dimensions without significant quality loss:

```python
# OpenAI text-embedding-3 supports native dimension reduction
from openai import OpenAI
client = OpenAI()

# Full dimensions (3072)
full = client.embeddings.create(input="query", model="text-embedding-3-large")

# Reduced dimensions (256) - still high quality
reduced = client.embeddings.create(
    input="query",
    model="text-embedding-3-large",
    dimensions=256  # Matryoshka: truncate to 256 dims
)
```

**Dimension vs Quality Tradeoff (text-embedding-3-large):**
| Dimensions | Relative Quality | Storage per Vector | Search Speed |
|------------|-----------------|-------------------|--------------|
| 3072 | 100% (baseline) | 12.3 KB | Baseline |
| 1536 | ~98.5% | 6.1 KB | ~1.8x faster |
| 1024 | ~97.5% | 4.1 KB | ~2.5x faster |
| 512 | ~95.0% | 2.0 KB | ~4x faster |
| 256 | ~91.0% | 1.0 KB | ~7x faster |

#### Decision Framework

```
START
  │
  ├── Need multilingual?
  │   ├── YES → Cohere embed-v4 or BGE-M3 (self-hosted)
  │   └── NO ─┐
  │            │
  ├── Need code search?
  │   ├── YES → Voyage-code-3 or jina-embeddings-v3
  │   └── NO ─┐
  │            │
  ├── Budget constrained?
  │   ├── YES → text-embedding-3-small (API) or nomic-embed-text (self-hosted)
  │   └── NO ─┐
  │            │
  ├── Maximum quality?
  │   ├── YES → voyage-3 or Cohere embed-v4
  │   └── BALANCED → text-embedding-3-large (reduced dims)
```

### Step 1: Shortlist Models

Based on use case analysis, create a shortlist of 3-4 candidate models.

```
Candidate Models for Your Use Case:

Based on: {domain}, {languages}, {constraints}

| # | Model | Why Shortlisted | Estimated Cost |
|---|-------|-----------------|---------------|
| 1 | {model} | {reason} | ${cost}/1M tokens |
| 2 | {model} | {reason} | ${cost}/1M tokens |
| 3 | {model} | {reason} | ${cost}/1M tokens |
| 4 | {model} | {reason} | ${cost}/1M tokens |

Proceed with benchmarking these models? (yes/no):
```

### Step 2: Benchmark Models

```
Embedding Benchmark Results:

Test corpus: {description}
Test queries: {count}
Metrics: Recall@5, Recall@10, MRR, NDCG@10

| Model | Recall@5 | Recall@10 | MRR | NDCG@10 | Latency (ms) | Cost/1M tok |
|-------|----------|-----------|-----|---------|--------------|------------|
| {model} | {val} | {val} | {val} | {val} | {val} | ${val} |
| {model} | {val} | {val} | {val} | {val} | {val} | ${val} |
| {model} | {val} | {val} | {val} | {val} | {val} | ${val} |
| {model} | {val} | {val} | {val} | {val} | {val} | ${val} |

Quality/Cost ratio:
| Model | Quality Score | Monthly Cost* | Quality/$ |
|-------|---------------|--------------|-----------|
| {model} | {score} | ${cost} | {ratio} |

*Based on {volume} queries/month, {avg_tokens} tokens/query
```

### Step 3: Dimension Optimization

```
Dimension Optimization (if Matryoshka supported):

Model: {selected_model}
Full dimensions: {full_dims}

| Dimensions | Recall@10 | Quality Retention | Storage/Vector | Monthly Storage |
|------------|-----------|-------------------|----------------|----------------|
| {full} | {val} | 100% | {size} | {total} |
| {reduced1} | {val} | {pct}% | {size} | {total} |
| {reduced2} | {val} | {pct}% | {size} | {total} |
| {reduced3} | {val} | {pct}% | {size} | {total} |

Recommended dimensions: {value}
  Rationale: {reason}
```

### Step 4: Generate Configuration

```yaml
# embedding-config.yaml
model:
  name: {model_name}
  provider: {provider}
  version: {version}
  dimensions: {dimensions}
  max_tokens: {max_tokens}

api:
  endpoint: {endpoint}
  key_env: {env_var_name}
  batch_size: {batch_size}
  rate_limit: {requests_per_min}

performance:
  expected_latency_ms: {value}
  throughput_per_sec: {value}

cost:
  price_per_million_tokens: {value}
  estimated_monthly: {value}
  query_volume_assumption: {value}

vectordb_integration:
  distance_metric: {cosine/dot_product/euclidean}
  index_type: {hnsw/ivf/flat}
  quantization: {none/scalar/product}
```

---

## Usage

```
*select-embeddings
*select-embeddings --domain technical --languages english
*select-embeddings --budget 0.05 --self-hosted
*select-embeddings --compare-only openai cohere voyage  # Compare specific models
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| use_case | string | Yes | - | RAG use case description |
| languages | array | Yes | ["english"] | Languages in corpus and queries |
| domain | string | Yes | - | Content domain (general, legal, medical, etc.) |
| constraints | object | No | - | Budget, latency, privacy constraints |
| hosting | string | No | "api" | api, self-hosted, hybrid |
| mode | string | No | "interactive" | yolo, interactive, pre-flight |

---

## Output

The task produces:

1. **Model Recommendation** - Detailed recommendation with rationale and alternatives
2. **Embedding Config** - Production-ready configuration YAML
3. **Benchmark Report** - Quality and performance comparison across candidates
4. **Cost Projection** - Monthly cost estimate for expected query volume
5. **Integration Guide** - How to integrate selected model with VectorDB

---

## Error Handling

| Error | Cause | Resolution | Recovery |
|-------|-------|------------|----------|
| API Key Invalid | Missing or expired embedding API key | Verify API key in environment | Check provider dashboard for key status |
| Rate Limit Hit | Too many benchmark requests | Add rate limiting, reduce sample size | Benchmark models sequentially with delays |
| Dimension Mismatch | Model dims incompatible with VectorDB | Verify VectorDB dimension limits | Use Matryoshka reduction or re-create index |
| Domain Quality Low | General model poor on domain content | Consider domain fine-tuning | Use domain-specific model or larger general model |
| Cost Exceeds Budget | Selected model too expensive | Use smaller model or reduce dimensions | Apply Matryoshka reduction, batch requests |
| Context Too Short | Documents exceed model's max tokens | Chunk documents to fit context window | Use model with longer context (Voyage, E5-Mistral) |

---

## Related

- **Agent:** @vectordb-advisor (Vex)
- **Related tasks:**
  - `*configure-index` - Index configuration depends on embedding dimensions
  - `*setup-hybrid-search` - Embedding quality affects hybrid balance
  - `*implement-cache` - Same embeddings used for semantic cache lookup
  - `*choose-chunking` - Chunk size should respect embedding context window
  - `*benchmark-retrieval` - End-to-end retrieval quality depends on embeddings
