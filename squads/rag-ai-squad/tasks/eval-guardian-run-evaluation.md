---
task: Run RAG Evaluation Suite
responsavel: "@eval-guardian"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - pipeline: Path or reference to the RAG pipeline to evaluate
  - eval_dataset: Path to evaluation dataset or LangSmith dataset ID
  - metrics: List of evaluation metrics to run (RAGAS, DeepEval, or both)
  - thresholds: Minimum acceptable scores per metric (pass/fail criteria)
Saida: |
  - ragas_scores: RAGAS evaluation scores (Faithfulness, Answer Relevancy, Context Precision, Context Recall)
  - deepeval_report: DeepEval evaluation report with detailed metric breakdowns
  - recommendations: Actionable recommendations based on evaluation results
  - detailed_results: Per-query detailed results with individual metric scores
Checklist:
  - "[ ] Load evaluation dataset"
  - "[ ] Configure RAGAS metrics (Faithfulness, Answer Relevancy, Context Precision, Context Recall)"
  - "[ ] Configure DeepEval metrics"
  - "[ ] Run evaluation"
  - "[ ] Analyze results"
  - "[ ] Compare against thresholds"
  - "[ ] Generate recommendations"
  - "[ ] Create report"
---

# *run-evaluation

Run a comprehensive RAG evaluation suite using RAGAS and DeepEval frameworks against your RAG pipeline. This task evaluates retrieval quality, answer faithfulness, context relevance, and overall response quality using industry-standard metrics. Results are compared against configurable thresholds to determine pass/fail status.

## Usage

```
*run-evaluation                                               # Interactive (default)
*run-evaluation pipeline="src/rag/chain.py"                   # Specify pipeline
*run-evaluation eval_dataset="data/eval/golden-v1.jsonl"      # Specify dataset
*run-evaluation metrics="ragas,deepeval" thresholds="0.8"     # Full configuration
*run-evaluation pipeline="src/rag/chain.py" eval_dataset="langsmith://dataset-id" metrics="ragas"
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pipeline` | string | yes | — | Path to RAG pipeline module or chain definition |
| `eval_dataset` | string | yes | — | Path to JSONL dataset or LangSmith dataset ID (`langsmith://{id}`) |
| `metrics` | string | no | `both` | Metrics to run: `ragas`, `deepeval`, `both` |
| `thresholds` | string/object | no | `0.7` | Global threshold or per-metric JSON: `{"faithfulness": 0.8, "relevancy": 0.75}` |

## RAGAS Metrics Deep Dive

### Core RAGAS Metrics

RAGAS (Retrieval Augmented Generation Assessment) provides four core metrics for evaluating RAG pipelines:

#### 1. Faithfulness (0.0 - 1.0)
- **What it measures:** Whether the generated answer is factually consistent with the retrieved context
- **How it works:** Breaks the answer into individual claims, then verifies each claim against the provided context
- **Score interpretation:**
  - 1.0 = Every claim in the answer is supported by the context
  - 0.5 = Half the claims are unsupported (potential hallucination)
  - 0.0 = No claims are supported by the context (complete hallucination)
- **Critical for:** Hallucination detection, factual accuracy
- **Recommended threshold:** >= 0.85

#### 2. Answer Relevancy (0.0 - 1.0)
- **What it measures:** How relevant the generated answer is to the original question
- **How it works:** Generates hypothetical questions from the answer, then measures semantic similarity to the original question
- **Score interpretation:**
  - 1.0 = Answer perfectly addresses the question
  - 0.5 = Answer partially addresses the question or includes irrelevant information
  - 0.0 = Answer is completely irrelevant to the question
- **Critical for:** User satisfaction, response quality
- **Recommended threshold:** >= 0.80

#### 3. Context Precision (0.0 - 1.0)
- **What it measures:** Whether the retrieved context items that are relevant to the ground truth are ranked higher
- **How it works:** Evaluates the ranking of context passages - relevant passages should appear before irrelevant ones
- **Score interpretation:**
  - 1.0 = All relevant context passages are ranked at the top
  - 0.5 = Relevant passages are mixed with irrelevant ones
  - 0.0 = Relevant passages are ranked at the bottom
- **Critical for:** Retrieval quality, efficiency
- **Recommended threshold:** >= 0.75

