# Tech Stack — RAG AI Squad

## Core Language
- **Python 3.10+** (primary language for all components)

## Frameworks
| Framework | Version | Purpose |
|-----------|---------|---------|
| LangChain | latest | Chains, retrievers, document loaders |
| LangGraph | latest | Agent state machines, workflow orchestration |
| LangSmith | latest | Observability, tracing, evaluation |
| FastAPI | latest | API serving |
| Pydantic | v2 | Data validation and schemas |

## Vector Databases (supported)
| Database | Type | Best For |
|----------|------|----------|
| Pinecone | Managed | Production, scale |
| Weaviate | Managed/Self-hosted | Hybrid search native |
| Chroma | Self-hosted | Prototyping, small scale |
| Qdrant | Managed/Self-hosted | Performance, filtering |
| Milvus | Self-hosted | Large scale, GPU |
| FAISS | In-memory | Research, benchmarking |
| pgvector | Self-hosted | PostgreSQL integration |

## Embedding Models (supported)
| Model | Provider | Dimensions |
|-------|----------|-----------|
| text-embedding-3-small | OpenAI | 1536 |
| text-embedding-3-large | OpenAI | 3072 |
| embed-v3 | Cohere | 1024 |
| BGE-large-en-v1.5 | HuggingFace | 1024 |
| E5-large-v2 | HuggingFace | 1024 |
| GTE-large | HuggingFace | 1024 |
| jina-embeddings-v2 | Jina AI | 768 |

## Search & Retrieval
| Component | Options |
|-----------|---------|
| Semantic Search | VectorDB native |
| BM25 | rank_bm25, Elasticsearch |
| Hybrid Fusion | RRF, Weighted |
| Reranking | Cohere Rerank, cross-encoders |
| HyDE | Custom implementation |

## Evaluation
| Tool | Purpose |
|------|---------|
| RAGAS | RAG-specific metrics |
| DeepEval | General LLM evaluation |
| LangSmith Evaluators | Custom evaluators |

## Observability
| Tool | Purpose |
|------|---------|
| LangSmith | Tracing, evaluation, prompt management |
| Custom Dashboards | Cost, latency, quality monitoring |

## Infrastructure
| Component | Options |
|-----------|---------|
| API Framework | FastAPI |
| Container | Docker |
| Orchestration | Kubernetes (optional) |
| CI/CD | GitHub Actions |
| Secret Management | .env, AWS Secrets Manager, Vault |
