---
task: Implement Retrieval Chain
responsavel: "@rag-ai-engineer"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - pipeline_config: RAG pipeline configuration (VectorDB connection, embedding model, collection name)
  - retrieval_strategy: Retrieval approach (semantic, hybrid, HyDE, multi-query, contextual compression)
  - reranking_config: Reranking model and parameters (Cohere, cross-encoder, LLM-based)
Saida: |
  - retrieval_chain: Fully implemented retrieval chain with query transformation and reranking
  - prompt_templates: Prompt templates for query transformation and response generation
  - test_queries: Curated set of test queries with expected results for validation
  - quality_metrics: Retrieval quality metrics (MRR, NDCG, hit rate, latency)
Checklist:
  - "[ ] Configure base retrieval method (semantic, keyword, or hybrid)"
  - "[ ] Implement query transformation (HyDE, multi-query, step-back)"
  - "[ ] Setup reranking pipeline (Cohere, cross-encoder, or LLM-based)"
  - "[ ] Build prompt templates for generation"
  - "[ ] Test with sample queries and measure retrieval quality"
  - "[ ] Measure and optimize retrieval quality metrics"
  - "[ ] Tune parameters for optimal accuracy-latency tradeoff"
---

# *implement-retrieval

Implement a production-grade retrieval chain for a RAG pipeline, including query transformation, multi-stage retrieval, reranking, and prompt engineering. Atlas builds the complete retrieval flow, integrating with the existing VectorDB and embedding infrastructure, and validates quality with test queries.

## Usage

```bash
# Interactive mode (recommended)
*implement-retrieval

# With explicit strategy
*implement-retrieval --strategy hybrid --reranking cohere

# Quick semantic retrieval
*implement-retrieval --mode yolo --strategy semantic

# Full configuration
*implement-retrieval --pipeline-config config/pipeline.yaml --strategy hybrid --reranking cross-encoder
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pipeline_config` | string/object | yes | - | Pipeline configuration path or object |
| `retrieval_strategy` | enum | no | `semantic` | Strategy: `semantic`, `hybrid`, `hyde`, `multi_query`, `contextual_compression`, `ensemble` |
| `reranking_config` | object | no | `null` | Reranking configuration |
| `mode` | enum | no | `interactive` | Execution mode: `yolo`, `interactive`, `preflight` |
| `top_k` | integer | no | `5` | Number of documents to retrieve |
| `search_type` | enum | no | `similarity` | VectorDB search: `similarity`, `mmr`, `similarity_score_threshold` |
| `include_sources` | boolean | no | `true` | Include source citations in responses |
| `streaming` | boolean | no | `false` | Enable streaming responses |

## Retrieval Strategy Reference

### Semantic Search (Baseline)
Simple embedding-based similarity search. Query is embedded and compared against document embeddings in the VectorDB.

```python
retriever = vectorstore.as_retriever(
    search_type="similarity",
    search_kwargs={"k": 5}
)
```

### Hybrid Search (Semantic + Keyword)
Combines dense (embedding) and sparse (BM25/keyword) retrieval with weighted fusion. Handles both semantic understanding and exact keyword matching.

```python
from langchain.retrievers import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever

bm25_retriever = BM25Retriever.from_documents(documents, k=5)
vector_retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

ensemble = EnsembleRetriever(
    retrievers=[bm25_retriever, vector_retriever],
    weights=[0.3, 0.7]
)
```

### HyDE (Hypothetical Document Embeddings)
Generates a hypothetical answer to the query, embeds that answer, and uses it for retrieval. Bridges the query-document semantic gap.

```python
from langchain.chains import HypotheticalDocumentEmbedder

hyde_embeddings = HypotheticalDocumentEmbedder.from_llm(
    llm=llm,
    base_embeddings=embeddings,
    prompt_key="web_search"
)
retriever = vectorstore.as_retriever(
    search_kwargs={"k": 5},
    embedding_function=hyde_embeddings
)
```

### Multi-Query Retrieval
Generates multiple reformulations of the original query, retrieves for each, and merges results. Captures different aspects of the user's intent.

```python
from langchain.retrievers.multi_query import MultiQueryRetriever

retriever = MultiQueryRetriever.from_llm(
    retriever=vectorstore.as_retriever(),
    llm=llm
)
```

