# Task: Configure Vector Index

**Purpose**: Configure and optimize vector index settings for a chosen VectorDB, including distance metric selection, index type, partitioning strategy, and performance tuning

**Elicit**: true

---

## Execution Modes

**Choose your execution mode:**

### 1. YOLO Mode - Fast, Autonomous (0-1 prompts)
- Autonomous decision making with logging
- Minimal user interaction
- **Best for:** Standard configurations with known parameters

### 2. Interactive Mode - Balanced, Educational (5-10 prompts) **[DEFAULT]**
- Explicit decision checkpoints
- Educational explanations at each stage
- **Best for:** Learning index configuration, non-standard workloads

### 3. Pre-Flight Planning - Comprehensive Upfront Planning
- Task analysis phase (identify all ambiguities)
- Zero ambiguity execution
- **Best for:** Production index deployment, critical workloads

**Parameter:** `mode` (optional, default: `interactive`)

---

## Task Definition (AIOS Task Format V1.0)

```yaml
task: configureIndex()
responsavel: "@vectordb-advisor"
responsavel_type: agent
atomic_layer: task
elicit: true

**Entrada:**
- campo: vectordb_choice
  tipo: string
  origem: User Input
  obrigatorio: true
  validacao: One of - pinecone, weaviate, chroma, qdrant, milvus, faiss, pgvector

- campo: data_profile
  tipo: object
  origem: User Input
  obrigatorio: true
  validacao: |
    Vector dimensions, data volume, update frequency, metadata schema

- campo: query_patterns
  tipo: object
  origem: User Input
  obrigatorio: true
  validacao: |
    Query types (kNN, filtered, range), concurrency patterns, read/write ratio

- campo: performance_targets
  tipo: object
  origem: User Input
  obrigatorio: false
  validacao: |
    Target latency (p50, p95, p99), recall target, throughput requirements

**Saida:**
- campo: index_config
  tipo: object
  destino: File (index-config.yaml)
  persistido: true

- campo: distance_metric
  tipo: string
  destino: Memory
  persistido: false

- campo: partitioning_strategy
  tipo: object
  destino: File (partitioning-strategy.md)
  persistido: true

- campo: tuning_params
  tipo: object
  destino: File (tuning-params.yaml)
  persistido: true
```

---

## Pre-Conditions

**Purpose:** Validate prerequisites BEFORE task execution (blocking)

**Checklist:**

```yaml
pre-conditions:
  - "[ ] VectorDB has been selected (ideally via *compare-vectordbs)"
    tipo: pre-condition
    blocker: true
    validacao: |
      Check that user has a specific VectorDB in mind
    error_message: "Pre-condition failed: VectorDB choice required - run *compare-vectordbs first"
  - "[ ] Data profile is available (dimensions, volume, update patterns)"
    tipo: pre-condition
    blocker: true
    validacao: |
      Check that basic data profile information is provided
    error_message: "Pre-condition failed: Data profile needed for index configuration"
```

---

## Post-Conditions

**Purpose:** Validate execution success AFTER task completes

**Checklist:**

```yaml
post-conditions:
  - "[ ] Index configuration is valid for the chosen VectorDB"
    tipo: post-condition
    blocker: true
    validacao: |
      Verify config parameters are within VectorDB's supported range
    error_message: "Post-condition failed: Index configuration contains invalid parameters"
  - "[ ] Performance targets are achievable with given configuration"
    tipo: post-condition
    blocker: true
    validacao: |
      Verify expected performance aligns with stated targets
    error_message: "Post-condition failed: Configuration unlikely to meet performance targets"
```

---

## Acceptance Criteria

**Purpose:** Definitive pass/fail criteria for task completion

**Checklist:**

```yaml
acceptance-criteria:
  - "[ ] Complete index configuration with all required parameters"
    tipo: acceptance-criterion
    blocker: true
    validacao: |
      Assert index config includes type, metric, and sizing
    error_message: "Acceptance criterion not met: Incomplete index configuration"
  - "[ ] Distance metric selection justified with rationale"
    tipo: acceptance-criterion
    blocker: true
    validacao: |
      Assert distance metric choice is documented with reasoning
    error_message: "Acceptance criterion not met: Distance metric not justified"
  - "[ ] Benchmark results validate configuration"
    tipo: acceptance-criterion
    blocker: false
    validacao: |
      Assert benchmark confirms expected performance (when available)
    error_message: "Acceptance criterion not met: Configuration not benchmarked"
```

---

## Tools

**External/shared resources used by this task:**

- **Tool:** vectordb-config-validator
  - **Purpose:** Validate index configuration parameters against VectorDB constraints
  - **Source:** squads/rag-ai-squad/tools/config-validator.py

