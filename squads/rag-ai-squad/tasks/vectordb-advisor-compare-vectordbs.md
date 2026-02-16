# Task: Compare Vector Databases

**Purpose**: Compare and evaluate vector database options for a specific use case, delivering a scored comparison matrix with a clear recommendation

**Elicit**: true

---

## Execution Modes

**Choose your execution mode:**

### 1. YOLO Mode - Fast, Autonomous (0-1 prompts)
- Autonomous decision making with logging
- Minimal user interaction
- **Best for:** Quick comparison with known requirements

### 2. Interactive Mode - Balanced, Educational (5-10 prompts) **[DEFAULT]**
- Explicit decision checkpoints
- Educational explanations at each stage
- **Best for:** Learning, complex decisions, team buy-in

### 3. Pre-Flight Planning - Comprehensive Upfront Planning
- Task analysis phase (identify all ambiguities)
- Zero ambiguity execution
- **Best for:** Production selection, high-stakes decisions

**Parameter:** `mode` (optional, default: `interactive`)

---

## Task Definition (AIOS Task Format V1.0)

```yaml
task: compareVectordbs()
responsavel: "@vectordb-advisor"
responsavel_type: agent
atomic_layer: task
elicit: true

**Entrada:**
- campo: use_case
  tipo: string
  origem: User Input
  obrigatorio: true
  validacao: Description of the retrieval use case (e.g., RAG, semantic search, recommendation)

- campo: scale_requirements
  tipo: object
  origem: User Input
  obrigatorio: true
  validacao: |
    Expected data volume (vectors count), query throughput (QPS), growth projections

- campo: budget
  tipo: object
  origem: User Input
  obrigatorio: false
  validacao: |
    Monthly budget range, willingness to pay for managed vs self-hosted

- campo: feature_requirements
  tipo: array
  origem: User Input
  obrigatorio: false
  validacao: |
    Specific features needed (filtering, multi-tenancy, hybrid search, GPU support)

**Saida:**
- campo: comparison_matrix
  tipo: object
  destino: File (comparison-matrix.md)
  persistido: true

- campo: recommendation
  tipo: object
  destino: File (recommendation.md)
  persistido: true

- campo: migration_path
  tipo: object
  destino: Memory
  persistido: false

- campo: cost_projection
  tipo: object
  destino: File (cost-projection.md)
  persistido: true
```

---

## Pre-Conditions

**Purpose:** Validate prerequisites BEFORE task execution (blocking)

**Checklist:**

```yaml
pre-conditions:
  - "[ ] Use case is clearly defined with measurable requirements"
    tipo: pre-condition
    blocker: true
    validacao: |
      Check that the user has a clear retrieval use case defined
    error_message: "Pre-condition failed: Use case must be defined before comparison"
  - "[ ] Scale requirements include at minimum vector count and QPS targets"
    tipo: pre-condition
    blocker: true
    validacao: |
      Check that minimum scale parameters are provided or estimated
    error_message: "Pre-condition failed: Scale requirements needed for meaningful comparison"
```

---

## Post-Conditions

**Purpose:** Validate execution success AFTER task completes

**Checklist:**

```yaml
post-conditions:
  - "[ ] Comparison matrix covers all relevant candidates with consistent scoring"
    tipo: post-condition
    blocker: true
    validacao: |
      Verify all candidates scored on same criteria with evidence
    error_message: "Post-condition failed: Comparison matrix incomplete or inconsistent"
  - "[ ] Recommendation is backed by data and aligned with stated requirements"
    tipo: post-condition
    blocker: true
    validacao: |
      Verify recommendation matches stated priorities and constraints
    error_message: "Post-condition failed: Recommendation not data-backed"
```

---

## Acceptance Criteria

**Purpose:** Definitive pass/fail criteria for task completion

**Checklist:**

