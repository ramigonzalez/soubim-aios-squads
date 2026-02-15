# RAG Pipeline Evaluation Report

## Project: {{project_name}}
## Pipeline Version: {{pipeline_version}}
## Date: {{date}}
## Evaluator: Sage (eval-guardian)

---

## Executive Summary

**Overall Score: {{overall_score}}/100**

| Category | Score | Status |
|----------|-------|--------|
| Faithfulness | {{faithfulness_score}} | {{faithfulness_status}} |
| Answer Relevancy | {{relevancy_score}} | {{relevancy_status}} |
| Context Precision | {{context_precision}} | {{precision_status}} |
| Context Recall | {{context_recall}} | {{recall_status}} |
| Groundedness | {{groundedness_score}} | {{groundedness_status}} |
| Hallucination Rate | {{hallucination_rate}}% | {{hallucination_status}} |

**Recommendation:** {{overall_recommendation}}

---

## Evaluation Configuration

### Dataset
| Property | Value |
|----------|-------|
| Dataset Name | {{dataset_name}} |
| Total Samples | {{total_samples}} |
| Source | {{dataset_source}} |
| Created | {{dataset_created}} |
| Last Updated | {{dataset_updated}} |

### Metrics Configuration
| Framework | Metrics | Version |
|-----------|---------|---------|
| RAGAS | Faithfulness, Answer Relevancy, Context Precision, Context Recall | {{ragas_version}} |
| DeepEval | {{deepeval_metrics}} | {{deepeval_version}} |
| Custom | {{custom_metrics}} | - |

### Pipeline Under Test
| Component | Version |
|-----------|---------|
| Chunking | {{chunking_version}} |
| Embedding Model | {{embedding_model}} |
| VectorDB | {{vectordb_version}} |
| Retrieval | {{retrieval_version}} |
| LLM | {{llm_model}} |
| Prompt | {{prompt_version}} |

---

## RAGAS Scores

### Faithfulness
**Score: {{faithfulness_score}}** (threshold: {{faithfulness_threshold}})

{{faithfulness_analysis}}

| Quartile | Score Range | Count | % |
|----------|-----------|-------|---|
| Excellent | 0.9 - 1.0 | {{q1_count}} | {{q1_pct}}% |
| Good | 0.7 - 0.9 | {{q2_count}} | {{q2_pct}}% |
| Fair | 0.5 - 0.7 | {{q3_count}} | {{q3_pct}}% |
| Poor | 0.0 - 0.5 | {{q4_count}} | {{q4_pct}}% |

### Answer Relevancy
**Score: {{relevancy_score}}** (threshold: {{relevancy_threshold}})

{{relevancy_analysis}}

### Context Precision
**Score: {{context_precision}}** (threshold: {{precision_threshold}})

{{precision_analysis}}

### Context Recall
**Score: {{context_recall}}** (threshold: {{recall_threshold}})

{{recall_analysis}}

---

## DeepEval Metrics

{{deepeval_detailed_results}}

---

## Groundedness Analysis

### Overall Groundedness: {{groundedness_score}}

| Category | Count | % | Examples |
|----------|-------|---|----------|
| Fully Grounded | {{grounded_count}} | {{grounded_pct}}% | - |
| Partially Grounded | {{partial_count}} | {{partial_pct}}% | {{partial_examples}} |
| Ungrounded | {{ungrounded_count}} | {{ungrounded_pct}}% | {{ungrounded_examples}} |

### Citation Accuracy
| Metric | Value |
|--------|-------|
| Citations Provided | {{citations_provided}}% |
| Citations Correct | {{citations_correct}}% |
| False Citations | {{false_citations}} |

---

## Hallucination Rate

**Rate: {{hallucination_rate}}%** (threshold: < {{hallucination_threshold}}%)

### Hallucination Types
| Type | Count | % | Severity |
|------|-------|---|----------|
| Factual Error | {{factual_count}} | {{factual_pct}}% | High |
| Fabricated Detail | {{fabricated_count}} | {{fabricated_pct}}% | High |
| Misattribution | {{misattr_count}} | {{misattr_pct}}% | Medium |
| Exaggeration | {{exag_count}} | {{exag_pct}}% | Low |

