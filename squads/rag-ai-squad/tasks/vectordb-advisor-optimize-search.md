# Task: Optimize Search Performance

**Purpose**: Profile, diagnose, and optimize vector search pipeline performance through systematic bottleneck analysis, parameter tuning, and before/after benchmarking

**Elicit**: true

---

## Execution Modes

**Choose your execution mode:**

### 1. YOLO Mode - Fast, Autonomous (0-1 prompts)
- Autonomous decision making with logging
- Minimal user interaction
- **Best for:** Quick tuning of known bottlenecks

### 2. Interactive Mode - Balanced, Educational (5-10 prompts) **[DEFAULT]**
- Explicit decision checkpoints
- Educational explanations at each optimization
- **Best for:** Learning, complex multi-stage pipelines

### 3. Pre-Flight Planning - Comprehensive Upfront Planning
- Task analysis phase (identify all ambiguities)
- Zero ambiguity execution
- **Best for:** Production pipelines, SLA-driven optimization

**Parameter:** `mode` (optional, default: `interactive`)

---

## Task Definition (AIOS Task Format V1.0)

```yaml
task: optimizeSearch()
responsavel: "@vectordb-advisor"
responsavel_type: agent
atomic_layer: task
elicit: true

**Entrada:**
- campo: current_pipeline
  tipo: object
  origem: User Input
  obrigatorio: true
  validacao: |
    Description of current search pipeline stages (embedding, retrieval, reranking, etc.)

- campo: performance_metrics
  tipo: object
  origem: User Input
  obrigatorio: true
  validacao: |
    Current latency (p50, p95, p99), throughput (QPS), recall/accuracy scores

- campo: bottleneck_analysis
  tipo: object
  origem: User Input
  obrigatorio: false
  validacao: |
    Known or suspected bottlenecks, specific pain points

**Saida:**
- campo: optimization_plan
  tipo: object
  destino: File (optimization-plan.md)
  persistido: true

- campo: tuned_config
  tipo: object
  destino: File (tuned-config.yaml)
  persistido: true

- campo: benchmark_results
  tipo: object
  destino: File (benchmark-results.md)
  persistido: true

- campo: before_after_comparison
  tipo: object
  destino: File (before-after.md)
  persistido: true
```

---

## Pre-Conditions

**Purpose:** Validate prerequisites BEFORE task execution (blocking)

**Checklist:**

```yaml
pre-conditions:
  - "[ ] Search pipeline exists and is operational (even if slow)"
    tipo: pre-condition
    blocker: true
    validacao: |
      Check that there is an existing pipeline to optimize
    error_message: "Pre-condition failed: Need an existing search pipeline - run *configure-index first"
  - "[ ] Baseline performance metrics are available or can be collected"
    tipo: pre-condition
    blocker: true
    validacao: |
      Check that current performance can be measured
    error_message: "Pre-condition failed: Need baseline metrics before optimization"
```

---

## Post-Conditions

**Purpose:** Validate execution success AFTER task completes

**Checklist:**

```yaml
post-conditions:
  - "[ ] At least one measurable improvement achieved"
    tipo: post-condition
    blocker: true
    validacao: |
      Verify at least one metric improved without degrading others
    error_message: "Post-condition failed: No measurable improvement from optimization"
  - "[ ] Search quality (recall/relevance) not degraded beyond acceptable threshold"
    tipo: post-condition
    blocker: true
    validacao: |
      Verify recall/quality maintained within acceptable range
    error_message: "Post-condition failed: Search quality degraded beyond threshold"
```

---

## Acceptance Criteria

**Purpose:** Definitive pass/fail criteria for task completion

**Checklist:**

```yaml
acceptance-criteria:
  - "[ ] Before/after comparison with quantified improvements"
    tipo: acceptance-criterion
    blocker: true
    validacao: |
      Assert comparison includes specific numbers (latency, recall, etc.)
    error_message: "Acceptance criterion not met: Before/after comparison missing"
  - "[ ] Optimization changes documented and reversible"
    tipo: acceptance-criterion
    blocker: true
    validacao: |
      Assert all changes are documented and can be rolled back
    error_message: "Acceptance criterion not met: Changes not documented or not reversible"
```

---

## Tools

**External/shared resources used by this task:**

