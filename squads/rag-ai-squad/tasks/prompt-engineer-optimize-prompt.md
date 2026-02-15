---
task: Optimize Prompt for Performance
responsavel: "@prompt-engineer"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - current_prompt: The existing prompt to optimize (system prompt + user template + examples)
  - performance_data: Current metrics - token usage, latency, cost per request, quality scores
  - constraints: Hard constraints that cannot be violated (min quality threshold, max latency, compliance rules)
  - optimization_goals: Priority-ordered goals (reduce cost, reduce latency, improve quality, reduce tokens)
Saida: |
  - optimized_prompt: Compressed and refined prompt maintaining quality within constraints
  - token_reduction: Detailed token savings breakdown by component (system prompt, examples, instructions)
  - quality_comparison: Side-by-side quality metrics before and after optimization
  - cost_savings: Projected monthly cost reduction based on request volume
Checklist:
  - "[ ] Analyze current prompt structure and token distribution"
  - "[ ] Identify token waste and redundancy"
  - "[ ] Apply compression techniques appropriate to each section"
  - "[ ] Test compressed version against quality baseline"
  - "[ ] Compare quality metrics pre and post optimization"
  - "[ ] Measure token savings per component"
  - "[ ] Calculate cost reduction based on usage volume"
  - "[ ] Validate edge cases still pass"
  - "[ ] Document all optimizations with rationale"
---

# *optimize-prompt

Optimize an existing prompt for token efficiency, cost reduction, latency improvement, or quality enhancement while maintaining quality thresholds. Lyra analyzes the current prompt's token distribution, identifies waste and redundancy, applies systematic compression techniques, and validates that the optimized version meets or exceeds the original's quality metrics. Includes cost projection based on actual usage volume.

## Optimization Knowledge Base

Lyra applies the following compression and optimization techniques:

### Token Compression Techniques

| Technique | Token Reduction | Quality Risk | When to Use |
|-----------|----------------|--------------|-------------|
| **Instruction Deduplication** | 10-25% | Very Low | Multiple overlapping instructions |
| **Example Pruning** | 15-40% | Low-Medium | Redundant or similar few-shot examples |
| **Verbose-to-Terse Rewrite** | 10-30% | Low | Natural language instructions with filler words |
| **Structured Compression** | 20-35% | Low | Lists, tables, schemas with whitespace |
| **Role Consolidation** | 5-15% | Very Low | System prompt with scattered persona instructions |
| **Negative Example Removal** | 5-20% | Medium | "Do not..." instructions replaceable with positive framing |
| **Schema Minimization** | 10-25% | Low | JSON/YAML schemas with verbose descriptions |
| **Context Window Rebalancing** | Variable | Medium | Misallocated token budget across sections |
| **Few-Shot Distillation** | 20-50% | Medium | Many examples reducible to fewer, better ones |
| **Prompt Chaining Split** | 30-60% | Low | Monolithic prompt breakable into focused stages |

### Optimization Strategy Matrix

| Goal | Primary Techniques | Tradeoff |
|------|-------------------|----------|
| **Reduce Cost** | Example pruning, verbose-to-terse, schema minimization | May reduce few-shot quality guidance |
| **Reduce Latency** | Prompt chaining split, structured compression, example pruning | May add orchestration complexity |
| **Improve Quality** | Better examples, CoT addition, structured output enforcement | May increase tokens and cost |
| **Reduce Hallucination** | Extractive-first pattern, citation enforcement, context grounding | May increase tokens, reduce fluency |
| **Balance All** | Instruction dedup, role consolidation, context rebalancing | Moderate gains across all dimensions |

### Quality Preservation Rules

```
CRITICAL RULES (Never violate during optimization):
1. Never remove safety guardrails or injection defense
2. Never compress below the minimum example count for the task type
3. Never merge distinct instructions that serve different failure modes
4. Never remove output schema constraints for pipeline-connected prompts
5. Always preserve citation requirements for grounded generation
6. Always maintain refusal conditions for safety-critical prompts
7. Never optimize away uncertainty flagging in high-stakes domains
```

### Token Budget Framework