### Sample Hallucinations
{{hallucination_samples}}

---

## Latency & Throughput

### Latency Distribution
| Percentile | Value | Target | Status |
|-----------|-------|--------|--------|
| P50 | {{p50_ms}}ms | {{p50_target}}ms | {{p50_status}} |
| P90 | {{p90_ms}}ms | {{p90_target}}ms | {{p90_status}} |
| P95 | {{p95_ms}}ms | {{p95_target}}ms | {{p95_status}} |
| P99 | {{p99_ms}}ms | {{p99_target}}ms | {{p99_status}} |

### Latency Breakdown
| Component | Avg (ms) | % of Total |
|-----------|----------|-----------|
| Embedding | {{embed_latency}} | {{embed_pct}}% |
| VectorDB Query | {{vectordb_latency}} | {{vectordb_pct}}% |
| Reranking | {{rerank_latency}} | {{rerank_pct}}% |
| LLM Generation | {{llm_latency}} | {{llm_pct}}% |
| Other | {{other_latency}} | {{other_pct}}% |

### Throughput
| Metric | Value |
|--------|-------|
| Queries/second | {{qps}} |
| Concurrent Users | {{concurrent}} |
| Peak QPS | {{peak_qps}} |

---

## Cost Per Query

| Component | Tokens/Query | Cost/Query | Monthly ({{monthly_queries}} queries) |
|-----------|-------------|-----------|-------|
| Input Tokens (LLM) | {{input_tokens}} | ${{input_cost}} | ${{input_monthly}} |
| Output Tokens (LLM) | {{output_tokens}} | ${{output_cost}} | ${{output_monthly}} |
| Embeddings | {{embed_tokens}} | ${{embed_cost}} | ${{embed_monthly}} |
| VectorDB | - | ${{vectordb_cost}} | ${{vectordb_monthly}} |
| **Total** | - | **${{total_cost_per_query}}** | **${{total_monthly}}** |

---

## Regression Comparison

### vs Previous Version ({{previous_version}})
| Metric | Previous | Current | Delta | Status |
|--------|----------|---------|-------|--------|
| Faithfulness | {{prev_faith}} | {{curr_faith}} | {{delta_faith}} | {{faith_status}} |
| Answer Relevancy | {{prev_rel}} | {{curr_rel}} | {{delta_rel}} | {{rel_status}} |
| Context Precision | {{prev_prec}} | {{curr_prec}} | {{delta_prec}} | {{prec_status}} |
| Hallucination Rate | {{prev_halluc}}% | {{curr_halluc}}% | {{delta_halluc}} | {{halluc_status}} |
| P95 Latency | {{prev_latency}}ms | {{curr_latency}}ms | {{delta_latency}} | {{latency_status}} |
| Cost/Query | ${{prev_cost}} | ${{curr_cost}} | {{delta_cost}} | {{cost_status}} |

### Regressions Detected
{{regression_details}}

---

## Failure Analysis

### Top Failure Patterns
| Pattern | Count | % | Root Cause | Suggested Fix |
|---------|-------|---|-----------|--------------|
| {{pattern_1}} | {{count}} | {{pct}}% | {{cause}} | {{fix}} |

### Sample Failures
{{failure_samples}}

---

## Recommendations & Next Steps

### Immediate Actions
1. {{action_1}}
2. {{action_2}}

### Short-term Improvements
1. {{improvement_1}}
2. {{improvement_2}}

### Long-term Optimizations
1. {{optimization_1}}
2. {{optimization_2}}

---

## Appendix

### A. Full Metric Details
{{full_metrics}}

### B. Test Environment
| Property | Value |
|----------|-------|
| LangSmith Project | {{langsmith_project}} |
| Run ID | {{run_id}} |
| Duration | {{duration}} |
| Environment | {{environment}} |

### C. Methodology Notes
{{methodology_notes}}