#### 4. Context Recall (0.0 - 1.0)
- **What it measures:** Whether all relevant information needed to answer the question was retrieved
- **How it works:** Compares ground truth answer sentences against retrieved context to check if each claim is present
- **Score interpretation:**
  - 1.0 = All information in the ground truth is present in retrieved context
  - 0.5 = Half the needed information was retrieved
  - 0.0 = None of the needed information was retrieved
- **Critical for:** Retrieval completeness, information coverage
- **Recommended threshold:** >= 0.75

### Additional RAGAS Metrics

| Metric | Description | When to Use |
|--------|-------------|-------------|
| `Answer Correctness` | Factual similarity between generated and ground truth answer | When you have exact expected answers |
| `Answer Similarity` | Semantic similarity between generated and ground truth answer | When answers can vary in phrasing |
| `Context Relevancy` | Proportion of retrieved context relevant to the question | When optimizing retrieval precision |
| `Harmfulness` | Whether the response contains harmful content | Safety-critical applications |

## DeepEval Metrics Deep Dive

### Core DeepEval Metrics

DeepEval provides complementary evaluation metrics with a focus on LLM-as-judge evaluation:

| Metric | Description | Threshold |
|--------|-------------|-----------|
| `GEval` | General evaluation using configurable criteria | >= 0.7 |
| `Faithfulness` | Claims supported by retrieval context | >= 0.85 |
| `Answer Relevancy` | Response addresses the query | >= 0.80 |
| `Contextual Precision` | Relevant context ranked higher | >= 0.75 |
| `Contextual Recall` | All needed info was retrieved | >= 0.75 |
| `Contextual Relevancy` | Retrieved context is relevant | >= 0.75 |
| `Hallucination` | Detects fabricated information | <= 0.15 |
| `Toxicity` | Detects harmful/toxic content | <= 0.05 |
| `Bias` | Detects biased responses | <= 0.10 |

### DeepEval vs RAGAS Comparison

| Aspect | RAGAS | DeepEval |
|--------|-------|----------|
| Focus | RAG-specific metrics | General LLM evaluation |
| Hallucination | Via Faithfulness score | Dedicated Hallucination metric |
| Toxicity | Basic (Harmfulness) | Comprehensive toxicity detection |
| Bias | Not included | Dedicated Bias metric |
| Custom metrics | Limited | Highly extensible (GEval) |
| LLM-as-judge | Uses LLM internally | Explicit LLM-as-judge support |
| Speed | Faster (fewer API calls) | Slower (more thorough) |

## Interactive Flow

### Step 1: Pipeline Selection

```
ELICIT: RAG Pipeline

1. Which RAG pipeline do you want to evaluate?
   [1] Auto-detect from project structure
   [2] Specify path manually
   [3] Use LangSmith traced pipeline

   Your choice? [1/2/3]:

→ If [1]: Scanning project... Found: {list of detected chains/pipelines}
→ If [2]: Pipeline path: _
→ If [3]: LangSmith project: _ , Chain name: _
```

### Step 2: Dataset Selection

```
ELICIT: Evaluation Dataset

1. Which evaluation dataset should we use?
   [1] Load from file (JSONL/CSV)
   [2] Load from LangSmith datasets
   [3] Create new dataset (invokes *create-eval-dataset)

   Your choice? [1/2/3]:

→ If [1]: File path: _
→ If [2]: Available datasets in LangSmith: {list}
   Select dataset: _
→ If [3]: Launching *create-eval-dataset...
```

### Step 3: Metrics Configuration

```
ELICIT: Metrics Selection

Which evaluation metrics do you want to run?

[1] RAGAS only (Faithfulness, Answer Relevancy, Context Precision, Context Recall)
[2] DeepEval only (Faithfulness, Relevancy, Hallucination, Toxicity, Bias)
[3] Both RAGAS + DeepEval (comprehensive, recommended)
[4] Custom selection (pick individual metrics)

Your choice? [1/2/3/4]:

→ If [4] Custom:
  Available metrics:
  RAGAS:
    [ ] Faithfulness
    [ ] Answer Relevancy
    [ ] Context Precision
    [ ] Context Recall
    [ ] Answer Correctness
    [ ] Answer Similarity

  DeepEval:
    [ ] Faithfulness
    [ ] Answer Relevancy
    [ ] Hallucination
    [ ] Toxicity
    [ ] Bias
    [ ] Contextual Precision
    [ ] Contextual Recall
    [ ] GEval (custom criteria)

  Select metrics (comma-separated numbers): _
```

