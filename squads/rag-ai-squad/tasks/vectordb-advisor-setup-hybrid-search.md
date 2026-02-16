# Task: Setup Hybrid Search

**Purpose**: Implement hybrid search combining BM25 (sparse) and semantic (dense) retrieval with configurable fusion strategies, weight tuning, and quality validation

**Elicit**: true

---

## Execution Modes

**Choose your execution mode:**

### 1. YOLO Mode - Fast, Autonomous (0-1 prompts)
- Autonomous decision making with logging
- Minimal user interaction
- **Best for:** Standard hybrid setup with known VectorDB

### 2. Interactive Mode - Balanced, Educational (5-10 prompts) **[DEFAULT]**
- Explicit decision checkpoints
- Educational explanations at each stage
- **Best for:** Learning hybrid search, tuning fusion weights

### 3. Pre-Flight Planning - Comprehensive Upfront Planning
- Task analysis phase (identify all ambiguities)
- Zero ambiguity execution
- **Best for:** Production hybrid search deployment, SLA requirements

**Parameter:** `mode` (optional, default: `interactive`)

---

## Task Definition (AIOS Task Format V1.0)

```yaml
task: setupHybridSearch()
responsavel: "@vectordb-advisor"
responsavel_type: agent
atomic_layer: task
elicit: true

**Entrada:**
- campo: vectordb
  tipo: string
  origem: User Input
  obrigatorio: true
  validacao: VectorDB that supports or can be augmented with hybrid search

- campo: corpus
  tipo: object
  origem: User Input
  obrigatorio: true
  validacao: |
    Corpus characteristics - language, domain, document types, average document length

- campo: query_types
  tipo: array
  origem: User Input
  obrigatorio: true
  validacao: |
    Types of queries (keyword, natural language, mixed, code, etc.)

- campo: fusion_preferences
  tipo: object
  origem: User Input
  obrigatorio: false
  validacao: |
    Preferred fusion strategy, weight tuning approach, quality requirements

**Saida:**
- campo: hybrid_config
  tipo: object
  destino: File (hybrid-search-config.yaml)
  persistido: true

- campo: bm25_index
  tipo: object
  destino: File (bm25-config.yaml)
  persistido: true

- campo: fusion_strategy
  tipo: object
  destino: File (fusion-strategy.md)
  persistido: true

- campo: weights
  tipo: object
  destino: File (fusion-weights.yaml)
  persistido: true

- campo: quality_metrics
  tipo: object
  destino: File (hybrid-quality-report.md)
  persistido: true
```

---

## Pre-Conditions

**Purpose:** Validate prerequisites BEFORE task execution (blocking)

**Checklist:**

```yaml
pre-conditions:
  - "[ ] VectorDB is configured with semantic search operational"
    tipo: pre-condition
    blocker: true
    validacao: |
      Check that vector/semantic search is already working
    error_message: "Pre-condition failed: Semantic search must be operational - run *configure-index first"
  - "[ ] Corpus is indexed and searchable"
    tipo: pre-condition
    blocker: true
    validacao: |
      Check that documents are indexed in the VectorDB
    error_message: "Pre-condition failed: Corpus must be indexed before hybrid search setup"
```

---

## Post-Conditions

**Purpose:** Validate execution success AFTER task completes

**Checklist:**

```yaml
post-conditions:
  - "[ ] Hybrid search returns results combining both sparse and dense retrieval"
    tipo: post-condition
    blocker: true
    validacao: |
      Verify hybrid search returns fused results from both sources
    error_message: "Post-condition failed: Hybrid search not returning fused results"
  - "[ ] Hybrid search quality equals or exceeds pure semantic search"
    tipo: post-condition
    blocker: true
    validacao: |
      Verify hybrid recall >= semantic-only recall on test queries
    error_message: "Post-condition failed: Hybrid search quality below semantic-only baseline"
```

---

## Acceptance Criteria

**Purpose:** Definitive pass/fail criteria for task completion

**Checklist:**

