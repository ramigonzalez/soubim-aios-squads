# Task: Benchmark Retrieval Infrastructure

**Purpose**: Systematically benchmark retrieval pipeline infrastructure for latency, throughput, cost, and quality using standardized test methodology and golden datasets

**Elicit**: true

---

## Execution Modes

**Choose your execution mode:**

### 1. YOLO Mode - Fast, Autonomous (0-1 prompts)
- Autonomous decision making with logging
- Minimal user interaction
- **Best for:** Quick smoke-test benchmarks

### 2. Interactive Mode - Balanced, Educational (5-10 prompts) **[DEFAULT]**
- Explicit decision checkpoints
- Educational explanations at each stage
- **Best for:** Comprehensive benchmarks, team alignment

### 3. Pre-Flight Planning - Comprehensive Upfront Planning
- Task analysis phase (identify all ambiguities)
- Zero ambiguity execution
- **Best for:** SLA validation, vendor comparison benchmarks

**Parameter:** `mode` (optional, default: `interactive`)

---

## Task Definition (AIOS Task Format V1.0)

```yaml
task: benchmarkRetrieval()
responsavel: "@vectordb-advisor"
responsavel_type: agent
atomic_layer: task
elicit: true

**Entrada:**
- campo: pipeline_endpoint
  tipo: string
  origem: User Input
  obrigatorio: true
  validacao: |
    Endpoint or function to benchmark (API URL, function reference, or pipeline config)

- campo: test_queries
  tipo: array
  origem: User Input
  obrigatorio: true
  validacao: |
    Set of test queries (minimum 50 for statistical significance)

- campo: golden_dataset
  tipo: object
  origem: User Input
  obrigatorio: false
  validacao: |
    Ground truth relevance judgments for quality metrics (query -> expected docs mapping)

- campo: metrics_to_track
  tipo: array
  origem: User Input
  obrigatorio: false
  validacao: |
    Specific metrics to track (latency, throughput, recall, MRR, NDCG, cost)

**Saida:**
- campo: latency_report
  tipo: object
  destino: File (latency-report.md)
  persistido: true

- campo: throughput_stats
  tipo: object
  destino: File (throughput-stats.md)
  persistido: true

- campo: cost_analysis
  tipo: object
  destino: File (cost-analysis.md)
  persistido: true

- campo: quality_scores
  tipo: object
  destino: File (quality-scores.md)
  persistido: true
```

---

## Pre-Conditions

**Purpose:** Validate prerequisites BEFORE task execution (blocking)

**Checklist:**

```yaml
pre-conditions:
  - "[ ] Pipeline endpoint is reachable and returning results"
    tipo: pre-condition
    blocker: true
    validacao: |
      Check that the retrieval pipeline can be queried successfully
    error_message: "Pre-condition failed: Pipeline endpoint not reachable"
  - "[ ] Test query set contains minimum 50 queries for statistical validity"
    tipo: pre-condition
    blocker: true
    validacao: |
      Check that sufficient test queries are available
    error_message: "Pre-condition failed: Need at least 50 test queries for valid benchmarks"
```

---

## Post-Conditions

**Purpose:** Validate execution success AFTER task completes

**Checklist:**

```yaml
post-conditions:
  - "[ ] All benchmark runs completed without errors"
    tipo: post-condition
    blocker: true
    validacao: |
      Verify all benchmark iterations ran to completion
    error_message: "Post-condition failed: Benchmark runs had errors"
  - "[ ] Statistical significance achieved (sufficient iterations)"
    tipo: post-condition
    blocker: true
    validacao: |
      Verify enough iterations for statistically significant results
    error_message: "Post-condition failed: Insufficient iterations for statistical significance"
```

---

## Acceptance Criteria

**Purpose:** Definitive pass/fail criteria for task completion

**Checklist:**

```yaml
acceptance-criteria:
  - "[ ] Latency report includes p50, p95, p99 with confidence intervals"
    tipo: acceptance-criterion
    blocker: true
    validacao: |
      Assert latency report has required percentiles
    error_message: "Acceptance criterion not met: Latency report incomplete"
  - "[ ] Throughput measured under both single-query and concurrent load"
    tipo: acceptance-criterion
    blocker: true
    validacao: |
      Assert throughput benchmarked at multiple concurrency levels
    error_message: "Acceptance criterion not met: Throughput not tested under load"
  - "[ ] Quality scores computed against golden dataset (when provided)"
    tipo: acceptance-criterion
    blocker: false
    validacao: |
      Assert quality metrics computed if golden dataset available
    error_message: "Acceptance criterion not met: Quality scores not computed"
```

