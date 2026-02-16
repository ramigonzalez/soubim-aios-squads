---
task: Test Prompt Effectiveness
responsavel: "@prompt-engineer"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - prompt_template: The prompt to be tested (system prompt + user prompt template + few-shot examples)
  - test_cases: Set of input-output pairs or input scenarios to run the prompt against
  - eval_criteria: Evaluation dimensions and thresholds (relevance, faithfulness, format compliance, etc.)
  - baseline_prompt: Optional baseline prompt to compare against for relative improvement measurement
Saida: |
  - test_results: Per-test-case results with scores, outputs, and pass/fail status
  - quality_scores: Aggregate quality scores across all evaluation dimensions
  - failure_analysis: Detailed breakdown of failure modes, patterns, and root causes
  - improvement_suggestions: Prioritized list of prompt modifications to address identified weaknesses
Checklist:
  - "[ ] Define test cases covering typical, edge, and adversarial scenarios"
  - "[ ] Set evaluation criteria with clear scoring rubrics"
  - "[ ] Run prompt against full test set"
  - "[ ] Score outputs on each evaluation dimension"
  - "[ ] Analyze failures and identify patterns"
  - "[ ] Identify systematic weaknesses and root causes"
  - "[ ] Compare with baseline prompt if provided"
  - "[ ] Generate prioritized improvement suggestions"
  - "[ ] Document test results with reproducible methodology"
---

# *test-prompt

Test a prompt's effectiveness against a structured test suite with multi-dimensional evaluation. Lyra executes the prompt against representative, edge-case, and adversarial test inputs, then scores outputs across configurable quality dimensions (relevance, faithfulness, completeness, format compliance, safety). Results include failure analysis with pattern detection and prioritized improvement suggestions.

## Evaluation Framework

Lyra applies a rigorous multi-dimensional evaluation approach:

### Quality Dimensions

| Dimension | Description | Scoring | Weight (Default) |
|-----------|------------|---------|-------------------|
| **Relevance** | Output directly addresses the query using retrieved context | 0-10 scale | 25% |
| **Faithfulness** | Output is grounded in context, no hallucinated claims | 0-10 scale | 30% |
| **Completeness** | Output covers all relevant information from context | 0-10 scale | 15% |
| **Format Compliance** | Output matches the specified schema/format exactly | Pass/Fail | 10% |
| **Conciseness** | Output is appropriately sized, no unnecessary verbosity | 0-10 scale | 5% |
| **Citation Accuracy** | Sources are correctly attributed (if citations required) | 0-10 scale | 10% |
| **Safety Compliance** | Output respects guardrails, refuses when appropriate | Pass/Fail | 5% |

### Test Case Categories

| Category | Purpose | Minimum Count |
|----------|---------|---------------|
| **Happy Path** | Typical queries with good context | 3-5 cases |
| **Edge Cases** | Boundary conditions, unusual inputs, sparse context | 2-3 cases |
| **Insufficient Context** | Queries where context lacks the answer | 1-2 cases |
| **Adversarial** | Injection attempts, misleading context, contradictions | 1-2 cases |
| **Multi-Chunk** | Answers requiring synthesis across multiple chunks | 1-2 cases |
| **Format Stress** | Inputs that challenge output format compliance | 1-2 cases |

### Scoring Rubric

```
10: Perfect - Exceeds expectations in every aspect
 8-9: Excellent - Minor issues that do not affect usefulness
 6-7: Good - Acceptable quality with room for improvement
 4-5: Fair - Noticeable issues that may affect user trust
 2-3: Poor - Significant issues, partially useful at best
 0-1: Fail - Incorrect, harmful, or completely off-target
```

## Usage

```bash
# Interactive mode with test case generation
*test-prompt

# Test a specific prompt file
*test-prompt --prompt prompts/customer-support/v1.0.0/prompt.md

# Test with existing test suite
*test-prompt --prompt prompts/qa/v2.0.0/prompt.md --tests prompts/qa/v2.0.0/tests.yaml

# Compare against baseline
*test-prompt --prompt prompts/qa/v2.0.0/prompt.md --baseline prompts/qa/v1.0.0/prompt.md

# Quick evaluation mode
*test-prompt --mode yolo --prompt prompts/extraction/v1.0.0/prompt.md
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `prompt_template` | string/path | yes | - | Prompt to test (inline or file path) |
| `test_cases` | list/path | no | auto-generated | Test cases (inline list or YAML file path) |
| `eval_criteria` | object | no | default dimensions | Evaluation dimensions, weights, and thresholds |
| `baseline_prompt` | string/path | no | - | Baseline prompt for comparative scoring |
| `num_runs` | integer | no | `1` | Number of runs per test case (>1 for consistency checking) |
| `mode` | enum | no | `interactive` | Execution mode: `yolo`, `interactive`, `preflight` |
| `output_format` | enum | no | `markdown` | Results format: `markdown`, `json`, `yaml`, `csv` |
| `pass_threshold` | float | no | `7.0` | Minimum weighted score to pass (0-10 scale) |
| `temperature` | float | no | `0.0` | Temperature for test runs (0.0 for deterministic) |

## Interactive Flow

### Step 1: Prompt Loading

```
Lyra: Let's test your prompt's effectiveness.