- **Tool:** search-profiler
  - **Purpose:** Profile each stage of the search pipeline
  - **Source:** squads/rag-ai-squad/tools/search-profiler.py

- **Tool:** benchmark-runner
  - **Purpose:** Run standardized search benchmarks
  - **Source:** squads/rag-ai-squad/tools/benchmark-runner.py

---

## Scripts

**Agent-specific code for this task:**

- **Script:** optimize-search.py
  - **Purpose:** Systematic search optimization with before/after tracking
  - **Language:** Python
  - **Location:** squads/rag-ai-squad/scripts/optimize-search.py

---

## Error Handling

**Strategy:** fallback

**Common Errors:**

1. **Error:** No Baseline Available
   - **Cause:** Cannot measure current performance
   - **Resolution:** Run baseline benchmark first
   - **Recovery:** Generate synthetic benchmark with sample queries

2. **Error:** Optimization Causes Quality Drop
   - **Cause:** Speed optimization reduced recall below threshold
   - **Resolution:** Roll back change, try alternative optimization
   - **Recovery:** Restore previous configuration, document failure mode

3. **Error:** Diminishing Returns
   - **Cause:** Pipeline already near-optimal for given constraints
   - **Resolution:** Identify if hardware/architecture changes needed
   - **Recovery:** Document current limits and recommend infrastructure changes

4. **Error:** Concurrent Load Impact
   - **Cause:** Optimization effective under low load but degrades under concurrency
   - **Resolution:** Test under realistic concurrent load
   - **Recovery:** Adjust parameters for concurrent access patterns

---

## Performance

**Expected Metrics:**

```yaml
duration_expected: 15-45 min (estimated)
cost_estimated: $0.005-0.020
token_usage: ~4,000-12,000 tokens
```

**Optimization Notes:**
- Profile before optimizing; target the largest bottleneck first; iterate in small steps

---

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies:
  - vectordb-advisor-configure-index.md (recommended)
  - vectordb-advisor-benchmark-retrieval.md (for benchmarking)
tags:
  - search
  - optimization
  - performance
  - tuning
updated_at: 2026-02-09
```

---

## Elicitation

### Step 1: Current Pipeline Description

```
Describe your current search pipeline. Which stages does it include?

1. **Embedding** - Query text -> vector (which model?)
2. **Pre-filtering** - Metadata filters before search
3. **Vector Search** - kNN/ANN retrieval (which VectorDB?)
4. **Post-filtering** - Filter results after retrieval
5. **Reranking** - Cross-encoder or other reranker
6. **Hybrid fusion** - BM25 + vector result merging

Which stages are in your pipeline? [comma-separated, e.g., 1,3,5]:
```

**Capture:** `{pipeline_stages}`

**For each selected stage, ask:**

```
For stage "{stage_name}":
  - Implementation: {what tool/model/service}
  - Average latency: {ms}
  - Known issues: {any}
```

**Capture:** `{current_pipeline}`

### Step 2: Performance Metrics

```
What are your current performance numbers?

1. **End-to-end latency**:
   - p50 (median): ___ ms
   - p95: ___ ms
   - p99: ___ ms

2. **Stage breakdown** (if known):
   - Embedding: ___ ms
   - Vector search: ___ ms
   - Reranking: ___ ms
   - Other: ___ ms

3. **Throughput**: ___ queries per second (QPS)

4. **Quality metrics** (if measured):
   - Recall@K: ___
   - MRR: ___
   - NDCG: ___
   - User satisfaction: ___

Enter current metrics:
```

**Capture:** `{performance_metrics}`

### Step 3: Pain Points & Targets

```
What are your optimization goals?

1. **Primary goal**:
   - Reduce latency (which percentile matters most?)
   - Increase throughput (target QPS?)
   - Improve quality (which metric?)
   - Reduce cost (current spend?)

2. **Specific pain points**:
   - Slow queries (> ___ ms threshold?)
   - Inconsistent latency (spikes?)
   - Poor relevance for certain query types?
   - High infrastructure cost?
   - Scaling issues under load?

3. **Target metrics**:
   - Target p50: ___ ms
   - Target p95: ___ ms
   - Target QPS: ___
   - Minimum acceptable recall: ___

4. **Constraints**:
   - Cannot change VectorDB? (yes/no)
   - Cannot change embedding model? (yes/no)
   - Budget limit for new infrastructure? ($)
   - Downtime acceptable for changes? (yes/no)