- **Tool:** benchmark-runner
  - **Purpose:** Run performance benchmarks against configured index
  - **Source:** squads/rag-ai-squad/tools/benchmark-runner.py

---

## Scripts

**Agent-specific code for this task:**

- **Script:** configure-index.py
  - **Purpose:** Generate and validate index configurations
  - **Language:** Python
  - **Location:** squads/rag-ai-squad/scripts/configure-index.py

---

## Error Handling

**Strategy:** fallback

**Common Errors:**

1. **Error:** Unsupported Index Type
   - **Cause:** Chosen index type not available for the selected VectorDB
   - **Resolution:** Map to closest supported index type
   - **Recovery:** Present available alternatives with trade-off explanation

2. **Error:** Dimension Mismatch
   - **Cause:** Configured dimensions exceed VectorDB maximum
   - **Resolution:** Suggest dimension reduction or alternative VectorDB
   - **Recovery:** Recommend Matryoshka embeddings or PCA for dimension reduction

3. **Error:** Memory Exceeded
   - **Cause:** Index size exceeds available memory at configured parameters
   - **Resolution:** Enable quantization, reduce ef_construction, or add nodes
   - **Recovery:** Calculate minimum memory requirement and recommend sizing

4. **Error:** Partitioning Not Supported
   - **Cause:** Selected VectorDB does not support requested partitioning strategy
   - **Resolution:** Use namespace/collection separation instead
   - **Recovery:** Recommend alternative isolation patterns

---

## Performance

**Expected Metrics:**

```yaml
duration_expected: 10-20 min (estimated)
cost_estimated: $0.003-0.012
token_usage: ~3,000-8,000 tokens
```

**Optimization Notes:**
- Reuse standard configurations for common VectorDB + scale combinations

---

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies:
  - vectordb-advisor-compare-vectordbs.md (optional, for VectorDB selection context)
tags:
  - vectordb
  - index
  - configuration
  - performance
updated_at: 2026-02-09
```

---

## Elicitation

### Step 1: VectorDB Selection

```
Which VectorDB are you configuring?

1. **Pinecone** - Managed SaaS (serverless or pod-based)
2. **Weaviate** - Open-source with managed cloud
3. **Chroma** - Lightweight, local-first
4. **Qdrant** - High-performance with quantization
5. **Milvus** - Distributed, GPU-capable
6. **FAISS** - In-memory library (custom wrapper)
7. **pgvector** - PostgreSQL extension

Which VectorDB? [1-7]:
```

**Capture:** `{vectordb_choice}`

### Step 2: Data Profile

```
Tell me about your data:

1. **Vector dimensions**: What are your embedding dimensions?
   (e.g., 384, 768, 1024, 1536, 3072)

2. **Current vector count**: How many vectors do you have now?
   (e.g., 10K, 500K, 5M, 100M)

3. **Expected growth**: How fast will your data grow?
   - Stable (< 1K new vectors/day)
   - Growing (1K-100K new vectors/day)
   - High-volume (100K+ new vectors/day)

4. **Update frequency**: How often do you update existing vectors?
   - Rarely (append-mostly)
   - Occasionally (weekly updates)
   - Frequently (daily updates)
   - Real-time (continuous updates)

5. **Metadata per vector**: What metadata do you attach?
   - Minimal (< 5 fields, simple types)
   - Moderate (5-20 fields, mixed types)
   - Rich (20+ fields, nested objects, arrays)

Enter your data profile:
```

**Capture:** `{data_profile}`

### Step 3: Query Patterns

```
How will you query this index?

1. **Primary query type**:
   - Pure kNN (nearest neighbor, no filters)
   - Filtered kNN (nearest neighbor + metadata filters)
   - Range search (find all within distance threshold)
   - Hybrid (BM25 + vector)

2. **Top-K range**: How many results per query?
   - Small (1-10 results)
   - Medium (10-50 results)
   - Large (50-200 results)

3. **Read/Write ratio**: What percentage of ops are reads?
   - Read-heavy (> 90% reads)
   - Balanced (50-90% reads)
   - Write-heavy (< 50% reads)

4. **Concurrency**: How many simultaneous queries?
   - Low (< 10 concurrent)
   - Medium (10-100 concurrent)
   - High (100+ concurrent)

Enter your query patterns:
```

**Capture:** `{query_patterns}`

### Step 4: Performance Targets

```
What performance do you need?

1. **Latency targets**:
   - p50 (median): ___ ms
   - p95 (tail): ___ ms
   - p99 (worst case): ___ ms
   (Leave blank for "as fast as possible")

