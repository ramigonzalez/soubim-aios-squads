# Task: Implement Semantic Cache

**Purpose**: Implement semantic caching for RAG queries to reduce latency and LLM costs by caching semantically similar queries and their responses

**Elicit**: true

---

## Execution Modes

**Choose your execution mode:**

### 1. YOLO Mode - Fast, Autonomous (0-1 prompts)
- Autonomous decision making with logging
- Minimal user interaction
- **Best for:** Standard caching setup with known query patterns

### 2. Interactive Mode - Balanced, Educational (5-10 prompts) **[DEFAULT]**
- Explicit decision checkpoints
- Educational explanations at each stage
- **Best for:** Learning semantic caching, tuning similarity thresholds

### 3. Pre-Flight Planning - Comprehensive Upfront Planning
- Task analysis phase (identify all ambiguities)
- Zero ambiguity execution
- **Best for:** Production cache deployment, cost-sensitive environments

**Parameter:** `mode` (optional, default: `interactive`)

---

## Task Definition (AIOS Task Format V1.0)

```yaml
task: implementCache()
responsavel: "@vectordb-advisor"
responsavel_type: agent
atomic_layer: task
elicit: true

**Entrada:**
- campo: query_patterns
  tipo: object
  origem: User Input
  obrigatorio: true
  validacao: |
    Query patterns including frequency distribution, average query length,
    semantic clusters, and temporal access patterns

- campo: cache_requirements
  tipo: object
  origem: User Input
  obrigatorio: true
  validacao: |
    Cache requirements including max latency target, cost reduction goal,
    acceptable staleness, and storage constraints

- campo: cache_backend
  tipo: string
  origem: User Input
  obrigatorio: false
  validacao: |
    Preferred cache backend (Redis, in-memory, GPTCache, custom)

**Saida:**
- campo: semantic_cache
  tipo: object
  destino: File (semantic-cache-config.yaml)
  persistido: true

- campo: eviction_policy
  tipo: object
  destino: File (cache-eviction-policy.yaml)
  persistido: true

- campo: hit_rate_metrics
  tipo: object
  destino: File (cache-metrics-report.md)
  persistido: true

- campo: cache_implementation
  tipo: object
  destino: File (src/cache/semantic_cache.py)
  persistido: true
```

---

## Pre-Conditions

**Purpose:** Validate prerequisites BEFORE task execution (blocking)

**Checklist:**

```yaml
pre-conditions:
  - "[ ] Embedding model is configured and operational"
    tipo: pre-condition
    blocker: true
    validacao: |
      Check that embedding model is available for query vectorization
    error_message: "Pre-condition failed: Embedding model must be configured - run *select-embeddings first"
  - "[ ] RAG pipeline is functional with baseline latency measured"
    tipo: pre-condition
    blocker: true
    validacao: |
      Check that the RAG pipeline works end-to-end with known latency
    error_message: "Pre-condition failed: RAG pipeline must be operational with baseline metrics"
```

---

## Post-Conditions

**Purpose:** Validate execution success AFTER task completes

**Checklist:**

```yaml
post-conditions:
  - "[ ] Semantic cache returns cached results for similar queries"
    tipo: post-condition
    blocker: true
    validacao: |
      Verify that semantically similar queries return cached responses
    error_message: "Post-condition failed: Semantic cache not returning cached results for similar queries"
  - "[ ] Cache hit rate exceeds minimum threshold"
    tipo: post-condition
    blocker: true
    validacao: |
      Verify cache hit rate meets configured minimum (default: 15%)
    error_message: "Post-condition failed: Cache hit rate below minimum threshold"
  - "[ ] Cached responses maintain quality parity with live responses"
    tipo: post-condition
    blocker: true
    validacao: |
      Verify cached responses are semantically equivalent to fresh responses
    error_message: "Post-condition failed: Cached response quality degraded"
```

---

## Acceptance Criteria

**Purpose:** Definitive pass/fail criteria for task completion

**Checklist:**