How would you like to provide the prompt?
  1. Paste the prompt directly
  2. Load from file path
  3. Load from prompt registry (prompts/ directory)
  4. Use the prompt from my last *design-prompt session

> [user input]

Prompt loaded. Summary:
  - System prompt: {length} tokens
  - User template: {length} tokens
  - Few-shot examples: {count} examples ({length} tokens)
  - Variables: {list_of_variables}
  - Total overhead: {total} tokens

Proceed to test case setup? [Y/n]
```

### Step 2: Test Case Definition

```
Lyra: Now let's define the test cases.

How would you like to create test cases?
  1. I'll provide test cases manually
  2. Generate test cases from sample data
  3. Load test cases from file
  4. Auto-generate test cases based on prompt analysis
  5. Mix: some manual + some auto-generated

> [user input]

[If auto-generate selected:]
Based on analyzing your prompt, I recommend these test categories:

  Happy Path (3 cases):
    - {description_1}
    - {description_2}
    - {description_3}

  Edge Cases (2 cases):
    - {description_1}
    - {description_2}

  Insufficient Context (1 case):
    - {description_1}

  Adversarial (1 case):
    - {description_1}

Total: {N} test cases

Approve this test suite? [Y/n/customize]
```

### Step 3: Evaluation Criteria

```
Lyra: Let's configure evaluation criteria.

Use default evaluation dimensions? [Y/n]

Default dimensions:
  1. Relevance (25%) - threshold: 7.0
  2. Faithfulness (30%) - threshold: 7.0
  3. Completeness (15%) - threshold: 6.0
  4. Format Compliance (10%) - threshold: Pass
  5. Conciseness (5%) - threshold: 6.0
  6. Citation Accuracy (10%) - threshold: 7.0
  7. Safety Compliance (5%) - threshold: Pass

Overall pass threshold: 7.0/10 (weighted average)

Adjust weights, thresholds, or add custom dimensions? [Y/n]

> [user input]
```

### Step 4: Test Execution

```
Lyra: Running tests...

=== TEST EXECUTION ===

Test 1/N: {test_name} [{category}]
  Input: {truncated_input}
  Output: {truncated_output}
  Scores:
    Relevance: {score}/10
    Faithfulness: {score}/10
    Completeness: {score}/10
    Format: {PASS/FAIL}
    Conciseness: {score}/10
    Citations: {score}/10
    Safety: {PASS/FAIL}
  Weighted Score: {weighted}/10
  Status: {PASS/FAIL}

[... repeat for all test cases ...]

Running... {progress_bar} {N}/{total}
```

### Step 5: Results Analysis

```
Lyra: Here are the test results.

=== TEST RESULTS SUMMARY ===

Overall Score: {weighted_average}/10
Pass Rate: {passed}/{total} ({percentage}%)
Status: {PASS/FAIL/MARGINAL}

Per-Dimension Scores (Weighted Average):
  Relevance:        {score}/10 {bar_chart} {status}
  Faithfulness:     {score}/10 {bar_chart} {status}
  Completeness:     {score}/10 {bar_chart} {status}
  Format Compliance: {pass_count}/{total}   {status}
  Conciseness:      {score}/10 {bar_chart} {status}
  Citation Accuracy: {score}/10 {bar_chart} {status}
  Safety Compliance: {pass_count}/{total}   {status}

Per-Category Results:
  Happy Path:           {score}/10 ({passed}/{total} passed)
  Edge Cases:           {score}/10 ({passed}/{total} passed)
  Insufficient Context: {score}/10 ({passed}/{total} passed)
  Adversarial:          {score}/10 ({passed}/{total} passed)

[If baseline provided:]
=== BASELINE COMPARISON ===
  Current prompt: {score}/10
  Baseline prompt: {score}/10
  Delta: {+/-delta} ({percentage}% {improvement/regression})
  Per-dimension comparison: {table}
```

### Step 6: Failure Analysis and Recommendations

```
Lyra: Here is the failure analysis.

=== FAILURE ANALYSIS ===

Failed Tests: {count}

Failure Pattern 1: {pattern_name}
  Affected tests: {list}
  Root cause: {analysis}
  Example:
    Input: {input_excerpt}
    Expected: {expected_excerpt}
    Actual: {actual_excerpt}
    Gap: {specific_gap}

Failure Pattern 2: {pattern_name}
  [...]

=== IMPROVEMENT SUGGESTIONS (Priority Order) ===

1. [HIGH] {suggestion_1}
   - Impact: Fixes {N} test failures
   - Effort: {low/medium/high}
   - Specific change: {what_to_modify_in_prompt}

2. [MEDIUM] {suggestion_2}
   - Impact: Improves {dimension} by ~{delta} points
   - Effort: {low/medium/high}
   - Specific change: {what_to_modify_in_prompt}