2. **Recall target**: What minimum recall is acceptable?
   - 0.95+ (high quality, may be slower)
   - 0.90-0.95 (balanced)
   - 0.80-0.90 (speed-optimized, some quality loss OK)

3. **Throughput target**: Minimum QPS?
   (Leave blank for "match query patterns")

Enter your targets [p50, p95, p99, recall, QPS]:
```

**Capture:** `{performance_targets}`

---

## Process

### Index Configuration Knowledge Base

#### Distance Metric Selection Guide

| Metric | When to Use | Embedding Models | Notes |
|--------|-------------|------------------|-------|
| **Cosine** | Most common for text embeddings; normalized embeddings | OpenAI, Cohere, Sentence-Transformers (default) | Equivalent to dot product on L2-normalized vectors |
| **Dot Product** | Pre-normalized embeddings; when magnitude matters | OpenAI (already normalized), ColBERT | Fastest computation; requires normalized vectors for cosine equivalence |
| **Euclidean (L2)** | Absolute distance matters; image embeddings | CLIP, image models, some sentence-transformers | Penalizes outlier dimensions more than cosine |
| **Manhattan (L1)** | Sparse-ish vectors; high-dimensional | Rare in practice | More robust to outliers than L2 |
| **Hamming** | Binary vectors; binary quantized embeddings | Binary hash functions | For binary quantization only |

**Rule of thumb:** Start with cosine similarity. Switch to dot product if your embeddings are already L2-normalized. Use L2 only if absolute distances are meaningful in your domain.

#### Index Type Selection by VectorDB

**Pinecone:**
- No user-selectable index type (managed internally)
- Serverless: Automatic scaling and indexing
- Pod-based: p1 (fast, more RAM) or s1 (storage-optimized)

**Weaviate:**
- **HNSW** (default): Best for most workloads, balanced recall/speed
  - `efConstruction`: 128-512 (higher = better recall, slower build)
  - `ef`: 64-256 (higher = better recall, slower query)
  - `maxConnections`: 16-64 (higher = better recall, more memory)
- **Flat**: Brute-force, 100% recall, for small collections (< 10K)
- **Dynamic**: Auto-switches flat -> HNSW at threshold

**Chroma:**
- **HNSW** (default, via hnswlib): Only option
  - `space`: "cosine", "l2", "ip"
  - `construction_ef`: 100-200
  - `search_ef`: 100-200
  - `M`: 16-48

**Qdrant:**
- **HNSW** (default): Primary index type
  - `m`: 16 (connections per node)
  - `ef_construct`: 100-200
  - `full_scan_threshold`: 10000
- **Quantization options:**
  - Scalar (INT8): 4x memory reduction, ~1% quality loss
  - Product Quantization: 8-64x compression, higher quality loss
  - Binary Quantization: 32x compression, use with reranking

**Milvus:**
- **IVF_FLAT**: Inverted file index, exact search within clusters
  - `nlist`: Number of clusters (4 * sqrt(n) recommended)
- **IVF_SQ8**: IVF with scalar quantization
- **IVF_PQ**: IVF with product quantization (high compression)
- **HNSW**: Graph-based, best recall/speed trade-off
  - `M`: 16-64
  - `efConstruction`: 128-512
- **GPU_IVF_FLAT / GPU_CAGRA**: GPU-accelerated indexes
- **SCANN**: Google ScaNN implementation

**FAISS:**
- **Flat**: Brute-force (exact, slow at scale)
- **IVF**: Inverted file (cluster + search)
- **HNSW**: Graph-based (fast, memory-intensive)
- **PQ**: Product quantization (compressed, approximate)
- **IVF+PQ**: Combined (fast + compressed)
- **OPQ**: Optimized PQ with rotation

**pgvector:**
- **IVFFlat**: Inverted file, up to 16,000 dimensions
  - `lists`: Number of lists (rows / 1000 for < 1M, sqrt(rows) for > 1M)
- **HNSW**: Graph-based, up to 2,000 dimensions
  - `m`: 16 (default)
  - `ef_construction`: 64 (default)

---

### Step 1: Analyze Data Profile

```
Vex: Analyzing your data profile for optimal index configuration.

Data Summary:
  VectorDB: {vectordb_choice}
  Dimensions: {dimensions}
  Vector Count: {count} (projected: {projected_count})
  Update Pattern: {update_frequency}
  Metadata: {metadata_complexity}
```

- Map data profile to index constraints
- Identify memory requirements
- Flag any dimension or scale limitations

### Step 2: Choose Distance Metric

```
Distance Metric Recommendation:

Based on your embedding model ({model}) and use case ({use_case}):

  Recommended: {metric}
  Rationale: {why}

  Alternative: {alt_metric}
  When to switch: {when}