```yaml
acceptance-criteria:
  - "[ ] BM25 index created and returning results"
    tipo: acceptance-criterion
    blocker: true
    validacao: |
      Assert BM25/sparse retrieval is functional
    error_message: "Acceptance criterion not met: BM25 index not functional"
  - "[ ] Fusion strategy implemented with tuned weights"
    tipo: acceptance-criterion
    blocker: true
    validacao: |
      Assert fusion is configured with optimized weights
    error_message: "Acceptance criterion not met: Fusion not configured"
  - "[ ] Quality comparison vs pure semantic search documented"
    tipo: acceptance-criterion
    blocker: true
    validacao: |
      Assert comparison results available
    error_message: "Acceptance criterion not met: No quality comparison"
```

---

## Tools

**External/shared resources used by this task:**

- **Tool:** bm25-indexer
  - **Purpose:** Build and manage BM25 sparse indexes
  - **Source:** squads/rag-ai-squad/tools/bm25-indexer.py

- **Tool:** fusion-tuner
  - **Purpose:** Optimize fusion weights via grid search or Bayesian optimization
  - **Source:** squads/rag-ai-squad/tools/fusion-tuner.py

---

## Scripts

**Agent-specific code for this task:**

- **Script:** setup-hybrid-search.py
  - **Purpose:** End-to-end hybrid search setup and tuning
  - **Language:** Python
  - **Location:** squads/rag-ai-squad/scripts/setup-hybrid-search.py

---

## Error Handling

**Strategy:** fallback

**Common Errors:**

1. **Error:** VectorDB Does Not Support Native BM25
   - **Cause:** Selected VectorDB lacks built-in sparse search
   - **Resolution:** Implement external BM25 index (Elasticsearch, rank_bm25, or custom)
   - **Recovery:** Set up parallel BM25 index with fusion at application layer

2. **Error:** Fusion Degrades Quality
   - **Cause:** Incorrect fusion weights or mismatched score distributions
   - **Resolution:** Normalize scores before fusion, tune weights with grid search
   - **Recovery:** Fall back to semantic-only while debugging fusion

3. **Error:** BM25 Index Too Large
   - **Cause:** Corpus vocabulary creates oversized inverted index
   - **Resolution:** Apply vocabulary pruning, stop word removal, stemming
   - **Recovery:** Use sub-word tokenization to reduce vocabulary

4. **Error:** Latency Increase from Dual Retrieval
   - **Cause:** Running BM25 + semantic sequentially doubles latency
   - **Resolution:** Run both in parallel, set per-source timeout
   - **Recovery:** Async parallel retrieval with early termination

---

## Performance

**Expected Metrics:**

```yaml
duration_expected: 20-40 min (estimated)
cost_estimated: $0.005-0.020
token_usage: ~5,000-15,000 tokens
```

**Optimization Notes:**
- Run BM25 and semantic in parallel; pre-compute BM25 index; cache fusion results for repeated queries

---

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies:
  - vectordb-advisor-configure-index.md (semantic search must be configured)
tags:
  - hybrid-search
  - bm25
  - fusion
  - retrieval
updated_at: 2026-02-09
```

---

## Elicitation

### Step 1: VectorDB and Current Setup

```
Which VectorDB are you using for semantic search?

1. **Weaviate** - Has native BM25 + vector hybrid search built-in
2. **Pinecone** - Supports sparse-dense vectors natively
3. **Qdrant** - Supports sparse vectors natively
4. **Milvus** - Has experimental hybrid support
5. **pgvector** - Combine with PostgreSQL full-text search (ts_vector)
6. **Chroma** - No native BM25 (need external index)
7. **FAISS** - No native BM25 (need external index)
8. **Other** - Specify

Which VectorDB? [1-8]:
```

**Capture:** `{vectordb}`

**If native hybrid available (Weaviate, Pinecone, Qdrant):**
```
Your VectorDB supports native hybrid search.
Would you like to use the native implementation or a custom fusion layer?

1. **Native** - Use VectorDB's built-in hybrid search (simpler, less control)
2. **Custom** - Build external BM25 + custom fusion (more control, more effort)

Preference? [1-2]:
```

### Step 2: Corpus Characteristics

```
Tell me about your corpus:

1. **Language(s)**: Primary language(s) of your documents
   - English only
   - Multilingual (which languages?)
   - Code / Technical (programming languages)