```yaml
acceptance-criteria:
  - "[ ] Semantic similarity matching works with configurable threshold"
    tipo: acceptance-criterion
    blocker: true
    validacao: |
      Assert similarity-based cache lookup is functional
    error_message: "Acceptance criterion not met: Semantic similarity matching not functional"
  - "[ ] Eviction policy configured and operational"
    tipo: acceptance-criterion
    blocker: true
    validacao: |
      Assert cache eviction works (TTL, LRU, or size-based)
    error_message: "Acceptance criterion not met: Eviction policy not configured"
  - "[ ] Cache hit/miss metrics tracked and reported"
    tipo: acceptance-criterion
    blocker: true
    validacao: |
      Assert metrics are collected for monitoring
    error_message: "Acceptance criterion not met: No cache metrics available"
```

---

## Tools

**External/shared resources used by this task:**

- **Tool:** embedding-model
  - **Purpose:** Vectorize queries for semantic similarity comparison
  - **Source:** Configured embedding model (OpenAI, Cohere, HuggingFace)

- **Tool:** cache-backend
  - **Purpose:** Persistent or in-memory storage for cached query-response pairs
  - **Source:** Redis, SQLite, or in-memory store

---

## Scripts

**Agent-specific code for this task:**

- **Script:** implement-semantic-cache.py
  - **Purpose:** End-to-end semantic cache setup and configuration
  - **Language:** Python
  - **Location:** squads/rag-ai-squad/scripts/implement-semantic-cache.py

---

## Error Handling

**Strategy:** fallback

**Common Errors:**

1. **Error:** Similarity Threshold Too Low
   - **Cause:** Threshold too permissive, returning incorrect cached responses
   - **Resolution:** Increase similarity threshold (0.92-0.98 range recommended)
   - **Recovery:** Temporarily disable cache, re-tune threshold with test queries

2. **Error:** Cache Memory Overflow
   - **Cause:** Cache grows unbounded or eviction not working
   - **Resolution:** Configure max size limit and verify eviction policy
   - **Recovery:** Clear cache, set aggressive TTL, enable LRU eviction

3. **Error:** Stale Cached Responses
   - **Cause:** Source data updated but cache not invalidated
   - **Resolution:** Implement cache invalidation on data ingestion events
   - **Recovery:** Set shorter TTL, add version tags to cache keys

4. **Error:** High Latency on Cache Miss
   - **Cause:** Embedding computation for cache lookup adds latency on misses
   - **Resolution:** Use the same embedding already computed for retrieval
   - **Recovery:** Share embedding between retrieval and cache lookup steps

---

## Performance

**Expected Metrics:**

```yaml
duration_expected: 15-30 min (estimated)
cost_estimated: $0.003-0.010
token_usage: ~3,000-8,000 tokens
```

**Optimization Notes:**
- Reuse query embeddings from retrieval step for cache lookup; batch cache writes; pre-warm cache with frequent queries

---

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies:
  - vectordb-advisor-select-embeddings.md (embedding model must be configured)
  - vectordb-advisor-configure-index.md (VectorDB must be operational)
tags:
  - semantic-cache
  - caching
  - latency-optimization
  - cost-reduction
updated_at: 2026-02-10
```

---

## Elicitation

### Step 1: Query Pattern Analysis

```
What are your query patterns?

1. **Query volume**: How many queries per day?
   [1] Low (< 100/day)
   [2] Medium (100 - 1,000/day)
   [3] High (1,000 - 10,000/day)
   [4] Very High (> 10,000/day)

   Volume? [1-4]:

2. **Query repetition**: How often do users ask similar questions?
   [1] Very repetitive (support FAQ, same topics)
   [2] Moderately repetitive (common themes with variations)
   [3] Diverse (wide range of topics, few repeats)
   [4] Unknown (need analysis)

   Repetition? [1-4]:

3. **Freshness requirements**: How often does your source data change?
   [1] Rarely (monthly or less)
   [2] Weekly
   [3] Daily
   [4] Real-time / continuously

   Freshness? [1-4]:
```

**Capture:** `{query_patterns}`

### Step 2: Cache Requirements

```
Cache configuration:

1. **Primary goal**: What's the main reason for caching?
   [1] Reduce latency (faster responses)
   [2] Reduce LLM costs (fewer API calls)
   [3] Both latency and cost
   [4] Handle rate limits (burst protection)

   Goal? [1-4]:

2. **Latency target**: What's your target response time?
   [1] < 100ms (instant feel)
   [2] < 500ms (fast)
   [3] < 1 second (acceptable)
   [4] < 3 seconds (current is slow, any improvement helps)

   Target? [1-4]:

3. **Cost reduction target**: How much cost reduction do you need?
   [1] 20-30% reduction
   [2] 40-50% reduction
   [3] 60%+ reduction
   [4] No specific target

   Cost target? [1-4]:
```

**Capture:** `{cache_requirements}`

### Step 3: Cache Backend Selection

```
Which cache backend do you want to use?

1. **GPTCache** [RECOMMENDED for RAG]
   - Purpose-built for LLM semantic caching
   - Built-in similarity search, eviction, and metrics
   - Supports multiple embedding backends
   - Overhead: ~5-15ms per cache lookup

2. **Redis + Vector Search**
   - Production-grade, distributed caching
   - Redis Stack with vector similarity search
   - Supports TTL, LRU, and custom eviction
   - Best for: High-scale production deployments

3. **In-Memory (FAISS/NumPy)**
   - Fastest lookup (~1-5ms)
   - No external dependencies
   - Lost on restart (no persistence)
   - Best for: Development, low-volume, single-instance

4. **Custom LangChain Cache**
   - LangChain's built-in caching layer
   - Integrates directly with chains
   - Supports exact match and semantic modes
   - Best for: LangChain-based pipelines

Backend? [1-4]:
```

**Capture:** `{cache_backend}`

### Step 4: Similarity Threshold

```
Semantic similarity threshold for cache hits:

A query is considered a cache "hit" when its embedding is within
this similarity threshold of a cached query.

| Threshold | Behavior | Example |
|-----------|----------|---------|
| 0.98+     | Near-exact match only | "What is RAG?" = "What is RAG?" |
| 0.95      | Very similar queries | "What is RAG?" ≈ "What's RAG?" |
| 0.92      | Similar intent [RECOMMENDED] | "What is RAG?" ≈ "Explain RAG" |
| 0.88      | Broader matching | "What is RAG?" ≈ "How does retrieval augmented generation work?" |
| 0.85      | Aggressive caching | May return wrong cached results |

1. Conservative (0.98) - Only near-exact matches
2. Balanced (0.95) - Safe similarity matching
3. Recommended (0.92) - Good hit rate with quality [DEFAULT]
4. Aggressive (0.88) - Higher hit rate, some quality risk
5. Custom - Specify your own threshold

Threshold? [1-5]:
```

**Capture:** `{similarity_threshold}`

### Step 5: Eviction Policy

```
Cache eviction strategy:

1. **TTL-based** (Time To Live)
   - Entries expire after configured duration
   - Best for: Data that changes on a known schedule
   - Recommended TTL: 1h (dynamic), 24h (stable), 7d (static)

2. **LRU** (Least Recently Used)
   - Evicts least recently accessed entries when cache is full
   - Best for: Memory-constrained environments
   - Requires max cache size setting

3. **TTL + LRU** (Combined) [RECOMMENDED]
   - Entries have a TTL AND LRU eviction on size limit
   - Best balance of freshness and memory management

4. **Invalidation-based**
   - Manual or event-driven cache invalidation
   - Cache cleared when source data is updated
   - Best for: Real-time data pipelines

Eviction strategy? [1-4]:
```

**Capture:** `{eviction_policy}`

---

## Process

### Semantic Caching Knowledge Base

#### How Semantic Caching Works

```
User Query → Embed Query → Search Cache (similarity) → Hit? → Return Cached Response
                                                      → Miss? → Run RAG Pipeline → Cache Response → Return