```yaml
acceptance-criteria:
  - "[ ] At least 3 VectorDB candidates evaluated with scores"
    tipo: acceptance-criterion
    blocker: true
    validacao: |
      Assert minimum 3 candidates in comparison matrix
    error_message: "Acceptance criterion not met: Fewer than 3 candidates evaluated"
  - "[ ] Cost projection provided for recommended option at stated scale"
    tipo: acceptance-criterion
    blocker: true
    validacao: |
      Assert cost projection exists and is realistic
    error_message: "Acceptance criterion not met: Missing cost projection"
  - "[ ] Migration path documented if switching from existing solution"
    tipo: acceptance-criterion
    blocker: false
    validacao: |
      Assert migration path exists when applicable
    error_message: "Acceptance criterion not met: Migration path missing"
```

---

## Tools

**External/shared resources used by this task:**

- **Tool:** vectordb-benchmark-data
  - **Purpose:** Reference benchmark data for VectorDB comparison
  - **Source:** squads/rag-ai-squad/data/vectordb-benchmarks.yaml

- **Tool:** pricing-calculator
  - **Purpose:** VectorDB cost modeling and projection
  - **Source:** squads/rag-ai-squad/tools/pricing-calculator.py

---

## Scripts

**Agent-specific code for this task:**

- **Script:** compare-vectordbs.py
  - **Purpose:** Generate comparison matrices and cost projections
  - **Language:** Python
  - **Location:** squads/rag-ai-squad/scripts/compare-vectordbs.py

---

## Error Handling

**Strategy:** fallback

**Common Errors:**

1. **Error:** Insufficient Requirements
   - **Cause:** User provides vague or incomplete use case description
   - **Resolution:** Re-elicit with targeted questions about data volume, query patterns, latency
   - **Recovery:** Use industry defaults and flag estimates as rough

2. **Error:** Budget Not Specified
   - **Cause:** User cannot provide budget range
   - **Resolution:** Present options across price tiers (free, mid, enterprise)
   - **Recovery:** Include all tiers in comparison, let user filter

3. **Error:** Unknown Use Case Pattern
   - **Cause:** Use case does not match standard retrieval patterns
   - **Resolution:** Break down into sub-problems with known patterns
   - **Recovery:** Recommend proof-of-concept with 2 candidates

4. **Error:** Stale Pricing Data
   - **Cause:** VectorDB pricing changes frequently
   - **Resolution:** Note pricing date and recommend verification
   - **Recovery:** Provide relative cost ratios instead of absolute numbers

---

## Performance

**Expected Metrics:**

```yaml
duration_expected: 10-30 min (estimated)
cost_estimated: $0.005-0.020
token_usage: ~4,000-12,000 tokens
```

**Optimization Notes:**
- Cache comparison matrices for common use case patterns; reuse scoring rubrics across sessions

---

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies:
  - N/A
tags:
  - vectordb
  - comparison
  - infrastructure
  - selection
updated_at: 2026-02-09
```

---

## Elicitation

### Step 1: Use Case Understanding

```
What is your primary retrieval use case?

1. **RAG (Retrieval-Augmented Generation)** - Augmenting LLM responses with retrieved context
2. **Semantic Search** - Finding similar documents/passages by meaning
3. **Recommendation System** - Item-to-item or user-to-item similarity
4. **Anomaly Detection** - Finding outliers in vector space
5. **Multi-modal Search** - Image + text cross-modal retrieval
6. **Other** - Describe your use case

Which use case? [1-6]:
```

**Capture:** `{use_case}`

### Step 2: Scale Requirements

```
Let's understand your scale requirements:

1. **Vector count**: How many vectors will you store?
   - Small: < 100K vectors
   - Medium: 100K - 10M vectors
   - Large: 10M - 100M vectors
   - Massive: > 100M vectors

2. **Vector dimensions**: What embedding dimensions?
   (e.g., 384, 768, 1024, 1536, 3072)

3. **Query throughput**: Expected queries per second (QPS)?
   - Low: < 10 QPS
   - Medium: 10-100 QPS
   - High: 100-1000 QPS
   - Very High: > 1000 QPS

4. **Growth projection**: Expected growth over 12 months?
   - Stable (< 2x)
   - Moderate (2-5x)
   - Rapid (5-10x)
   - Explosive (> 10x)

Enter your answers [vector_count, dimensions, QPS, growth]:
```

**Capture:** `{scale_requirements}`

### Step 3: Budget & Infrastructure Preferences

```
Budget and infrastructure preferences:

1. **Monthly budget range**:
   - Free / Open-source only
   - $0 - $100/month
   - $100 - $500/month
   - $500 - $2,000/month
   - $2,000+/month
   - No fixed budget (optimize for performance)

2. **Deployment preference**:
   - Fully managed (SaaS) - minimal ops
   - Self-hosted on cloud (AWS/GCP/Azure)
   - Self-hosted on-premises
   - Hybrid (managed with self-hosted option)
   - No preference

3. **Cloud provider** (if applicable):
   - AWS
   - Google Cloud
   - Azure
   - Multi-cloud
   - No cloud (on-premises)

Enter your preferences [budget, deployment, cloud]:
```

**Capture:** `{budget}`, `{deployment_preference}`, `{cloud_provider}`

### Step 4: Feature Requirements

```
Which features are important to you? (select all that apply)

1. [ ] **Metadata filtering** - Filter by attributes during search
2. [ ] **Hybrid search** - BM25 + semantic in one query
3. [ ] **Multi-tenancy** - Isolated namespaces per tenant
4. [ ] **Real-time updates** - Low-latency upsert/delete
5. [ ] **GPU acceleration** - Hardware-accelerated search
6. [ ] **Quantization** - Vector compression (INT8, binary)
7. [ ] **RBAC / Auth** - Role-based access control
8. [ ] **Backups & DR** - Automated backups and disaster recovery
9. [ ] **SDK support** - Python, JS/TS, Go, Rust SDKs
10. [ ] **LangChain integration** - Native LangChain/LlamaIndex support
11. [ ] **Sparse vectors** - Native sparse vector support
12. [ ] **Multi-vector** - Store multiple vectors per document