2. **Domain**:
   - General knowledge
   - Technical documentation
   - Legal / Compliance
   - Medical / Scientific
   - Customer support
   - E-commerce / Product
   - Code / Engineering
   - Other: ___

3. **Document characteristics**:
   - Average document/chunk length: ___ tokens
   - Total documents/chunks: ___
   - Vocabulary richness: Standard / Domain-specific / Highly technical

4. **Content type**:
   - Prose (paragraphs, articles)
   - Structured (tables, lists, key-value)
   - Mixed (prose + structured)
   - Code (source code, configs)

Enter corpus details:
```

**Capture:** `{corpus}`

### Step 3: Query Types

```
What types of queries will users make?

1. [ ] **Keyword queries** - Specific terms, product names, error codes
   Example: "CUDA out of memory error"

2. [ ] **Natural language questions** - Full questions seeking answers
   Example: "How do I increase the batch size for training?"

3. [ ] **Conceptual queries** - Abstract concepts, not specific terms
   Example: "memory optimization techniques for deep learning"

4. [ ] **Exact match queries** - Need specific document by identifier
   Example: "RFC 7231" or "section 4.2.1"

5. [ ] **Multi-aspect queries** - Combine keywords + concepts
   Example: "PyTorch CUDA memory optimization for transformer models"

6. [ ] **Code queries** - Searching for code patterns or functions
   Example: "async batch processing with error handling"

Select query types [comma-separated numbers]:
```

**Capture:** `{query_types}`

### Step 4: Fusion Preferences

```
How should we fuse BM25 and semantic results?

**Fusion Strategies:**

1. **Reciprocal Rank Fusion (RRF)** [RECOMMENDED]
   - Combines rankings, not scores
   - Robust to score distribution differences
   - Formula: RRF(d) = SUM(1 / (k + rank_i(d))) for each retriever i
   - Default k=60 (lower k = more weight to top results)
   - Best for: Most use cases, especially when score scales differ

2. **Weighted Linear Combination**
   - Combines normalized scores: score = alpha * semantic + (1-alpha) * bm25
   - Requires score normalization (min-max or z-score)
   - alpha typically 0.5-0.8 (semantic usually more important)
   - Best for: When fine-grained control over balance is needed

3. **Convex Combination (Weaviate native)**
   - Built-in alpha parameter in Weaviate
   - alpha=1.0 = pure vector, alpha=0.0 = pure BM25
   - No manual normalization needed
   - Best for: Weaviate users wanting simplicity

4. **Distribution-Based Score Fusion (DBSF)**
   - Normalizes based on score distributions
   - More sophisticated than simple min-max
   - Handles outlier scores better
   - Best for: Heterogeneous score distributions

5. **Cascade / Fallback**
   - Try semantic first, fall back to BM25 for low-confidence results
   - Best for: High-precision requirements

Select strategy [1-5]:
```

**Capture:** `{fusion_preferences}`

**Follow-up for weight tuning:**
```
How should we tune the fusion weights?

1. **Manual** - I'll specify weights based on intuition
2. **Grid search** - Systematically test weight combinations
3. **Bayesian optimization** - Efficient automated weight optimization
4. **A/B testing** - Deploy multiple configs and measure user engagement