```

### Step 3: Configure Index Type

```
Index Configuration:

VectorDB: {vectordb}
Index Type: {index_type}

Parameters:
  {param1}: {value1}  // {explanation}
  {param2}: {value2}  // {explanation}
  {param3}: {value3}  // {explanation}

Memory Estimate: {memory_gb} GB
Build Time Estimate: {build_time}
```

### Step 4: Set Partitioning Strategy

```
Partitioning Strategy:

Approach: {strategy}
  - Partition key: {key}
  - Partition count: {count}
  - Rationale: {why}

Benefits:
  - Reduced search space per query
  - Better cache locality
  - Easier scaling and management
```

### Step 5: Tune Parameters

```
Performance Tuning:

Read Path:
  - ef_search / nprobe: {value}  // recall vs latency trade-off
  - top_k: {value}
  - Filters: {filter_strategy}

Write Path:
  - ef_construction / nlist: {value}
  - Batch size: {value}
  - Flush interval: {value}

Quantization:
  - Type: {quant_type or "none"}
  - Expected compression: {ratio}
  - Expected quality impact: {impact}
```

### Step 6: Test Configuration

```
Verification Plan:

1. Load {sample_size} test vectors
2. Run {query_count} test queries
3. Measure: latency (p50, p95, p99), recall@{k}, throughput
4. Compare against targets
5. Adjust parameters if needed
```

### Step 7: Benchmark Performance

```
Benchmark Results:

| Metric     | Target    | Actual    | Status |
|------------|-----------|-----------|--------|
| p50 latency| {target}  | {actual}  | PASS/FAIL |
| p95 latency| {target}  | {actual}  | PASS/FAIL |
| Recall@{k} | {target}  | {actual}  | PASS/FAIL |
| Throughput | {target}  | {actual}  | PASS/FAIL |
| Memory     | {budget}  | {actual}  | PASS/FAIL |
```

### Step 8: Document Config

Generate final configuration file:

```yaml
# index-config.yaml
vectordb: {vectordb_choice}
version: "1.0"
created_at: "{timestamp}"

index:
  type: {index_type}
  metric: {distance_metric}
  dimensions: {dimensions}

parameters:
  # Build-time parameters
  ef_construction: {value}
  m: {value}
  # Search-time parameters
  ef_search: {value}
  # Quantization
  quantization:
    enabled: {bool}
    type: {type}

partitioning:
  strategy: {strategy}
  key: {key}
  count: {count}

performance:
  expected_p50_ms: {value}
  expected_p95_ms: {value}
  expected_recall: {value}
  expected_qps: {value}
  memory_gb: {value}
```

---

## Usage

```
*configure-index
*configure-index --vectordb qdrant --dimensions 1536 --vectors 5M
*configure-index --vectordb pgvector --performance "p95 < 50ms"
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| vectordb_choice | string | Yes | - | Target VectorDB (pinecone, weaviate, qdrant, etc.) |
| data_profile | object | Yes | - | Dimensions, vector count, update frequency, metadata |
| query_patterns | object | Yes | - | Query types, concurrency, read/write ratio |
| performance_targets | object | No | "balanced" | Latency, recall, throughput targets |
| mode | string | No | "interactive" | yolo, interactive, pre-flight |

---

## Output

The task produces:

1. **index-config.yaml** - Complete index configuration ready for deployment
2. **Distance metric recommendation** - Justified metric selection
3. **Partitioning strategy** - Data partitioning plan if applicable
4. **Tuning parameters** - Search and build-time parameter values
5. **Benchmark results** - Performance validation (when run with test data)

---

## Error Handling

| Error | Cause | Resolution | Recovery |
|-------|-------|------------|----------|
| Unsupported Index Type | Index type not available for VectorDB | Map to closest alternative | Present alternatives with trade-offs |
| Dimension Limit Exceeded | Dimensions exceed VectorDB max | Suggest dimension reduction | Recommend Matryoshka or PCA |
| Memory Exceeded | Index too large for available RAM | Enable quantization or add nodes | Calculate minimum requirement |
| Partitioning Unavailable | VectorDB lacks partitioning | Use collection/namespace isolation | Recommend alternative patterns |
| Performance Target Unachievable | Targets conflict (e.g., max recall + min latency) | Explain trade-offs, ask user to prioritize | Offer multiple configs at different trade-off points |

---

## Related

- **Agent:** @vectordb-advisor (Vex)
- **Related tasks:**
  - `*compare-vectordbs` - Select the VectorDB before configuring
  - `*optimize-search` - Fine-tune search after initial configuration
  - `*benchmark-retrieval` - Benchmark the configured index under load
  - `*select-embeddings` - Embedding model affects dimension and metric choice