### Step 4: Threshold Configuration

```
ELICIT: Pass/Fail Thresholds

Configure minimum acceptable scores:

Use default thresholds? (yes/no)

→ If YES:
  Defaults:
  - Faithfulness:       >= 0.85
  - Answer Relevancy:   >= 0.80
  - Context Precision:  >= 0.75
  - Context Recall:     >= 0.75
  - Hallucination:      <= 0.15
  - Toxicity:           <= 0.05

→ If NO:
  Enter threshold for each metric:
  Faithfulness (0.0-1.0):       _
  Answer Relevancy (0.0-1.0):   _
  Context Precision (0.0-1.0):  _
  Context Recall (0.0-1.0):     _
  Hallucination (0.0-1.0):      _
  Toxicity (0.0-1.0):           _
```

### Step 5: Run Evaluation

```
Running RAG Evaluation Suite...

Pipeline:  {pipeline_name}
Dataset:   {dataset_name} ({count} samples)
Metrics:   {selected_metrics}
Model:     {evaluation_llm_model}

Progress:
  [1/4] Running RAGAS Faithfulness...          [████████████████████] 100%
  [2/4] Running RAGAS Answer Relevancy...      [████████████████████] 100%
  [3/4] Running RAGAS Context Precision...     [████████████████████] 100%
  [4/4] Running RAGAS Context Recall...        [████████████████████] 100%

  [1/3] Running DeepEval Hallucination...      [████████████████████] 100%
  [2/3] Running DeepEval Toxicity...           [████████████████████] 100%
  [3/3] Running DeepEval Bias...               [████████████████████] 100%

Evaluation complete. Generating report...
```

### Step 6: Results Analysis

```
ELICIT: Results Review

Evaluation Results Summary:

┌─────────────────────┬────────┬───────────┬────────┐
│ Metric              │ Score  │ Threshold │ Status │
├─────────────────────┼────────┼───────────┼────────┤
│ Faithfulness        │ 0.89   │ >= 0.85   │ PASS   │
│ Answer Relevancy    │ 0.82   │ >= 0.80   │ PASS   │
│ Context Precision   │ 0.71   │ >= 0.75   │ FAIL   │
│ Context Recall      │ 0.78   │ >= 0.75   │ PASS   │
│ Hallucination       │ 0.08   │ <= 0.15   │ PASS   │
│ Toxicity            │ 0.01   │ <= 0.05   │ PASS   │
└─────────────────────┴────────┴───────────┴────────┘

Overall: 5/6 PASS, 1/6 FAIL

Would you like to:
[1] View detailed per-query results
[2] View failing queries only
[3] View recommendations
[4] Export full report
[5] All of the above

Your choice? [1/2/3/4/5]:
```

## Output

On successful completion:

```
RAG Evaluation Complete

Pipeline:     {pipeline_name}
Dataset:      {dataset_name} ({count} samples)
Overall:      {pass_count}/{total_count} metrics PASS
Status:       {PASS/FAIL}

RAGAS Scores:
  Faithfulness:       {score} {status}
  Answer Relevancy:   {score} {status}
  Context Precision:  {score} {status}
  Context Recall:     {score} {status}

DeepEval Scores:
  Hallucination:      {score} {status}
  Toxicity:           {score} {status}
  Bias:               {score} {status}

Recommendations:
  1. {recommendation_1}
  2. {recommendation_2}
  3. {recommendation_3}

Files Created:
  reports/eval/{timestamp}-ragas-report.json       - RAGAS detailed results
  reports/eval/{timestamp}-deepeval-report.json     - DeepEval detailed results
  reports/eval/{timestamp}-evaluation-summary.md    - Human-readable summary
  reports/eval/{timestamp}-per-query-results.csv    - Per-query breakdown
  reports/eval/{timestamp}-recommendations.md       - Actionable recommendations

LangSmith:
  Results logged to project: {project_name}
  Experiment: {experiment_id}
  Dashboard: https://smith.langchain.com/o/{org}/datasets/{dataset_id}/compare

Next Steps:
  1. Address failing metrics using recommendations
  2. Run *regression-test to track improvements
  3. Run *check-groundedness for deeper hallucination analysis
  4. Run *setup-guardrails to prevent quality issues in production
```