---

## Tools

**External/shared resources used by this task:**

- **Tool:** benchmark-runner
  - **Purpose:** Execute standardized retrieval benchmarks
  - **Source:** squads/rag-ai-squad/tools/benchmark-runner.py

- **Tool:** metrics-calculator
  - **Purpose:** Compute IR metrics (recall, MRR, NDCG)
  - **Source:** squads/rag-ai-squad/tools/metrics-calculator.py

- **Tool:** load-generator
  - **Purpose:** Generate concurrent load for throughput testing
  - **Source:** squads/rag-ai-squad/tools/load-generator.py

---

## Scripts

**Agent-specific code for this task:**

- **Script:** benchmark-retrieval.py
  - **Purpose:** End-to-end retrieval benchmarking suite
  - **Language:** Python
  - **Location:** squads/rag-ai-squad/scripts/benchmark-retrieval.py

---

## Error Handling

**Strategy:** fallback

**Common Errors:**

1. **Error:** Pipeline Timeout
   - **Cause:** Pipeline does not respond within timeout window
   - **Resolution:** Increase timeout, check pipeline health
   - **Recovery:** Log timeout as a data point, continue with remaining queries

2. **Error:** Insufficient Test Queries
   - **Cause:** Fewer than 50 test queries provided
   - **Resolution:** Generate synthetic queries or request more from user
   - **Recovery:** Run with available queries but flag low confidence

3. **Error:** Golden Dataset Mismatch
   - **Cause:** Golden dataset IDs do not match pipeline document IDs
   - **Resolution:** Verify document ID format alignment
   - **Recovery:** Skip quality metrics, report only latency/throughput

4. **Error:** Load Generator Overwhelms Pipeline
   - **Cause:** Concurrency level too high, pipeline crashes
   - **Resolution:** Start with low concurrency, ramp up gradually
   - **Recovery:** Report max sustainable QPS before failure

5. **Error:** Cold Start Skew
   - **Cause:** First queries are slower due to cache warming
   - **Resolution:** Include warm-up phase before benchmarking
   - **Recovery:** Exclude first N queries from statistics

---

## Performance

**Expected Metrics:**

```yaml
duration_expected: 15-60 min (estimated, depends on query count and iterations)
cost_estimated: $0.010-0.050
token_usage: ~5,000-15,000 tokens
```

**Optimization Notes:**
- Run warm-up queries before benchmarking; use async runners for throughput tests; compute metrics in post-processing

---

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies:
  - vectordb-advisor-configure-index.md (pipeline should be configured)
tags:
  - benchmark
  - retrieval
  - performance
  - quality
updated_at: 2026-02-09
```

---

## Elicitation

### Step 1: What to Benchmark

```
What are you benchmarking?

1. **Full pipeline** - End-to-end from query text to ranked results
2. **Vector search only** - VectorDB query performance (no embedding/reranking)
3. **Embedding stage** - Embedding model latency and throughput
4. **Reranking stage** - Reranker latency and quality impact
5. **Comparison** - Compare two or more pipeline configurations
6. **Regression test** - Validate against previous baseline

Which benchmark type? [1-6]:
```

**Capture:** `{benchmark_type}`

### Step 2: Pipeline Details

```
Tell me about the pipeline to benchmark:

1. **Endpoint type**:
   - REST API endpoint (URL)
   - Python function (module.function)
   - LangChain chain/retriever
   - Direct VectorDB client

2. **Pipeline stages** (select all present):
   - Embedding model: ___
   - VectorDB: ___ (collection/index: ___)
   - Pre-filter: ___
   - Reranker: ___
   - Post-processing: ___

3. **Current estimated latency**: ___ ms (rough idea)

4. **Expected QPS in production**: ___

Enter pipeline details:
```

**Capture:** `{pipeline_endpoint}`, `{pipeline_config}`

### Step 3: Test Dataset

```
Let's set up the test dataset:

1. **Test queries**: How will you provide test queries?
   - From file (path to JSON/CSV with queries)
   - From golden dataset (query-relevance pairs)
   - Generate synthetic (from your corpus)
   - Manual entry (provide a few representative queries)

