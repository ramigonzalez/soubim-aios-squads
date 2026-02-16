---
task: Run Regression Tests
responsavel: "@eval-guardian"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - golden_dataset: Path to golden evaluation dataset or LangSmith dataset ID
  - pipeline_versions: Pipeline versions to compare (current vs. previous, or specific versions)
  - comparison_metrics: Metrics to use for regression comparison (RAGAS, DeepEval, or custom)
Saida: |
  - comparison_report: Side-by-side metric comparison report with statistical analysis
  - regression_flags: List of metrics that regressed with severity and details
  - approval_gate: Pass/fail gate decision with justification for deployment approval
  - detailed_diffs: Per-query differences between versions with root cause hints
Checklist:
  - "[ ] Load golden dataset"
  - "[ ] Run current version"
  - "[ ] Run previous version"
  - "[ ] Compare metrics side-by-side"
  - "[ ] Flag regressions"
  - "[ ] Calculate statistical significance"
  - "[ ] Generate approval gate"
  - "[ ] Create detailed report"
---

# *regression-test

Run regression tests to detect quality degradation across RAG pipeline versions. This task compares evaluation metrics between the current pipeline version and a baseline (previous version or golden benchmark), flagging any statistically significant regressions. It generates an approval gate decision to support deployment decisions with evidence-based quality assurance.

## Usage

```
*regression-test                                                    # Interactive (default)
*regression-test golden_dataset="data/eval/golden-v1.jsonl"         # Specify dataset
*regression-test pipeline_versions="v2.1,v2.0"                      # Compare specific versions
*regression-test comparison_metrics="ragas" golden_dataset="langsmith://dataset-id"
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `golden_dataset` | string | yes | — | Path to evaluation dataset or LangSmith dataset ID |
| `pipeline_versions` | string | no | `current,previous` | Versions to compare (comma-separated: `current,v1.0`, or `v2.1,v2.0`) |
| `comparison_metrics` | string | no | `both` | Metrics: `ragas`, `deepeval`, `both`, or custom metric list |

## Regression Detection Framework

### What Constitutes a Regression?

A regression is detected when a metric score for the new version is statistically significantly worse than the baseline version:

| Severity | Criteria | Action |
|----------|----------|--------|
| **CRITICAL** | Score drop >= 10% AND below threshold | Block deployment |
| **HIGH** | Score drop >= 5% or newly below threshold | Require approval |
| **MEDIUM** | Score drop >= 2%, still above threshold | Warning, document |
| **LOW** | Score drop < 2%, still above threshold | Informational |

### Statistical Significance

Regressions are only flagged if statistically significant to avoid false alarms from random variance:

- **Method:** Paired t-test or bootstrap confidence intervals
- **Significance level:** p < 0.05 (95% confidence)
- **Minimum sample size:** 30 query pairs for reliable results
- **Effect size:** Cohen's d reported for practical significance

## Interactive Flow

### Step 1: Dataset Selection

```
ELICIT: Golden Dataset

1. Which evaluation dataset should we use for regression testing?
   [1] Load from file (JSONL/CSV)
   [2] Load from LangSmith datasets
   [3] Use last evaluation run as baseline

   Your choice? [1/2/3]:

→ If [1]: File path: _
→ If [2]: Available datasets: {list}
   Select: _
→ If [3]: Available experiments: {list}
   Select baseline: _

2. Dataset info:
   Name:      {dataset_name}
   Size:      {count} QA pairs
   Domain:    {domain}
   Last used: {timestamp}

   Proceed with this dataset? (yes/no):
```

### Step 2: Pipeline Versions

```
ELICIT: Version Selection

1. Which pipeline versions do you want to compare?
   [1] Current (deployed) vs. Previous (last deployed)
   [2] Current (local) vs. Production (deployed)
   [3] Specific versions (manual selection)
   [4] Current vs. Golden baseline (from last *run-evaluation)

   Your choice? [1/2/3/4]:

→ If [3]:
  Available versions:
  ┌────┬─────────┬─────────────┬───────────────────┐
  │ #  │ Version │ Date        │ Last Eval Score   │
  ├────┼─────────┼─────────────┼───────────────────┤
  │ 1  │ v2.1.0  │ 2026-02-08  │ 0.87 avg          │
  │ 2  │ v2.0.0  │ 2026-01-15  │ 0.85 avg          │
  │ 3  │ v1.9.0  │ 2026-01-02  │ 0.83 avg          │
  │ 4  │ v1.8.0  │ 2025-12-20  │ 0.81 avg          │
  └────┴─────────┴─────────────┴───────────────────┘

  Version A (new): _
  Version B (baseline): _

2. What changed between versions?
   [1] Auto-detect from git diff / changelog
   [2] Describe changes manually
   [3] Skip (just compare metrics)

   Your choice? [1/2/3]:
```

### Step 3: Metrics Configuration

```
ELICIT: Comparison Metrics

1. Which metrics should we compare?
   [1] RAGAS metrics (Faithfulness, Relevancy, Context Precision, Context Recall)
   [2] DeepEval metrics (Faithfulness, Hallucination, Toxicity, Bias)
   [3] Both RAGAS + DeepEval (comprehensive, recommended)
   [4] Custom metric selection

   Your choice? [1/2/3/4]:

2. Regression severity thresholds:
   Accept defaults? (yes/no)

   Defaults:
   - CRITICAL: Score drop >= 10% AND below pass threshold
   - HIGH:     Score drop >= 5%
   - MEDIUM:   Score drop >= 2%
   - LOW:      Score drop < 2%

→ If NO: Configure custom severity thresholds for each level.

