---
task: Choose Chunking Strategy
responsavel: "@rag-ai-engineer"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - document_type: Types of documents to be chunked (PDF, HTML, code, transcripts, markdown, etc.)
  - use_case: The downstream use case for retrieved chunks (Q&A, summarization, extraction, etc.)
  - sample_data: Sample documents or representative examples for testing strategies
  - accuracy_requirements: Required retrieval accuracy level and quality constraints
Saida: |
  - strategy_recommendation: Recommended chunking strategy with full configuration
  - implementation_code: Ready-to-use implementation code for the chosen strategy
  - rationale: Detailed rationale document explaining why this strategy was selected
  - benchmark_results: Comparative benchmark results across tested strategies
Checklist:
  - "[ ] Analyze document types and structural patterns"
  - "[ ] Evaluate use case requirements and query patterns"
  - "[ ] Test candidate chunking strategies on sample data"
  - "[ ] Benchmark accuracy across strategies"
  - "[ ] Compare chunk size impact on retrieval quality"
  - "[ ] Measure retrieval quality with different overlap settings"
  - "[ ] Document rationale and decision matrix"
---

# *choose-chunking

Evaluate, benchmark, and select the optimal chunking strategy for a RAG pipeline. Atlas analyzes document types, use case requirements, and accuracy needs, then tests multiple chunking strategies against sample data to produce a data-driven recommendation with implementation code.

## Usage

```bash
# Interactive mode (recommended)
*choose-chunking

# With document type specified
*choose-chunking --document-type pdf --use-case "contract Q&A"

# Quick recommendation without benchmarking
*choose-chunking --mode yolo --document-type markdown

# Full benchmark mode
*choose-chunking --mode preflight --sample-data ./data/samples/
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `document_type` | list | yes | - | Document types to chunk |
| `use_case` | string | yes | - | Downstream use case description |
| `sample_data` | string | no | - | Path to sample documents for benchmarking |
| `accuracy_requirements` | enum | no | `high` | Level: `best-effort`, `high`, `critical` |
| `mode` | enum | no | `interactive` | Execution mode: `yolo`, `interactive`, `preflight` |
| `max_chunk_size` | integer | no | `512` | Maximum chunk size in tokens |
| `test_queries` | list | no | `[]` | Sample queries for retrieval quality testing |
| `embedding_model` | string | no | `text-embedding-3-small` | Embedding model for benchmarking |

## Chunking Strategy Knowledge Base

Atlas maintains deep expertise in all major chunking strategies. The following is the decision reference used during evaluation.

### Strategy Catalog

#### 1. Fixed-Size Chunking
- **How it works:** Splits text into chunks of a fixed token/character count with configurable overlap.
- **Best for:** Uniform documents, simple use cases, baseline comparisons.
- **Pros:** Simple, predictable, fast, easy to debug.
- **Cons:** Breaks semantic boundaries, splits sentences/paragraphs mid-thought.
- **Configuration:** `chunk_size` (tokens), `chunk_overlap` (tokens).
- **When to choose:** You need a quick baseline, documents are uniform, or simplicity is paramount.

```python
from langchain.text_splitter import CharacterTextSplitter

splitter = CharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=50,
    separator="\n\n"
)
```

#### 2. Recursive Character Splitting
- **How it works:** Splits hierarchically using a list of separators (`\n\n`, `\n`, ` `, `""`), attempting to keep semantic units together.
- **Best for:** General-purpose text, articles, documentation.
- **Pros:** Respects paragraph/sentence boundaries, widely supported, good default.
- **Cons:** No semantic understanding, may still break complex structures.
- **Configuration:** `chunk_size`, `chunk_overlap`, `separators` list.
- **When to choose:** Default choice for most text documents when you need a reliable general-purpose strategy.

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=512,
    chunk_overlap=50,
    separators=["\n\n", "\n", ". ", " ", ""]
)
```

#### 3. Semantic Chunking
- **How it works:** Uses embedding similarity to detect topic boundaries. Sentences with similar embeddings are grouped together; a significant drop in similarity triggers a split.
- **Best for:** Documents with varying topics, long-form content, research papers.
- **Pros:** Semantically coherent chunks, adapts to content structure.
- **Cons:** Slower (requires embedding computation), harder to debug, non-deterministic chunk sizes.
- **Configuration:** `breakpoint_threshold_type` (`percentile`, `standard_deviation`, `interquartile`), `buffer_size`.
- **When to choose:** Content varies in topic density and you need high semantic coherence per chunk.

