---
task: Check Groundedness & Implement Guardrails
responsavel: "@eval-guardian"
responsavel_type: agent
atomic_layer: task
elicit: true
Entrada: |
  - pipeline: Path or reference to the RAG pipeline to evaluate for groundedness
  - guardrail_rules: Rules defining acceptable groundedness criteria and fact-checking logic
  - fact_sources: Authoritative fact sources or knowledge base references for verification
Saida: |
  - guardrail_chain: Implemented groundedness checking chain with fact verification
  - fact_check_logic: Fact-checking logic module with citation verification and claim extraction
  - alert_config: Alert configuration for groundedness violations and confidence thresholds
  - test_results: Test results from adversarial and edge case groundedness testing
Checklist:
  - "[ ] Define groundedness criteria"
  - "[ ] Implement fact-checking chain"
  - "[ ] Setup citation verification"
  - "[ ] Configure confidence thresholds"
  - "[ ] Add fallback responses"
  - "[ ] Test with adversarial inputs"
  - "[ ] Validate guardrail effectiveness"
  - "[ ] Document rules"
---

# *check-groundedness

Check RAG pipeline response groundedness against retrieved context and implement guardrails to prevent hallucination. This task establishes a multi-layer groundedness verification system including claim extraction, citation checking, confidence scoring, and fallback response chains. It ensures that every generated response can be traced back to source material.

## Usage

```
*check-groundedness                                        # Interactive (default)
*check-groundedness pipeline="src/rag/chain.py"            # Specify pipeline
*check-groundedness guardrail_rules="strict"               # Use strict rules preset
*check-groundedness pipeline="src/rag/chain.py" fact_sources="data/knowledge_base/"
```

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `pipeline` | string | yes | — | Path to RAG pipeline module or chain definition |
| `guardrail_rules` | string | no | `standard` | Rules preset: `permissive`, `standard`, `strict`, or path to custom rules YAML |
| `fact_sources` | string | no | — | Path to authoritative sources directory or knowledge base index |

## Groundedness Framework

### What is Groundedness?

Groundedness measures whether a generated response is factually supported by the retrieved context. A grounded response:

1. **Makes only claims present in the context** - No fabricated facts
2. **Attributes information to sources** - Citations or references provided
3. **Expresses appropriate uncertainty** - Says "I don't know" when context is insufficient
4. **Does not extrapolate beyond evidence** - No unsupported inferences

### Groundedness Levels

| Level | Description | Use Case |
|-------|-------------|----------|
| `permissive` | Allow minor inferences, paraphrasing OK | Creative, conversational apps |
| `standard` | Claims must be supported, minor synthesis OK | General knowledge assistants |
| `strict` | Every claim must have direct citation | Legal, medical, financial apps |

## Interactive Flow

### Step 1: Pipeline Analysis

```
ELICIT: Pipeline Configuration

1. Which RAG pipeline should we analyze for groundedness?
   [1] Auto-detect from project structure
   [2] Specify path manually
   [3] Analyze LangSmith traces

   Your choice? [1/2/3]:

2. What is the pipeline's output format?
   [1] Plain text response
   [2] Response with source citations
   [3] Structured JSON with metadata
   [4] Streaming response

   Your choice? [1/2/3/4]:

3. Current groundedness safeguards in place:
   Scanning pipeline... {analysis results}
   - System prompt groundedness instructions: {present/absent}
   - Citation generation: {present/absent}
   - Confidence scoring: {present/absent}
   - Fallback behavior: {present/absent}
```

### Step 2: Define Groundedness Criteria

```
ELICIT: Groundedness Rules

1. What groundedness level do you need?
   [1] Permissive - Allow reasonable inferences (conversational apps)
   [2] Standard   - Claims must be supported by context (recommended)
   [3] Strict     - Every claim needs direct citation (regulated industries)

   Your choice? [1/2/3]:

2. How should the system handle insufficient context?
   [1] Generate best-effort answer with disclaimer
   [2] Refuse to answer and explain why
   [3] Provide partial answer with clear uncertainty markers
   [4] Escalate to human review

   Your choice? [1/2/3/4]:

3. What constitutes a groundedness violation?
   Select all that apply:
   [ ] Fabricated facts not in any retrieved context
   [ ] Statistics or numbers not in the source material
   [ ] Dates or timelines not explicitly mentioned
   [ ] Causal claims not supported by evidence
   [ ] Opinions presented as facts
   [ ] Information from outdated context versions

   Select (comma-separated): _
```

