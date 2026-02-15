---
task: A/B Compare Prompt Variants
responsavel: "@prompt-engineer"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - prompt_variants: Two or more prompt versions to compare (inline or file paths)
  - test_dataset: Shared test dataset for fair comparison (input-output pairs or input scenarios)
  - metrics: Evaluation metrics and dimensions to compare on (relevance, faithfulness, cost, latency)
  - statistical_config: Confidence level, minimum sample size, comparison methodology
Saida: |
  - comparison_report: Comprehensive side-by-side comparison with per-metric breakdowns
  - winner: Winning variant with confidence level and margin of victory
  - statistical_significance: P-values, confidence intervals, and effect sizes for each metric
  - detailed_analysis: Per-test-case breakdown showing where each variant wins or loses
Checklist:
  - "[ ] Load and validate all prompt variants"
  - "[ ] Prepare shared test dataset with representative coverage"
  - "[ ] Define comparison metrics and scoring methodology"
  - "[ ] Run all variants against the full test dataset"
  - "[ ] Score outputs for each variant on every metric"
  - "[ ] Calculate aggregate statistics and confidence intervals"
  - "[ ] Determine statistical significance of differences"
  - "[ ] Generate comprehensive comparison report"
  - "[ ] Recommend winner with evidence-based justification"
---

# *compare-prompts

A/B compare two or more prompt variants using a shared test dataset and rigorous statistical methodology. Lyra runs each variant against the same inputs, scores outputs across configurable quality dimensions, calculates statistical significance, and produces a comprehensive comparison report with a clear winner recommendation. Supports multi-variant comparison, cost-quality tradeoff analysis, and stratified analysis by test category.

## A/B Testing Knowledge Base

Lyra applies the following statistical and evaluation methodology:

### Statistical Methods

| Method | When to Use | Requirements | Output |
|--------|------------|--------------|--------|
| **Paired t-test** | 2 variants, continuous scores, normal distribution | n >= 30 per variant | p-value, confidence interval |
| **Wilcoxon Signed-Rank** | 2 variants, ordinal/non-normal scores | n >= 15 per variant | p-value, effect size |
| **McNemar's Test** | 2 variants, binary pass/fail outcomes | n >= 25 per variant | p-value, odds ratio |
| **Friedman Test** | 3+ variants, ordinal scores | n >= 10 per variant | chi-squared, p-value |
| **Bootstrap Confidence Interval** | Any number of variants, small samples | n >= 10 per variant | 95% CI, effect size |
| **Bayesian Comparison** | Probabilistic winner assessment | n >= 5 per variant | P(A > B), credible interval |

### Effect Size Interpretation

