# RAG Pipeline Technical Review Checklist

## Project: {{project_name}}
## Reviewer: {{reviewer}}
## Date: {{date}}
## Pipeline Version: {{version}}

---

## 1. Chunking Strategy
- [ ] Chunking strategy justified for document types
- [ ] Chunk size validated (not too large, not too small)
- [ ] Chunk overlap configured appropriately
- [ ] Metadata preserved in chunks (source, page, section)
- [ ] Special document types handled (tables, code, lists)
- [ ] Chunking tested with representative documents
- [ ] No information loss at chunk boundaries

## 2. Embedding Model
- [ ] Embedding model benchmarked on domain data
- [ ] Dimensions appropriate for use case
- [ ] Multilingual support verified (if needed)
- [ ] Embedding latency acceptable
- [ ] Cost per embedding within budget
- [ ] Model versioning tracked

## 3. VectorDB & Index
- [ ] VectorDB appropriate for scale requirements
- [ ] Distance metric correct for embedding model
- [ ] Index type optimized (HNSW, IVF, etc.)
- [ ] Partitioning strategy defined (if needed)
- [ ] Metadata filtering working correctly
- [ ] Backup and recovery configured
- [ ] Connection pooling configured

## 4. Search & Retrieval
- [ ] Hybrid search configured (semantic + BM25)
- [ ] Fusion strategy appropriate (RRF, weighted)
- [ ] Fusion weights tuned on eval dataset
- [ ] Top-K retrieval value optimized
- [ ] Reranking model evaluated
- [ ] Query transformation implemented (if needed)
- [ ] HyDE evaluated (if applicable)
- [ ] Empty result handling implemented

## 5. Prompt Templates
- [ ] System prompt clearly defines role and constraints
- [ ] RAG prompt includes context formatting
- [ ] Few-shot examples included (if applicable)
- [ ] Output format specified
- [ ] "I don't know" instruction for missing context
- [ ] Token budget managed (context + prompt < limit)
- [ ] Prompt tested with edge cases

## 6. Evaluation
- [ ] Golden dataset created (min 100 QA pairs)
- [ ] RAGAS faithfulness > threshold
- [ ] RAGAS answer relevancy > threshold
- [ ] RAGAS context precision > threshold
- [ ] RAGAS context recall > threshold
- [ ] Hallucination rate < threshold
- [ ] Edge cases evaluated

## 7. Groundedness & Safety
- [ ] Groundedness checks implemented
- [ ] Citation/source attribution working
- [ ] Factual accuracy verified on sample
- [ ] Input guardrails active
- [ ] Output guardrails active
- [ ] PII handling configured
- [ ] Adversarial testing completed

## 8. Performance
- [ ] End-to-end latency profiled
- [ ] Bottleneck identified and optimized
- [ ] Caching strategy implemented
- [ ] Concurrent request handling tested
- [ ] Memory usage acceptable
- [ ] No memory leaks detected

## 9. Observability
- [ ] LangSmith tracing active
- [ ] Custom metadata in traces
- [ ] Evaluation runs configured
- [ ] Dashboard monitoring key metrics
- [ ] Alerts configured for anomalies

## 10. Edge Cases
- [ ] Empty query handling
- [ ] Very long query handling
- [ ] Out-of-domain query handling
- [ ] Multilingual query handling (if applicable)
- [ ] Concurrent heavy load
- [ ] VectorDB connection failure
- [ ] LLM timeout/rate limit
- [ ] Embedding model failure

---

## Review Summary

| Area | Score (1-5) | Notes |
|------|------------|-------|
| Chunking | | |
| Embeddings | | |
| VectorDB | | |
| Retrieval | | |
| Prompts | | |
| Evaluation | | |
| Safety | | |
| Performance | | |
| Observability | | |
| Edge Cases | | |

**Overall Score: {{overall_score}}/50**

**Verdict:** [ ] Approved / [ ] Needs Revision / [ ] Rejected

**Reviewer Notes:**
{{reviewer_notes}}