Enter goals and constraints:
```

**Capture:** `{bottleneck_analysis}`, `{optimization_targets}`

---

## Process

### Search Optimization Strategies

#### Embedding Stage Optimizations
| Strategy | Impact | Effort | Trade-off |
|----------|--------|--------|-----------|
| Batch embedding requests | 2-5x throughput | Low | Adds batch latency |
| Cache frequent queries | 10-100x for cached | Low | Memory cost |
| Use smaller model (3-small vs 3-large) | 2x faster | Low | Potential quality loss |
| Quantize to INT8 | 2-4x faster | Medium | ~1% quality loss |
| Local embedding model | Remove API latency | High | GPU required |
| Matryoshka dimension reduction | 1.5-3x faster search | Low | Marginal quality loss |

#### Vector Search Optimizations
| Strategy | Impact | Effort | Trade-off |
|----------|--------|--------|-----------|
| Tune ef_search / nprobe | 2-10x latency | Low | Recall vs speed |
| Enable quantization (INT8) | 4x memory, 2x speed | Low | ~1% recall loss |
| Binary quantization + rescore | 32x memory, 10x speed | Medium | Needs rescoring |
| Add metadata pre-filters | 2-5x faster | Low | Requires indexed metadata |
| Reduce top-K (fetch fewer) | Linear improvement | Low | May miss relevant results |
| Partition by tenant/category | 2-10x per query | Medium | Management complexity |
| Connection pooling | 2-5x throughput | Low | Memory per connection |
| Async/parallel queries | 2-4x throughput | Medium | Code complexity |

#### Reranking Optimizations
| Strategy | Impact | Effort | Trade-off |
|----------|--------|--------|-----------|
| Reduce candidates (top-50 -> top-20) | 2x faster | Low | Potential quality loss |
| Use faster reranker model | 2-5x faster | Low | Quality vs speed |
| Batch reranking | 1.5-3x throughput | Low | Adds batch latency |
| Cache reranking results | 10x for cached | Medium | Staleness risk |
| Move reranking to GPU | 5-10x faster | High | GPU cost |
| Skip reranking for simple queries | Variable | Medium | Reduced quality for some |

#### Pipeline-Level Optimizations
| Strategy | Impact | Effort | Trade-off |
|----------|--------|--------|-----------|
| Semantic caching | 100x for cache hits | Medium | Cache management |
| Parallel retrieval (multi-index) | Depends on strategy | Medium | Code complexity |
| Adaptive retrieval (skip stages) | 2-5x for simple queries | High | Logic complexity |
| Prefetching / warming | Better p99 | Medium | Background load |
| Result streaming | Better perceived latency | Medium | Architecture change |

---

### Step 1: Profile Current Performance

```
Vex: Profiling your search pipeline...

Pipeline Stage Breakdown:

| Stage          | Latency (p50) | Latency (p95) | % of Total | Status     |
|----------------|---------------|---------------|------------|------------|
| Embedding      | {ms}          | {ms}          | {%}        | {ok/slow}  |
| Pre-filter     | {ms}          | {ms}          | {%}        | {ok/slow}  |
| Vector Search  | {ms}          | {ms}          | {%}        | {ok/slow}  |
| Post-filter    | {ms}          | {ms}          | {%}        | {ok/slow}  |
| Reranking      | {ms}          | {ms}          | {%}        | {ok/slow}  |
| Network/Other  | {ms}          | {ms}          | {%}        | {ok/slow}  |
|----------------|---------------|---------------|------------|------------|
| TOTAL          | {ms}          | {ms}          | 100%       |            |

Bottleneck: {stage} consuming {%} of total latency
```

### Step 2: Identify Bottlenecks

```
Bottleneck Analysis:

Primary: {bottleneck_stage}
  Current: {current_metric}
  Target: {target_metric}
  Gap: {difference}

Root Cause: {analysis}
  - {cause_1}
  - {cause_2}

Secondary: {secondary_bottleneck}
  Impact: {description}
```

### Step 3: Test Optimization Strategies

For each identified bottleneck, test the top 2-3 strategies:

```
Testing Optimization: {strategy_name}

Change: {what_changed}
Before: {metric_before}
After: {metric_after}
Impact: {improvement_percent}
Quality Impact: {quality_change}
Verdict: {KEEP / REVERT / NEEDS_TUNING}
```

### Step 4: Tune Parameters

```
Parameter Tuning:

| Parameter        | Before | After | Impact           |
|------------------|--------|-------|------------------|
| ef_search        | {old}  | {new} | {latency_change} |
| top_k            | {old}  | {new} | {latency_change} |
| rerank_candidates| {old}  | {new} | {latency_change} |
| batch_size       | {old}  | {new} | {throughput_change}|
| quantization     | {old}  | {new} | {memory_change}  |
```

### Step 5: Benchmark Improvements

```
Optimization Benchmark Results:

| Metric        | Before  | After   | Change  | Target  | Status |
|---------------|---------|---------|---------|---------|--------|
| p50 latency   | {ms}    | {ms}    | {-%}    | {ms}    | PASS   |
| p95 latency   | {ms}    | {ms}    | {-%}    | {ms}    | PASS   |
| p99 latency   | {ms}    | {ms}    | {-%}    | {ms}    | PASS   |
| Throughput     | {qps}   | {qps}   | {+%}    | {qps}   | PASS   |
| Recall@10      | {score} | {score} | {change}| {min}   | PASS   |
| Memory         | {gb}    | {gb}    | {-%}    | {max}   | PASS   |
| Cost/query     | ${cost} | ${cost} | {-%}    | ${max}  | PASS   |
```

### Step 6: Document Changes

```
Optimization Summary:

Changes Applied:
1. {change_1}: {before} -> {after} ({impact})
2. {change_2}: {before} -> {after} ({impact})
3. {change_3}: {before} -> {after} ({impact})

Net Impact:
  Latency: {total_latency_improvement}
  Throughput: {total_throughput_improvement}
  Quality: {quality_assessment}
  Cost: {cost_impact}

Rollback Plan:
  1. {rollback_step_1}
  2. {rollback_step_2}
```

### Step 7: Validate Quality Maintained

```
Quality Validation:

| Quality Metric | Before | After | Threshold | Status      |
|----------------|--------|-------|-----------|-------------|
| Recall@10      | {val}  | {val} | > {min}   | PASS/FAIL   |
| MRR            | {val}  | {val} | > {min}   | PASS/FAIL   |
| NDCG@10        | {val}  | {val} | > {min}   | PASS/FAIL   |

Verdict: {Quality maintained / Quality degraded - rollback recommended}
```

---

## Usage

```
*optimize-search
*optimize-search --target "p95 < 100ms" --constraint "recall > 0.95"
*optimize-search --bottleneck "reranking" --quick
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| current_pipeline | object | Yes | - | Description of pipeline stages and their configuration |
| performance_metrics | object | Yes | - | Current latency, throughput, quality metrics |
| bottleneck_analysis | object | No | auto-detect | Known bottlenecks or pain points |
| optimization_targets | object | No | "improve all" | Specific targets for latency, throughput, quality |
| constraints | object | No | none | What cannot be changed (VectorDB, model, etc.) |
| mode | string | No | "interactive" | yolo, interactive, pre-flight |

---

## Output

The task produces:

1. **Optimization Plan** - Prioritized list of optimizations with expected impact
2. **Tuned Configuration** - Updated config with optimized parameters
3. **Benchmark Results** - Before/after performance comparison
4. **Before/After Comparison** - Summary with quantified improvements

---

## Error Handling

| Error | Cause | Resolution | Recovery |
|-------|-------|------------|----------|
| No Baseline Available | Cannot measure current performance | Run baseline benchmark first | Generate synthetic benchmark |
| Quality Degradation | Speed optimization reduced recall | Roll back specific change | Restore previous config |
| Diminishing Returns | Pipeline near-optimal | Recommend architecture changes | Document current limits |
| Load-Sensitive Results | Optimization fails under concurrency | Test under production load | Use conservative parameters |
| Flaky Benchmarks | Inconsistent results between runs | Increase iterations, warm up | Use median of 5+ runs |

---

## Related

- **Agent:** @vectordb-advisor (Vex)
- **Related tasks:**
  - `*configure-index` - Initial index configuration (optimize after this)
  - `*benchmark-retrieval` - Detailed benchmarking methodology
  - `*setup-hybrid-search` - Hybrid search optimization
  - `*implement-cache` - Add caching to reduce repeat query latency