### Contextual Compression
Post-processes retrieved documents to extract only the most relevant portions, reducing noise in the context window.

```python
from langchain.retrievers import ContextualCompressionRetriever
from langchain.retrievers.document_compressors import LLMChainExtractor

compressor = LLMChainExtractor.from_llm(llm)
retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=vectorstore.as_retriever()
)
```

### Reranking Options

| Reranker | Speed | Quality | Cost | Use Case |
|----------|-------|---------|------|----------|
| Cohere Rerank | Fast | High | API cost | Production, high throughput |
| Cross-Encoder | Medium | Very High | Compute cost | High accuracy requirements |
| LLM-based | Slow | Highest | High token cost | Critical accuracy, low volume |
| FlashRank | Very Fast | Good | Free (local) | Development, budget-conscious |
| ColBERT | Fast | High | Compute cost | Multi-vector precision |

## Interactive Flow

### Step 1: Current Pipeline Assessment

```
Atlas: Let's implement your retrieval chain.

Do you have an existing pipeline configuration?
  1. Yes, from *build-pipeline (provide config path)
  2. Yes, custom configuration (provide details)
  3. No, I'll configure components now

> [user input]

If configuring now:
  VectorDB type:
    1. Chroma (local)
    2. Pinecone (cloud)
    3. Qdrant (self-hosted / cloud)
    4. Weaviate (self-hosted / cloud)
    5. FAISS (in-memory)
    6. PGVector (PostgreSQL)
    7. Other: ___

  Embedding model:
    1. OpenAI text-embedding-3-small
    2. OpenAI text-embedding-3-large
    3. Cohere embed-english-v3.0
    4. Sentence Transformers (local)
    5. Other: ___

> [user input]
```

### Step 2: Retrieval Strategy Selection

```
Atlas: Which retrieval strategy fits your needs?

What are your primary concerns?
  1. General accuracy (semantic search is fine)
  2. Exact keyword matching matters (use hybrid)
  3. Complex queries with semantic gap (use HyDE)
  4. Queries can be interpreted multiple ways (use multi-query)
  5. Context window is limited, need compressed results
  6. Maximum accuracy, combine everything (use ensemble)

> [user input]

Based on your selection, I recommend: {strategy}

Rationale: {explanation}

Would you like to:
  1. Accept and proceed
  2. Compare strategies with test queries
  3. Choose a different strategy
  4. Use an ensemble of multiple strategies

> [user input]
```

### Step 3: Reranking Configuration

```
Atlas: Reranking can significantly improve retrieval quality.

Do you want to add reranking?
  1. Yes - Cohere Rerank (fast, cloud API, high quality)
  2. Yes - Cross-Encoder (local, highest quality, slower)
  3. Yes - FlashRank (local, fast, free)
  4. Yes - LLM-based (expensive but best quality)
  5. No reranking (faster, lower cost)

> [user input]

If yes:
  Reranking parameters:
    - Initial retrieval k: {default: 20} (retrieve more, then rerank to top-k)
    - Final top-k after reranking: {default: 5}
    - Reranking model: {selected}
    - Score threshold: {default: 0.0}

  Confirm? [Y/n]
```

### Step 4: Prompt Template Design

```
Atlas: Let's configure the generation prompts.

Response style:
  1. Concise (1-3 sentences, direct answer)
  2. Detailed (paragraph with explanation)
  3. Structured (bullet points, sections)
  4. Conversational (natural dialogue style)
  5. Custom template

> [user input]

Source citation style:
  1. Inline citations [1], [2]
  2. Footnotes with source details
  3. Source list at end of response
  4. No citations
  5. Custom format

> [user input]

Should the system:
  [ ] Admit when it doesn't know the answer
  [ ] Ask clarifying questions when query is ambiguous
  [ ] Provide confidence scores
  [ ] Flag potential hallucinations
  [ ] Support follow-up questions with memory

> [user selection]
```

### Step 5: Testing and Validation