```
Optimal Token Distribution (RAG Q&A prompt):
  System Prompt:    10-15% of total overhead
  Instructions:     15-20% of total overhead
  Few-Shot Examples: 30-40% of total overhead
  Output Schema:     5-10% of total overhead
  Safety/Guardrails: 5-10% of total overhead
  Reserved Context: 50-70% of context window
  Reserved Output:  10-20% of context window
```

## Usage

```bash
# Interactive optimization
*optimize-prompt

# Optimize a specific prompt file
*optimize-prompt --prompt prompts/qa/v1.0.0/prompt.md

# Optimize with target savings
*optimize-prompt --prompt prompts/qa/v1.0.0/prompt.md --target-reduction 30%

# Cost-focused optimization
*optimize-prompt --prompt prompts/qa/v1.0.0/prompt.md --goal cost --volume 50000/day

# Quality-focused optimization (improve without adding tokens)
*optimize-prompt --prompt prompts/qa/v1.0.0/prompt.md --goal quality

# Quick mode
*optimize-prompt --mode yolo --prompt prompts/extraction/v1.0.0/prompt.md --goal cost
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `current_prompt` | string/path | yes | - | Prompt to optimize (inline or file path) |
| `performance_data` | object | no | auto-analyzed | Current metrics: tokens, latency, cost, quality scores |
| `constraints` | object | no | `{ min_quality: 7.0 }` | Hard constraints (min quality, max tokens, compliance) |
| `optimization_goals` | list | no | `[cost, tokens]` | Priority-ordered goals: `cost`, `tokens`, `latency`, `quality` |
| `target_reduction` | string | no | - | Target token reduction percentage (e.g., "30%") |
| `request_volume` | string | no | `1000/day` | Daily request volume for cost projections |
| `mode` | enum | no | `interactive` | Execution mode: `yolo`, `interactive`, `preflight` |
| `model_pricing` | object | no | auto-detect | Input/output token pricing for cost calculations |
| `preserve_examples` | boolean | no | `true` | Whether to keep all few-shot examples intact |

## Interactive Flow

### Step 1: Prompt Analysis

```
Lyra: Let's optimize your prompt for better performance.

How would you like to provide the prompt?
  1. Paste the prompt directly
  2. Load from file path
  3. Load from prompt registry
  4. Use the prompt from my last *design-prompt session

> [user input]

=== CURRENT PROMPT ANALYSIS ===

Token Distribution:
  System Prompt:     {n} tokens ({pct}%)  {efficiency_indicator}
  Instructions:      {n} tokens ({pct}%)  {efficiency_indicator}
  Few-Shot Examples: {n} tokens ({pct}%)  {efficiency_indicator}
  Output Schema:     {n} tokens ({pct}%)  {efficiency_indicator}
  Safety/Guardrails: {n} tokens ({pct}%)  {efficiency_indicator}
  ──────────────────────────────────────
  Total Overhead:    {total} tokens (100%)

Context Window Budget:
  Model: {model_name} ({max_tokens} token limit)
  Prompt overhead: {overhead} tokens ({pct}%)
  Available for context: {available} tokens ({pct}%)
  Reserved for output: {output_budget} tokens ({pct}%)

Detected Issues:
  {icon} {issue_1}: {description}
  {icon} {issue_2}: {description}
  {icon} {issue_3}: {description}

Proceed to optimization goals? [Y/n]
```

### Step 2: Goal Setting

```
Lyra: What are your optimization priorities?

Rank your goals (1 = highest priority):
  [ ] Reduce token count (currently {n} tokens)
  [ ] Reduce cost per request (currently ~${cost})
  [ ] Reduce latency (currently ~{latency}ms)
  [ ] Improve quality scores (currently {score}/10)
  [ ] Increase context window for retrieval
  [ ] Maintain current quality, just compress

> [user ranking]

Hard constraints (cannot be violated):
  - Minimum quality threshold: ___ /10 (default: 7.0)
  - Maximum token budget: ___ tokens (default: no limit)
  - Must keep safety guardrails: [Y/n] (default: Y)
  - Must keep all examples: [Y/n] (default: Y)
  - Other constraints: ___

> [user input]

Request volume for cost projection:
  - Requests per day: ___ (default: 1,000)
  - Expected growth: ___ per month

> [user input]
```

### Step 3: Optimization Plan

```
Lyra: Here is my optimization plan based on your goals.

=== OPTIMIZATION PLAN ===