Weight tuning approach? [1-4]:
```

---

## Process

### Hybrid Search Knowledge Base

#### When Hybrid Search Wins Over Pure Semantic

| Scenario | Why Hybrid Wins | Example |
|----------|-----------------|---------|
| Keyword-specific queries | BM25 excels at exact term matching | "error code E_CONNREFUSED" |
| Rare/domain terms | Semantic models may not encode rare tokens well | "kubectl port-forward" |
| Named entities | BM25 finds exact name matches | "John Smith quarterly report" |
| Short queries | BM25 handles 1-2 word queries well | "pagination" |
| Mixed intent | Combines concept + keyword matching | "React useState hook memory leak" |

#### When Pure Semantic Suffices

| Scenario | Why Semantic Alone Works | Example |
|----------|--------------------------|---------|
| Conceptual queries | Meaning > exact words | "how to handle application state" |
| Paraphrased queries | Semantic captures meaning variants | "automobile" matches "car" |
| Cross-lingual | Semantic embeddings cross languages | "como funciona" matches English docs |
| Typo tolerance | Embeddings are robust to minor typos | "reccomendation system" |

#### Reciprocal Rank Fusion (RRF) Deep Dive

**Formula:**
```
RRF_score(d) = SUM( 1 / (k + rank_i(d)) ) for each retriever i
```

**Parameters:**
- `k` (constant): Controls influence of top-ranked documents
  - k=60 (default): Standard balance
  - k=1-10: Strongly favors top-ranked results
  - k=100+: More uniform weighting across ranks

**Why RRF works well:**
1. Rank-based (not score-based) - immune to score scale differences
2. No normalization needed - BM25 scores and cosine scores are incomparable
3. Rewards agreement - documents ranked high by both retrievers score highest
4. Handles missing documents - if a doc only appears in one retriever, still scored

**Example:**
```
Query: "CUDA memory optimization PyTorch"

Semantic results:         BM25 results:
1. doc_A (cosine: 0.92)  1. doc_C (BM25: 25.3)
2. doc_B (cosine: 0.88)  2. doc_A (BM25: 22.1)
3. doc_D (cosine: 0.85)  3. doc_E (BM25: 20.8)
4. doc_C (cosine: 0.82)  4. doc_B (BM25: 18.5)

RRF scores (k=60):
doc_A: 1/(60+1) + 1/(60+2) = 0.0164 + 0.0161 = 0.0325  <- HIGHEST (top in both)
doc_C: 1/(60+4) + 1/(60+1) = 0.0156 + 0.0164 = 0.0320
doc_B: 1/(60+2) + 1/(60+4) = 0.0161 + 0.0156 = 0.0317
doc_D: 1/(60+3) + 0        = 0.0159              = 0.0159
doc_E: 0        + 1/(60+3) = 0.0159              = 0.0159

Final ranking: doc_A > doc_C > doc_B > doc_D = doc_E
```

#### Weighted Linear Combination Deep Dive

**Formula:**
```
score(d) = alpha * normalize(semantic_score(d)) + (1 - alpha) * normalize(bm25_score(d))
```

**Normalization methods:**
- **Min-Max:** `norm(s) = (s - min) / (max - min)` - simple, sensitive to outliers
- **Z-Score:** `norm(s) = (s - mean) / std` - robust to outliers
- **Percentile:** `norm(s) = percentile_rank(s)` - most robust

**Alpha tuning guide:**
| alpha | Bias | Best For |
|-------|------|----------|
| 0.9 | Strong semantic | Conceptual, multilingual queries |
| 0.7 | Semantic-leaning | General RAG (most common) |
| 0.5 | Equal balance | Mixed keyword + conceptual |
| 0.3 | BM25-leaning | Keyword-heavy, technical docs |
| 0.1 | Strong BM25 | Exact match, code search |

---

### Step 1: Configure BM25 Index

**If native hybrid (Weaviate):**
```python
# Weaviate native hybrid search setup
import weaviate

client = weaviate.connect_to_local()  # or cloud

# BM25 is enabled by default in Weaviate collections
collection = client.collections.create(
    name="Documents",
    vectorizer_config=wvc.config.Configure.Vectorizer.text2vec_openai(),
    # BM25 configuration
    inverted_index_config=wvc.config.Configure.inverted_index(
        bm25_b=0.75,    # Length normalization (0=none, 1=full)
        bm25_k1=1.2,    # Term frequency saturation
        stopwords_preset=wvc.config.StopwordsPreset.EN,
    ),
)
```

**If native hybrid (Pinecone):**
```python
# Pinecone sparse-dense hybrid
from pinecone_text.sparse import BM25Encoder

# Build BM25 encoder
bm25 = BM25Encoder()
bm25.fit(corpus_texts)

# Upsert with sparse-dense vectors
index.upsert(vectors=[{
    "id": doc_id,
    "values": dense_vector,          # From embedding model
    "sparse_values": bm25.encode(text),  # BM25 sparse vector
}])