## Recommendation Engine

Based on evaluation results, the system generates targeted recommendations:

| Metric Failing | Recommendation |
|----------------|----------------|
| Faithfulness < 0.85 | Improve chunking strategy, add source citations, implement fact-checking chain |
| Answer Relevancy < 0.80 | Refine prompt template, add query rewriting, improve context window |
| Context Precision < 0.75 | Tune retrieval k value, implement re-ranking, improve embedding model |
| Context Recall < 0.75 | Increase chunk overlap, use hybrid search, add document expansion |
| Hallucination > 0.15 | Add guardrails, implement groundedness checking, reduce temperature |
| Toxicity > 0.05 | Add output filters, implement content moderation, update system prompt |

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `PIPELINE_NOT_FOUND` | RAG pipeline path is invalid or module cannot be imported | Verify pipeline path and dependencies |
| `DATASET_NOT_FOUND` | Evaluation dataset file or LangSmith dataset ID not found | Check file path or create dataset with *create-eval-dataset |
| `DATASET_FORMAT_ERROR` | Dataset schema does not match expected format | Validate dataset against required schema (query, ground_truth, contexts) |
| `RAGAS_IMPORT_ERROR` | RAGAS library not installed | Install: `pip install ragas` |
| `DEEPEVAL_IMPORT_ERROR` | DeepEval library not installed | Install: `pip install deepeval` |
| `LLM_API_ERROR` | Evaluation LLM (judge) API call failed | Check API key, rate limits, and model availability |
| `RATE_LIMIT_EXCEEDED` | Too many concurrent API calls to evaluation LLM | Reduce batch size or add retry with exponential backoff |
| `THRESHOLD_FORMAT_ERROR` | Invalid threshold format | Use float (0.0-1.0) or JSON object with per-metric thresholds |
| `EVALUATION_TIMEOUT` | Evaluation took longer than timeout limit | Reduce dataset size or increase timeout; check for slow API responses |
| `LANGSMITH_EXPERIMENT_FAILED` | Failed to log results to LangSmith experiment | Check LangSmith API key and project configuration |

## Implementation Reference

### RAGAS Evaluation Code

```python
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)
from datasets import Dataset

# Load evaluation dataset
eval_data = {
    "question": questions,
    "answer": answers,
    "contexts": contexts,
    "ground_truth": ground_truths,
}
dataset = Dataset.from_dict(eval_data)

# Run RAGAS evaluation
result = evaluate(
    dataset=dataset,
    metrics=[
        faithfulness,
        answer_relevancy,
        context_precision,
        context_recall,
    ],
)

print(result)  # {'faithfulness': 0.89, 'answer_relevancy': 0.82, ...}
```

### DeepEval Evaluation Code

```python
from deepeval import evaluate
from deepeval.metrics import (
    FaithfulnessMetric,
    AnswerRelevancyMetric,
    HallucinationMetric,
    ToxicityMetric,
)
from deepeval.test_case import LLMTestCase

# Create test cases
test_cases = [
    LLMTestCase(
        input=query,
        actual_output=answer,
        expected_output=ground_truth,
        retrieval_context=contexts,
    )
    for query, answer, ground_truth, contexts in zip(queries, answers, ground_truths, all_contexts)
]

# Define metrics
metrics = [
    FaithfulnessMetric(threshold=0.85),
    AnswerRelevancyMetric(threshold=0.80),
    HallucinationMetric(threshold=0.15),
    ToxicityMetric(threshold=0.05),
]

# Run evaluation
evaluate(test_cases=test_cases, metrics=metrics)
```

## Related

- **Agent:** @eval-guardian (Sage)
- **Depends On:** *setup-langsmith (for logging results), *create-eval-dataset (for golden dataset)
- **Used By:** *regression-test (as baseline comparison), *monitor-production (quality benchmarks)
- **Collaborates With:** @retrieval-engineer (retrieval tuning), @prompt-engineer (prompt optimization), @rag-architect (architecture improvements)