2. **Query count**: How many test queries?
   - Quick (50 queries) - minimum for valid stats
   - Standard (200 queries) - good statistical power
   - Comprehensive (500+ queries) - high confidence
   - Custom: ___

3. **Golden dataset available?**
   - Yes - have query -> relevant_doc_ids mapping
   - Partial - have some relevance judgments
   - No - latency/throughput only (no quality metrics)

4. **Query distribution**: Does your query set represent production traffic?
   - Yes - sampled from production logs
   - Approximately - representative but not exact
   - No - synthetic or curated

Enter test dataset details:
```

**Capture:** `{test_queries}`, `{golden_dataset}`

### Step 4: Metrics of Interest

```
Which metrics should we track?

**Latency Metrics:**
1. [x] p50 (median) latency
2. [x] p95 latency
3. [x] p99 latency
4. [ ] Mean latency
5. [ ] Standard deviation
6. [ ] Per-stage breakdown

**Throughput Metrics:**
7. [x] Queries per second (single client)
8. [ ] Max QPS (concurrent load)
9. [ ] QPS at target latency (e.g., QPS where p95 < 200ms)

**Quality Metrics (requires golden dataset):**
10. [ ] Recall@K
11. [ ] MRR (Mean Reciprocal Rank)
12. [ ] NDCG@K (Normalized Discounted Cumulative Gain)
13. [ ] MAP (Mean Average Precision)
14. [ ] Hit Rate@K

**Cost Metrics:**
15. [ ] Cost per query (API calls, compute)
16. [ ] Cost per 1M queries (monthly projection)
17. [ ] Infrastructure cost (VectorDB + compute)

Select metrics [comma-separated numbers, or "all"]:
```

**Capture:** `{metrics_to_track}`

---

## Process

### Benchmark Methodology

#### Warm-Up Phase
- Run 10-20 queries to warm caches and JIT
- Discard warm-up results from statistics
- Verify pipeline is responding correctly

#### Latency Benchmark Protocol
```
For each test query:
  1. Record start timestamp (high-resolution)
  2. Send query to pipeline
  3. Record end timestamp
  4. Calculate elapsed time
  5. Record per-stage timing (if available)
  6. Store results with query metadata

Iterations: 3 passes over full query set
Statistical processing:
  - Exclude warm-up queries
  - Calculate percentiles (p50, p95, p99)
  - Calculate mean and standard deviation
  - Compute 95% confidence intervals
  - Identify outliers (> 3 sigma)
```

#### Throughput Benchmark Protocol
```
Concurrency levels: [1, 5, 10, 25, 50, 100]

For each concurrency level:
  1. Spawn N concurrent workers
  2. Each worker sends queries from shared queue
  3. Run for 60 seconds (or until all queries complete)
  4. Collect total queries completed
  5. Calculate QPS = total_queries / elapsed_seconds
  6. Record latency distribution under load
  7. Check for errors or timeouts
```

#### Quality Benchmark Protocol
```
Requires golden dataset: {query_id -> [relevant_doc_ids]}

For each query:
  1. Run retrieval (top-K results)
  2. Compare against golden relevance judgments
  3. Calculate per-query metrics

Aggregate metrics:
  - Recall@K = avg(relevant_retrieved / total_relevant)
  - MRR = avg(1 / rank_of_first_relevant)
  - NDCG@K = avg(DCG@K / IDCG@K)
  - MAP = avg(average_precision per query)
  - Hit Rate@K = fraction of queries with >= 1 relevant in top-K
```

#### Cost Analysis Protocol
```
Cost components:
  1. Embedding API cost ($/token or $/request)
  2. VectorDB query cost ($/query or included in hosting)
  3. Reranker API cost ($/request)
  4. Infrastructure cost (hosting, compute)

Calculate:
  - Cost per query = sum(component_costs)
  - Monthly cost = cost_per_query * estimated_monthly_queries
  - Cost per 1M queries = cost_per_query * 1,000,000
```

---

### Step 1: Prepare Test Dataset

```
Vex: Preparing benchmark test dataset...

Test Dataset Summary:
  Total queries: {count}
  Query types: {distribution}
  Golden dataset: {available/not available}
  Estimated run time: {minutes} minutes