```

**Key Concepts:**
1. **Query Embedding**: Convert user query to a vector using the same embedding model
2. **Similarity Search**: Compare query vector against cached query vectors
3. **Threshold**: If similarity > threshold, it's a cache hit
4. **Cache Entry**: Stores (query_text, query_vector, response, metadata, timestamp)

#### GPTCache Implementation

```python
from gptcache import cache
from gptcache.adapter import openai
from gptcache.embedding import OpenAI as OpenAIEmbedding
from gptcache.manager import CacheBase, VectorBase, get_data_manager
from gptcache.similarity_evaluation.distance import SearchDistanceEvaluation

# Initialize embedding function
embedding = OpenAIEmbedding()

# Configure cache storage
cache_base = CacheBase("sqlite")  # or "mysql", "postgresql"
vector_base = VectorBase("faiss", dimension=embedding.dimension)
data_manager = get_data_manager(cache_base, vector_base)

# Initialize cache
cache.init(
    embedding_func=embedding.to_embeddings,
    data_manager=data_manager,
    similarity_evaluation=SearchDistanceEvaluation(),
)
cache.set_openai_key()
```

#### Redis Vector Cache Implementation

```python
import redis
import numpy as np
from redis.commands.search.field import VectorField, TextField, NumericField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType
from redis.commands.search.query import Query

class SemanticCache:
    def __init__(self, redis_url, embedding_model, threshold=0.92, ttl=3600):
        self.redis = redis.from_url(redis_url)
        self.embed = embedding_model
        self.threshold = threshold
        self.ttl = ttl
        self._create_index()

    def _create_index(self):
        schema = (
            TextField("query"),
            TextField("response"),
            NumericField("timestamp"),
            VectorField("embedding", "FLAT", {
                "TYPE": "FLOAT32",
                "DIM": self.embed.dimension,
                "DISTANCE_METRIC": "COSINE",
            }),
        )
        self.redis.ft("cache_idx").create_index(
            schema,
            definition=IndexDefinition(prefix=["cache:"], index_type=IndexType.HASH),
        )

    def get(self, query: str):
        query_vector = self.embed.encode(query)
        q = (
            Query(f"*=>[KNN 1 @embedding $vec AS score]")
            .return_fields("query", "response", "score")
            .dialect(2)
        )
        results = self.redis.ft("cache_idx").search(
            q, query_params={"vec": query_vector.tobytes()}
        )
        if results.docs and float(results.docs[0].score) >= self.threshold:
            return results.docs[0].response  # Cache HIT
        return None  # Cache MISS

    def set(self, query: str, response: str):
        query_vector = self.embed.encode(query)
        key = f"cache:{hash(query)}"
        self.redis.hset(key, mapping={
            "query": query,
            "response": response,
            "timestamp": int(time.time()),
            "embedding": query_vector.tobytes(),
        })
        self.redis.expire(key, self.ttl)
```

#### LangChain Semantic Cache

```python
from langchain.cache import RedisSemanticCache
from langchain.globals import set_llm_cache
from langchain_openai import OpenAIEmbeddings

# Setup semantic cache with LangChain
set_llm_cache(
    RedisSemanticCache(
        redis_url="redis://localhost:6379",
        embedding=OpenAIEmbeddings(),
        score_threshold=0.92,
    )
)

# All LLM calls now automatically use the cache
# No code changes needed in your chains
```

### Step 1: Analyze Query Patterns

```
Query Pattern Analysis:

Total queries analyzed: {count}
Time period: {period}

Query Clusters:
| Cluster | Queries | % Total | Avg Similarity | Cacheable |
|---------|---------|---------|----------------|-----------|
| {topic} | {count} | {pct}%  | {sim}          | {yes/no}  |
| {topic} | {count} | {pct}%  | {sim}          | {yes/no}  |
| ...     | ...     | ...     | ...            | ...       |