Target: {reduction_target}% token reduction (~{saved} tokens)
Strategy: {primary_strategy}

Planned Optimizations:
  1. [{impact}] {technique_1}: {description}
     - Estimated savings: {n} tokens ({pct}%)
     - Quality risk: {low/medium/high}

  2. [{impact}] {technique_2}: {description}
     - Estimated savings: {n} tokens ({pct}%)
     - Quality risk: {low/medium/high}

  3. [{impact}] {technique_3}: {description}
     - Estimated savings: {n} tokens ({pct}%)
     - Quality risk: {low/medium/high}

Total Estimated Savings: {total_saved} tokens ({total_pct}%)
Projected Quality Impact: {delta}/10

Proceed with this plan? [Y/n/customize]
```

### Step 4: Optimization Execution

```
Lyra: Applying optimizations...

=== OPTIMIZATION LOG ===

[1/N] Applying: {technique_1}
  Before: {section_tokens_before} tokens
  Change: {description_of_change}
  After:  {section_tokens_after} tokens
  Saved:  {tokens_saved} tokens ({pct}%)

[2/N] Applying: {technique_2}
  Before: {section_tokens_before} tokens
  Change: {description_of_change}
  After:  {section_tokens_after} tokens
  Saved:  {tokens_saved} tokens ({pct}%)

[...]

=== OPTIMIZED PROMPT ===

--- SYSTEM PROMPT ---
{optimized_system_prompt}

--- USER TEMPLATE ---
{optimized_user_template}

--- FEW-SHOT EXAMPLES ---
{optimized_examples}

--- OUTPUT SCHEMA ---
{optimized_schema}

Total tokens: {new_total} (was {old_total}, saved {saved} = {pct}% reduction)

Review the optimized prompt? [Y/n]
```

### Step 5: Quality Validation

```
Lyra: Running quality validation against the original prompt.

=== QUALITY COMPARISON ===

Running test suite against both versions...

Dimension         | Original | Optimized | Delta  | Status
──────────────────|──────────|───────────|────────|───────
Relevance         | {score}  | {score}   | {+/-}  | {ok/warn/fail}
Faithfulness      | {score}  | {score}   | {+/-}  | {ok/warn/fail}
Completeness      | {score}  | {score}   | {+/-}  | {ok/warn/fail}
Format Compliance | {pf}     | {pf}      | {same}  | {ok/warn/fail}
Conciseness       | {score}  | {score}   | {+/-}  | {ok/warn/fail}
Citation Accuracy | {score}  | {score}   | {+/-}  | {ok/warn/fail}
Safety Compliance | {pf}     | {pf}      | {same}  | {ok/warn/fail}
──────────────────|──────────|───────────|────────|───────
Weighted Average  | {score}  | {score}   | {+/-}  | {PASS/FAIL}

Quality Gate: {PASS/FAIL}
  Constraint: min quality >= {threshold}/10
  Result: {optimized_score}/10 {status}
```

### Step 6: Cost and Savings Report

```
Lyra: Here are the projected savings.

=== COST & SAVINGS REPORT ===

Token Reduction:
  Original:  {old_total} tokens per request
  Optimized: {new_total} tokens per request
  Saved:     {saved} tokens ({pct}% reduction)

Cost Per Request:
  Original:  ${old_cost} per request
  Optimized: ${new_cost} per request
  Saved:     ${cost_saved} per request ({pct}% reduction)

Monthly Projection (at {volume} requests/day):
  Original monthly cost:  ${old_monthly}
  Optimized monthly cost: ${new_monthly}
  Monthly savings:        ${monthly_saved}
  Annual savings:         ${annual_saved}

Latency Impact:
  Estimated latency reduction: ~{pct}% ({ms}ms fewer)
  Note: Actual latency depends on model provider and load

Context Window Impact:
  Additional context capacity: +{tokens} tokens
  Equivalent to: ~{chunks} more retrieved chunks

Would you like to:
  1. Accept optimized prompt and save as new version
  2. Further optimize (apply additional techniques)
  3. Revert specific optimizations
  4. Run extended test suite before accepting
  5. Export comparison report