3. [LOW] {suggestion_3}
   [...]

Would you like to:
  1. Apply the top suggestion and re-test
  2. Apply all suggestions and re-test
  3. Export results to file
  4. Switch to *optimize-prompt for systematic optimization
  5. Done - accept current results

> [user input]
```

## Output

The task produces the following artifacts:

### 1. Test Results Report (`prompts/{slug}/v{version}/test-results-{timestamp}.md`)
- Executive summary with overall score and pass rate
- Per-test-case detailed results with inputs, outputs, and scores
- Per-dimension aggregate scores with pass/fail status
- Category breakdown (happy path, edge cases, adversarial)
- Baseline comparison table (if baseline provided)

### 2. Failure Analysis (`prompts/{slug}/v{version}/failure-analysis-{timestamp}.md`)
- Identified failure patterns with affected test cases
- Root cause analysis for each pattern
- Concrete input-output examples showing the gap
- Severity classification (critical, major, minor)

### 3. Improvement Plan (`prompts/{slug}/v{version}/improvements-{timestamp}.md`)
- Prioritized list of prompt modifications
- Expected impact per suggestion (which tests it fixes)
- Effort estimation and implementation guidance
- Recommended iteration strategy

### 4. Raw Scores Data (`prompts/{slug}/v{version}/scores-{timestamp}.yaml`)
- Machine-readable scores for all test cases and dimensions
- Statistical summary (mean, median, std dev, min, max)
- Suitable for tracking quality over prompt versions

## Error Handling

| Error | Cause | Resolution | Recovery |
|-------|-------|------------|----------|
| No Test Cases | Neither provided nor auto-generatable | Guide user to provide at least 3 representative inputs | Show test case template and examples for the prompt type |
| Prompt Template Error | Variables in template cannot be populated from test case | Validate variable mapping before execution | Show variable mismatch and ask user to fix mapping |
| Model API Failure | Target model unavailable or rate limited | Retry with exponential backoff (3 attempts) | Save partial results, offer to resume from last checkpoint |
| Scoring Ambiguity | Evaluator cannot determine clear score for a dimension | Flag dimension as "uncertain" with explanation | Show the output and ask user for manual score override |
| Baseline Incompatible | Baseline prompt has different variables than current prompt | Adapt test cases to work with both prompts | Run each prompt with its own variable mapping, compare outputs only |
| Token Limit Exceeded | Test case context + prompt exceeds model context window | Truncate context to fit within budget | Warn user and suggest context compression or shorter examples |
| Inconsistent Results | Same input produces different outputs across runs | Increase num_runs, lower temperature, flag instability | Report consistency score and recommend temperature/seed settings |
| Empty Output | Model returns empty or whitespace-only response | Log as critical failure, check for prompt formatting issues | Verify prompt template rendering and check for truncation |

## Pre-Conditions

```yaml
pre-conditions:
  - "[ ] Prompt template provided or loadable from file"
  - "[ ] At least 3 test cases available (provided or auto-generated)"
  - "[ ] Evaluation criteria defined with scoring rubric"
  - "[ ] Target model accessible for test execution"
```

## Post-Conditions

```yaml
post-conditions:
  - "[ ] All test cases executed with scored outputs"
  - "[ ] Aggregate quality scores calculated across all dimensions"
  - "[ ] Failure patterns identified and analyzed"
  - "[ ] Improvement suggestions generated with priority ranking"
  - "[ ] Results saved in reproducible format"
```

## Acceptance Criteria

```yaml
acceptance-criteria:
  - "[ ] Every test case has a scored output for each evaluation dimension"
  - "[ ] Overall pass/fail determination is based on configured thresholds"
  - "[ ] Failure analysis identifies at least one actionable pattern if failures exist"
  - "[ ] Improvement suggestions are specific enough to implement without guessing"
  - "[ ] Results are reproducible (same inputs produce same scores)"
  - "[ ] Baseline comparison shows per-dimension delta if baseline provided"
```

## Performance

```yaml
duration_expected: 8-20 min (interactive), 3-8 min (yolo)
cost_estimated: $0.01-0.08 (depends on test case count and model)
token_usage: ~5,000-25,000 tokens (scales with test set size)
```

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies:
  - prompt-engineer-design-prompt.md
  - prompt-engineer-optimize-prompt.md
tags:
  - prompt-engineering
  - testing
  - evaluation
  - quality-assurance
  - rag
updated_at: 2026-02-09
```

## Related

- **Agent:** @prompt-engineer (Lyra)
- **Upstream Tasks:** `*design-prompt`, `*create-prompt-template`
- **Downstream Tasks:** `*optimize-prompt`, `*compare-prompts`
- **Collaborators:** @eval-guardian (Sage) for evaluation methodology and ground truth datasets, @rag-ai-engineer (Atlas) for RAG pipeline integration testing
- **Templates:** `test-results-report.md`, `failure-analysis.md`
- **Checklists:** `prompt-test-coverage-checklist.md`