3. Statistical test configuration:
   Significance level: [0.05] (press Enter for default)
   Minimum effect size: [0.2] (Cohen's d, press Enter for default)
```

### Step 4: Run Regression Tests

```
Running Regression Tests...

Version A: {version_a} (new)
Version B: {version_b} (baseline)
Dataset:   {dataset_name} ({count} pairs)
Metrics:   {selected_metrics}

Phase 1: Evaluating Version A...
  [████████████████████] 100%  ({count}/{count} queries)

Phase 2: Evaluating Version B...
  [████████████████████] 100%  ({count}/{count} queries)

Phase 3: Comparing results...
  Computing metric differences...
  Running statistical tests...
  Calculating effect sizes...
  Flagging regressions...

Comparison complete.
```

### Step 5: Results Analysis

```
ELICIT: Regression Results

Regression Test Results:

┌─────────────────────┬──────────┬──────────┬────────┬───────────┬──────────┐
│ Metric              │ V{a}     │ V{b}     │ Delta  │ p-value   │ Severity │
├─────────────────────┼──────────┼──────────┼────────┼───────────┼──────────┤
│ Faithfulness        │ 0.87     │ 0.89     │ -0.02  │ 0.032*    │ MEDIUM   │
│ Answer Relevancy    │ 0.84     │ 0.82     │ +0.02  │ 0.115     │ IMPROVED │
│ Context Precision   │ 0.72     │ 0.76     │ -0.04  │ 0.008**   │ HIGH     │
│ Context Recall      │ 0.79     │ 0.78     │ +0.01  │ 0.420     │ NONE     │
│ Hallucination       │ 0.09     │ 0.07     │ +0.02  │ 0.045*    │ MEDIUM   │
│ Toxicity            │ 0.01     │ 0.01     │  0.00  │ 0.950     │ NONE     │
└─────────────────────┴──────────┴──────────┴────────┴───────────┴──────────┘

* p < 0.05  ** p < 0.01  *** p < 0.001

Regressions Detected: 2
  - Context Precision: HIGH severity (statistically significant drop)
  - Faithfulness: MEDIUM severity (statistically significant drop)

Improvements Detected: 1
  - Answer Relevancy: +0.02 (not statistically significant)

Would you like to:
[1] View per-query regression details
[2] View queries with largest score drops
[3] View root cause analysis
[4] View approval gate recommendation
[5] All of the above

Your choice? [1/2/3/4/5]:
```

### Step 6: Approval Gate

```
ELICIT: Deployment Approval Gate

APPROVAL GATE RECOMMENDATION: CONDITIONAL APPROVAL

Justification:
  - 1 HIGH severity regression (Context Precision: -0.04)
  - 1 MEDIUM severity regression (Faithfulness: -0.02)
  - 0 CRITICAL regressions
  - 1 improvement (Answer Relevancy: +0.02)

Recommendation:
  The Context Precision regression suggests retrieval ranking has degraded.
  Consider investigating the re-ranking step before full deployment.

Options:
[1] APPROVE   - Deploy with documented regressions
[2] REJECT    - Block deployment, investigate regressions
[3] CONDITIONAL - Deploy to canary/staging only, monitor closely
[4] OVERRIDE  - Force approval (requires justification)

Your choice? [1/2/3/4]:

→ If [4]: Provide justification: _
```

## Output

On successful completion:

```
Regression Test Complete

Versions Compared: {version_a} vs {version_b}
Dataset:           {dataset_name} ({count} pairs)
Gate Decision:     {APPROVED/REJECTED/CONDITIONAL}

Summary:
  Regressions: {count} ({critical} critical, {high} high, {medium} medium)
  Improvements: {count}
  No Change:    {count}
  Overall:      {verdict}

Regression Details:
  {metric_1}: {version_a_score} vs {version_b_score} ({delta}, {severity})
  {metric_2}: {version_a_score} vs {version_b_score} ({delta}, {severity})

Files Created:
  reports/regression/{timestamp}-comparison.md        - Full comparison report
  reports/regression/{timestamp}-per-query-diffs.csv  - Per-query differences
  reports/regression/{timestamp}-approval-gate.json   - Gate decision record
  reports/regression/{timestamp}-root-cause.md        - Root cause analysis hints

LangSmith:
  Experiment A: https://smith.langchain.com/.../experiments/{exp_a}
  Experiment B: https://smith.langchain.com/.../experiments/{exp_b}
  Comparison:   https://smith.langchain.com/.../compare/{exp_a},{exp_b}

Next Steps (based on gate decision):
  If APPROVED:
    1. Deploy to production
    2. Run *monitor-production to track post-deployment metrics

  If REJECTED:
    1. Investigate root causes in regression report
    2. Fix regressions and re-run *regression-test

  If CONDITIONAL:
    1. Deploy to staging/canary
    2. Monitor for 24-48 hours
    3. Re-evaluate with production data
```

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `DATASET_NOT_FOUND` | Golden dataset file or LangSmith ID not found | Verify path or create with *create-eval-dataset |
| `VERSION_NOT_FOUND` | Specified pipeline version does not exist | Check available versions, use correct identifier |
| `INSUFFICIENT_SAMPLES` | Dataset too small for statistical significance (< 30) | Add more QA pairs to golden dataset |
| `EVALUATION_MISMATCH` | Versions evaluated with different metrics/settings | Re-run both evaluations with identical configuration |
| `BASELINE_MISSING` | No previous evaluation results for comparison | Run *run-evaluation first to establish baseline |
| `STATISTICAL_ERROR` | Statistical test failed (e.g., zero variance) | Check data quality, ensure sufficient sample diversity |
| `GATE_DECISION_CONFLICT` | Multiple conflicting signals (some improve, some regress) | Review per-metric results, apply domain judgment |
| `LLM_API_ERROR` | Evaluation LLM API failure during test runs | Retry with backoff, check API status and quotas |
| `TIMEOUT` | Regression test exceeded maximum runtime | Reduce dataset size or split into batches |

## Related

- **Agent:** @eval-guardian (Sage)
- **Depends On:** *create-eval-dataset (golden dataset), *run-evaluation (baseline scores), *setup-langsmith (experiment logging)
- **Complements:** *manage-prompts (prompt version comparison), *monitor-production (post-deployment monitoring)
- **Used By:** CI/CD pipeline (automated quality gates), deployment approval workflows
- **Collaborates With:** @rag-architect (architecture change impact), @retrieval-engineer (retrieval regression), @prompt-engineer (prompt regression)