Warm-up: {warm_up_count} queries (results excluded)
```

### Step 2: Define Metrics

```
Benchmark Configuration:

Metrics to track:
  Latency: p50, p95, p99, mean, stdev
  Throughput: QPS @ [1, 5, 10, 25, 50] concurrent
  Quality: {recall@K, MRR, NDCG@K} (if golden dataset)
  Cost: $/query, $/month projection

Parameters:
  Iterations: 3 (for latency stability)
  Warm-up: 20 queries
  Throughput duration: 60s per concurrency level
  Top-K: {k}
```

### Step 3: Run Latency Benchmarks

```
Latency Benchmark Results:

| Percentile | Pass 1  | Pass 2  | Pass 3  | Average | CI (95%)     |
|------------|---------|---------|---------|---------|--------------|
| p50        | {ms}    | {ms}    | {ms}    | {ms}    | +/- {ms}     |
| p95        | {ms}    | {ms}    | {ms}    | {ms}    | +/- {ms}     |
| p99        | {ms}    | {ms}    | {ms}    | {ms}    | +/- {ms}     |
| Mean       | {ms}    | {ms}    | {ms}    | {ms}    | +/- {ms}     |
| Stdev      | {ms}    | {ms}    | {ms}    | {ms}    |              |

Per-Stage Breakdown (average):
| Stage          | p50 (ms) | p95 (ms) | % of Total |
|----------------|----------|----------|------------|
| Embedding      | {ms}     | {ms}     | {%}        |
| Vector Search  | {ms}     | {ms}     | {%}        |
| Reranking      | {ms}     | {ms}     | {%}        |
| Other          | {ms}     | {ms}     | {%}        |

Outliers: {count} queries > 3 sigma ({threshold} ms)
```

### Step 4: Run Throughput Tests

```
Throughput Benchmark Results:

| Concurrency | QPS   | p50 (ms) | p95 (ms) | Errors | Error Rate |
|-------------|-------|----------|----------|--------|------------|
| 1           | {qps} | {ms}     | {ms}     | {n}    | {%}        |
| 5           | {qps} | {ms}     | {ms}     | {n}    | {%}        |
| 10          | {qps} | {ms}     | {ms}     | {n}    | {%}        |
| 25          | {qps} | {ms}     | {ms}     | {n}    | {%}        |
| 50          | {qps} | {ms}     | {ms}     | {n}    | {%}        |

Max sustainable QPS (p95 < {target_ms}): {max_qps}
Saturation point: {concurrency} concurrent
```

### Step 5: Calculate Costs

```
Cost Analysis:

Per-Query Cost Breakdown:
| Component       | Cost/Query | Monthly ({volume}/mo) | Annual    |
|-----------------|------------|----------------------|-----------|
| Embedding API   | ${cost}    | ${cost}              | ${cost}   |
| VectorDB query  | ${cost}    | ${cost}              | ${cost}   |
| Reranker API    | ${cost}    | ${cost}              | ${cost}   |
| Infrastructure  | ${cost}    | ${cost}              | ${cost}   |
|-----------------|------------|----------------------|-----------|
| TOTAL           | ${cost}    | ${cost}              | ${cost}   |

Cost per 1M queries: ${cost}
Cost efficiency: ${cost}/relevant_result
```

### Step 6: Measure Retrieval Quality

```
Quality Benchmark Results (against golden dataset):

| Metric       | Score  | Industry Avg | Status          |
|--------------|--------|--------------|-----------------|
| Recall@5     | {val}  | 0.70-0.85    | GOOD/NEEDS WORK |
| Recall@10    | {val}  | 0.80-0.92    | GOOD/NEEDS WORK |
| Recall@20    | {val}  | 0.85-0.95    | GOOD/NEEDS WORK |
| MRR          | {val}  | 0.60-0.80    | GOOD/NEEDS WORK |
| NDCG@10      | {val}  | 0.65-0.82    | GOOD/NEEDS WORK |
| Hit Rate@5   | {val}  | 0.75-0.90    | GOOD/NEEDS WORK |

Quality by Query Type:
| Query Type     | Count | Recall@10 | MRR   | Notes          |
|----------------|-------|-----------|-------|----------------|
| Short keyword  | {n}   | {val}     | {val} | {observation}  |
| Natural lang   | {n}   | {val}     | {val} | {observation}  |
| Complex/multi  | {n}   | {val}     | {val} | {observation}  |
```

### Step 7: Generate Report

```
BENCHMARK REPORT SUMMARY