Estimated cache hit rate: {rate}%
Estimated cost savings: ${savings}/day
Estimated latency improvement: {improvement}%
```

### Step 2: Configure Cache Backend

Based on selection, configure the chosen cache backend with appropriate settings.

### Step 3: Set Similarity Threshold

Test threshold with sample queries:

```
Threshold Tuning Results:

| Threshold | Hit Rate | False Positives | Quality Score |
|-----------|----------|-----------------|---------------|
| 0.98      | {rate}%  | {count}         | {score}       |
| 0.95      | {rate}%  | {count}         | {score}       |
| 0.92      | {rate}%  | {count}         | {score}       |
| 0.88      | {rate}%  | {count}         | {score}       |

Recommended threshold: {value}
  Rationale: {why}
```

### Step 4: Configure Eviction Policy

Apply selected eviction strategy with tuned parameters.

### Step 5: Pre-Warm Cache (Optional)

```
Cache Pre-Warming:

Pre-warm with top {N} most frequent queries?

Frequent queries identified: {count}
Estimated pre-warm time: {time}
Estimated initial hit rate: {rate}%

Pre-warm? (yes/no):
```

### Step 6: Validate and Benchmark

```
Cache Performance Report:

Setup:
  Backend: {backend}
  Threshold: {threshold}
  Eviction: {policy}
  Max size: {size}

Metrics:
  Cache hit rate:        {rate}%
  Avg hit latency:       {ms} ms
  Avg miss latency:      {ms} ms
  Latency improvement:   {improvement}%
  False positive rate:   {rate}%
  Memory usage:          {size} MB
  Estimated daily savings: ${savings}
```

---

## Usage

```
*implement-cache
*implement-cache --backend redis --threshold 0.92
*implement-cache --backend gptcache --ttl 3600
*implement-cache --analyze-only  # Just analyze cacheability without implementing
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| query_patterns | object | Yes | - | Query frequency, clusters, and access patterns |
| cache_requirements | object | Yes | - | Latency target, cost reduction goal, staleness tolerance |
| cache_backend | string | No | "gptcache" | Backend: gptcache, redis, in-memory, langchain |
| similarity_threshold | float | No | 0.92 | Cosine similarity threshold for cache hits |
| ttl | int | No | 3600 | Time-to-live in seconds for cache entries |
| max_size | int | No | 10000 | Maximum number of cached entries |
| mode | string | No | "interactive" | yolo, interactive, pre-flight |

---

## Output

The task produces:

1. **Semantic Cache Config** - Complete cache configuration YAML
2. **Eviction Policy** - Eviction strategy and parameters
3. **Cache Implementation** - Production-ready cache code (Python)
4. **Hit Rate Metrics** - Performance report with benchmarks
5. **Pre-Warm Script** - Optional script to pre-warm cache with frequent queries

---

## Error Handling

| Error | Cause | Resolution | Recovery |
|-------|-------|------------|----------|
| Low Hit Rate | Diverse queries, threshold too high | Lower threshold or analyze query clusters | Pre-warm cache with common query variations |
| False Positives | Threshold too low, similar but different queries | Increase threshold, add metadata filtering | Add topic/intent filter alongside similarity |
| Memory Overflow | Cache grows unbounded | Set max size, enable eviction | Clear cache, configure LRU + TTL |
| Stale Responses | Source data changed | Implement invalidation hooks | Set shorter TTL, version cache keys |
| Embedding Latency | Cache lookup slower than expected | Reuse retrieval embeddings | Share embedding computation across pipeline |
| Redis Connection | Redis unavailable | Add connection retry and fallback | Fall back to in-memory cache or bypass |

---

## Related

- **Agent:** @vectordb-advisor (Vex)
- **Related tasks:**
  - `*select-embeddings` - Embedding model affects cache similarity quality
  - `*optimize-search` - Cache reduces load on search infrastructure
  - `*benchmark-retrieval` - Measure cache impact on overall pipeline
  - `*track-costs` - Monitor cost savings from caching
