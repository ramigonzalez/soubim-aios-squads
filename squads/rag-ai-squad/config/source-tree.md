# Source Tree — RAG AI Squad

```
squads/rag-ai-squad/
├── squad.yaml                              # Squad manifest
├── README.md                               # Squad documentation
│
├── config/
│   ├── coding-standards.md                 # Python coding standards
│   ├── tech-stack.md                       # Technology stack reference
│   └── source-tree.md                      # This file
│
├── agents/
│   ├── rag-ai-engineer.md                  # Atlas — Lead RAG Architect (98%)
│   ├── vectordb-advisor.md                 # Vex — Data & Retrieval Infra (93%)
│   ├── eval-guardian.md                    # Sage — Observability & QA (92%)
│   └── prompt-engineer.md                  # Lyra — Prompt Specialist (91%)
│
├── tasks/
│   │── # Atlas Tasks (7)
│   ├── rag-ai-engineer-design-rag.md       # Design RAG pipeline architecture
│   ├── rag-ai-engineer-build-pipeline.md   # Build RAG pipeline
│   ├── rag-ai-engineer-choose-chunking.md  # Choose chunking strategy
│   ├── rag-ai-engineer-implement-retrieval.md  # Implement retrieval chain
│   ├── rag-ai-engineer-extract-transcript.md   # Extract from call transcripts
│   ├── rag-ai-engineer-build-agent.md      # Build production agent
│   ├── rag-ai-engineer-design-graph.md     # Design LangGraph state machine
│   │── # Vex Tasks (7)
│   ├── vectordb-advisor-compare-vectordbs.md   # Compare vector databases
│   ├── vectordb-advisor-configure-index.md     # Configure vector index
│   ├── vectordb-advisor-optimize-search.md     # Optimize search performance
│   ├── vectordb-advisor-benchmark-retrieval.md # Benchmark retrieval infra
│   ├── vectordb-advisor-setup-hybrid-search.md # Setup hybrid search
│   ├── vectordb-advisor-implement-cache.md     # Implement semantic cache
│   ├── vectordb-advisor-select-embeddings.md   # Select embedding model
│   │── # Sage Tasks (9)
│   ├── eval-guardian-setup-langsmith.md         # Setup LangSmith
│   ├── eval-guardian-create-eval-dataset.md     # Create evaluation dataset
│   ├── eval-guardian-run-evaluation.md          # Run RAGAS/DeepEval evaluation
│   ├── eval-guardian-check-groundedness.md      # Check groundedness
│   ├── eval-guardian-monitor-production.md      # Monitor production
│   ├── eval-guardian-manage-prompts.md          # Manage prompt versioning
│   ├── eval-guardian-regression-test.md         # Run regression tests
│   ├── eval-guardian-track-costs.md             # Track LLM costs
│   ├── eval-guardian-setup-guardrails.md        # Setup guardrails
│   │── # Lyra Tasks (5)
│   ├── prompt-engineer-design-prompt.md        # Design prompt
│   ├── prompt-engineer-test-prompt.md          # Test prompt
│   ├── prompt-engineer-optimize-prompt.md      # Optimize prompt
│   ├── prompt-engineer-create-prompt-template.md  # Create prompt template
│   └── prompt-engineer-compare-prompts.md      # A/B compare prompts
│
├── workflows/
│   └── full-rag-setup.yaml                 # End-to-end RAG pipeline setup
│
├── checklists/
│   ├── production-readiness.md             # Pre-production checklist
│   └── rag-pipeline-review.md              # Technical review checklist
│
├── templates/
│   ├── rag-architecture-doc.md             # RAG architecture document template
│   └── evaluation-report.md                # Evaluation report template
│
├── tools/
│   └── .gitkeep
│
├── scripts/
│   └── .gitkeep
│
└── data/
    └── .gitkeep
```

## Component Summary
| Type | Count |
|------|-------|
| Agents | 4 |
| Tasks | 28 |
| Workflows | 1 |
| Checklists | 2 |
| Templates | 2 |
| **Total** | **37** |