# Query with hybrid
results = index.query(
    vector=query_dense_vector,
    sparse_vector=bm25.encode(query_text),
    top_k=10,
    alpha=0.7,  # 0=sparse only, 1=dense only
)
```

**If external BM25 (Chroma, FAISS, pgvector):**
```python
# External BM25 with rank_bm25 library
from rank_bm25 import BM25Okapi
import numpy as np

# Build BM25 index
tokenized_corpus = [doc.split() for doc in corpus_texts]
bm25 = BM25Okapi(tokenized_corpus)

# Hybrid search function
def hybrid_search(query, top_k=10, alpha=0.7, rrf_k=60):
    # Semantic search
    query_vector = embed(query)
    semantic_results = vectordb.search(query_vector, top_k=top_k*2)

    # BM25 search
    tokenized_query = query.split()
    bm25_scores = bm25.get_scores(tokenized_query)
    bm25_top = np.argsort(bm25_scores)[::-1][:top_k*2]

    # Reciprocal Rank Fusion
    rrf_scores = {}
    for rank, doc_id in enumerate(semantic_results):
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + 1/(rrf_k + rank + 1)
    for rank, doc_idx in enumerate(bm25_top):
        doc_id = corpus_ids[doc_idx]
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + 1/(rrf_k + rank + 1)

    # Sort by RRF score
    ranked = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    return ranked[:top_k]
```

### Step 2: Setup Semantic Search

```
Semantic Search Verification:

VectorDB: {vectordb}
Index: {index_name}
Embedding model: {model}
Dimensions: {dimensions}
Distance metric: {metric}
Vector count: {count}

Test query: "{sample_query}"
Top result: {top_result} (score: {score})

Status: {OPERATIONAL / ISSUES FOUND}
```

### Step 3: Choose Fusion Strategy

Based on corpus and query analysis:

```
Fusion Strategy Recommendation:

Based on your setup:
  VectorDB: {vectordb}
  Query types: {query_types}
  Corpus: {domain}

Recommended: {strategy}
  Rationale: {why}

Configuration:
  {config_details}
```

### Step 4: Tune Weights

```
Weight Tuning Results:

Method: {grid_search / bayesian / manual}
Test queries: {count}

| Config           | Recall@10 | MRR   | NDCG@10 | Notes         |
|------------------|-----------|-------|---------|---------------|
| Semantic only    | {val}     | {val} | {val}   | Baseline      |
| BM25 only        | {val}     | {val} | {val}   | Baseline      |
| alpha=0.3        | {val}     | {val} | {val}   |               |
| alpha=0.5        | {val}     | {val} | {val}   |               |
| alpha=0.7        | {val}     | {val} | {val}   |               |
| alpha=0.9        | {val}     | {val} | {val}   |               |
| RRF k=60         | {val}     | {val} | {val}   |               |
| RRF k=20         | {val}     | {val} | {val}   |               |

Best config: {config}
  Improvement over semantic only: {+%} recall, {+%} MRR
```

### Step 5: Test with Sample Queries

```
Hybrid Search Quality Check:

Query: "{sample_query}"

Semantic-only results:
  1. {doc} (score: {score})
  2. {doc} (score: {score})
  3. {doc} (score: {score})

BM25-only results:
  1. {doc} (score: {score})
  2. {doc} (score: {score})
  3. {doc} (score: {score})