```python
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings

splitter = SemanticChunker(
    embeddings=OpenAIEmbeddings(),
    breakpoint_threshold_type="percentile",
    breakpoint_threshold_amount=95
)
```

#### 4. Agentic Chunking
- **How it works:** Uses an LLM to decide chunk boundaries. The LLM reads propositions and decides whether each belongs to the current chunk or starts a new one.
- **Best for:** Complex documents where context-aware splitting is critical (legal, medical).
- **Pros:** Highest semantic quality, understands context deeply.
- **Cons:** Expensive (LLM calls per proposition), slow, high token usage.
- **Configuration:** LLM model, proposition extraction prompt, grouping prompt.
- **When to choose:** Accuracy is paramount and cost/latency are secondary concerns.

```python
# Pseudocode - agentic chunking pattern
from langchain_openai import ChatOpenAI

llm = ChatOpenAI(model="gpt-4o-mini")

def agentic_chunk(propositions):
    chunks = []
    current_chunk = []
    for prop in propositions:
        decision = llm.invoke(
            f"Does this proposition belong to the current chunk "
            f"or start a new topic?\n\nCurrent chunk: {current_chunk}\n"
            f"New proposition: {prop}"
        )
        if decision == "new_chunk":
            chunks.append(current_chunk)
            current_chunk = [prop]
        else:
            current_chunk.append(prop)
    return chunks
```

#### 5. Parent-Child (Hierarchical) Chunking
- **How it works:** Creates two levels of chunks: small child chunks for precise retrieval, linked to larger parent chunks for full context. Search matches on children, but returns the parent.
- **Best for:** Long documents where precise retrieval must return sufficient context.
- **Pros:** Best of both worlds (precision + context), excellent for detailed Q&A.
- **Cons:** More complex indexing, higher storage requirements, requires parent-child metadata.
- **Configuration:** `parent_chunk_size`, `child_chunk_size`, `parent_overlap`, `child_overlap`.
- **When to choose:** You need precise retrieval but answers require broader context than a single small chunk provides.

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.retrievers import ParentDocumentRetriever
from langchain.storage import InMemoryStore

parent_splitter = RecursiveCharacterTextSplitter(chunk_size=2000)
child_splitter = RecursiveCharacterTextSplitter(chunk_size=400)

retriever = ParentDocumentRetriever(
    vectorstore=vectorstore,
    docstore=InMemoryStore(),
    child_splitter=child_splitter,
    parent_splitter=parent_splitter
)
```

#### 6. Sentence Window Chunking
- **How it works:** Indexes individual sentences for retrieval, but at query time expands the window to include surrounding sentences for context.
- **Best for:** Precise fact retrieval, FAQ systems, knowledge bases with discrete facts.
- **Pros:** Extremely precise retrieval, configurable context window.
- **Cons:** Higher index size (one embedding per sentence), window expansion adds latency.
- **Configuration:** `window_size` (sentences before/after), sentence splitter.
- **When to choose:** You need pinpoint accuracy for fact-based Q&A and can afford the storage overhead.

```python
from llama_index.core.node_parser import SentenceWindowNodeParser

parser = SentenceWindowNodeParser.from_defaults(
    window_size=3,           # 3 sentences on each side
    window_metadata_key="window",
    original_text_metadata_key="original_text"
)
```

#### 7. Document-Specific Chunking
- **How it works:** Uses format-aware parsers that understand document structure (headings, tables, code blocks, sections) to create semantically meaningful chunks.
- **Best for:** Structured documents (HTML, Markdown, code, LaTeX, legal contracts).
- **Pros:** Preserves document structure, tables stay intact, code blocks are not split.
- **Cons:** Requires format-specific parsers, less generalizable.
- **Configuration:** Format-specific parser settings, heading hierarchy, table handling.
- **When to choose:** Documents have rich structure that must be preserved for accurate retrieval.

```python
from langchain.text_splitter import (
    MarkdownHeaderTextSplitter,
    HTMLHeaderTextSplitter,
    Language,
    RecursiveCharacterTextSplitter
)

# Markdown-aware chunking
md_splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on=[
        ("#", "Header 1"),
        ("##", "Header 2"),
        ("###", "Header 3"),
    ]
)