### Step 3: Implement Fact-Checking Chain

```
ELICIT: Fact-Checking Implementation

1. Fact-checking approach:
   [1] Claim extraction + verification (recommended)
   [2] Entailment-based checking (NLI model)
   [3] LLM-as-judge verification
   [4] Hybrid (claim extraction + NLI + LLM judge)

   Your choice? [1/2/3/4]:

2. Claim extraction granularity:
   [1] Sentence-level (each sentence is a claim)
   [2] Claim-level (extract individual factual claims)
   [3] Entity-level (verify each named entity and fact)

   Your choice? [1/2/3]:

3. Verification model:
   [1] Same model as generation (cost-effective)
   [2] Dedicated verification model (more reliable)
   [3] Smaller specialized model (fast, cheap)

   Your choice? [1/2/3]:
```

### Step 4: Citation Verification Setup

```
ELICIT: Citation System

1. Does your pipeline currently generate citations? (yes/no)

→ If YES:
  Citation format:
  [1] Inline references [1], [2], [3]
  [2] Footnote-style
  [3] Source links
  [4] Structured metadata (JSON)

  Your format? [1/2/3/4]:

→ If NO:
  Would you like to add citation generation? (yes/no)
  → If YES: Implementing citation chain...

2. Citation verification rules:
   [ ] Every factual claim must have a citation
   [ ] Citations must point to valid source documents
   [ ] Cited passage must actually support the claim
   [ ] Source document must be from approved sources list

   Select rules (comma-separated): _
```

### Step 5: Confidence Thresholds

```
ELICIT: Confidence Configuration

1. Groundedness confidence scoring:
   - HIGH (>= 0.9):    Response is fully grounded, serve normally
   - MEDIUM (0.7-0.9):  Mostly grounded, add disclaimer
   - LOW (0.5-0.7):     Partially grounded, add strong warning
   - CRITICAL (< 0.5):  Not grounded, trigger fallback

   Accept these defaults? (yes/no)
   → If NO: Configure custom thresholds for each level

2. What should happen at each confidence level?
   HIGH:     [serve / serve with sources]
   MEDIUM:   [add disclaimer / request review]
   LOW:      [add warning / fallback / block]
   CRITICAL: [fallback / block / escalate]

   Configure actions for each level: _
```

### Step 6: Fallback Response Configuration

```
ELICIT: Fallback Responses

1. Default fallback response template:
   "I don't have enough verified information to answer that question accurately.
    Here's what I found in the available sources: {partial_info}
    For a complete answer, please consult: {suggested_sources}"

   Accept this template? (yes/no)
   → If NO: Provide custom template: _

2. Fallback behavior options:
   [1] Static response (fixed template)
   [2] Dynamic response (summarize available context)
   [3] Redirect to human agent
   [4] Suggest alternative questions

   Your choice? [1/2/3/4]:
```

### Step 7: Adversarial Testing

```
ELICIT: Adversarial Testing

Running adversarial groundedness tests...

Test categories:
1. Hallucination probes - Questions designed to elicit fabricated answers
2. Context poisoning - Misleading context injected to test resistance
3. Ambiguous queries - Questions with no clear answer in context
4. Leading questions - Questions that suggest false premises
5. Out-of-scope queries - Questions completely outside the knowledge base

Running tests...
  [1/5] Hallucination probes...      {pass_count}/{total} passed
  [2/5] Context poisoning...         {pass_count}/{total} passed
  [3/5] Ambiguous queries...         {pass_count}/{total} passed
  [4/5] Leading questions...         {pass_count}/{total} passed
  [5/5] Out-of-scope queries...      {pass_count}/{total} passed

Overall groundedness score: {score}

Review detailed results? (yes/no):
```

## Output

On successful completion:

```
Groundedness Check & Guardrails Complete

Pipeline:             {pipeline_name}
Groundedness Level:   {level}
Overall Score:        {score}/1.0
Adversarial Tests:    {pass_count}/{total} passed

Guardrail Chain:
  Claim extraction:   {method}
  Fact verification:  {method}
  Citation checking:  {enabled/disabled}
  Confidence scoring: {thresholds}
  Fallback behavior:  {type}

Adversarial Test Results:
  Hallucination probes:  {score}
  Context poisoning:     {score}
  Ambiguous queries:     {score}
  Leading questions:     {score}
  Out-of-scope:          {score}

Files Created/Modified:
  src/guardrails/groundedness.ts       - Groundedness checking chain
  src/guardrails/fact_checker.ts       - Fact-checking logic module
  src/guardrails/citation_verifier.ts  - Citation verification
  src/guardrails/fallback.ts           - Fallback response handler
  src/guardrails/confidence.ts         - Confidence scoring module
  config/groundedness-rules.yaml       - Groundedness rule configuration
  tests/adversarial/groundedness.test.ts - Adversarial test suite
  reports/groundedness-{timestamp}.md  - Groundedness report

Next Steps:
  1. Run *setup-guardrails for comprehensive input/output guardrails
  2. Run *run-evaluation to measure faithfulness improvements
  3. Run *monitor-production to track groundedness in production
```

## Groundedness Checking Architecture

```
┌─────────────────────────────────────────────────────┐
│                   User Query                         │
│                      │                               │
│                      ▼                               │
│              ┌──────────────┐                        │
│              │   Retrieval  │                        │
│              └──────┬───────┘                        │
│                     │                                │
│                     ▼                                │
│              ┌──────────────┐                        │
│              │  Generation  │                        │
│              └──────┬───────┘                        │
│                     │                                │
│                     ▼                                │
│     ┌───────────────────────────────┐               │
│     │   GROUNDEDNESS CHECK CHAIN     │               │
│     │                               │               │
│     │  1. Extract claims            │               │
│     │  2. Verify each claim         │               │
│     │     against context           │               │
│     │  3. Check citations           │               │
│     │  4. Score confidence          │               │
│     │                               │               │
│     │  Confidence >= threshold? ────┼── YES → Serve │
│     │           │                   │               │
│     │           NO                  │               │
│     │           │                   │               │
│     │           ▼                   │               │
│     │     Fallback response         │               │
│     └───────────────────────────────┘               │
└─────────────────────────────────────────────────────┘
```

## Error Handling

| Error | Cause | Resolution |
|-------|-------|------------|
| `PIPELINE_NOT_FOUND` | RAG pipeline path is invalid | Verify pipeline path and module structure |
| `CLAIM_EXTRACTION_FAILED` | LLM failed to extract claims from response | Check extraction prompt, try different model |
| `VERIFICATION_MODEL_ERROR` | Verification LLM unavailable or errored | Check model API key, try fallback model |
| `CITATION_FORMAT_ERROR` | Citations in unexpected format | Update citation parser regex/logic |
| `NO_CONTEXT_RETRIEVED` | Pipeline returned empty context | Check retrieval configuration, verify index |
| `ADVERSARIAL_TEST_TIMEOUT` | Adversarial testing exceeded time limit | Reduce test set size or increase timeout |
| `RULES_FILE_INVALID` | Custom rules YAML has invalid schema | Validate against groundedness rules schema |
| `CONFIDENCE_CALIBRATION_ERROR` | Confidence scores inconsistent | Recalibrate using labeled dataset |
| `FALLBACK_CHAIN_ERROR` | Fallback response generation failed | Check fallback template and handler |

## Related

- **Agent:** @eval-guardian (Sage)
- **Depends On:** *setup-langsmith (tracing), *create-eval-dataset (adversarial test data)
- **Complements:** *setup-guardrails (broader guardrail system)
- **Used By:** *run-evaluation (faithfulness metric), *monitor-production (groundedness tracking)
- **Collaborates With:** @prompt-engineer (prompt groundedness instructions), @rag-architect (architecture for verification chain)
