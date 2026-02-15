---
task: Create Evaluation Dataset
responsavel: "@eval-guardian"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - domain: The knowledge domain for evaluation (e.g., "technical-docs", "customer-support", "legal")
  - sample_queries: Representative queries for the RAG pipeline to be evaluated
  - ground_truth: Expected correct answers with source references for each query
  - dataset_size: Target number of QA pairs in the dataset (default: 50)
Saida: |
  - golden_dataset: Curated evaluation dataset with QA pairs, contexts, and ground truth
  - qa_pairs: Structured question-answer pairs with metadata and difficulty levels
  - annotation_guide: Documentation for annotators to maintain dataset quality
  - dataset_stats: Statistical summary of dataset coverage, distribution, and quality metrics
Checklist:
  - "[ ] Define evaluation scope"
  - "[ ] Collect sample queries"
  - "[ ] Create ground truth answers"
  - "[ ] Add context references"
  - "[ ] Annotate edge cases"
  - "[ ] Validate dataset quality"
  - "[ ] Upload to LangSmith"
  - "[ ] Document annotation guide"
---

# *create-eval-dataset

Create a high-quality evaluation dataset (golden dataset) for RAG pipeline evaluation. This dataset serves as the ground truth benchmark for RAGAS and DeepEval metrics, regression testing, and continuous quality monitoring. The dataset includes query-answer pairs, expected context passages, difficulty ratings, and edge case annotations.

## Usage

```
*create-eval-dataset                                    # Interactive creation (default)
*create-eval-dataset domain="technical-docs"            # With domain specified
*create-eval-dataset domain="support" dataset_size=100  # Custom size
*create-eval-dataset domain="legal" sample_queries="queries.jsonl" ground_truth="answers.jsonl"
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `domain` | string | yes | — | Knowledge domain (e.g., "technical-docs", "customer-support", "legal", "medical") |
| `sample_queries` | string/file | no | — | Path to file with sample queries or comma-separated list |
| `ground_truth` | string/file | no | — | Path to file with ground truth answers or will be created interactively |
| `dataset_size` | integer | no | `50` | Target number of QA pairs (min: 10, recommended: 50-200) |

## Interactive Flow

### Step 1: Define Evaluation Scope

```
ELICIT: Evaluation Scope

1. What is the knowledge domain for this evaluation?
   Examples: "technical-documentation", "customer-support", "legal-contracts", "medical-research"

   Domain: _

2. What type of queries does your RAG pipeline handle?
   [1] Factual questions (Who, What, When, Where)
   [2] Analytical questions (How, Why, Compare)
   [3] Procedural questions (How to, Steps to)
   [4] Multi-hop reasoning (requires combining multiple sources)
   [5] Mixed (all of the above)

   Select types (comma-separated): _

3. What is the target dataset size?
   [1] Small   (10-25 pairs)  - Quick validation
   [2] Medium  (50-100 pairs) - Standard evaluation (recommended)
   [3] Large   (100-200 pairs) - Comprehensive benchmark
   [4] Custom  (specify number)

   Your choice? [1/2/3/4]:
```

### Step 2: Collect Sample Queries

```
ELICIT: Query Collection

How would you like to provide sample queries?

[1] Manual entry - Type queries one by one
[2] File import  - Import from JSONL/CSV/TXT file
[3] Production traces - Extract from LangSmith production traces
[4] Synthetic generation - Generate queries from your document corpus
[5] Hybrid - Combine multiple sources

Your choice? [1/2/3/4/5]:

→ If [1] Manual entry:
  Enter queries (one per line, empty line to finish):
  Query 1: _
  Query 2: _
  ...

→ If [2] File import:
  File path: _
  Supported formats: .jsonl, .csv, .txt (one query per line)

→ If [3] Production traces:
  LangSmith project: _
  Date range: last __ days
  Minimum run count: _
  Filter by feedback score? (yes/no):

→ If [4] Synthetic generation:
  Document corpus path: _
  Generation model: [gpt-4/claude-3/custom]
  Queries per document: _
```

### Step 3: Create Ground Truth Answers

```
ELICIT: Ground Truth Creation

For each query, provide the expected correct answer and source context.

Strategy for ground truth:
[1] Manual annotation - Write answers yourself
[2] Expert review    - Generate candidates, then review/edit
[3] Document-based   - Extract answers directly from source documents
[4] LLM-assisted     - Use LLM to generate, then human validates

Your choice? [1/2/3/4]:

→ For each QA pair:
  Query: "{query_text}"

  Expected answer: _
  Source document(s): _
  Relevant context passage(s): _
  Confidence level: [high/medium/low]
  Difficulty: [easy/medium/hard]
```

### Step 4: Add Context References

```
ELICIT: Context References

For accurate RAGAS evaluation, each QA pair needs reference contexts.

1. How are your source documents organized?
   [1] Single knowledge base (one vector store)
   [2] Multiple collections (segmented by topic)
   [3] Hierarchical (parent/child documents)

   Your choice? [1/2/3]:

2. For each QA pair, specify:
   - Which document(s) contain the answer
   - The exact passage(s) that support the answer
   - Any related passages that provide additional context

3. Context format:
   {
     "query": "What is the return policy?",
     "ground_truth": "Items can be returned within 30 days...",
     "contexts": [
       "Our return policy allows customers to return items within 30 days of purchase...",
       "Exceptions to the return policy include clearance items..."
     ],
     "source_docs": ["policy-manual.pdf", "faq.md"]
   }