# Code-aware chunking
code_splitter = RecursiveCharacterTextSplitter.from_language(
    language=Language.PYTHON,
    chunk_size=512,
    chunk_overlap=50
)
```

### Decision Matrix

| Strategy | Semantic Quality | Speed | Cost | Complexity | Best Document Types |
|----------|-----------------|-------|------|------------|-------------------|
| Fixed-Size | Low | Very Fast | Very Low | Very Low | Uniform text |
| Recursive | Medium | Fast | Low | Low | General text, articles |
| Semantic | High | Medium | Medium | Medium | Mixed-topic documents |
| Agentic | Very High | Slow | High | High | Legal, medical, complex |
| Parent-Child | High | Fast (index), Medium (query) | Medium | Medium | Long documents, reports |
| Sentence Window | Very High (precision) | Fast (index), Medium (query) | Medium | Medium | FAQ, knowledge bases |
| Document-Specific | High | Fast | Low | Medium | HTML, Markdown, code |

### Document Type Recommendations

| Document Type | Primary Strategy | Alternative | Rationale |
|---------------|-----------------|-------------|-----------|
| PDF (text-heavy) | Recursive | Semantic | Paragraphs as natural boundaries |
| PDF (tables/forms) | Document-Specific | Parent-Child | Preserve table structure |
| HTML pages | Document-Specific | Recursive | Use heading hierarchy |
| Markdown docs | Document-Specific | Recursive | Headers define sections |
| Code files | Document-Specific | Fixed-Size | Preserve function/class boundaries |
| Call transcripts | Semantic | Sentence Window | Topic shifts in conversation |
| Legal contracts | Agentic | Parent-Child | Clause-level precision required |
| Research papers | Semantic | Parent-Child | Section-based with citations |
| Chat/email threads | Semantic | Fixed-Size | Message boundaries |
| CSV/structured data | Fixed-Size (row-based) | Document-Specific | Row as atomic unit |

## Interactive Flow

### Step 1: Document Analysis

```
Atlas: Let's find the right chunking strategy for your data.

What types of documents will be chunked?
  (select all that apply)

  [ ] PDF documents (text-heavy)
  [ ] PDF documents (tables, forms, mixed content)
  [ ] HTML / web pages
  [ ] Markdown / documentation
  [ ] Source code files
  [ ] Call transcripts (speaker-labeled text)
  [ ] Legal contracts / agreements
  [ ] Research papers / academic content
  [ ] Chat logs / email threads
  [ ] JSON / structured data
  [ ] Plain text / notes
  [ ] Other: ___________

> [user selection]

For each selected type:
  - Average document length (pages/words)?
  - Do documents have consistent structure?
  - Are there tables, images, or code blocks?
  - How many documents total?
```

### Step 2: Use Case Analysis

```
Atlas: Understanding your query patterns helps select the right strategy.

What will users ask about these documents?
  1. Specific facts ("What is the termination clause?")
  2. Summaries ("Summarize the Q3 earnings call")
  3. Comparisons ("Compare policy A and policy B")
  4. Extraction ("Extract all action items from the transcript")
  5. Code questions ("How does the auth middleware work?")
  6. Mixed / varied queries

> [user input]

How precise do answers need to be?
  1. General understanding sufficient
  2. Specific paragraph-level accuracy
  3. Exact sentence-level precision
  4. Verbatim extraction required

> [user input]

How much context does a good answer need?
  1. Single sentence is enough
  2. A paragraph of context
  3. Full section / multiple paragraphs
  4. Entire document context sometimes needed

> [user input]
```

### Step 3: Strategy Evaluation

```
Atlas: Based on your inputs, I'm evaluating these strategies:

  Primary candidate:   {strategy_1} (score: X/10)
  Secondary candidate: {strategy_2} (score: X/10)
  Also considered:     {strategy_3} (score: X/10)

Evaluation criteria:
  - Semantic coherence: {score}
  - Retrieval precision: {score}
  - Speed / throughput: {score}
  - Cost efficiency: {score}
  - Implementation complexity: {score}

Would you like to:
  1. Accept the recommendation
  2. Run benchmarks on sample data
  3. See detailed comparison
  4. Override with a specific strategy