Select features [comma-separated numbers]:
```

**Capture:** `{feature_requirements}`

---

## Process

### VectorDB Knowledge Base

Vex uses the following reference knowledge when evaluating candidates:

#### Pinecone
- **Type:** Fully managed SaaS
- **Strengths:** Serverless option (pay-per-query), excellent metadata filtering, low-latency at scale, strong LangChain integration, namespaces for multi-tenancy
- **Weaknesses:** Vendor lock-in, no self-hosted option, limited query flexibility (no hybrid search native until recently), cost scales with stored vectors
- **Best for:** Production RAG at scale, teams wanting zero-ops, serverless pay-per-use model
- **Pricing model:** Serverless (read/write units) or pod-based (fixed capacity)
- **Max dimensions:** 20,000
- **Distance metrics:** Cosine, Euclidean, Dot Product
- **Unique features:** Serverless architecture, integrated inference API, sparse-dense vectors

#### Weaviate
- **Type:** Open-source with managed cloud option
- **Strengths:** Native hybrid search (BM25 + vector), module ecosystem (vectorizers, rerankers), multi-tenancy, GraphQL API, excellent filtering
- **Weaknesses:** Higher resource consumption, complex module configuration, steeper learning curve
- **Best for:** Hybrid search use cases, multi-tenant SaaS applications, teams wanting flexibility with managed option
- **Pricing model:** Self-hosted (free), Weaviate Cloud (pay-per-resource)
- **Max dimensions:** 65,535
- **Distance metrics:** Cosine, L2, Dot, Manhattan, Hamming
- **Unique features:** Modules (text2vec, generative), native BM25, multi-tenancy with data isolation

#### Chroma
- **Type:** Open-source, local-first
- **Strengths:** Extremely simple API, zero-config local setup, great for prototyping, Python-native, embedded mode
- **Weaknesses:** Limited scalability (single-node), no native hybrid search, fewer production features, early-stage managed offering
- **Best for:** Prototyping, local development, small-scale applications, learning RAG
- **Pricing model:** Self-hosted (free), Chroma Cloud (early access)
- **Max dimensions:** No hard limit
- **Distance metrics:** Cosine, L2, IP (Inner Product)
- **Unique features:** In-process embedding, dead-simple API, persistent local storage

#### Qdrant
- **Type:** Open-source with managed cloud
- **Strengths:** Excellent filtering (payload indexing), quantization (scalar, product, binary), fast HNSW, Rust performance, sparse vector support
- **Weaknesses:** Smaller community than alternatives, fewer integrations, managed cloud is newer
- **Best for:** High-performance filtering use cases, cost-sensitive deployments needing quantization, hybrid sparse+dense search
- **Pricing model:** Self-hosted (free), Qdrant Cloud (pay-per-resource), hybrid cloud option
- **Max dimensions:** 65,535
- **Distance metrics:** Cosine, Euclid, Dot
- **Unique features:** Named vectors (multi-vector), payload indexing, binary quantization, built-in sparse vectors

#### Milvus
- **Type:** Open-source, distributed
- **Strengths:** Massive scale (billions of vectors), GPU acceleration (NVIDIA RAPIDS), advanced partitioning, strong consistency, mature distributed architecture
- **Weaknesses:** Complex deployment (etcd, MinIO, Pulsar), heavy resource requirements, steeper ops burden
- **Best for:** Massive-scale deployments (100M+ vectors), GPU-accelerated search, enterprise with dedicated infra teams
- **Pricing model:** Self-hosted (free), Zilliz Cloud (managed Milvus, pay-per-resource)
- **Max dimensions:** 32,768
- **Distance metrics:** L2, IP, Cosine, Jaccard, Hamming
- **Unique features:** GPU index (CAGRA, GPU-IVF), dynamic schema, partition keys, range search

#### FAISS (Facebook AI Similarity Search)
- **Type:** Library (not a database)
- **Strengths:** Fastest in-memory search, extensive index types (IVF, HNSW, PQ, OPQ, ScaNN), GPU support, mature and battle-tested
- **Weaknesses:** No persistence (DIY), no filtering, no API server, no CRUD operations, requires custom wrapper
- **Best for:** Batch processing, offline search, embedded in custom applications, maximum raw performance
- **Pricing model:** Free (library only, you provide infrastructure)
- **Max dimensions:** No hard limit
- **Distance metrics:** L2, IP (cosine via normalization)
- **Unique features:** Product quantization, IVF+PQ compression, GPU acceleration, memory-mapped indexes

#### pgvector
- **Type:** PostgreSQL extension
- **Strengths:** Leverage existing PostgreSQL infrastructure, SQL interface, ACID transactions, combine with relational data, no new infra
- **Weaknesses:** Slower than dedicated VectorDBs at scale, limited index types (IVFFlat, HNSW), no built-in quantization, single-node scaling
- **Best for:** Teams with existing PostgreSQL, small-to-medium vector workloads, hybrid relational+vector queries
- **Pricing model:** Free extension, use existing PostgreSQL (Supabase, Neon, RDS, etc.)
- **Max dimensions:** 2,000 (HNSW), 16,000 (IVFFlat)
- **Distance metrics:** L2, IP, Cosine, L1 (Manhattan)
- **Unique features:** SQL queries, JOIN with relational data, ACID compliance, familiar tooling

---

### Step 1: Gather Requirements

```
Vex: Let me understand your retrieval infrastructure needs.

I'll evaluate your requirements across these dimensions:
- Performance (latency, throughput)
- Scale (vector count, growth)
- Features (filtering, hybrid search, multi-tenancy)
- Operations (managed vs self-hosted, monitoring)
- Cost (TCO at current and projected scale)
- Ecosystem (SDK support, integrations)
```

- Collect all elicitation responses
- Validate completeness of requirements
- Identify any gaps or ambiguities

### Step 2: Define Evaluation Criteria

Based on collected requirements, weight the evaluation criteria:

```
Evaluation Criteria (weighted by your priorities):

| Criterion          | Weight | Description                                    |
|--------------------|--------|------------------------------------------------|
| Performance        | {w1}%  | Query latency p50/p99, indexing speed          |
| Scalability        | {w2}%  | Max vectors, horizontal scaling, partitioning  |
| Features           | {w3}%  | Filtering, hybrid search, multi-tenancy        |
| Ease of Use        | {w4}%  | API design, SDK quality, documentation         |
| Operational Cost   | {w5}%  | TCO including infra, ops, and engineering time |
| Ecosystem          | {w6}%  | LangChain, LlamaIndex, community, support     |
| Reliability        | {w7}%  | Durability, backups, consistency guarantees    |