| Effect Size (Cohen's d) | Interpretation | Practical Significance |
|--------------------------|---------------|----------------------|
| < 0.2 | Negligible | Not worth switching unless cost is lower |
| 0.2 - 0.5 | Small | Noticeable in aggregate, marginal per-query |
| 0.5 - 0.8 | Medium | Clearly better, worth switching |
| > 0.8 | Large | Substantially better, switch immediately |

### Comparison Dimensions

| Dimension | Type | Description | Aggregation |
|-----------|------|-------------|-------------|
| **Quality Score** | Continuous (0-10) | Weighted average of quality dimensions | Mean + CI |
| **Relevance** | Continuous (0-10) | How well output addresses the query | Mean + CI |
| **Faithfulness** | Continuous (0-10) | Groundedness in retrieved context | Mean + CI |
| **Completeness** | Continuous (0-10) | Coverage of relevant information | Mean + CI |
| **Format Compliance** | Binary (pass/fail) | Output matches required format | Pass rate |
| **Token Usage** | Continuous | Total tokens consumed per request | Mean + CI |
| **Cost Per Request** | Continuous | Dollar cost per request | Mean + CI |
| **Latency** | Continuous (ms) | Time to generate response | Mean + P95 |
| **Safety** | Binary (pass/fail) | Respects guardrails and refusal conditions | Pass rate |
| **User Preference** | Ordinal (A/B/Tie) | Side-by-side preference judgment | Win rate |

### Minimum Sample Sizes

| Confidence Level | Min Effect Size Detectable | Required Sample Size |
|-----------------|---------------------------|---------------------|
| 80% (exploratory) | Large (d > 0.8) | 10-15 per variant |
| 90% (standard) | Medium (d > 0.5) | 20-30 per variant |
| 95% (rigorous) | Small (d > 0.2) | 50-100 per variant |
| 99% (publication) | Very small (d > 0.1) | 200+ per variant |

### Common Pitfalls in Prompt A/B Testing

```
AVOID THESE MISTAKES:
1. Testing multiple changes simultaneously (confounding variables)
2. Stopping early when results look good (peeking bias)
3. Ignoring distribution of scores (mean hides bimodal failure)
4. Comparing on a single dimension (quality may improve but cost doubles)
5. Using non-representative test data (selection bias)
6. Ignoring edge case performance (overall score hides tail failures)
7. Not controlling for randomness (run multiple times with low temperature)
8. Cherry-picking metrics that favor one variant
```

## Usage

```bash
# Interactive comparison
*compare-prompts

# Compare two prompt files
*compare-prompts --a prompts/qa/v1.0.0/prompt.md --b prompts/qa/v2.0.0/prompt.md

# Compare with existing test dataset
*compare-prompts --a v1.md --b v2.md --dataset tests/qa-test-suite.yaml

# Multi-variant comparison
*compare-prompts --variants prompts/qa/v1.md,prompts/qa/v2.md,prompts/qa/v3.md

# Compare with specific metrics focus
*compare-prompts --a v1.md --b v2.md --metrics quality,cost,latency

# High-confidence comparison
*compare-prompts --a v1.md --b v2.md --confidence 0.95 --min-samples 50

# Quick comparison mode
*compare-prompts --mode yolo --a v1.md --b v2.md
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt_variants` | list[string/path] | yes | - | Two or more prompts to compare (inline or file paths) |
| `test_dataset` | list/path | no | auto-generated | Shared test dataset (YAML file or inline) |
| `metrics` | list[string] | no | all dimensions | Which metrics to compare on |
| `statistical_config` | object | no | see defaults | Confidence level, min samples, methodology |
| `confidence_level` | float | no | `0.90` | Statistical confidence level (0.80-0.99) |
| `min_samples` | integer | no | `20` | Minimum test cases per variant |
| `num_runs` | integer | no | `1` | Runs per test case per variant (>1 for consistency) |
| `mode` | enum | no | `interactive` | Execution mode: `yolo`, `interactive`, `preflight` |
| `output_format` | enum | no | `markdown` | Report format: `markdown`, `json`, `yaml`, `csv` |
| `cost_model` | object | no | auto-detect | Token pricing for cost comparison |
| `temperature` | float | no | `0.0` | Temperature for test runs |

## Interactive Flow

### Step 1: Variant Loading

```
Lyra: Let's A/B compare your prompt variants.

How many variants are you comparing?
  1. Two variants (classic A/B test)
  2. Three or more variants (multi-armed comparison)

> [user input]

Provide Variant A:
  1. Paste inline
  2. Load from file path
  3. Load from prompt registry

> [user input for variant A]

Provide Variant B:
  1. Paste inline
  2. Load from file path
  3. Load from prompt registry

> [user input for variant B]

=== VARIANT SUMMARY ===

Variant A: "{name_or_path}"
  Tokens: {token_count}
  Variables: {variable_list}
  Techniques: {detected_techniques}

Variant B: "{name_or_path}"
  Tokens: {token_count}
  Variables: {variable_list}
  Techniques: {detected_techniques}

Key Differences Detected:
  - {diff_1}: A uses {approach_a}, B uses {approach_b}
  - {diff_2}: A has {feature}, B does not
  - {diff_3}: A is {n} tokens {more/fewer} than B

Proceed to test dataset? [Y/n]
```

### Step 2: Test Dataset Preparation

```
Lyra: Now let's prepare a fair test dataset.

How would you like to create the test dataset?
  1. Load from file
  2. Provide test cases manually
  3. Auto-generate based on variant analysis
  4. Use test cases from a previous *test-prompt run
  5. Mix: some manual + some auto-generated

> [user input]

[If auto-generate selected:]
Generating test dataset for fair comparison...

Proposed Test Dataset ({N} cases):

  Happy Path ({n} cases):
    1. {description} - tests {what_it_evaluates}
    2. {description} - tests {what_it_evaluates}
    3. {description} - tests {what_it_evaluates}

  Edge Cases ({n} cases):
    4. {description} - tests {what_it_evaluates}
    5. {description} - tests {what_it_evaluates}

  Adversarial ({n} cases):
    6. {description} - tests {what_it_evaluates}

  Stress Tests ({n} cases):
    7. {description} - tests {what_it_evaluates}

Total: {N} test cases

Statistical Power:
  With {N} samples at {confidence}% confidence:
  - Can detect effect size >= {d} (Cohen's d)
  - This is a {negligible/small/medium/large} effect

Is this sufficient? [Y/n/add more]
```

### Step 3: Metrics Configuration

```
Lyra: Let's configure the comparison metrics.

Which metrics matter for your comparison?
  (rank by importance, 1 = most important)

  [x] Quality Score (weighted average of dimensions)
  [x] Relevance
  [x] Faithfulness
  [x] Completeness
  [ ] Format Compliance
  [ ] Conciseness
  [x] Token Usage (cost proxy)
  [ ] Latency
  [x] Safety Compliance
  [ ] User Preference (requires manual judging)

> [user selection]

Comparison methodology:
  1. Automated scoring (LLM-as-judge) [DEFAULT]
  2. Manual scoring (you score each output)
  3. Hybrid (automated + manual for edge cases)
  4. Reference-based (compare against gold answers)

> [user input]

Statistical settings:
  - Confidence level: {default}% [adjust? Y/n]
  - Minimum detectable effect size: {calculated}
  - Test: {recommended_test} (based on data type)

> [user confirmation]
```

### Step 4: Comparison Execution

```
Lyra: Running comparison...

=== A/B TEST EXECUTION ===

Test 1/{N}: {test_name}
  Variant A output: {truncated_output_a}
  Variant B output: {truncated_output_b}

  Scores:
    Metric          | Variant A | Variant B | Winner
    ────────────────|───────────|───────────|───────
    Relevance       | {score}   | {score}   | {A/B/Tie}
    Faithfulness    | {score}   | {score}   | {A/B/Tie}
    Completeness    | {score}   | {score}   | {A/B/Tie}
    Token Usage     | {tokens}  | {tokens}  | {A/B/Tie}

Running... {progress_bar} {n}/{N}

[... continues for all test cases ...]
```

### Step 5: Statistical Analysis

```
Lyra: Computing statistical results...

=== STATISTICAL ANALYSIS ===

Overall Quality Score:
  Variant A: {mean} +/- {std} (95% CI: [{lower}, {upper}])
  Variant B: {mean} +/- {std} (95% CI: [{lower}, {upper}])

  Difference: {delta} (95% CI: [{lower}, {upper}])
  Effect Size: {cohens_d} ({negligible/small/medium/large})
  p-value: {p_value}
  Significant at {confidence}%: {YES/NO}

Per-Metric Breakdown:

Metric          | A (mean) | B (mean) | Delta  | p-value | Sig? | Effect
────────────────|──────────|──────────|────────|─────────|──────|───────
Relevance       | {mean}   | {mean}   | {delta}| {p}     | {yn} | {d}
Faithfulness    | {mean}   | {mean}   | {delta}| {p}     | {yn} | {d}
Completeness    | {mean}   | {mean}   | {delta}| {p}     | {yn} | {d}
Format          | {rate}%  | {rate}%  | {delta}| {p}     | {yn} | -
Token Usage     | {mean}   | {mean}   | {delta}| {p}     | {yn} | {d}
Safety          | {rate}%  | {rate}%  | {delta}| {p}     | {yn} | -

Win/Loss/Tie Distribution:
  Variant A wins: {count} ({pct}%)
  Variant B wins: {count} ({pct}%)
  Ties:           {count} ({pct}%)
```

### Step 6: Comparison Report and Recommendation

```
Lyra: Here are the final results and recommendation.

=== COMPARISON REPORT ===

============================================
  WINNER: Variant {A/B}
  Confidence: {confidence}%
  Margin: {margin} points ({pct}%)
============================================

Executive Summary:
  Variant {winner} outperforms on {N} of {M} metrics with
  statistical significance (p < {threshold}) on {K} metrics.
  The primary advantage is in {primary_dimension} where
  {winner} scores {delta} points higher.

Detailed Findings:

  1. Quality: Variant {winner} scores {delta} higher overall
     - Strongest advantage in {dimension}: +{delta} points
     - Weakest area (but still ahead): {dimension}: +{delta} points

  2. Cost: Variant {cost_winner} is {pct}% cheaper per request
     - A: ${cost_a} per request ({tokens_a} tokens)
     - B: ${cost_b} per request ({tokens_b} tokens)
     - Monthly difference: ${monthly_delta} (at {volume} requests/day)

  3. Consistency: Variant {consistency_winner} is more stable
     - A std dev: {std_a} | B std dev: {std_b}
     - {less_stable} has higher variance, especially on: {categories}

  4. Edge Cases: Variant {edge_winner} handles edge cases better
     - Edge case scores: A={score_a}, B={score_b}
     - Specific advantage: {description}

Category-Level Analysis:
  Category        | A Score | B Score | Winner | Confidence
  ────────────────|─────────|─────────|────────|──────────
  Happy Path      | {score} | {score} | {win}  | {conf}%
  Edge Cases      | {score} | {score} | {win}  | {conf}%
  Adversarial     | {score} | {score} | {win}  | {conf}%
  Stress Tests    | {score} | {score} | {win}  | {conf}%

Cost-Quality Tradeoff:
  If Variant {higher_quality} is better but {more_expensive}:
    - Quality gain per dollar: {quality_per_dollar}
    - Break-even volume: {volume} requests/day
    - Recommendation: {cost_quality_recommendation}

=== RECOMMENDATION ===

  Deploy: Variant {winner}
  Confidence: {confidence}%
  Rationale: {one_sentence_justification}

  Caveats:
    - {caveat_1}
    - {caveat_2}

  Suggested next steps:
    1. {next_step_1}
    2. {next_step_2}
    3. {next_step_3}

Would you like to:
  1. Export full comparison report
  2. Dig deeper into specific metric or test case
  3. Run additional tests to increase confidence
  4. Create a hybrid prompt combining best elements of both
  5. Deploy the winner as the new version

> [user input]
```

## Output

The task produces the following artifacts:

### 1. Comparison Report (`prompts/{slug}/comparisons/{timestamp}-comparison.md`)
- Executive summary with winner and confidence level
- Per-metric statistical analysis with p-values and effect sizes
- Category-level stratified analysis
- Cost-quality tradeoff analysis
- Win/loss/tie distribution across test cases
- Recommendation with rationale and caveats

### 2. Statistical Data (`prompts/{slug}/comparisons/{timestamp}-stats.yaml`)
- Raw scores per test case per variant per metric
- Aggregate statistics (mean, std, CI, p-value, effect size)
- Distribution plots data (histogram, box plot)
- Suitable for further analysis in external tools

### 3. Per-Test-Case Breakdown (`prompts/{slug}/comparisons/{timestamp}-details.md`)
- Side-by-side outputs for every test case
- Per-case scoring and winner determination
- Annotated examples where variants diverge most

### 4. Recommendation Document
- Clear winner declaration with confidence level
- Deployment guidance and rollback criteria
- Monitoring plan for post-deployment validation
- Suggested future experiments

## Error Handling

| Error | Cause | Resolution | Recovery |
|-------|-------|------------|----------|
| Incompatible Variants | Variants have different variable schemas | Adapt test cases to common variables, flag differences | Run each with its own variable mapping, compare outputs only |
| Insufficient Test Data | Test dataset too small for statistical significance | Show minimum sample size needed, offer to generate more | Report results with power analysis and uncertainty caveat |
| Tied Results | No statistically significant difference found | Report tie with confidence level and effect size | Recommend choosing based on secondary criteria (cost, simplicity) |
| Scoring Inconsistency | LLM-as-judge produces inconsistent scores | Increase scoring runs, use consensus of multiple judges | Flag inconsistent cases, offer manual override for those cases |
| Model API Failure | One variant fails on certain test cases | Retry with backoff, mark failed cases | Exclude failed cases equally from both variants, report exclusions |
| Budget Exceeded | Running all variants on full dataset exceeds cost limit | Subsample dataset, reduce num_runs | Show estimated cost, offer reduced test plan |
| Non-Normal Distribution | Score distribution violates parametric test assumptions | Switch to non-parametric test (Wilcoxon) | Report both parametric and non-parametric results |
| Confounding Variables | Variants differ in multiple ways simultaneously | Flag multiple changes, suggest isolating variables | Run comparison but caveat that differences are confounded |

## Pre-Conditions

```yaml
pre-conditions:
  - "[ ] At least 2 prompt variants provided and parseable"
  - "[ ] Test dataset with minimum sample size available"
  - "[ ] Comparison metrics specified or defaults accepted"
  - "[ ] Target model accessible for running all variants"
```

## Post-Conditions

```yaml
post-conditions:
  - "[ ] All variants run against full test dataset"
  - "[ ] Per-metric scores calculated for every variant"
  - "[ ] Statistical significance computed with p-values"
  - "[ ] Winner determined with confidence level stated"
  - "[ ] Comparison report generated with all findings"
  - "[ ] Results are reproducible (same data produces same conclusion)"
```

## Acceptance Criteria

```yaml
acceptance-criteria:
  - "[ ] Every test case scored for every variant on every selected metric"
  - "[ ] Statistical methodology is appropriate for the data type and sample size"
  - "[ ] Winner recommendation includes confidence level and effect size"
  - "[ ] Cost-quality tradeoff analysis produced if cost metrics selected"
  - "[ ] Report flags caveats, limitations, and confounding variables"
  - "[ ] Per-category stratified analysis shows where variants diverge"
```

## Performance

```yaml
duration_expected: 10-30 min (interactive), 5-15 min (yolo)
cost_estimated: $0.02-0.15 (scales with variants x test cases x num_runs)
token_usage: ~10,000-50,000 tokens (scales with comparison scope)
```

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies:
  - prompt-engineer-design-prompt.md
  - prompt-engineer-test-prompt.md
  - prompt-engineer-optimize-prompt.md
tags:
  - prompt-engineering
  - ab-testing
  - comparison
  - statistics
  - evaluation
  - rag
updated_at: 2026-02-09
```

## Related

- **Agent:** @prompt-engineer (Lyra)
- **Upstream Tasks:** `*design-prompt` (creates variants), `*optimize-prompt` (creates optimized variant to compare)
- **Downstream Tasks:** `*test-prompt` (deep-test the winner), `*create-prompt-template` (templatize the winner)
- **Collaborators:** @eval-guardian (Sage) for evaluation methodology and ground truth curation, @rag-ai-engineer (Atlas) for end-to-end pipeline comparison
- **Templates:** `comparison-report.md`, `statistical-analysis.md`
- **Checklists:** `ab-test-validity-checklist.md`, `statistical-rigor-checklist.md`