Hybrid results ({fusion_strategy}):
  1. {doc} (score: {score}) [semantic: #{rank}, BM25: #{rank}]
  2. {doc} (score: {score}) [semantic: #{rank}, BM25: #{rank}]
  3. {doc} (score: {score}) [semantic: #{rank}, BM25: #{rank}]

Assessment: {Hybrid improved / Same / Degraded}
```

### Step 6: Compare vs Pure Semantic

```
Hybrid vs Semantic Comparison:

| Metric      | Semantic Only | Hybrid       | Improvement |
|-------------|---------------|--------------|-------------|
| Recall@5    | {val}         | {val}        | {+/-%}      |
| Recall@10   | {val}         | {val}        | {+/-%}      |
| MRR         | {val}         | {val}        | {+/-%}      |
| NDCG@10     | {val}         | {val}        | {+/-%}      |
| p50 latency | {ms}          | {ms}         | {+/- ms}    |
| p95 latency | {ms}          | {ms}         | {+/- ms}    |

By Query Type:
| Query Type     | Semantic R@10 | Hybrid R@10 | Winner   |
|----------------|---------------|-------------|----------|
| Keyword        | {val}         | {val}       | {winner} |
| Natural lang   | {val}         | {val}       | {winner} |
| Mixed          | {val}         | {val}       | {winner} |

Verdict: {Hybrid recommended / Semantic sufficient}
```

### Step 7: Optimize for Query Types

```
Query-Type Specific Optimization:

For keyword queries: Use higher BM25 weight (alpha=0.4)
For conceptual queries: Use higher semantic weight (alpha=0.8)
For mixed queries: Use balanced fusion (alpha=0.6 or RRF)

Dynamic fusion recommendation:
  - Classify query type at runtime
  - Apply query-specific alpha values
  - Log and monitor per-type performance
```

### Step 8: Document Configuration

```yaml
# hybrid-search-config.yaml
vectordb: {vectordb}
version: "1.0"
created_at: "{timestamp}"

semantic:
  model: {embedding_model}
  dimensions: {dimensions}
  metric: {distance_metric}

bm25:
  implementation: {native/external}
  tokenizer: {tokenizer}
  k1: 1.2
  b: 0.75
  stop_words: {language}

fusion:
  strategy: {rrf/weighted/convex}
  parameters:
    k: 60          # RRF constant
    alpha: 0.7     # Weighted combination alpha
  normalization: {min-max/z-score/percentile}

retrieval:
  top_k_per_source: {value}
  final_top_k: {value}
  reranking: {enabled/disabled}
  reranker_model: {model}

performance:
  expected_p50_ms: {value}
  expected_recall_improvement: "+{value}%"
```

---

## Usage

```
*setup-hybrid-search
*setup-hybrid-search --vectordb weaviate --fusion rrf
*setup-hybrid-search --vectordb pinecone --alpha 0.7
*setup-hybrid-search --compare-only  # Just compare hybrid vs semantic
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| vectordb | string | Yes | - | VectorDB for hybrid search |
| corpus | object | Yes | - | Corpus characteristics (language, domain, size) |
| query_types | array | Yes | - | Types of queries to optimize for |
| fusion_preferences | object | No | RRF (k=60) | Fusion strategy and tuning approach |
| alpha | float | No | 0.7 | Semantic weight for weighted combination |
| rrf_k | int | No | 60 | RRF constant |
| reranking | boolean | No | false | Add reranking stage after fusion |
| mode | string | No | "interactive" | yolo, interactive, pre-flight |

---

## Output

The task produces:

1. **Hybrid Config** - Complete hybrid search configuration YAML
2. **BM25 Index** - BM25/sparse index configuration
3. **Fusion Strategy** - Documented fusion approach with rationale
4. **Tuned Weights** - Optimized fusion weights with tuning results
5. **Quality Report** - Hybrid vs semantic comparison with metrics

---

## Error Handling

| Error | Cause | Resolution | Recovery |
|-------|-------|------------|----------|
| No Native BM25 | VectorDB lacks sparse support | Implement external BM25 index | Use rank_bm25 or Elasticsearch sidecar |
| Fusion Degrades Quality | Bad weights or normalization | Re-tune with grid search | Fall back to semantic while debugging |
| BM25 Index Too Large | Huge vocabulary | Prune vocabulary, add stop words | Sub-word tokenization |
| Latency Doubled | Sequential BM25 + semantic | Parallelize both retrievals | Async with per-source timeout |
| Score Distribution Mismatch | BM25 and cosine scales differ | Use RRF instead of weighted | RRF is rank-based, immune to score scale |

---

## Related

- **Agent:** @vectordb-advisor (Vex)
- **Related tasks:**
  - `*configure-index` - Configure semantic search index (prerequisite)
  - `*optimize-search` - Optimize hybrid search performance
  - `*benchmark-retrieval` - Benchmark hybrid vs semantic quality
  - `*select-embeddings` - Embedding model choice affects hybrid balance
