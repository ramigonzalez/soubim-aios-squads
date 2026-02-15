# RAG Architecture Document

## Project: {{project_name}}
## Version: {{version}}
## Date: {{date}}
## Author: {{author}}

---

## 1. Overview & Objectives

### Business Context
{{business_context}}

### Objectives
- [ ] {{objective_1}}
- [ ] {{objective_2}}
- [ ] {{objective_3}}

### Success Metrics
| Metric | Target | Current |
|--------|--------|---------|
| Answer Accuracy | {{target_accuracy}}% | - |
| Hallucination Rate | < {{max_hallucination}}% | - |
| Latency (P95) | < {{target_latency_ms}}ms | - |
| Cost per Query | < ${{max_cost_per_query}} | - |
| Retrieval Precision | > {{target_precision}}% | - |

---

## 2. Data Sources & Ingestion

### Data Sources
| Source | Type | Volume | Update Frequency |
|--------|------|--------|-----------------|
| {{source_1}} | {{type}} | {{volume}} | {{frequency}} |

### Document Types
- [ ] PDF
- [ ] HTML/Web pages
- [ ] Markdown
- [ ] Code files
- [ ] Call transcripts
- [ ] Structured data (CSV, JSON)

### Ingestion Pipeline
```
{{ingestion_pipeline_diagram}}
```

---

## 3. Chunking Strategy & Rationale

### Selected Strategy: {{chunking_strategy}}

### Rationale
{{chunking_rationale}}

### Configuration
| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Chunk Size | {{chunk_size}} | {{size_rationale}} |
| Chunk Overlap | {{chunk_overlap}} | {{overlap_rationale}} |
| Separators | {{separators}} | {{separator_rationale}} |

### Alternatives Evaluated
| Strategy | Pros | Cons | Score |
|----------|------|------|-------|
| {{strategy_1}} | {{pros}} | {{cons}} | {{score}} |

---

## 4. Embedding Model Selection

### Selected Model: {{embedding_model}}

| Property | Value |
|----------|-------|
| Provider | {{provider}} |
| Dimensions | {{dimensions}} |
| Max Tokens | {{max_tokens}} |
| Cost per 1M tokens | ${{cost}} |
| Multilingual | {{multilingual}} |

### Benchmark Results
| Model | MTEB Score | Domain Score | Latency | Cost |
|-------|-----------|-------------|---------|------|
| {{model_1}} | {{score}} | {{domain_score}} | {{latency}} | {{cost}} |

---

## 5. VectorDB Configuration

### Selected Database: {{vectordb}}

| Property | Value |
|----------|-------|
| Deployment | {{managed_or_self_hosted}} |
| Distance Metric | {{distance_metric}} |
| Index Type | {{index_type}} |
| Partitioning | {{partitioning}} |
| Estimated Cost | ${{monthly_cost}}/mo |

### Index Configuration
```yaml
{{index_config}}
```

---

## 6. Retrieval Strategy

### Primary Method: {{retrieval_method}}

### Search Stack
| Component | Implementation | Purpose |
|-----------|---------------|---------|
| Semantic Search | {{semantic_impl}} | {{purpose}} |
| BM25 | {{bm25_impl}} | Keyword matching |
| Hybrid Fusion | {{fusion_method}} | Combine results |
| Reranking | {{reranker}} | Improve precision |

### Query Pipeline
```
User Query → {{query_pipeline_steps}}
```

### HyDE Configuration (if applicable)
{{hyde_config}}

---

## 7. Reranking & Post-Processing

### Reranker: {{reranker_model}}

| Property | Value |
|----------|-------|
| Model | {{model}} |
| Top-K Input | {{top_k_input}} |
| Top-K Output | {{top_k_output}} |
| Latency Impact | +{{latency_ms}}ms |

### Post-Processing Pipeline
1. {{post_processing_step_1}}
2. {{post_processing_step_2}}

---

## 8. Prompt Architecture

### System Prompt
```
{{system_prompt}}
```

### RAG Prompt Template
```
{{rag_prompt_template}}
```

### Few-Shot Examples
{{few_shot_examples}}

---

## 9. Agent Workflow (LangGraph)

### Architecture
```
{{langgraph_diagram}}
```

### Nodes
| Node | Purpose | Agent/Tool |
|------|---------|-----------|
| {{node_1}} | {{purpose}} | {{tool}} |

### State Schema
```python
{{state_schema}}
```

### Edge Conditions
{{edge_conditions}}

---

## 10. Deployment Topology

### Infrastructure
```
{{deployment_diagram}}
```

### Environments
| Environment | Purpose | Config |
|-------------|---------|--------|
| Development | {{dev_purpose}} | {{dev_config}} |
| Staging | {{staging_purpose}} | {{staging_config}} |
| Production | {{prod_purpose}} | {{prod_config}} |

---

## 11. Performance Requirements

| Metric | Requirement | Measurement Method |
|--------|------------|-------------------|
| Latency (P50) | < {{p50}}ms | LangSmith traces |
| Latency (P95) | < {{p95}}ms | LangSmith traces |
| Throughput | {{qps}} queries/sec | Load testing |
| Availability | {{availability}}% | Monitoring |
| Error Rate | < {{error_rate}}% | Alerting |

---

## 12. Cost Projections

| Component | Monthly Cost | Per Query Cost |
|-----------|-------------|---------------|
| LLM ({{llm_model}}) | ${{llm_cost}} | ${{llm_per_query}} |
| Embeddings | ${{embed_cost}} | ${{embed_per_query}} |
| VectorDB | ${{vectordb_cost}} | ${{vectordb_per_query}} |
| Infrastructure | ${{infra_cost}} | - |
| **Total** | **${{total_cost}}** | **${{total_per_query}}** |

### Optimization Opportunities
- {{optimization_1}}
- {{optimization_2}}

---

## Appendix

### A. Decision Log
| Decision | Date | Rationale | Alternatives Considered |
|----------|------|-----------|------------------------|
| {{decision}} | {{date}} | {{rationale}} | {{alternatives}} |

### B. References
- {{reference_1}}
- {{reference_2}}
