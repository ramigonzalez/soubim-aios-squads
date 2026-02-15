# Production Readiness Checklist — RAG Pipeline

## Project: {{project_name}}
## Reviewer: Sage (eval-guardian)
## Date: {{date}}

---

## Infrastructure
- [ ] VectorDB deployed and configured
- [ ] Embedding model endpoint available
- [ ] LLM endpoint available and rate limits understood
- [ ] Semantic cache configured (if applicable)
- [ ] All API keys securely stored (not hardcoded)

## Data Pipeline
- [ ] Document ingestion pipeline functional
- [ ] Chunking strategy validated on production data
- [ ] Embeddings generated for full corpus
- [ ] Index optimized for query patterns
- [ ] Data refresh/update mechanism in place

## Retrieval Quality
- [ ] Hybrid search configured (if applicable)
- [ ] Reranking model evaluated and configured
- [ ] Retrieval precision meets threshold
- [ ] Retrieval recall meets threshold
- [ ] Edge cases tested (empty results, irrelevant queries)

## Guardrails
- [ ] Input validation implemented
- [ ] PII detection configured
- [ ] Topic boundary enforcement active
- [ ] Output validation implemented
- [ ] Toxicity filters active
- [ ] Fallback responses configured
- [ ] Adversarial inputs tested

## Evaluation
- [ ] Golden evaluation dataset created (min 100 samples)
- [ ] RAGAS baseline scores established
- [ ] Faithfulness score > {{faithfulness_threshold}}
- [ ] Answer relevancy score > {{relevancy_threshold}}
- [ ] Hallucination rate < {{hallucination_threshold}}%
- [ ] Groundedness checks passing

## Observability
- [ ] LangSmith tracing active for all chains
- [ ] Custom metadata attached to traces
- [ ] Dashboard configured with key metrics
- [ ] Latency monitoring active
- [ ] Error rate monitoring active
- [ ] Quality score monitoring active

## Alerting
- [ ] Latency SLA alerts configured (P95 > {{latency_threshold}}ms)
- [ ] Error rate alerts configured (> {{error_threshold}}%)
- [ ] Quality degradation alerts configured
- [ ] Cost spike alerts configured
- [ ] Escalation paths documented

## Performance
- [ ] Latency P95 < {{latency_target}}ms
- [ ] Throughput meets requirements ({{qps_target}} QPS)
- [ ] Load testing completed
- [ ] Concurrent user testing completed
- [ ] Memory usage profiled

## Cost
- [ ] Cost per query calculated and within budget
- [ ] Monthly cost projection created
- [ ] Cost optimization opportunities identified
- [ ] Token usage monitoring in place
- [ ] Budget alerts configured

## Prompt Management
- [ ] Prompt versioning in place
- [ ] Prompt templates stored in registry
- [ ] Rollback procedure documented and tested
- [ ] Prompt change approval workflow defined

## Deployment
- [ ] CI/CD pipeline includes regression tests
- [ ] Rollback plan documented
- [ ] Blue/green or canary deployment configured
- [ ] Health check endpoints active
- [ ] Runbook created for common issues

## Documentation
- [ ] Architecture document up to date
- [ ] API documentation complete
- [ ] Runbook available for on-call
- [ ] Known limitations documented
- [ ] SLA/SLO defined and communicated

---

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| AI Engineer | | | [ ] |
| QA/Evaluation | | | [ ] |
| DevOps | | | [ ] |
| Product Owner | | | [ ] |