Pipeline: {pipeline_description}
Date: {timestamp}
Queries: {count} queries, {iterations} iterations

KEY METRICS:
  Latency (p50/p95/p99): {ms} / {ms} / {ms}
  Throughput (max QPS): {qps} @ {concurrency} concurrent
  Quality (Recall@10): {score}
  Cost: ${cost}/query (${monthly}/month)

ASSESSMENT:
  Latency: {EXCELLENT / GOOD / NEEDS OPTIMIZATION}
  Throughput: {EXCELLENT / GOOD / NEEDS SCALING}
  Quality: {EXCELLENT / GOOD / NEEDS IMPROVEMENT}
  Cost: {EXCELLENT / GOOD / NEEDS OPTIMIZATION}

RECOMMENDATIONS:
  1. {recommendation_1}
  2. {recommendation_2}
  3. {recommendation_3}

-- Vex, optimizing retrieval infrastructure
```

### Step 8: Compare with Baselines

```
Baseline Comparison (if previous benchmark exists):

| Metric      | Previous | Current | Change  | Trend |
|-------------|----------|---------|---------|-------|
| p50 latency | {ms}     | {ms}    | {+/-%}  | {up/down} |
| p95 latency | {ms}     | {ms}    | {+/-%}  | {up/down} |
| Max QPS     | {qps}    | {qps}   | {+/-%}  | {up/down} |
| Recall@10   | {score}  | {score} | {+/-%}  | {up/down} |
| Cost/query  | ${cost}  | ${cost} | {+/-%}  | {up/down} |

Overall Trend: {IMPROVING / STABLE / DEGRADING}
```

---

## Usage

```
*benchmark-retrieval
*benchmark-retrieval --endpoint "http://localhost:8000/search" --queries queries.json
*benchmark-retrieval --type "comparison" --configs "config_a.yaml,config_b.yaml"
*benchmark-retrieval --type "regression" --baseline "benchmark-2026-01-15.json"
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| pipeline_endpoint | string | Yes | - | API URL, function ref, or pipeline config |
| test_queries | array | Yes | - | Test query set (min 50 for statistical validity) |
| golden_dataset | object | No | none | Relevance judgments for quality metrics |
| metrics_to_track | array | No | all | Specific metrics to track |
| concurrency_levels | array | No | [1,5,10,25,50] | Concurrency levels for throughput test |
| iterations | number | No | 3 | Passes over query set for latency stability |
| warm_up | number | No | 20 | Warm-up queries to discard |
| top_k | number | No | 10 | Number of results to retrieve per query |
| mode | string | No | "interactive" | yolo, interactive, pre-flight |

---

## Output

The task produces:

1. **Latency Report** - Percentile latencies with confidence intervals and per-stage breakdown
2. **Throughput Stats** - QPS at multiple concurrency levels with saturation point
3. **Cost Analysis** - Per-query and monthly cost breakdown by component
4. **Quality Scores** - IR metrics (Recall, MRR, NDCG) against golden dataset
5. **Baseline Comparison** - Comparison with previous benchmarks if available

---

## Error Handling

| Error | Cause | Resolution | Recovery |
|-------|-------|------------|----------|
| Pipeline Timeout | Endpoint unresponsive | Check health, increase timeout | Log timeout, continue remaining |
| Insufficient Queries | < 50 test queries | Generate synthetic or request more | Run but flag low confidence |
| Golden Dataset Mismatch | Doc IDs don't match | Verify ID format | Skip quality, report latency only |
| Load Overload | Concurrency crashes pipeline | Reduce max concurrency | Report max sustainable QPS |
| Cold Start Skew | First queries skew results | Warm-up phase | Exclude warm-up from stats |
| Network Variability | Unstable network adds noise | Run from same network/region | Increase iterations, use medians |

---

## Related

- **Agent:** @vectordb-advisor (Vex)
- **Related tasks:**
  - `*configure-index` - Configure index before benchmarking
  - `*optimize-search` - Optimize based on benchmark findings
  - `*setup-hybrid-search` - Benchmark hybrid vs pure semantic
  - `*implement-cache` - Measure cache impact via benchmarks