> [user input]
```

## Output

The task produces the following artifacts:

### 1. Optimized Prompt (`prompts/{slug}/v{new_version}/prompt.md`)
- Compressed system prompt
- Streamlined user template
- Distilled few-shot examples
- Minimized output schema
- Preserved safety guardrails

### 2. Optimization Report (`prompts/{slug}/v{new_version}/optimization-report.md`)
- Technique-by-technique breakdown of changes
- Token savings per component
- Quality comparison table (before/after)
- Cost projection with monthly/annual savings
- Latency improvement estimates

### 3. Quality Validation Results (`prompts/{slug}/v{new_version}/quality-validation.yaml`)
- Per-dimension scores for original and optimized
- Pass/fail determination against constraints
- Test case results for both versions
- Statistical confidence in quality preservation

### 4. Rollback Guide
- Exact changes made for easy reversal
- Version diff between original and optimized
- Conditions that should trigger rollback

## Error Handling

| Error | Cause | Resolution | Recovery |
|-------|-------|------------|----------|
| Quality Below Threshold | Optimization degraded quality below minimum | Revert last optimization, try gentler technique | Show which technique caused the drop, offer alternatives |
| Over-Compression | Prompt compressed so much it loses essential instructions | Restore critical instructions, compress elsewhere | Identify minimum viable prompt size for the task |
| Example Distillation Failure | Reduced examples no longer cover required edge cases | Restore critical examples, compress non-essential ones | Show which test cases fail and which examples they need |
| Safety Guardrail Removed | Optimization accidentally stripped safety instructions | Immediately restore safety section from original | Block the optimization and flag as critical error |
| Format Breaking | Compressed schema causes output format violations | Restore output schema constraints, compress elsewhere | Test format compliance specifically after each change |
| Cost Data Missing | Cannot calculate savings without pricing or volume data | Use default model pricing, ask for volume estimate | Provide token count savings even without cost projection |
| Incompatible Constraints | Min quality + max tokens + required examples conflict | Show constraint conflict and ask which to relax | Present tradeoff analysis: quality vs cost vs tokens |
| No Optimization Possible | Prompt is already near-optimal for the task | Report current efficiency metrics and confirm | Suggest alternative strategies (model switch, caching, chaining) |

## Pre-Conditions

```yaml
pre-conditions:
  - "[ ] Current prompt provided and parseable"
  - "[ ] Quality baseline established (existing scores or run baseline test)"
  - "[ ] Optimization goals specified or defaults accepted"
  - "[ ] Hard constraints defined (min quality threshold)"
```

## Post-Conditions

```yaml
post-conditions:
  - "[ ] Optimized prompt generated with measured token reduction"
  - "[ ] Quality validated against baseline with all dimensions scored"
  - "[ ] Quality meets or exceeds minimum threshold constraint"
  - "[ ] Cost savings projected based on request volume"
  - "[ ] All optimizations documented with rationale"
  - "[ ] Rollback path documented for each optimization"
```

## Acceptance Criteria

```yaml
acceptance-criteria:
  - "[ ] Token count reduced by measurable amount from original"
  - "[ ] Quality scores within acceptable delta of original (per constraints)"
  - "[ ] No safety guardrails removed or weakened"
  - "[ ] All edge case test cases still pass"
  - "[ ] Cost savings report generated with realistic projections"
  - "[ ] Every optimization technique applied is documented with before/after"
```

## Performance

```yaml
duration_expected: 10-25 min (interactive), 5-10 min (yolo)
cost_estimated: $0.01-0.06 (includes quality validation runs)
token_usage: ~5,000-20,000 tokens
```

## Metadata

```yaml
story: N/A
version: 1.0.0
dependencies:
  - prompt-engineer-design-prompt.md
  - prompt-engineer-test-prompt.md
tags:
  - prompt-engineering
  - optimization
  - token-compression
  - cost-reduction
  - rag
updated_at: 2026-02-09
```

## Related

- **Agent:** @prompt-engineer (Lyra)
- **Upstream Tasks:** `*design-prompt`, `*test-prompt`
- **Downstream Tasks:** `*test-prompt` (for validation), `*compare-prompts` (original vs optimized)
- **Collaborators:** @rag-ai-engineer (Atlas) for pipeline integration impact, @eval-guardian (Sage) for quality validation methodology
- **Templates:** `optimization-report.md`, `cost-projection.md`
- **Checklists:** `optimization-safety-checklist.md`, `quality-preservation-checklist.md`