Total: 100%
```

### Step 3: Benchmark Candidates

For each candidate VectorDB, score against criteria:

```
Scoring Scale:
  5 = Excellent (best-in-class)
  4 = Good (meets requirements well)
  3 = Adequate (meets minimum requirements)
  2 = Weak (partially meets requirements)
  1 = Poor (does not meet requirements)
  0 = N/A (feature not available)
```

### Step 4: Compare Pricing

Generate cost projections at stated scale:

```
Cost Projection Template:

| VectorDB  | Monthly (Current) | Monthly (12mo) | Annual TCO | $/1M queries |
|-----------|-------------------|----------------|------------|--------------|
| Pinecone  | $XXX              | $XXX           | $X,XXX     | $X.XX        |
| Weaviate  | $XXX              | $XXX           | $X,XXX     | $X.XX        |
| Qdrant    | $XXX              | $XXX           | $X,XXX     | $X.XX        |
| pgvector  | $XXX              | $XXX           | $X,XXX     | $X.XX        |

Notes:
- Self-hosted costs include estimated infrastructure + engineering time
- Managed costs based on published pricing at stated scale
- Engineering time valued at $150/hr default
```

### Step 5: Evaluate Scalability

```
Scaling Assessment:

| VectorDB  | Current Scale | 12mo Scale | Scaling Strategy         | Risk  |
|-----------|---------------|------------|--------------------------|-------|
| Pinecone  | OK            | OK         | Serverless auto-scale    | Low   |
| Milvus    | OK            | OK         | Shard + partition         | Med   |
| Qdrant    | OK            | Needs plan | Add nodes + rebalance    | Med   |
| Chroma    | OK            | Risky      | Single-node limit        | High  |
```

### Step 6: Assess Managed vs Self-Hosted

For each candidate, evaluate operational burden:

```
Operational Assessment:

| VectorDB  | Managed Option | Self-Hosted Effort | Monitoring | Backup/DR   |
|-----------|----------------|--------------------|------------|-------------|
| Pinecone  | Only managed   | N/A                | Built-in   | Automatic   |
| Weaviate  | Weaviate Cloud | Medium (Docker)    | Module     | Manual      |
| Qdrant    | Qdrant Cloud   | Low (single binary)| Basic      | Snapshots   |
| Milvus    | Zilliz Cloud   | High (distributed) | Grafana    | Manual      |
| pgvector  | Supabase/Neon  | Low (PG extension) | PG tools   | PG backups  |
```

### Step 7: Generate Comparison Matrix

Produce the final scored matrix:

```
COMPARISON MATRIX

| Criterion      | Weight | Pinecone | Weaviate | Qdrant | Milvus | pgvector | Chroma |
|----------------|--------|----------|----------|--------|--------|----------|--------|
| Performance    | {w1}%  | X.X      | X.X      | X.X    | X.X    | X.X      | X.X    |
| Scalability    | {w2}%  | X.X      | X.X      | X.X    | X.X    | X.X      | X.X    |
| Features       | {w3}%  | X.X      | X.X      | X.X    | X.X    | X.X      | X.X    |
| Ease of Use    | {w4}%  | X.X      | X.X      | X.X    | X.X    | X.X      | X.X    |
| Cost           | {w5}%  | X.X      | X.X      | X.X    | X.X    | X.X      | X.X    |
| Ecosystem      | {w6}%  | X.X      | X.X      | X.X    | X.X    | X.X      | X.X    |
| Reliability    | {w7}%  | X.X      | X.X      | X.X    | X.X    | X.X      | X.X    |
|----------------|--------|----------|----------|--------|--------|----------|--------|
| WEIGHTED TOTAL |  100%  | XX.X     | XX.X     | XX.X   | XX.X   | XX.X     | XX.X   |
| RANK           |        | #X       | #X       | #X     | #X     | #X       | #X     |
```

### Step 8: Make Recommendation

```
RECOMMENDATION