```

### Step 5: Annotate Edge Cases

```
ELICIT: Edge Case Annotation

Edge cases are critical for robust evaluation. Tag the following categories:

[1] Unanswerable queries - Questions with no answer in the corpus
[2] Ambiguous queries    - Questions with multiple valid interpretations
[3] Multi-hop queries    - Require reasoning across multiple documents
[4] Temporal queries     - Answers depend on time/version
[5] Contradictory sources - Different documents give conflicting answers
[6] Out-of-scope queries  - Valid questions outside the RAG domain

Select edge case categories to annotate (comma-separated): _

For each category, provide at least 2-3 examples:

Category: Unanswerable
  Query: _
  Expected behavior: "The system should indicate it cannot find a relevant answer"
  ...
```

### Step 6: Validate Dataset Quality

```
ELICIT: Quality Validation

Running dataset quality checks...

1. Coverage analysis:
   - Query type distribution: {breakdown}
   - Difficulty distribution: {breakdown}
   - Edge case coverage: {percentage}
   - Source document coverage: {percentage}

2. Quality metrics:
   - Duplicate queries detected: {count}
   - Answers without context: {count}
   - Very short answers (<10 words): {count}
   - Missing source references: {count}

3. Issues found: {count}
   {list of issues}

Fix issues automatically where possible? (yes/no):
Review and approve final dataset? (yes/no):
```

### Step 7: Upload to LangSmith

```
ELICIT: LangSmith Upload

1. Upload dataset to LangSmith? (yes/no)

2. Dataset configuration:
   Name: {domain}-eval-dataset-v{version}
   Description: _
   Tags: _

3. Uploading {count} QA pairs to LangSmith...
   Progress: [████████████████████] 100%

4. Dataset URL: https://smith.langchain.com/datasets/{dataset_id}
```

## Output

On successful completion:

```
Evaluation Dataset Created

Dataset:     {domain}-eval-dataset-v1
Total Pairs: {count}
Domain:      {domain}
LangSmith:   https://smith.langchain.com/datasets/{dataset_id}

Distribution:
  Factual:      {n} ({pct}%)
  Analytical:   {n} ({pct}%)
  Procedural:   {n} ({pct}%)
  Multi-hop:    {n} ({pct}%)

Difficulty:
  Easy:   {n} ({pct}%)
  Medium: {n} ({pct}%)
  Hard:   {n} ({pct}%)

Edge Cases:
  Unanswerable:  {n}
  Ambiguous:     {n}
  Multi-hop:     {n}
  Out-of-scope:  {n}

Files Created:
  data/eval/{domain}-eval-dataset-v1.jsonl    - Full dataset (JSONL)
  data/eval/{domain}-eval-dataset-v1.csv      - Dataset (CSV export)
  data/eval/{domain}-annotation-guide.md      - Annotation guide
  data/eval/{domain}-dataset-stats.json       - Statistical summary

Next Steps:
  1. Run *run-evaluation to evaluate your RAG pipeline against this dataset
  2. Run *regression-test to establish baseline metrics
  3. Review annotation guide and share with team annotators
```

## Dataset Schema

Each entry in the golden dataset follows this schema:

```json
{
  "id": "eval-001",
  "query": "What is the maximum file upload size?",
  "ground_truth": "The maximum file upload size is 100MB for standard accounts and 500MB for enterprise accounts.",
  "contexts": [
    "File uploads are limited to 100MB per file for standard tier accounts. Enterprise customers can upload files up to 500MB.",
    "To increase your upload limit, contact sales to upgrade to the enterprise plan."
  ],
  "source_docs": ["docs/file-management.md", "docs/pricing.md"],
  "metadata": {
    "query_type": "factual",
    "difficulty": "easy",
    "edge_case": null,
    "domain": "technical-docs",
    "annotator": "human",
    "confidence": "high",
    "created_at": "2026-02-09T00:00:00Z",
    "version": 1
  }
}
```

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `DATASET_TOO_SMALL` | Fewer than 10 QA pairs provided | Add more queries or use synthetic generation to reach minimum |
| `MISSING_GROUND_TRUTH` | QA pairs without expected answers | Annotate missing answers manually or use LLM-assisted generation |
| `MISSING_CONTEXT` | QA pairs without reference context passages | Extract contexts from source documents |
| `DUPLICATE_QUERIES` | Duplicate or near-duplicate queries detected | Remove duplicates or rephrase for diversity |
| `LANGSMITH_UPLOAD_FAILED` | Failed to upload dataset to LangSmith | Check API key, network connectivity, and dataset format |
| `FILE_FORMAT_ERROR` | Import file has invalid format | Verify JSONL/CSV format matches expected schema |
| `CORPUS_NOT_FOUND` | Document corpus path does not exist | Verify path to source documents |
| `SYNTHETIC_GENERATION_FAILED` | LLM failed to generate synthetic queries | Check model API key and reduce batch size |
| `IMBALANCED_DISTRIBUTION` | Query types or difficulty levels heavily skewed | Add more queries in underrepresented categories |

## Related

- **Agent:** @eval-guardian (Sage)
- **Depends On:** *setup-langsmith (LangSmith project must exist for upload)
- **Used By:** *run-evaluation, *regression-test, *check-groundedness
- **Collaborates With:** @rag-architect (domain knowledge), @retrieval-engineer (context retrieval validation)
