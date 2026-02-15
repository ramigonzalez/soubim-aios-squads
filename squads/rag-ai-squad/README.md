# RAG AI Engineering Squad

Production-grade RAG & Agentic AI Engineering squad specializing in RAG pipelines, chunking strategies, VectorDB optimization, LangChain/LangGraph agents, call transcript extraction, and LangSmith observability.

## Agents

| Agent | Name | Role | Confidence |
|-------|------|------|-----------|
| `@rag-ai-engineer` | Atlas | Lead RAG Architect & Agentic Workflow Engineer | 98% |
| `@vectordb-advisor` | Vex | Data & Retrieval Infrastructure Engineer | 93% |
| `@eval-guardian` | Sage | Observability, Evaluation & QA Engineer | 92% |
| `@prompt-engineer` | Lyra | Prompt Engineering Specialist | 91% |

## Delegation Model

```
Atlas designs the pipeline
  -> Lyra crafts the prompts
    -> Vex builds the retrieval infrastructure
      -> Atlas implements the solution
        -> Sage ensures production quality
```

## Quick Start

### 1. Design a RAG Pipeline
```bash
@rag-ai-engineer *design-rag
```

### 2. Run Full Setup Workflow
```bash
# Orchestrates all 5 phases: Design -> Prompts -> Infrastructure -> Build -> Quality
@aios-master *run-workflow full-rag-setup
```

### 3. Individual Agent Commands

**Atlas (RAG Architecture):**
```bash
@rag-ai-engineer *choose-chunking    # Select chunking strategy
@rag-ai-engineer *build-pipeline     # Build RAG pipeline
@rag-ai-engineer *build-agent        # Build LangGraph agent
@rag-ai-engineer *extract-transcript # Extract from call transcripts
```

**Vex (Retrieval Infrastructure):**
```bash
@vectordb-advisor *compare-vectordbs   # Compare VectorDBs
@vectordb-advisor *setup-hybrid-search # Setup hybrid search
@vectordb-advisor *select-embeddings   # Select embedding model
@vectordb-advisor *implement-cache     # Semantic caching
```

**Sage (Quality & Observability):**
```bash
@eval-guardian *setup-langsmith      # Setup observability
@eval-guardian *run-evaluation       # Run RAGAS/DeepEval
@eval-guardian *setup-guardrails     # Input/output guardrails
@eval-guardian *monitor-production   # Production monitoring
```

**Lyra (Prompt Engineering):**
```bash
@prompt-engineer *design-prompt          # Design RAG prompts
@prompt-engineer *optimize-prompt        # Optimize token usage
@prompt-engineer *compare-prompts        # A/B test prompts
```

## Tech Stack

- **Language:** Python 3.10+
- **Frameworks:** LangChain, LangGraph, FastAPI, Pydantic
- **Observability:** LangSmith
- **Evaluation:** RAGAS, DeepEval
- **VectorDBs:** Pinecone, Weaviate, Chroma, Qdrant, Milvus, FAISS
- **Embeddings:** OpenAI, Cohere, HuggingFace
- **Search:** BM25, Semantic, Hybrid, HyDE, Reranking

## Components

| Type | Count |
|------|-------|
| Agents | 4 |
| Tasks | 28 |
| Workflows | 1 |
| Templates | 2 |
| Checklists | 2 |

## Checklists

- **production-readiness.md** — Pre-production validation
- **rag-pipeline-review.md** — Technical review

## Templates

- **rag-architecture-doc.md** — RAG architecture document
- **evaluation-report.md** — Evaluation results report

## Created

- **Date:** 2026-02-06
- **Author:** Ramiro Gonzalez
- **Tool:** Craft (squad-creator)
- **Blueprint:** `.designs/rag-ai-squad-design.yaml`
- **Overall Confidence:** 94%