Primary: {top_ranked_db}
  Rationale: {why this is the best fit}
  Risk: {main risk factor}
  Mitigation: {how to mitigate}

Runner-up: {second_ranked_db}
  Rationale: {why this is a good alternative}
  When to prefer: {scenarios where runner-up wins}

Migration Path (if switching):
  1. {step 1}
  2. {step 2}
  3. {step 3}
  Estimated effort: {time estimate}
```

---

## Usage

```
*compare-vectordbs
*compare-vectordbs --use-case "RAG for customer support" --scale "1M vectors"
*compare-vectordbs --budget "$500/month" --cloud aws --managed
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| use_case | string | Yes | - | Primary retrieval use case description |
| scale_requirements | object | Yes | - | Vector count, QPS, dimensions, growth |
| budget | object | No | "no limit" | Monthly budget range and constraints |
| feature_requirements | array | No | [] | Required features list |
| deployment_preference | string | No | "no preference" | managed, self-hosted, hybrid |
| cloud_provider | string | No | "any" | AWS, GCP, Azure, multi-cloud |
| mode | string | No | "interactive" | yolo, interactive, pre-flight |

---

## Output

The task produces:

1. **Comparison Matrix** - Weighted scoring of all candidates across criteria
2. **Recommendation** - Primary and runner-up with rationale
3. **Cost Projection** - Monthly and annual TCO at current and projected scale
4. **Migration Path** - Steps to migrate if switching from existing solution

### Output Example

```
VECTORDB COMPARISON COMPLETE

Use Case: RAG for customer support chatbot
Scale: 2M vectors, 768 dimensions, 50 QPS
Budget: $200-500/month

COMPARISON MATRIX (Top 3):

| Criterion      | Weight | Qdrant  | Pinecone | Weaviate |
|----------------|--------|---------|----------|----------|
| Performance    | 25%    | 4.5     | 4.0      | 3.5      |
| Scalability    | 15%    | 4.0     | 5.0      | 4.0      |
| Features       | 20%    | 4.5     | 3.5      | 5.0      |
| Ease of Use    | 15%    | 4.0     | 5.0      | 3.5      |
| Cost           | 15%    | 5.0     | 3.0      | 4.0      |
| Ecosystem      | 5%     | 3.5     | 4.5      | 4.0      |
| Reliability    | 5%     | 4.0     | 5.0      | 4.0      |
| WEIGHTED TOTAL | 100%   | 4.30    | 4.00     | 4.00     |
| RANK           |        | #1      | #2       | #3       |

RECOMMENDATION: Qdrant Cloud
  - Best balance of performance, features, and cost
  - Native quantization reduces storage costs 4x
  - Excellent filtering via payload indexing
  - Monthly cost: ~$150 at stated scale

RUNNER-UP: Pinecone Serverless
  - Best for zero-ops, pay-per-query model
  - Higher cost at steady-state but scales elastically
  - Monthly cost: ~$350 at stated scale

-- Vex, optimizing retrieval infrastructure
```

---

## Error Handling

| Error | Cause | Resolution | Recovery |
|-------|-------|------------|----------|
| Insufficient Requirements | Vague use case description | Re-elicit with specific questions | Use standard RAG defaults |
| Budget Not Provided | User skips budget question | Show all tiers, let user filter | Include free and paid options |
| Unknown Use Case | Non-standard retrieval pattern | Decompose into known sub-patterns | Recommend PoC with 2 candidates |
| Stale Pricing | VectorDB pricing changes | Note date, recommend verification | Use relative ratios |
| Scale Exceeds All Options | Requirements beyond single-DB capacity | Recommend distributed or sharded setup | Suggest Milvus or custom FAISS |

---

## Related

- **Agent:** @vectordb-advisor (Vex)
- **Related tasks:**
  - `*configure-index` - Configure the chosen VectorDB's index settings
  - `*select-embeddings` - Choose embedding model to pair with VectorDB
  - `*setup-hybrid-search` - Implement hybrid search on chosen VectorDB
  - `*benchmark-retrieval` - Benchmark the selected VectorDB in production