```
Atlas: Testing the retrieval chain...

Test query 1: "{query}"
  Retrieved documents: 5
  Top result relevance: 0.92
  Response quality: Good
  Latency: 340ms

Test query 2: "{query}"
  Retrieved documents: 5
  Top result relevance: 0.88
  Response quality: Good
  Latency: 380ms

Test query 3: "{query}"
  Retrieved documents: 5
  Top result relevance: 0.71
  Response quality: Needs improvement
  Latency: 420ms

Overall metrics:
  - Mean Reciprocal Rank (MRR): 0.84
  - Hit Rate @5: 0.90
  - NDCG @5: 0.82
  - Average latency: 380ms
  - P95 latency: 520ms

Recommendation: Consider adding reranking to improve query 3 results.

Accept results? [Y/n]
```

## Output

### 1. Retrieval Chain
- Complete retrieval implementation with query transformation
- Reranking pipeline (if configured)
- Source citation extraction
- Streaming support (if enabled)
- Error handling and fallbacks

### 2. Prompt Templates
- System prompt with RAG instructions
- Query transformation prompts (HyDE, multi-query)
- Response generation prompt with citation format
- Fallback prompts for edge cases

### 3. Test Queries
- Curated test query set with expected behavior
- Edge cases (out-of-scope, ambiguous, multi-hop)
- Regression test suite
- Performance benchmarks

### 4. Quality Metrics
- MRR, NDCG, Hit Rate measurements
- Latency distribution (p50, p95, p99)
- Cost per query estimate
- Accuracy vs. speed tradeoff analysis

## Error Handling

| Error | Cause | Resolution | Recovery |
|-------|-------|------------|----------|
| VectorDB Connection Failed | Database unreachable or wrong credentials | Verify connection string and credentials | Retry with exponential backoff, fall back to cached results |
| Embedding Dimension Mismatch | Query embedding dimensions differ from index | Verify embedding model matches index configuration | Re-embed query with correct model |
| Empty Retrieval Results | No documents match the query | Lower similarity threshold, broaden search | Return "no relevant information found" response |
| Reranker API Error | Cohere/external reranker unavailable | Check API key and rate limits | Skip reranking, return unranked results |
| LLM Rate Limit | Too many generation requests | Implement rate limiting and queuing | Queue requests, return cached responses |
| Context Window Exceeded | Retrieved context exceeds LLM limits | Reduce top-k or enable compression | Truncate context, use summarization |
| Timeout | Query takes too long | Optimize retrieval parameters, reduce top-k | Return partial results with timeout warning |
| Hallucination Detected | Response not grounded in retrieved context | Enable groundedness checking | Flag response, return only retrieved excerpts |

## Pre-Conditions

```yaml
pre-conditions:
  - "[ ] VectorDB populated with embedded documents"
  - "[ ] Embedding model accessible and matching index dimensions"
  - "[ ] LLM API key configured for generation"
  - "[ ] Pipeline configuration available"
```

## Post-Conditions

```yaml
post-conditions:
  - "[ ] Retrieval chain returns relevant results for test queries"
  - "[ ] Reranking improves result quality (if configured)"
  - "[ ] Prompt templates produce well-formatted responses"
  - "[ ] Quality metrics meet acceptance thresholds"
```

## Acceptance Criteria

```yaml
acceptance-criteria:
  - "[ ] MRR >= 0.75 on test query set"
  - "[ ] Hit Rate @5 >= 0.85"
  - "[ ] P95 latency < 2 seconds"
  - "[ ] Responses include source citations (if configured)"
  - "[ ] Graceful handling of out-of-scope queries"
```

## Performance

```yaml
duration_expected: 15-30 min (interactive), 8-15 min (yolo)
cost_estimated: $0.01-0.08
token_usage: ~8,000-25,000 tokens
```

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies:
  - build-pipeline
  - choose-chunking
tags:
  - retrieval
  - rag
  - reranking
  - prompt-engineering
  - implementation
updated_at: 2026-02-09
```

## Related

- **Agent:** @rag-ai-engineer (Atlas)
- **Upstream Tasks:** `*build-pipeline` (pipeline infrastructure), `*choose-chunking` (chunk quality affects retrieval)
- **Downstream Tasks:** `*build-agent` (agent uses retrieval chain)
- **Collaborators:** @vectordb-advisor (Vex) for search optimization, @prompt-engineer (Lyra) for prompt templates, @eval-guardian (Sage) for quality metrics
- **Checklists:** `rag-pipeline-review.md`