> [user input]
```

### Step 4: Benchmarking (optional)

```
Atlas: Running benchmarks on sample data...

  Testing: Fixed-Size (512 tokens, 50 overlap)
    - Chunks generated: 142
    - Avg chunk size: 487 tokens
    - Retrieval accuracy (top-5): 72%
    - Time: 0.8s

  Testing: Recursive (512 tokens, 50 overlap)
    - Chunks generated: 138
    - Avg chunk size: 463 tokens
    - Retrieval accuracy (top-5): 81%
    - Time: 1.2s

  Testing: Semantic (percentile-95)
    - Chunks generated: 156
    - Avg chunk size: 398 tokens
    - Retrieval accuracy (top-5): 89%
    - Time: 4.7s

  Testing: Parent-Child (parent: 2000, child: 400)
    - Child chunks generated: 312
    - Parent chunks: 64
    - Retrieval accuracy (top-5): 86%
    - Time: 2.1s

Winner: Semantic Chunking (89% accuracy)
Runner-up: Parent-Child (86% accuracy, better context)

Proceed with {winner}? [Y/n]
```

### Step 5: Implementation

```
Atlas: Generating implementation code...

  Strategy: {selected_strategy}
  Configuration:
    - chunk_size: {value}
    - chunk_overlap: {value}
    - {strategy-specific params}

  Files generated:
    - src/ingestion/chunkers.py (strategy implementation)
    - config/chunking.yaml (configuration)
    - tests/test_chunking.py (unit tests)
    - docs/chunking-rationale.md (decision document)

Implementation ready!
```

## Output

### 1. Strategy Recommendation
- Selected strategy with full configuration
- Rationale explaining why this strategy outperforms alternatives
- Configuration parameters with tuning guidance
- Edge cases and known limitations

### 2. Implementation Code
- Production-ready chunking implementation
- Configuration file for easy parameter tuning
- Unit tests for chunk quality validation
- Integration with document loaders

### 3. Rationale Document
- Decision matrix with scoring
- Benchmark results (if run)
- Alternatives considered and why they were rejected
- Recommendations for future optimization

### 4. Benchmark Results
- Per-strategy accuracy metrics
- Chunk size distribution analysis
- Retrieval quality comparison
- Speed and cost analysis

## Error Handling

| Error | Cause | Resolution | Recovery |
|-------|-------|------------|----------|
| No Sample Data | Sample data path empty or invalid | Prompt for sample data or use synthetic examples | Generate representative synthetic documents |
| Unsupported Document Type | Document format not recognized | Show supported formats, suggest conversion | Recommend preprocessing pipeline |
| Embedding Model Unavailable | API key missing or model not accessible | Verify credentials, suggest alternatives | Fall back to local embedding model for benchmarks |
| Benchmark Timeout | Large sample data causes timeout | Reduce sample size or increase timeout | Run benchmarks on subset, extrapolate results |
| Low Accuracy All Strategies | No strategy meets accuracy threshold | Suggest hybrid approach or data preprocessing | Recommend data cleaning, metadata enrichment |
| Memory Error | Large documents exceed memory limits | Implement streaming/batched processing | Process documents in smaller batches |

## Pre-Conditions

```yaml
pre-conditions:
  - "[ ] Document types identified and sample data available"
  - "[ ] Use case and query patterns understood"
  - "[ ] Embedding model accessible for benchmarking (if benchmark mode)"
```

## Post-Conditions

```yaml
post-conditions:
  - "[ ] Chunking strategy selected with documented rationale"
  - "[ ] Implementation code generated and tested"
  - "[ ] Benchmark results documented (if benchmark mode used)"
```

## Acceptance Criteria

```yaml
acceptance-criteria:
  - "[ ] Selected strategy handles all identified document types"
  - "[ ] Implementation code passes unit tests"
  - "[ ] Rationale document explains decision with data"
  - "[ ] Configuration is tunable without code changes"
```

## Performance

```yaml
duration_expected: 10-25 min (interactive), 5 min (yolo), 15-30 min (with benchmarks)
cost_estimated: $0.005-0.05 (higher if benchmarking with embeddings)
token_usage: ~5,000-20,000 tokens
```

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies: []
tags:
  - chunking
  - rag
  - strategy
  - analysis
  - benchmarking
updated_at: 2026-02-09
```

## Related

- **Agent:** @rag-ai-engineer (Atlas)
- **Upstream Tasks:** `*design-rag` (architecture context)
- **Downstream Tasks:** `*build-pipeline` (uses chosen strategy), `*implement-retrieval` (retrieval depends on chunk quality)
- **Collaborators:** @eval-guardian (Sage) for accuracy benchmarking, @vectordb-advisor (Vex) for index optimization per chunk size
- **Checklists:** `rag-pipeline-review.md`
